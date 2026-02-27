import { NextResponse } from 'next/server';
import { getCalls } from '@/lib/data/store';

export async function GET() {
    const calls = await getCalls();
    return NextResponse.json(calls);
}
