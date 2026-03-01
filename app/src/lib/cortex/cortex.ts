// ═══════════════════════════════════════════════════════════════════════════════
// EMMA CENTRAL CORTEX — Autonomous ReAct Agent Loop
// The "OpenClaw" of Medical AI — Think → Act → Observe → Repeat
//
// This is the BRAIN. It replaces the linear if/else orchestrator with an
// autonomous loop where the LLM decides what tools to call and in what order.
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';
import { callCortexLLM, callCortexText, type LLMMessage, type LLMResponse } from './llm';
import { getAllTools, getToolByName, type CortexTool, type ToolContext, type ToolResult } from './tools';
import type { ConversationState, AgentResponse, PracticeConfig, PatientRecord, AppointmentSlot, TestResult } from '../types';
import { getPractice, getPatients, getAppointments, getTestResults as getTestResultsFromDB } from '../data/store';
import { persistChatToDB } from '../agents/persist';

// ── Types ──

export interface CortexStep {
    stepNumber: number;
    thought: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    observation: string;
    success: boolean;
    durationMs: number;
}

export interface CortexPlan {
    goal: string;
    steps: CortexStep[];
    totalSteps: number;
    totalDurationMs: number;
}

export interface CortexEvaluation {
    overallScore: number;       // 1-10
    clinicalSafety: number;     // 1-10
    patientExperience: number;  // 1-10
    efficiency: number;         // 1-10
    reasoning: string;
    improvements: string[];
}

export interface CortexResult {
    response: string;
    agent: string;
    plan: CortexPlan;
    evaluation: CortexEvaluation | null;
    metadata: Record<string, unknown>;
    state: ConversationState;
}

// ── System Prompt ──

