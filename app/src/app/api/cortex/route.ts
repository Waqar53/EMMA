// ═══════════════════════════════════════════════════════════════════════════════
// EMMA CORTEX API — The autonomous brain endpoint
// Receives patient messages, runs the ReAct agent loop, returns full response
// with plan, evaluation, and metadata.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { runCortex } from '@/lib/cortex/cortex';
import type { ConversationState } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const { message, conversationState } = await request.json() as {
            message: string;
            conversationState?: ConversationState;
        };

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        console.log(`\n🧠 ═══ EMMA CORTEX PROCESSING ═══`);
        console.log(`   Message: "${message.slice(0, 80)}..."`);

        const result = await runCortex(message, conversationState);

        console.log(`🧠 ═══ CORTEX COMPLETE ═══\n`);

        return NextResponse.json({
            response: result.response,
            agent: result.agent,
            metadata: result.metadata,
            plan: {
                goal: result.plan.goal,
                steps: result.plan.steps.map(s => ({
                    step: s.stepNumber,
                    tool: s.toolName,
                    input: s.toolInput,
                    result: s.observation.slice(0, 200),
                    success: s.success,
                    durationMs: s.durationMs,
                })),
                totalSteps: result.plan.totalSteps,
                totalDurationMs: result.plan.totalDurationMs,
            },
            evaluation: result.evaluation,
            conversationState: result.state,
        });
    } catch (error) {
        console.error('❌ Cortex API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', response: "I'm sorry, I'm experiencing a technical difficulty. Please try again." },
            { status: 500 }
        );
    }
}
