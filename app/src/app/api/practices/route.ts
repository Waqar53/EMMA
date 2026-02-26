import { NextResponse } from 'next/server';
import { practice } from '@/lib/data/store';

export async function GET() {
    return NextResponse.json(practice);
}