function buildCortexSystemPrompt(practice: PracticeConfig, tools: CortexTool[], patientMemories?: string[]): string {
    const toolDescriptions = tools.map(t => `• ${t.name}: ${t.description}`).join('\n');

    const memoryBlock = patientMemories && patientMemories.length > 0
        ? `\n═══ WHAT YOU REMEMBER ABOUT THIS PATIENT ═══\n${patientMemories.map(m => `• ${m}`).join('\n')}\nReference these naturally. Never ask for information you already have.`
        : '';

    return `You are EMMA — the AI receptionist at ${practice.name}. You are warm, professional, calm, and speak natural British English.

═══ IDENTITY & TONE ═══
- Warm, professional, calm British English. Never robotic. Never vague. Always precise.
- You remember every patient. Reference past interactions naturally.
- You take ACTION — you don't just suggest things, you DO them.
- Use the patient's first name once verified.
- Never ask for information you already have.
- Never ask "is it urgent?" — YOU decide based on clinical criteria.

═══ YOUR 18 CAPABILITIES (Tools Available) ═══
${toolDescriptions}

═══ DECISION FRAMEWORK — Run on EVERY message ═══

STEP 1 — SAFETY CHECK (runs first, always, non-negotiable)
Scan every message for red flag combinations:
- Chest pain + arm pain/jaw pain/sweating/breathlessness = CARDIAC → call alert_emergency_contact
- Sudden severe headache + vomiting + light sensitivity = MENINGITIS → call alert_emergency_contact
- Difficulty breathing + blue lips = RESPIRATORY EMERGENCY → call alert_emergency_contact
- Collapse/unresponsive = IMMEDIATE 999 → call alert_emergency_contact
- Suicidal ideation/self harm = MENTAL HEALTH CRISIS → call alert_emergency_contact
- Face drooping + arm weakness + speech slurred = STROKE → call alert_emergency_contact
If ANY red flag → IMMEDIATELY use alert_emergency_contact + triage_symptoms. Do NOT continue pleasantries.

STEP 2 — PATIENT CONTEXT LOAD
Before responding to any non-emergency:
- Use lookup_patient to find and verify the patient
- Use get_patient_history to load medications, allergies, past calls, memory
${memoryBlock}

STEP 3 — INTENT CLASSIFICATION
Classify into: TRIAGE | BOOKING | PRESCRIPTION | RESULTS | ADMIN | CHECKIN | GENERAL | COMPLAINT

STEP 4 — AGENT EXECUTION
Based on intent, call the correct tools. Chain multiple tools. Complete the full task:
- TRIAGE → triage_symptoms → if RED: alert_emergency_contact | if AMBER: auto-book same-day | if YELLOW: book within 48h | if GREEN: book routine
- BOOKING → check_available_slots → book_appointment → send_sms confirmation
- PRESCRIPTION → process_prescription → send_sms when submitted
- RESULTS → get_test_results → deliver if authorised, else create_gp_alert
- ADMIN → answer_admin_query
Always send_sms confirmation after booking or prescription actions.

STEP 5 — MEMORY UPDATE
After every clinical interaction: save_episode with summary, symptoms, actions, outcome.
If follow-up needed: schedule_followup.

═══ TRIAGE COLOUR MAPPING ═══
RED    → Emergency protocol (Step 1). Call 999. alert_emergency_contact.
AMBER  → Book same-day urgent appointment IMMEDIATELY. No asking. Just book it.
YELLOW → Book within 48 hours. Confirm with patient.
GREEN  → Book routine. Offer next available.
BLUE   → Handle without appointment (advice, admin, prescription).

═══ EMERGENCY ALERT PROTOCOL ═══
When RED detected, in the SAME response turn:
1. Tell patient: "Please call 999 immediately. This sounds like it could be serious."
2. Call alert_emergency_contact with symptoms and red flags
3. Call create_gp_alert with urgency IMMEDIATE
4. Do NOT continue normal conversation. Safety is the only priority.

═══ PRESCRIPTION PROTOCOL ═══
1. Verify patient identity first
2. Check if medication is on repeat list (process_prescription handles this)
3. If review overdue: "Before I can process this, Dr [name] needs a quick medication review. I'm booking that now." → book_appointment
4. If not on repeat: "This medication isn't on your repeat list. I'm creating a task for your GP." → create_gp_alert
5. Always send_sms confirmation with estimated ready date + pharmacy

═══ WHAT EMMA NEVER DOES ═══
- Never diagnoses. Assesses urgency only.
- Never overrides a red flag based on patient reassurance.
- Never books without confirmed patient identity.
- Never tells test results without GP authorisation.
- Never dismisses symptoms in elderly, paediatric, or immunocompromised patients.
- Never ends a RED/AMBER interaction without logging it.

═══ PRACTICE INFO ═══
Name: ${practice.name}
Address: ${practice.address}
Phone: ${practice.phone}
Pharmacy: ${practice.pharmacyName} (${practice.pharmacyAddress})
Out-of-hours: ${practice.oohNumber}

═══ RESPONSE STYLE ═══
- Speak naturally, as if on the phone. Warm but concise.
- Use the patient's name once verified.
- Always include safety netting for clinical interactions.
- After actions: confirm what you've done clearly.
- End with: "Is there anything else I can help you with?"`;
}


// ── The Core ReAct Loop ──

const MAX_STEPS = 12;

