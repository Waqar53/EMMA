// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 1 — AUTONOMOUS MULTI-STEP EXECUTION ENGINE
// ReAct Agent with 17-tool registry, up to 20 chained tool calls per task
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import {
    ToolDefinition, ExecutionStep, ExecutionTrace, ToolStatus,
} from '@/lib/types';

// ═══ TOOL REGISTRY — 17 tools across 6 categories ═══

const TOOL_REGISTRY: ToolDefinition[] = [
    // Patient
    { name: 'lookupPatient', description: 'Look up patient record by NHS number, name, or DOB', category: 'patient', parameters: [{ name: 'query', type: 'string', required: true, description: 'NHS number, name, or DOB' }], requiresPatientVerification: false },
    { name: 'verifyIdentity', description: 'Verify patient identity using 3-point check (name + DOB + NHS number)', category: 'patient', parameters: [{ name: 'nhsNumber', type: 'string', required: true, description: 'NHS number' }, { name: 'dob', type: 'string', required: true, description: 'Date of birth' }], requiresPatientVerification: false },
    { name: 'getPatientHistory', description: 'Retrieve full patient interaction history and medical timeline', category: 'patient', parameters: [{ name: 'nhsNumber', type: 'string', required: true, description: 'NHS number' }], requiresPatientVerification: true },

    // Appointments
    { name: 'checkSlots', description: 'Query available appointment slots by date, clinician type, and urgency', category: 'appointment', parameters: [{ name: 'date', type: 'string', required: false, description: 'Date (YYYY-MM-DD)' }, { name: 'clinicianType', type: 'string', required: false, description: 'GP, nurse, etc.' }, { name: 'urgency', type: 'string', required: false, description: 'EMERGENCY|URGENT|SOON|ROUTINE' }], requiresPatientVerification: false },
    { name: 'bookAppointment', description: 'Book an appointment slot for a verified patient', category: 'appointment', parameters: [{ name: 'slotId', type: 'string', required: true, description: 'Slot ID' }, { name: 'nhsNumber', type: 'string', required: true, description: 'Patient NHS number' }, { name: 'reason', type: 'string', required: true, description: 'Booking reason' }], requiresPatientVerification: true },
    { name: 'cancelAppointment', description: 'Cancel an existing appointment and release the slot', category: 'appointment', parameters: [{ name: 'appointmentId', type: 'string', required: true, description: 'Appointment ID' }, { name: 'reason', type: 'string', required: true, description: 'Cancellation reason' }], requiresPatientVerification: true },

    // Clinical
    { name: 'triagePatient', description: 'Run clinical triage assessment on reported symptoms', category: 'clinical', parameters: [{ name: 'symptoms', type: 'string', required: true, description: 'Patient-reported symptoms' }, { name: 'nhsNumber', type: 'string', required: false, description: 'NHS number for context' }], requiresPatientVerification: false },
    { name: 'verifySNOMED', description: 'Extract and verify SNOMED CT codes from clinical text', category: 'clinical', parameters: [{ name: 'text', type: 'string', required: true, description: 'Clinical text to code' }], requiresPatientVerification: false },
    { name: 'checkSafetyFlags', description: 'Run red flag detection against known clinical safety protocols', category: 'clinical', parameters: [{ name: 'symptoms', type: 'string', required: true, description: 'Symptoms to check' }, { name: 'history', type: 'string', required: false, description: 'Relevant patient history' }], requiresPatientVerification: false },
    { name: 'lookupTestResults', description: 'Retrieve pending or recent test results for a patient', category: 'clinical', parameters: [{ name: 'nhsNumber', type: 'string', required: true, description: 'NHS number' }], requiresPatientVerification: true },
    { name: 'submitPrescription', description: 'Submit a repeat prescription request for processing', category: 'clinical', parameters: [{ name: 'nhsNumber', type: 'string', required: true, description: 'NHS number' }, { name: 'medications', type: 'string', required: true, description: 'Comma-separated medication names' }], requiresPatientVerification: true },

    // Communication
    { name: 'sendSMS', description: 'Send an SMS notification to a patient (appointment confirmation, reminders)', category: 'communication', parameters: [{ name: 'nhsNumber', type: 'string', required: true, description: 'NHS number' }, { name: 'message', type: 'string', required: true, description: 'SMS content' }], requiresPatientVerification: true },
    { name: 'scheduleCallback', description: 'Schedule a GP callback for the patient', category: 'communication', parameters: [{ name: 'nhsNumber', type: 'string', required: true, description: 'NHS number' }, { name: 'reason', type: 'string', required: true, description: 'Callback reason' }, { name: 'urgency', type: 'string', required: true, description: 'Priority level' }], requiresPatientVerification: true },
    { name: 'escalateToHuman', description: 'Transfer conversation to a human receptionist or duty GP', category: 'communication', parameters: [{ name: 'reason', type: 'string', required: true, description: 'Escalation reason' }, { name: 'urgency', type: 'string', required: true, description: 'Priority level' }], requiresPatientVerification: false },

    // Admin
    { name: 'queryKnowledgeBase', description: 'Search practice knowledge base for protocols, FAQs, and policies', category: 'admin', parameters: [{ name: 'query', type: 'string', required: true, description: 'Search query' }], requiresPatientVerification: false },
    { name: 'writeAuditLog', description: 'Write an entry to the clinical audit trail', category: 'admin', parameters: [{ name: 'event', type: 'string', required: true, description: 'Event description' }, { name: 'severity', type: 'string', required: true, description: 'INFO|WARNING|CRITICAL' }], requiresPatientVerification: false },

    // Document
    { name: 'generateDocument', description: 'Draft a clinical document (referral, fit note, 2WW)', category: 'document', parameters: [{ name: 'type', type: 'string', required: true, description: 'referral_letter|fit_note|two_week_wait' }, { name: 'nhsNumber', type: 'string', required: true, description: 'NHS number' }, { name: 'details', type: 'string', required: true, description: 'Document context and details' }], requiresPatientVerification: true },
];

