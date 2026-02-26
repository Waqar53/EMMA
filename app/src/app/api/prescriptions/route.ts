import { NextResponse } from 'next/server';
import { prescriptions } from '@/lib/data/store';

export async function GET() {
    return NextResponse.json(prescriptions);
}