export async function runCortex(
    userMessage: string,
    currentState?: ConversationState
): Promise<CortexResult> {
    const startTime = Date.now();

    // ── 1. Load real data from database ──
    const practice = await getPractice();
    const patients = await getPatients();
    const appointments = await getAppointments();
    const testResults = await getTestResultsFromDB();

    // ── 2. Initialize or restore state ──
    const state: ConversationState = currentState ? { ...currentState } : {
        callId: uuidv4(),
        practiceId: practice.id,
        patientVerified: false,
        messages: [],
        intentConfidence: 0,
        currentAgent: 'orchestrator',
        symptoms: [],
        redFlags: [],
        safetyNetsApplied: [],
        actionsTaken: [],
        escalationRequired: false,
        resolved: false,
    };

    // Add user message
    state.messages.push({
        id: uuidv4(),
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
    });

    // ── 3. Build tool context ──
    const tools = getAllTools();
    const toolCtx: ToolContext = { state, practice, patients, appointments, testResults };

    // ── 4. Build LLM messages ──
    const systemPrompt = buildCortexSystemPrompt(practice, tools);
    const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 messages for context window)
    const recentMessages = state.messages.slice(-10);
    for (const m of recentMessages) {
        llmMessages.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }

    // ── 5. ReAct Loop: Think → Act → Observe → Repeat ──
    const steps: CortexStep[] = [];
    let finalResponse = '';

    for (let step = 0; step < MAX_STEPS; step++) {
        const stepStart = Date.now();

        // Call LLM with tools — use Groq for tool calling (more reliable)
        let llmResult: LLMResponse;
        try {
            llmResult = await callCortexLLM(llmMessages, tools, { preferCloud: true, maxTokens: 2048 });
        } catch (err) {
            console.error('Cortex LLM call failed:', err);
            finalResponse = "I apologize, I'm having a brief technical difficulty. Could you repeat what you said?";
            break;
        }

        // If LLM returns tool calls → execute them
        if (llmResult.toolCalls.length > 0) {
            // Add assistant message with tool calls
            llmMessages.push({
                role: 'assistant',
                content: llmResult.content || '',
                tool_calls: llmResult.toolCalls,
            });

            for (const tc of llmResult.toolCalls) {
                const tool = getToolByName(tc.function.name);
                if (!tool) {
                    const errMsg = `Tool "${tc.function.name}" not found.`;
                    llmMessages.push({ role: 'tool', content: errMsg, tool_call_id: tc.id });
                    steps.push({
                        stepNumber: step + 1,
                        thought: llmResult.content || '',
                        toolName: tc.function.name,
                        toolInput: {},
                        observation: errMsg,
                        success: false,
                        durationMs: Date.now() - stepStart,
                    });
                    continue;
                }

                // Parse arguments
                let args: Record<string, unknown> = {};
                try {
                    args = typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments as Record<string, unknown>;
                } catch {
                    args = {};
                }

                // Execute tool
                let result: ToolResult;
                try {
                    result = await tool.execute(args, toolCtx);
                } catch (err) {
                    result = { success: false, data: {}, observation: `Tool execution error: ${err}` };
                }

                // Record step
                steps.push({
                    stepNumber: steps.length + 1,
                    thought: llmResult.content || '',
                    toolName: tc.function.name,
                    toolInput: args,
                    observation: result.observation,
                    success: result.success,
                    durationMs: Date.now() - stepStart,
                });

                // Feed observation back to LLM
                llmMessages.push({
                    role: 'tool',
                    content: result.observation,
                    tool_call_id: tc.id,
                });

                console.log(`  🔧 Step ${steps.length}: ${tc.function.name} → ${result.success ? '✅' : '❌'}`);
            }
        } else {
            // No tool calls — LLM is done reasoning and wants to respond
            finalResponse = llmResult.content;
            console.log(`  💬 Final response generated after ${steps.length} tool calls`);
            break;
        }
    }

    // If we hit max steps without a final response, force one
    if (!finalResponse) {
        try {
            const forceMsg: LLMMessage[] = [...llmMessages, {
                role: 'user' as const,
                content: 'Now provide your final response to the patient based on everything you have gathered. Be natural and helpful.',
            }];
            const forced = await callCortexLLM(forceMsg, undefined, { preferCloud: true });
            finalResponse = forced.content;
        } catch {
            finalResponse = "I've completed the necessary checks. Is there anything specific you'd like me to help with?";
        }
    }

    // ── 6. Update state ──
    state.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date().toISOString(),
        metadata: {
            agent: state.currentAgent,
            intent: state.currentIntent,
            urgency: state.urgencyLevel,
            redFlags: state.redFlags,
            actionsPerformed: state.actionsTaken,
            patientVerified: state.patientVerified,
        },
    });

    const totalDuration = Date.now() - startTime;

    // ── 7. Build plan ──
    const plan: CortexPlan = {
        goal: userMessage.slice(0, 100),
        steps,
        totalSteps: steps.length,
        totalDurationMs: totalDuration,
    };

    // ── 8. Self-Evaluation (async, non-blocking) ──
    let evaluation: CortexEvaluation | null = null;
    if (steps.length > 0) {
        evaluation = await selfEvaluate(userMessage, finalResponse, steps, state);
    }

    // ── 9. Persist to database (fire-and-forget) ──
    persistChatToDB(state, finalResponse).catch(err =>
        console.error('Cortex persistence error:', err)
    );

    console.log(`\n🧠 EMMA Cortex completed: ${steps.length} tools called in ${totalDuration}ms`);
    console.log(`   Intent: ${state.currentIntent} | Agent: ${state.currentAgent} | Urgency: ${state.urgencyLevel}`);
    if (evaluation) console.log(`   Self-score: ${evaluation.overallScore}/10`);

    return {
        response: finalResponse,
        agent: state.currentAgent,
        plan,
        evaluation,
        metadata: {
            agent: state.currentAgent,
            intent: state.currentIntent,
            urgency: state.urgencyLevel,
            redFlags: state.redFlags,
            safetyNetting: state.safetyNetsApplied.join('; '),
            patientVerified: state.patientVerified,
            actionsPerformed: state.actionsTaken,
            toolsUsed: steps.map(s => s.toolName),
            totalSteps: steps.length,
            totalDurationMs: totalDuration,
            selfScore: evaluation?.overallScore,
        },
        state,
    };
}

