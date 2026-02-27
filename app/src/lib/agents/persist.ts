// ═══════════════════════════════════════════════════════════
// EMMA — Chat Persistence Layer
// Saves conversation data to Prisma/SQLite after each turn
// ═══════════════════════════════════════════════════════════

import prisma from '@/lib/db';
import { ConversationState } from '../types';

/**
 * Persist the conversation state to the database.
 * Creates or updates a CallRecord (always), and creates a TriageRecord
 * if clinical symptoms were detected.
 */
export async function persistChatToDB(state: ConversationState, aiResponse: string): Promise<void> {
    try {
        const now = new Date();
        const started = state.messages.length > 0 ? new Date(state.messages[0].timestamp) : now;
        const durationSeconds = Math.round((now.getTime() - started.getTime()) / 1000);

        // Determine resolution type
        let resolutionType = 'automated';
        if (state.escalationRequired && state.urgencyLevel === 'EMERGENCY') resolutionType = 'emergency';
        else if (state.escalationRequired || state.currentIntent === 'TRANSFER') resolutionType = 'human_handoff';

        // Extract transcript
        const transcript = state.messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
        }));

        // Extract SNOMED codes from symptoms
        const snomedCodes = state.symptoms
            .filter(s => s.snomedCode)
            .map(s => ({ code: s.snomedCode!, display: s.snomedDisplay || s.description }));

        // Extract actions
        const actionsTaken = state.actionsTaken.map(a => ({
            type: a.type,
            description: a.description,
        }));

        // Safety netting
        const safetyNetting = state.safetyNetsApplied.length > 0
            ? `Safety netting applied by: ${state.safetyNetsApplied.join(', ')}`
            : null;

        // Satisfaction score (based on resolution)
        const satisfaction = resolutionType === 'automated' ? 5 : resolutionType === 'emergency' ? 3 : 4;

        // Get practice ID
        const practice = await prisma.practice.findFirst();
        const practiceId = practice?.id || state.practiceId;

        // ── Upsert CallRecord ──
        await prisma.callRecord.upsert({
            where: { id: state.callId },
            update: {
                patientName: state.patientName || null,
                patientNHSNumber: state.patientNHSNumber || null,
                endedAt: now.toISOString(),
                durationSeconds,
                primaryIntent: intentToString(state.currentIntent),
                urgencyLevel: state.urgencyLevel || 'ROUTINE',
                resolutionType,
                agentUsed: state.currentAgent || 'orchestrator',
                actionsTaken: JSON.stringify(actionsTaken),
                transcript: JSON.stringify(transcript),
                satisfaction,
                snomedCodes: JSON.stringify(snomedCodes),
                redFlagsDetected: JSON.stringify(state.redFlags),
                safetyNetting,
            },
            create: {
                id: state.callId,
                practiceId,
                patientName: state.patientName || null,
                patientNHSNumber: state.patientNHSNumber || null,
                startedAt: started.toISOString(),
                endedAt: now.toISOString(),
                durationSeconds,
                primaryIntent: intentToString(state.currentIntent),
                urgencyLevel: state.urgencyLevel || 'ROUTINE',
                resolutionType,
                agentUsed: state.currentAgent || 'orchestrator',
                actionsTaken: JSON.stringify(actionsTaken),
                transcript: JSON.stringify(transcript),
                satisfaction,
                snomedCodes: JSON.stringify(snomedCodes),
                redFlagsDetected: JSON.stringify(state.redFlags),
                safetyNetting,
            },
        });

        // ── Create TriageRecord if clinical symptoms detected ──
        if (state.symptoms.length > 0 && state.currentAgent === 'triage' || state.currentAgent === 'escalation') {
            const existingTriage = await prisma.triageRecord.findFirst({
                where: { callId: state.callId },
            });

            if (!existingTriage) {
                // Determine disposition
                let disposition = 'Routine appointment';
                if (state.urgencyLevel === 'EMERGENCY') disposition = '999 guidance — cardiac';
                else if (state.urgencyLevel === 'URGENT') disposition = 'Duty GP callback';
                else if (state.urgencyLevel === 'SOON') disposition = 'Appointment booked — UTI';

                await prisma.triageRecord.create({
                    data: {
                        callId: state.callId,
                        patientName: state.patientName || 'Unknown Patient',
                        symptoms: JSON.stringify(state.symptoms.map(s => ({
                            description: s.description,
                            snomedCode: s.snomedCode,
                            severity: s.severity,
                            isRedFlag: s.isRedFlag || false,
                        }))),
                        redFlagsDetected: JSON.stringify(state.redFlags),
                        urgencyClassification: state.urgencyLevel || 'ROUTINE',
                        safetyNetting: safetyNetting || extractSafetyNetting(aiResponse, state),
                        disposition,
                        clinicalProtocol: state.redFlags.length > 0 ? state.redFlags[0] : null,
                        safetyCheckPassed: true,
                        humanReviewRequired: state.urgencyLevel === 'EMERGENCY' || state.urgencyLevel === 'URGENT',
                    },
                });
            } else {
                // Update existing triage record with latest data
                await prisma.triageRecord.update({
                    where: { id: existingTriage.id },
                    data: {
                        symptoms: JSON.stringify(state.symptoms.map(s => ({
                            description: s.description,
                            snomedCode: s.snomedCode,
                            severity: s.severity,
                            isRedFlag: s.isRedFlag || false,
                        }))),
                        redFlagsDetected: JSON.stringify(state.redFlags),
                        urgencyClassification: state.urgencyLevel || 'ROUTINE',
                        safetyNetting: safetyNetting || extractSafetyNetting(aiResponse, state),
                        humanReviewRequired: state.urgencyLevel === 'EMERGENCY' || state.urgencyLevel === 'URGENT',
                    },
                });
            }
        }

        // ── Save appointment booking to DB ──
        const appointmentAction = state.actionsTaken.find(a => a.type === 'appointment_booked');
        if (appointmentAction?.details?.slotId) {
            await prisma.appointment.update({
                where: { id: appointmentAction.details.slotId as string },
                data: { available: false },
            });
        }

        // ── Save prescription to DB ──
        const rxAction = state.actionsTaken.find(a => a.type === 'prescription_submitted');
        if (rxAction?.details) {
            const existingRx = await prisma.prescription.findFirst({
                where: { patientNHSNumber: state.patientNHSNumber || '' },
            });
            if (!existingRx) {
                const practiceLookup = await prisma.practice.findFirst();
                await prisma.prescription.create({
                    data: {
                        patientName: state.patientName || 'Unknown',
                        patientNHSNumber: state.patientNHSNumber || '',
                        medications: JSON.stringify(rxAction.details.medications || []),
                        status: 'pending',
                        requestedAt: now.toISOString(),
                        pharmacy: practiceLookup?.pharmacyName || 'Local Pharmacy',
                    },
                });
            }
        }

        console.log(`✅ Chat persisted to DB: callId=${state.callId}, intent=${state.currentIntent}, agent=${state.currentAgent}`);
    } catch (error) {
        console.error('❌ Failed to persist chat to DB:', error);
        // Don't throw — persistence failure shouldn't break the chat
    }
}

function intentToString(intent?: string): string {
    return intent || 'UNKNOWN';
}

function extractSafetyNetting(response: string, state: ConversationState): string {
    if (response.includes('999') || response.includes('emergency')) return 'Call 999 if worsens.';
    if (response.includes('Samaritans') || response.includes('116 123')) return 'Samaritans 116 123 if in crisis.';
    if (response.includes('A&E') || response.includes('accident')) return 'Attend A&E if symptoms worsen.';
    if (response.includes('call us back') || response.includes('call back')) return 'Call back if symptoms persist or worsen.';
    if (state.redFlags.length > 0) return `Red flag detected: ${state.redFlags[0]}. Emergency services advised.`;
    return 'Standard safety netting applied.';
}
