import { NextResponse } from 'next/server';
import { calls } from '@/lib/data/store';

export async function GET() {
    return NextResponse.json(calls);
}
