// ═══════════════════════════════════════════════════════════════════════════════
// MASTER GRAPH — Unified State Machine connecting all 8 Superpowers
// LangGraph-style StateGraph with checkpoint support
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import {
    GraphNode, MasterGraphState, CommandCentreData, GraphNodeStatus,
} from '@/lib/types';
import { getDemoExecutionTraces } from './agent-executor';
import { getDemoBrowserSessions } from './browser-agent';
import { getDemoPatientMemories } from './memory-store';
import { getDemoPromptVersions, getDemoABTests } from './self-improve';
import { getDemoOutreachCampaigns, getDemoOutreachContacts } from './outreach';
import { getDemoScheduleOptimization, getDemoDNAPredictions } from './schedule-optimizer';
import { getDemoDocuments } from './document-author';
import { getDemoHealthAlerts, getDemoHealthReadings } from './health-monitor';

// ═══ GRAPH NODE DEFINITIONS ═══

const MASTER_NODES: { name: string; engine: string; description: string }[] = [
    { name: 'intake', engine: 'core', description: 'Receive and parse incoming message/event' },
    { name: 'memory_recall', engine: 'memory', description: 'Recall relevant patient memories and context' },
    { name: 'intent_classify', engine: 'core', description: 'Classify intent and extract entities' },
    { name: 'safety_check', engine: 'core', description: 'Run clinical safety protocols and red flag detection' },
    { name: 'triage', engine: 'agent-executor', description: 'Clinical triage assessment' },
    { name: 'agent_route', engine: 'agent-executor', description: 'Route to appropriate specialist agent' },
    { name: 'tool_execute', engine: 'agent-executor', description: 'Execute tool chain (up to 20 steps)' },
    { name: 'browser_act', engine: 'browser-agent', description: 'Browser automation for NHS systems' },
    { name: 'document_draft', engine: 'document-author', description: 'Draft clinical documents if needed' },
    { name: 'outreach_check', engine: 'outreach', description: 'Check if proactive outreach is needed' },
    { name: 'schedule_optimize', engine: 'schedule-optimizer', description: 'Optimize schedule if appointment-related' },
    { name: 'health_scan', engine: 'health-monitor', description: 'Process health data and check for alerts' },
    { name: 'self_improve_eval', engine: 'self-improve', description: 'Evaluate response quality for prompt improvement' },
    { name: 'snomed_extract', engine: 'core', description: 'Extract SNOMED CT codes from clinical text' },
    { name: 'urgency_assign', engine: 'core', description: 'Assign urgency level based on all signals' },
    { name: 'response_generate', engine: 'core', description: 'Generate final patient-facing response' },
    { name: 'memory_store', engine: 'memory', description: 'Store new facts extracted from conversation' },
    { name: 'audit_log', engine: 'core', description: 'Write comprehensive audit trail entry' },
    { name: 'checkpoint', engine: 'core', description: 'Save state checkpoint for recovery' },
    { name: 'notification', engine: 'core', description: 'Send notifications (SMS, GP tasks, alerts)' },
];

// ═══ MASTER GRAPH CLASS ═══

export class EMMAMasterGraph {
    private nodes = MASTER_NODES;

    getNodeDefinitions() { return this.nodes; }

    createGraph(callId: string): MasterGraphState {
        return {
            id: uuid(), callId,
            nodes: this.nodes.map((n, i) => ({
                id: `node-${uuid().slice(0, 8)}`, name: n.name, engine: n.engine,
                status: 'pending' as GraphNodeStatus,
            })),
            currentNode: 'intake',
            checkpointData: {},
            startedAt: new Date().toISOString(),
            status: 'running',
        };
    }

