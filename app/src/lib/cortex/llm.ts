// ═══════════════════════════════════════════════════════════════════════════════
// EMMA CORTEX — Multi-Model LLM Intelligence Layer
// Primary: Ollama (local, free, unlimited) | Fallback: Groq (cloud, free tier)
// Supports tool/function calling for the ReAct agent loop.
// ═══════════════════════════════════════════════════════════════════════════════

import Groq from 'groq-sdk';
import type { CortexTool } from './tools';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ── Types ──

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
}

export interface LLMResponse {
    content: string;
    toolCalls: ToolCall[];
    model: string;
    provider: 'ollama' | 'groq';
    tokensUsed?: number;
}

// ── Convert tools to Groq function schemas ──

function toolsToGroqFormat(tools: CortexTool[]): Groq.Chat.Completions.ChatCompletionTool[] {
    return tools.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
}

// ── Convert tools to Ollama format ──

function toolsToOllamaFormat(tools: CortexTool[]): unknown[] {
    return tools.map(t => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
}

// ── Ollama Call (Local, Free, Unlimited) ──

async function callOllama(
    messages: LLMMessage[],
    tools?: CortexTool[],
    options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
        model: OLLAMA_MODEL,
        messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        })),
        stream: false,
        options: {
            temperature: options?.temperature ?? 0.2,
            num_predict: options?.maxTokens ?? 2048,
        },
    };

    if (tools && tools.length > 0) {
        body.tools = toolsToOllamaFormat(tools);
    }

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000), // 60s timeout
    });

    if (!res.ok) {
        throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const msg = data.message || {};
    const toolCalls: ToolCall[] = (msg.tool_calls || []).map((tc: Record<string, unknown>, i: number) => ({
        id: `ollama-tc-${Date.now()}-${i}`,
        type: 'function' as const,
        function: {
            name: (tc.function as Record<string, string>)?.name || '',
            arguments: typeof (tc.function as Record<string, unknown>)?.arguments === 'string'
                ? (tc.function as Record<string, string>).arguments
                : JSON.stringify((tc.function as Record<string, unknown>)?.arguments || {}),
        },
    }));

    return {
        content: msg.content || '',
        toolCalls,
        model: OLLAMA_MODEL,
        provider: 'ollama',
        tokensUsed: data.eval_count,
    };
}

// ── Groq Call (Cloud, Free Tier, Rate Limited) ──

async function callGroq(
    messages: LLMMessage[],
    tools?: CortexTool[],
    options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
    const params: Groq.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        messages: messages.map(m => {
            if (m.role === 'tool') {
                return { role: 'tool' as const, content: m.content, tool_call_id: m.tool_call_id || '' };
            }
            if (m.role === 'assistant' && m.tool_calls) {
                return { role: 'assistant' as const, content: m.content || '', tool_calls: m.tool_calls };
            }
            return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
        }),
        model: GROQ_MODEL,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false,
    };

    if (tools && tools.length > 0) {
        params.tools = toolsToGroqFormat(tools);
        params.tool_choice = 'auto';
    }

    const completion = await groq.chat.completions.create(params);
    const choice = completion.choices[0];
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls || []).map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
        },
    }));

    return {
        content: choice?.message?.content || '',
        toolCalls,
        model: GROQ_MODEL,
        provider: 'groq',
        tokensUsed: completion.usage?.total_tokens,
    };
}

// ── Smart Multi-Model Caller ──
// Strategy: Try Ollama first (local, free, unlimited)
//           If Ollama fails or is unavailable → fall back to Groq (cloud)

export async function callCortexLLM(
    messages: LLMMessage[],
    tools?: CortexTool[],
    options?: { temperature?: number; maxTokens?: number; preferCloud?: boolean }
): Promise<LLMResponse> {
    // If preferCloud is set, go straight to Groq (for complex reasoning)
    if (options?.preferCloud) {
        try {
            return await callGroq(messages, tools, options);
        } catch (err) {
            console.warn('⚠️ Groq failed, trying Ollama:', err);
            return await callOllama(messages, tools, options);
        }
    }

    // Default: try Ollama first (free, unlimited)
    try {
        return await callOllama(messages, tools, options);
    } catch (err) {
        console.warn('⚠️ Ollama unavailable, falling back to Groq:', err);
        try {
            return await callGroq(messages, tools, options);
        } catch (groqErr) {
            console.error('❌ Both LLM providers failed:', groqErr);
            return {
                content: "I'm experiencing a brief technical delay. Could you repeat what you said?",
                toolCalls: [],
                model: 'fallback',
                provider: 'groq',
            };
        }
    }
}

// ── Simple text call (no tools, for evaluation/summarization) ──

export async function callCortexText(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number; preferCloud?: boolean }
): Promise<string> {
    const messages: LLMMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });
    const res = await callCortexLLM(messages, undefined, options);
    return res.content;
}
