import { NextResponse } from 'next/server';
import {
    agentExecutor, browserAgent, memoryStore, selfImproveEngine,
    outreachEngine, scheduleOptimizer, documentAuthor, healthMonitor,
    getSystemStatus,
} from '@/lib/engines/master-graph';

// GET — system status from all engines (now async — reads from DB)
export async function GET() {
    try {
        const status = await getSystemStatus();
        return NextResponse.json(status);
    } catch (error) {
        console.error('Command Centre GET Error:', error);
        return NextResponse.json({ error: 'Failed to load system status' }, { status: 500 });
    }
}

// POST — execute superpower actions
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, payload } = body;

        switch (action) {
            // SP1: Agent Executor
            case 'execute-agent': {
                const { message, nhsNumber } = payload;
                const trace = await agentExecutor.execute(message, `call-${Date.now()}`, nhsNumber);
                return NextResponse.json({ success: true, data: trace });
            }

            // SP2: Browser Agent
            case 'browser-task': {
                const { task, domain } = payload;
                const session = await browserAgent.executeTask(task, domain || 'e-referral.nhs.uk');
                return NextResponse.json({ success: true, data: session });
            }

            // SP3: Memory — extract facts
            case 'extract-memory': {
                const { text, nhsNumber: memNhs } = payload;
                const facts = await memoryStore.learnFromConversation(memNhs || '000 000 0000', text);
                return NextResponse.json({ success: true, data: { facts, count: facts.length } });
            }

            // SP3: Memory — recall
            case 'recall-memory': {
                const { nhsNumber: recallNhs, context } = payload;
                const recalled = await memoryStore.recall(recallNhs, context);
                return NextResponse.json({ success: true, data: { facts: recalled } });
            }

            // SP4: Self-Improve — run all safety tests
            case 'run-safety-tests': {
                const results = await selfImproveEngine.runSafetyTests();
                return NextResponse.json({ success: true, data: results });
            }

            // SP5: Outreach — generate campaign for a rule
            case 'run-outreach-scan': {
                const { ruleId } = payload || {};
                const scanResult = await outreachEngine.generateOutreach(ruleId || 'rule-flu');
                return NextResponse.json({ success: true, data: scanResult });
            }

            // SP6: Schedule — optimize day
            case 'optimize-schedule': {
                const { date } = payload || {};
                const today = date || new Date().toISOString().split('T')[0];
                const optResult = await scheduleOptimizer.optimizeDay(today);
                return NextResponse.json({ success: true, data: optResult });
            }

            // SP7: Documents — draft
            case 'generate-document': {
                const { type, nhsNumber: docNhs, patientName, clinicalContext } = payload;
                const doc = await documentAuthor.draftDocument(
                    type || 'referral_letter', docNhs || '000 000 0000',
                    patientName || 'Patient', clinicalContext || '',
                );
                return NextResponse.json({ success: true, data: doc });
            }

            // SP7: Documents — approve
            case 'approve-document': {
                const { documentId, gpName } = payload;
                const approved = await documentAuthor.approveDocument(documentId, gpName || 'Dr. Khan');
                return NextResponse.json({ success: true, data: approved });
            }

            // SP8: Health Monitor — process reading
            case 'process-reading': {
                const { nhsNumber: healthNhs, patientName: healthName, readingType, value, patientContext: healthCtx } = payload;
                const result = await healthMonitor.processReading(
                    healthNhs || '000 000 0000', healthName || 'Patient',
                    readingType, value, healthCtx,
                );
                return NextResponse.json({ success: true, data: result });
            }

            // SP8: Health Monitor — acknowledge
            case 'acknowledge-alert': {
                const { alertId, gpName: ackGp } = payload;
                const acked = await healthMonitor.acknowledgeAlert(alertId, ackGp || 'Dr. Khan');
                return NextResponse.json({ success: true, data: acked });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error) {
        console.error('Command Centre POST Error:', error);
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