// ═══ TOOL EXECUTION SIMULATORS ═══

const TOOL_SIMULATORS: Record<string, (params: Record<string, unknown>) => unknown> = {
    lookupPatient: (p) => ({
        found: true, nhsNumber: '193 482 9103', name: 'Sarah Jenkins',
        dob: '1990-03-15', registeredPractice: 'Riverside Medical Centre',
        allergies: ['Penicillin'], medications: ['Salbutamol 100mcg inhaler'],
    }),
    verifyIdentity: () => ({ verified: true, method: '3-point-check', confidence: 0.98 }),
    getPatientHistory: () => ({
        interactions: 12, lastVisit: '2026-02-20', conditions: ['Asthma', 'Anxiety'],
        recentSymptoms: ['Shortness of breath', 'Chest tightness'],
    }),
    checkSlots: () => ([
        { id: 'slot-001', date: '2026-02-28', time: '09:00', clinician: 'Dr. Patel', type: 'GP' },
        { id: 'slot-002', date: '2026-02-28', time: '11:30', clinician: 'Dr. Khan', type: 'GP' },
        { id: 'slot-003', date: '2026-03-01', time: '08:30', clinician: 'Nurse Williams', type: 'Practice Nurse' },
    ]),
    bookAppointment: (p) => ({ booked: true, slotId: p.slotId, confirmationRef: `BK-${uuid().slice(0, 8).toUpperCase()}` }),
    cancelAppointment: (p) => ({ cancelled: true, appointmentId: p.appointmentId, slotReleased: true }),
    triagePatient: (p) => ({
        urgency: 'SOON', agent: 'triage', redFlags: [],
        snomedCodes: [{ code: '195967001', display: 'Asthma' }],
        recommendation: 'GP appointment within 48 hours',
    }),
    verifySNOMED: (p) => ({
        codes: [{ code: '29857009', display: 'Chest pain', isRedFlag: false }],
        confidence: 0.92,
    }),
    checkSafetyFlags: () => ({ redFlags: [], safetyNets: ['Worsening symptoms → urgent review'], safe: true }),
    lookupTestResults: () => ([
        { testType: 'FBC', date: '2026-02-22', status: 'normal', summary: 'All values within normal range' },
    ]),
    submitPrescription: (p) => ({ submitted: true, prescriptionId: `RX-${uuid().slice(0, 6).toUpperCase()}`, turnaround: '48 hours' }),
    sendSMS: (p) => ({ sent: true, messageId: `SMS-${uuid().slice(0, 6)}`, deliveredAt: new Date().toISOString() }),
    scheduleCallback: (p) => ({ scheduled: true, callbackId: `CB-${uuid().slice(0, 6)}`, estimatedTime: '2 hours' }),
    escalateToHuman: (p) => ({ escalated: true, queuePosition: 1, estimatedWait: '3 minutes' }),
    queryKnowledgeBase: (p) => ({ results: [{ title: 'Asthma Management Protocol', relevance: 0.95, content: 'Follow BTS/SIGN guidelines...' }] }),
    writeAuditLog: (p) => ({ logged: true, logId: `AL-${uuid().slice(0, 8)}`, timestamp: new Date().toISOString() }),
    generateDocument: (p) => ({
        documentId: `DOC-${uuid().slice(0, 8)}`, status: 'AWAITING_GP_REVIEW',
        type: p.type, preview: `Dear Colleague, I am writing to refer...`,
    }),
};

