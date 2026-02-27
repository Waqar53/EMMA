import { NextResponse } from 'next/server';
import { getTriageRecords } from '@/lib/data/store';

export async function GET() {
    const triages = await getTriageRecords();
    return NextResponse.json(triages);
}
