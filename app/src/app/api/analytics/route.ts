import { NextResponse } from 'next/server';
import { getDashboardStats, getCalls, getTriageRecords } from '@/lib/data/store';

export async function GET() {
    const stats = await getDashboardStats();
    const recentCalls = await getCalls();
    const triages = await getTriageRecords();
    return NextResponse.json({ ...stats, recentCalls: recentCalls.slice(0, 8), triageRecords: triages });
}