// ═══ AGENT EXECUTOR CLASS ═══

export class EMMAAgentExecutor {
    private maxSteps = 20;
    private registry = TOOL_REGISTRY;

    getToolRegistry(): ToolDefinition[] { return this.registry; }

    async planExecution(triggerMessage: string): Promise<string[]> {
        const lowerMsg = triggerMessage.toLowerCase();
        const plan: string[] = [];

        // Determine execution plan based on message analysis
        if (lowerMsg.includes('chest pain') || lowerMsg.includes('emergency')) {
            plan.push('checkSafetyFlags', 'triagePatient', 'verifySNOMED', 'escalateToHuman', 'writeAuditLog');
        } else if (lowerMsg.includes('appointment') || lowerMsg.includes('book')) {
            plan.push('lookupPatient', 'verifyIdentity', 'checkSlots', 'bookAppointment', 'sendSMS', 'writeAuditLog');
        } else if (lowerMsg.includes('prescription') || lowerMsg.includes('medication')) {
            plan.push('lookupPatient', 'verifyIdentity', 'getPatientHistory', 'submitPrescription', 'sendSMS', 'writeAuditLog');
        } else if (lowerMsg.includes('test result') || lowerMsg.includes('blood test')) {
            plan.push('lookupPatient', 'verifyIdentity', 'lookupTestResults', 'writeAuditLog');
        } else if (lowerMsg.includes('referral') || lowerMsg.includes('refer')) {
            plan.push('lookupPatient', 'verifyIdentity', 'getPatientHistory', 'triagePatient', 'verifySNOMED', 'generateDocument', 'writeAuditLog');
        } else if (lowerMsg.includes('cancel')) {
            plan.push('lookupPatient', 'verifyIdentity', 'cancelAppointment', 'writeAuditLog');
        } else {
            plan.push('queryKnowledgeBase', 'writeAuditLog');
        }
        return plan;
    }

    async executeStep(toolName: string, stepNumber: number, context: Record<string, unknown>): Promise<ExecutionStep> {
        const stepId = uuid();
        const startedAt = new Date().toISOString();
        const step: ExecutionStep = {
            id: stepId, stepNumber, toolName, parameters: context,
            status: 'running' as ToolStatus, startedAt,
            reasoning: `Executing ${toolName} as step ${stepNumber} in the autonomous pipeline`,
        };

        try {
            const simulator = TOOL_SIMULATORS[toolName];
            if (!simulator) throw new Error(`Unknown tool: ${toolName}`);

            // Simulate execution latency
            const result = simulator(context);
            const completedAt = new Date().toISOString();
            step.status = 'success';
            step.result = result;
            step.completedAt = completedAt;
            step.durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
        } catch (error) {
            step.status = 'failed';
            step.error = error instanceof Error ? error.message : 'Unknown error';
            step.completedAt = new Date().toISOString();
        }
        return step;
    }

