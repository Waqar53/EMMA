import { NextResponse } from 'next/server';
import { dashboardStats, calls, triageRecords } from '@/lib/data/store';

export async function GET() {
    const stats = { ...dashboardStats, recentCalls: calls.slice(0, 8), triageRecords: triageRecords };
    return NextResponse.json(stats);
}
