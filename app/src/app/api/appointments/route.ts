import { NextResponse } from 'next/server';
import { appointments } from '@/lib/data/store';

export async function GET() {
    return NextResponse.json(appointments);
}
