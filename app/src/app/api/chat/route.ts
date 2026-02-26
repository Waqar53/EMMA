import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/agents/orchestrator';
import { ConversationState } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, conversationState } = body as { message: string; conversationState?: ConversationState };

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const result = await processMessage(message, conversationState);

        return NextResponse.json({
            response: result.message,
            agent: result.agent,
            metadata: result.metadata,
            conversationState: result.state,
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: 'An internal error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
