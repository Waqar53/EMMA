// ═══════════════════════════════════════════════════════════════════════════════
// NHS Integration Status API — Health check for NHS PDS, ODS, Spine connectivity
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { checkPDSHealth } from '@/lib/nhs/pds';
import { checkSpineHealth } from '@/lib/nhs/spine';

export async function GET() {
    try {
        const [pds, spine] = await Promise.all([
            checkPDSHealth(),
            checkSpineHealth(),
        ]);

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            nhs: {
                pds: {
                    status: pds.status,
                    environment: pds.environment,
                    latencyMs: pds.latencyMs,
                    endpoint: 'https://sandbox.api.service.nhs.uk/personal-demographics/FHIR/R4',
                },
                spine: spine,
            },
            summary: {
                pdsConnected: pds.status === 'healthy',
                totalServices: Object.keys(spine).length + 1,
                healthyServices: (pds.status === 'healthy' ? 1 : 0) +
                    Object.values(spine).filter(s => s.status === 'healthy').length,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'NHS health check failed', details: String(error) }, { status: 500 });
    }
}