    async processNode(graph: MasterGraphState, nodeName: string): Promise<GraphNode> {
        const node = graph.nodes.find(n => n.name === nodeName);
        if (!node) throw new Error(`Node ${nodeName} not found`);

        node.status = 'active';
        node.startedAt = new Date().toISOString();

        // Simulate processing
        node.output = { processed: true, engine: node.engine, timestamp: new Date().toISOString() };
        node.status = 'completed';
        node.completedAt = new Date().toISOString();

        // Update current node pointer
        const idx = graph.nodes.findIndex(n => n.name === nodeName);
        if (idx < graph.nodes.length - 1) {
            graph.currentNode = graph.nodes[idx + 1].name;
        }

        return node;
    }

    getNextNode(graph: MasterGraphState, currentResult: unknown): string | null {
        const idx = graph.nodes.findIndex(n => n.name === graph.currentNode);
        if (idx >= graph.nodes.length - 1) return null;

        // Smart routing — skip irrelevant nodes
        const next = graph.nodes[idx + 1];
        return next.name;
    }

    checkpoint(graph: MasterGraphState): void {
        graph.checkpointData = {
            lastCheckpoint: new Date().toISOString(),
            completedNodes: graph.nodes.filter(n => n.status === 'completed').length,
            totalNodes: graph.nodes.length,
        };
    }
}

// ═══ AGGREGATED COMMAND CENTRE DATA ═══

export function getCommandCentreData(): CommandCentreData {
    const traces = getDemoExecutionTraces();
    const browserSessions = getDemoBrowserSessions();
    const memories = getDemoPatientMemories();
    const promptVersions = getDemoPromptVersions();
    const abTests = getDemoABTests();
    const campaigns = getDemoOutreachCampaigns();
    const contacts = getDemoOutreachContacts();
    const scheduleOpt = getDemoScheduleOptimization();
    const dnaPredictions = getDemoDNAPredictions();
    const documents = getDemoDocuments();
    const healthAlerts = getDemoHealthAlerts();
    const healthReadings = getDemoHealthReadings();

    return {
        agentExecutor: {
            activeTraces: traces,
            totalExecutions: 1847,
            avgStepsPerTask: 4.2,
            successRate: 0.967,
        },
        browserAgent: {
            activeSessions: browserSessions,
            totalSessions: 234,
            successRate: 0.942,
        },
        memory: {
            totalPatients: memories.length,
            totalFacts: memories.reduce((sum, m) => sum + m.facts.length, 0),
            factsByLayer: {
                working: 4,
                episodic: memories.reduce((sum, m) => sum + m.facts.filter(f => f.layer === 'episodic').length, 0),
                semantic: 5,
                procedural: 3,
            },
            recentFacts: memories.flatMap(m => m.facts).filter(f => f.layer === 'episodic').slice(0, 5),
        },
        selfImprove: {
            currentVersions: promptVersions,
            activeTests: abTests.filter(t => !t.completedAt),
            totalImprovements: 23,
            safetyGateStatus: 'passing',
        },
        outreach: {
            activeCampaigns: campaigns,
            todayContacted: contacts.filter(c => c.sentAt).length,
            todayResponded: contacts.filter(c => c.respondedAt).length,
            todayBooked: contacts.filter(c => c.status === 'booked').length,
        },
        schedule: {
            todayOptimization: scheduleOpt,
            predictedDNAs: dnaPredictions,
            gapsFilled: scheduleOpt.gapsFilled,
        },
        documents: {
            pendingReview: documents.filter(d => d.status === 'AWAITING_GP_REVIEW'),
            todayDrafted: 3,
            todayApproved: 1,
        },
        healthMonitor: {
            activeAlerts: healthAlerts,
            criticalCount: healthAlerts.filter(a => a.tier === 'CRITICAL').length,
            urgentCount: healthAlerts.filter(a => a.tier === 'URGENT').length,
            monitorCount: healthAlerts.filter(a => a.tier === 'MONITOR').length,
            recentReadings: healthReadings,
        },
        masterGraph: {
            activeGraphs: [],
            totalProcessed: 3247,
            avgProcessingMs: 1420,
        },
    };
}
