import { NextResponse } from 'next/server';
import { triageRecords } from '@/lib/data/store';

export async function GET() {
    return NextResponse.json(triageRecords);
}