    async execute(triggerMessage: string, callId: string, nhsNumber?: string): Promise<ExecutionTrace> {
        const traceId = uuid();
        const plan = await this.planExecution(triggerMessage);
        const trace: ExecutionTrace = {
            id: traceId, callId, patientNHSNumber: nhsNumber,
            triggerMessage, plan, steps: [],
            status: 'executing', totalSteps: plan.length,
            completedSteps: 0, startedAt: new Date().toISOString(),
        };

        const context: Record<string, unknown> = { triggerMessage, nhsNumber };

        for (let i = 0; i < Math.min(plan.length, this.maxSteps); i++) {
            const step = await this.executeStep(plan[i], i + 1, context);
            trace.steps.push(step);

            if (step.status === 'success' && step.result) {
                Object.assign(context, typeof step.result === 'object' ? step.result : { [`${plan[i]}_result`]: step.result });
            }

            trace.completedSteps = i + 1;

            if (step.status === 'failed') {
                trace.status = 'failed';
                break;
            }
        }

        if (trace.status !== 'failed') trace.status = 'completed';
        trace.completedAt = new Date().toISOString();
        trace.totalDurationMs = new Date(trace.completedAt).getTime() - new Date(trace.startedAt).getTime();
        return trace;
    }
}

// ═══ DEMO DATA ═══

