// ═══════════════════════════════════════════════════════════════════════════════
// MASTER GRAPH — Unified engine orchestration
// Real engine instantiation — all data from Prisma DB
// ═══════════════════════════════════════════════════════════════════════════════

import { EMMAAgentExecutor } from './agent-executor';
import { EMMAbrowserAgent } from './browser-agent';
import { PatientMemoryStore } from './memory-store';
import { EMMASelfImproveEngine } from './self-improve';
import { EMMAOutreachEngine } from './outreach';
import { EMMAScheduleOptimizer } from './schedule-optimizer';
import { ClinicalDocumentAuthor } from './document-author';
import { EMMAHealthMonitor } from './health-monitor';

// ═══ ENGINE SINGLETONS — shared across API calls ═══

export const agentExecutor = new EMMAAgentExecutor();
export const browserAgent = new EMMAbrowserAgent();
export const memoryStore = new PatientMemoryStore();
export const selfImproveEngine = new EMMASelfImproveEngine();
export const outreachEngine = new EMMAOutreachEngine();
export const scheduleOptimizer = new EMMAScheduleOptimizer();
export const documentAuthor = new ClinicalDocumentAuthor();
export const healthMonitor = new EMMAHealthMonitor();

// ═══ COMMAND CENTRE STATUS (now async — reads from DB) ═══

export async function getSystemStatus() {
    const memStats = await memoryStore.getStats();
    const alerts = await healthMonitor.getActiveAlerts();
    const docs = await documentAuthor.getPendingReview();
    const campaigns = await outreachEngine.getCampaigns();
    const optimizations = await scheduleOptimizer.getOptimizations();
    const safetyResults = await selfImproveEngine.getLastResults();
    const browserSessions = await browserAgent.getSessions();

    return {
        agentExecutor: {
            toolCount: agentExecutor.getToolRegistry().length,
            status: 'ready',
        },
        browserAgent: {
            sessionCount: browserSessions.length,
            allowedDomains: 8,
            status: 'ready',
        },
        memory: {
            totalPatients: memStats.totalPatients,
            totalFacts: memStats.totalFacts,
            factsByLayer: memStats.factsByLayer,
            status: 'ready',
        },
        selfImprove: {
            testCaseCount: selfImproveEngine.getTestCases().length,
            lastRunResults: safetyResults.length,
            status: 'ready',
        },
        outreach: {
            campaignCount: campaigns.length,
            ruleCount: outreachEngine.getRules().length,
            status: 'ready',
        },
        schedule: {
            optimizationCount: optimizations.length,
            dnaFactors: 8,
            status: 'ready',
        },
        documents: {
            pendingReview: docs.length,
            totalDocuments: (await documentAuthor.getDocuments()).length,
            status: 'ready',
        },
        healthMonitor: {
            activeAlerts: alerts.length,
            criticalCount: alerts.filter(a => a.tier === 'CRITICAL').length,
            urgentCount: alerts.filter(a => a.tier === 'URGENT').length,
            readingTypes: healthMonitor.getAvailableReadingTypes().length,
            status: 'ready',
        },
    };
}
