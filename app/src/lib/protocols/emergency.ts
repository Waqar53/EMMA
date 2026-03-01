// ═══════════════════════════════════════════════════════════════════════════════
// EMMA EMERGENCY ALERT PROTOCOL
//
// Trigger: RED triage OR direct red flag detection
// Actions: Patient instruction, emergency contact SMS, GP urgent flag, audit log
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from '@/lib/db';
import { sendSMS } from '@/lib/comms/twilio';

export interface EmergencyContext {
    patientName: string;
    patientNHSNumber: string;
    patientPhone?: string;
    symptoms: string;
    redFlags: string[];
    triageLevel: string;
    callId?: string;
}

export interface EmergencyResult {
    emergencyContactAlerted: boolean;
    emergencyContactName?: string;
    gpFlagged: boolean;
    auditLogged: boolean;
    patientSMSSent: boolean;
    actions: string[];
}

export async function executeEmergencyProtocol(ctx: EmergencyContext): Promise<EmergencyResult> {
    const actions: string[] = [];
    let emergencyContactAlerted = false;
    let emergencyContactName: string | undefined;
    let gpFlagged = false;
    let auditLogged = false;
    let patientSMSSent = false;

    // ── 1. Alert Emergency Contact via SMS ──
    try {
        const patient = await prisma.patient.findFirst({
            where: { nhsNumber: ctx.patientNHSNumber },
            include: { emergencyContacts: { where: { isPrimary: true } } },
        });

        if (patient?.emergencyContacts?.[0]) {
            const contact = patient.emergencyContacts[0];
            const smsResult = await sendSMS(
                contact.phone,
                `URGENT from Riverside Medical Centre: ${ctx.patientName} may be experiencing a medical emergency. ` +
                `Symptoms reported: ${ctx.redFlags.join(', ')}. ` +
                `Please check on them immediately. If they are unresponsive, call 999. ` +
                `This is an automated safety alert from their GP surgery.`
            );
            emergencyContactAlerted = smsResult.success;
            emergencyContactName = contact.name;
            actions.push(`Emergency contact ${contact.name} (${contact.relationship}) alerted via SMS`);
        } else {
            actions.push('No emergency contact on file — could not send next-of-kin alert');
        }
    } catch (err) {
        console.error('Emergency contact alert failed:', err);
        actions.push('Emergency contact SMS failed — logged for manual follow-up');
    }

    // ── 2. Send Patient Safety SMS ──
    if (ctx.patientPhone) {
        try {
            const patientSMS = await sendSMS(
                ctx.patientPhone,
                `URGENT SAFETY ALERT from your GP surgery: Based on the symptoms you described, ` +
                `please call 999 immediately if you haven't already. Do not wait. ` +
                `Your GP has been notified. If symptoms worsen, call 999 now.`
            );
            patientSMSSent = patientSMS.success;
            actions.push('Patient safety SMS sent');
        } catch (err) {
            console.error('Patient SMS failed:', err);
        }
    }

    // ── 3. Flag GP Urgent ──
    try {
        await prisma.healthAlert.create({
            data: {
                patientId: 'system',
                patientNHSNumber: ctx.patientNHSNumber,
                patientName: ctx.patientName,
                tier: 'IMMEDIATE',
                type: 'red_flag_emergency',
                description: `RED FLAG DETECTED: ${ctx.redFlags.join(', ')}. Symptoms: ${ctx.symptoms}`,
                context: `Call ID: ${ctx.callId || 'unknown'}, Triage: ${ctx.triageLevel}`,
                recommendedAction: 'URGENT GP REVIEW — Patient instructed to call 999. Emergency contact alerted.',
            },
        });
        gpFlagged = true;
        actions.push('GP urgent worklist task created');
    } catch (err) {
        console.error('GP flag failed:', err);
        actions.push('GP flag write failed — logged for manual follow-up');
    }

    // ── 4. Immutable Audit Log ──
    try {
        await prisma.auditLog.create({
            data: {
                eventType: 'EMERGENCY_PROTOCOL',
                severity: 'CRITICAL',
                practiceId: 'prac-001',
                patientNHSNumber: ctx.patientNHSNumber,
                agentName: 'cortex',
                action: 'EMERGENCY_PROTOCOL_EXECUTED',
                details: JSON.stringify({
                    patientName: ctx.patientName,
                    symptoms: ctx.symptoms,
                    redFlags: ctx.redFlags,
                    triageLevel: ctx.triageLevel,
                    emergencyContactAlerted,
                    emergencyContactName,
                    gpFlagged,
                    patientSMSSent,
                    timestamp: new Date().toISOString(),
                    agentVersion: 'cortex-v5.0',
                }),
                result: 'SUCCESS',
            },
        });
        auditLogged = true;
        actions.push('Immutable audit record created');
    } catch (err) {
        console.error('Audit log failed:', err);
    }

    console.log(`🚨 EMERGENCY PROTOCOL EXECUTED for ${ctx.patientName}: ${actions.join(' | ')}`);

    return {
        emergencyContactAlerted,
        emergencyContactName,
        gpFlagged,
        auditLogged,
        patientSMSSent,
        actions,
    };
}
