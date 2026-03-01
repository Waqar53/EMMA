// ═══════════════════════════════════════════════════════════════════════════════
// EMMA Scheduler API — Manual trigger for recalls, check-ins, and pending tasks
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { runFullScheduler } from '@/lib/scheduler/scheduler';

export async function GET() {
    try {
        const result = await runFullScheduler();
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: 'Scheduler run failed', details: String(error) },
            { status: 500 },
        );
    }
}