// ── Self-Evaluation Engine ──

async function selfEvaluate(
    userMessage: string,
    response: string,
    steps: CortexStep[],
    state: ConversationState
): Promise<CortexEvaluation> {
    try {
        const evalPrompt = `You are evaluating EMMA's performance on a patient call. Score each dimension 1-10.

PATIENT MESSAGE: "${userMessage}"

EMMA'S ACTIONS:
${steps.map(s => `Step ${s.stepNumber}: ${s.toolName}(${JSON.stringify(s.toolInput)}) → ${s.success ? 'SUCCESS' : 'FAILED'}: ${s.observation.slice(0, 100)}`).join('\n')}

EMMA'S RESPONSE: "${response}"

RED FLAGS DETECTED: ${state.redFlags.join(', ') || 'None'}
SAFETY NETTING: ${state.safetyNetsApplied.join('; ') || 'None applied'}

Respond in JSON only:
{
  "overallScore": <1-10>,
  "clinicalSafety": <1-10 — did EMMA detect all red flags? Apply safety netting?>,
  "patientExperience": <1-10 — was EMMA warm, clear, empathetic?>,
  "efficiency": <1-10 — did EMMA use minimum steps needed?>,
  "reasoning": "<1-2 sentences explaining scores>",
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}`;

        const evalResult = await callCortexText(evalPrompt, 'You are a medical AI quality evaluator. Respond in JSON only.', {
            preferCloud: true,
            temperature: 0.1,
            maxTokens: 512,
        });

        // Parse JSON from response
        const jsonMatch = evalResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                overallScore: Number(parsed.overallScore) || 5,
                clinicalSafety: Number(parsed.clinicalSafety) || 5,
                patientExperience: Number(parsed.patientExperience) || 5,
                efficiency: Number(parsed.efficiency) || 5,
                reasoning: String(parsed.reasoning || ''),
                improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
            };
        }
    } catch (err) {
        console.warn('Self-evaluation failed:', err);
    }

    return { overallScore: 5, clinicalSafety: 5, patientExperience: 5, efficiency: 5, reasoning: 'Evaluation unavailable', improvements: [] };
}
