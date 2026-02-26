import { NextResponse } from 'next/server';
import { getCommandCentreData } from '@/lib/engines/master-graph';

export async function GET() {
    try {
        const data = getCommandCentreData();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Command Centre API Error:', error);
        return NextResponse.json({ error: 'Failed to load command centre data' }, { status: 500 });
    }
}