export function getDemoExecutionTraces(): ExecutionTrace[] {
    const executor = new EMMAAgentExecutor();
    const now = new Date();

    return [
        {
            id: 'trace-001', callId: 'call-demo-001', patientNHSNumber: '193 482 9103',
            triggerMessage: "I've been having chest pains and my left arm is tingling",
            plan: ['checkSafetyFlags', 'triagePatient', 'verifySNOMED', 'escalateToHuman', 'writeAuditLog'],
            steps: [
                { id: 's1', stepNumber: 1, toolName: 'checkSafetyFlags', parameters: { symptoms: 'chest pain, arm tingling' }, status: 'success', result: { redFlags: ['Cardiac: chest pain with arm radiation'], safe: false }, startedAt: new Date(now.getTime() - 4200).toISOString(), completedAt: new Date(now.getTime() - 4050).toISOString(), durationMs: 150, reasoning: 'Priority safety check for reported symptoms' },
                { id: 's2', stepNumber: 2, toolName: 'triagePatient', parameters: { symptoms: 'chest pain, arm tingling' }, status: 'success', result: { urgency: 'EMERGENCY', redFlags: ['Cardiac emergency'], snomedCodes: [{ code: '29857009', display: 'Chest pain' }] }, startedAt: new Date(now.getTime() - 4050).toISOString(), completedAt: new Date(now.getTime() - 3800).toISOString(), durationMs: 250, reasoning: 'Clinical triage assessment' },
                { id: 's3', stepNumber: 3, toolName: 'verifySNOMED', parameters: { text: 'chest pain arm tingling' }, status: 'success', result: { codes: [{ code: '29857009', display: 'Chest pain' }, { code: '102556003', display: 'Upper limb pain' }] }, startedAt: new Date(now.getTime() - 3800).toISOString(), completedAt: new Date(now.getTime() - 3650).toISOString(), durationMs: 150, reasoning: 'Extract SNOMED codes for audit' },
                { id: 's4', stepNumber: 4, toolName: 'escalateToHuman', parameters: { reason: 'Cardiac emergency - chest pain with arm radiation', urgency: 'EMERGENCY' }, status: 'success', result: { escalated: true, queuePosition: 1 }, startedAt: new Date(now.getTime() - 3650).toISOString(), completedAt: new Date(now.getTime() - 3500).toISOString(), durationMs: 150, reasoning: 'Immediate escalation for cardiac red flag' },
                { id: 's5', stepNumber: 5, toolName: 'writeAuditLog', parameters: { event: 'Emergency escalation: cardiac red flag', severity: 'CRITICAL' }, status: 'success', result: { logged: true }, startedAt: new Date(now.getTime() - 3500).toISOString(), completedAt: new Date(now.getTime() - 3400).toISOString(), durationMs: 100, reasoning: 'Audit trail for clinical governance' },
            ],
            status: 'completed', totalSteps: 5, completedSteps: 5,
            startedAt: new Date(now.getTime() - 4200).toISOString(), completedAt: new Date(now.getTime() - 3400).toISOString(), totalDurationMs: 800,
        },
        {
            id: 'trace-002', callId: 'call-demo-002', patientNHSNumber: '482 190 3847',
            triggerMessage: "I need to book a GP appointment for a general check-up",
            plan: ['lookupPatient', 'verifyIdentity', 'checkSlots', 'bookAppointment', 'sendSMS', 'writeAuditLog'],
            steps: [
                { id: 's6', stepNumber: 1, toolName: 'lookupPatient', parameters: { query: '482 190 3847' }, status: 'success', result: { found: true, name: 'Robert Thompson' }, startedAt: new Date(now.getTime() - 60000).toISOString(), completedAt: new Date(now.getTime() - 59800).toISOString(), durationMs: 200, reasoning: 'Look up patient record' },
                { id: 's7', stepNumber: 2, toolName: 'verifyIdentity', parameters: { nhsNumber: '482 190 3847', dob: '1968-11-22' }, status: 'success', result: { verified: true }, startedAt: new Date(now.getTime() - 59800).toISOString(), completedAt: new Date(now.getTime() - 59600).toISOString(), durationMs: 200, reasoning: '3-point identity verification' },
                { id: 's8', stepNumber: 3, toolName: 'checkSlots', parameters: { clinicianType: 'GP', urgency: 'ROUTINE' }, status: 'success', result: [{ id: 'slot-001', date: '2026-02-28', time: '09:00' }], startedAt: new Date(now.getTime() - 59600).toISOString(), completedAt: new Date(now.getTime() - 59300).toISOString(), durationMs: 300, reasoning: 'Find available routine GP slots' },
                { id: 's9', stepNumber: 4, toolName: 'bookAppointment', parameters: { slotId: 'slot-001', nhsNumber: '482 190 3847', reason: 'General check-up' }, status: 'success', result: { booked: true, confirmationRef: 'BK-A1B2C3D4' }, startedAt: new Date(now.getTime() - 59300).toISOString(), completedAt: new Date(now.getTime() - 59000).toISOString(), durationMs: 300, reasoning: 'Book the earliest available slot' },
                { id: 's10', stepNumber: 5, toolName: 'sendSMS', parameters: { nhsNumber: '482 190 3847', message: 'Appointment confirmed: Dr. Patel, 28 Feb 09:00. Ref: BK-A1B2C3D4' }, status: 'success', result: { sent: true }, startedAt: new Date(now.getTime() - 59000).toISOString(), completedAt: new Date(now.getTime() - 58800).toISOString(), durationMs: 200, reasoning: 'Send SMS confirmation' },
                { id: 's11', stepNumber: 6, toolName: 'writeAuditLog', parameters: { event: 'Appointment booked: BK-A1B2C3D4', severity: 'INFO' }, status: 'success', result: { logged: true }, startedAt: new Date(now.getTime() - 58800).toISOString(), completedAt: new Date(now.getTime() - 58700).toISOString(), durationMs: 100, reasoning: 'Log booking event for audit' },
            ],
            status: 'completed', totalSteps: 6, completedSteps: 6,
            startedAt: new Date(now.getTime() - 60000).toISOString(), completedAt: new Date(now.getTime() - 58700).toISOString(), totalDurationMs: 1300,
        },
    ];
}
