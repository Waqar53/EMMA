// ═══════════════════════════════════════════════════════════════════════════════
// EMMA SMS Webhook — Twilio inbound SMS/WhatsApp handler
//
// Patients can reply to EMMA's messages:
//   YES    → Auto-book next available appointment
//   CANCEL → Cancel upcoming appointment
//   GOOD/SAME/WORSE → Post-appointment check-in responses
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseInboundWebhook } from '@/lib/comms/twilio';
import { sendSMS } from '@/lib/comms/twilio';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const body: Record<string, string> = {};
        formData.forEach((value, key) => { body[key] = String(value); });

        const msg = parseInboundWebhook(body);

        // Find patient by phone number
        let phone = msg.from.replace(/\s+/g, '');
        if (phone.startsWith('+44')) phone = '0' + phone.slice(3);

        const patient = await prisma.patient.findFirst({
            where: { phone: { contains: phone.slice(-10) } },
        });

        const reply = msg.body.trim().toUpperCase();
        let responseText = '';

        const practice = await prisma.practice.findFirst();
        const practiceName = practice?.name || 'your GP surgery';

        // ── Handle Replies ──

        if (reply === 'YES' || reply === 'BOOK') {
            // Auto-book next available routine appointment
            if (patient) {
                const slot = await prisma.appointment.findFirst({
                    where: { available: true, slotType: 'routine' },
                    orderBy: { date: 'asc' },
                });

                if (slot) {
                    await prisma.appointment.update({
                        where: { id: slot.id },
                        data: { available: false, patientId: patient.id, bookedReason: 'Booked via SMS reply' },
                    });
                    responseText = `Booked! ${slot.clinicianName} on ${slot.date} at ${slot.time}. Reply CANCEL to cancel.`;
                } else {
                    responseText = `Sorry, no slots available right now. Please call ${practiceName} to book.`;
                }
            } else {
                responseText = `We couldn't find your details. Please call ${practiceName} to book.`;
            }
        }

        else if (reply === 'CANCEL') {
            if (patient) {
                const upcoming = await prisma.appointment.findFirst({
                    where: { patientId: patient.id, available: false },
                    orderBy: { date: 'desc' },
                });
                if (upcoming) {
                    await prisma.appointment.update({
                        where: { id: upcoming.id },
                        data: { available: true, bookedReason: 'CANCELLED: Patient cancelled via SMS' },
                    });
                    responseText = `Your appointment on ${upcoming.date} has been cancelled. Reply YES to rebook.`;
                } else {
                    responseText = `We couldn't find an upcoming appointment. Call ${practiceName} for help.`;
                }
            } else {
                responseText = `We couldn't find your details. Please call ${practiceName}.`;
            }
        }

        else if (reply === 'GOOD' || reply === 'BETTER') {
            responseText = `Great to hear you're feeling well! Take care. — EMMA at ${practiceName}`;
            if (patient) {
                await prisma.memoryFact.create({
                    data: {
                        patientId: patient.id,
                        patientNHSNumber: patient.nhsNumber,
                        layer: 'episodic',
                        category: 'checkin_response',
                        fact: `Post-appointment check-in: Patient reported feeling GOOD`,
                        confidence: 1.0,
                        source: 'sms_checkin',
                        extractedAt: new Date().toISOString(),
                        lastAccessedAt: new Date().toISOString(),
                    },
                });
            }
        }

        else if (reply === 'SAME') {
            responseText = `Thanks for letting us know. If things don't improve in a few days, give us a call. — EMMA at ${practiceName}`;
            if (patient) {
                await prisma.memoryFact.create({
                    data: {
                        patientId: patient.id,
                        patientNHSNumber: patient.nhsNumber,
                        layer: 'episodic',
                        category: 'checkin_response',
                        fact: `Post-appointment check-in: Patient reported feeling the SAME`,
                        confidence: 1.0,
                        source: 'sms_checkin',
                        extractedAt: new Date().toISOString(),
                        lastAccessedAt: new Date().toISOString(),
                    },
                });
            }
        }

        else if (reply === 'WORSE') {
            responseText = `I'm sorry to hear that. I'm flagging this for your GP to review today. If you feel seriously unwell, please call 999 or go to A&E. — EMMA`;
            if (patient) {
                await prisma.healthAlert.create({
                    data: {
                        patientId: patient.id,
                        patientNHSNumber: patient.nhsNumber,
                        patientName: `${patient.firstName} ${patient.lastName}`,
                        tier: 'URGENT',
                        type: 'checkin_deterioration',
                        description: `Patient reports feeling WORSE after appointment`,
                        context: `Post-appointment SMS check-in response`,
                        recommendedAction: 'GP callback needed — patient deteriorating post-appointment',
                    },
                });
            }
        }

        else if (reply === 'DIFFERENT' || reply === 'CHANGE') {
            responseText = `No problem. Call ${practiceName} to pick a different time, or reply with your preferred day (e.g. "MONDAY" or "THURSDAY").`;
        }

        else {
            // Generic — could be free-text symptoms or questions
            responseText = `Thanks for your message. For urgent help, call 999. To book or ask a question, call ${practiceName} or visit our website. — EMMA`;
        }

        // Send reply
        if (responseText) {
            await sendSMS(msg.from, responseText);
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                eventType: 'sms_webhook',
                severity: 'INFO',
                practiceId: 'prac-001',
                patientNHSNumber: patient?.nhsNumber || '',
                agentName: 'cortex',
                action: `SMS_REPLY: ${reply}`,
                details: JSON.stringify({
                    from: msg.from,
                    body: msg.body,
                    channel: msg.channel,
                    response: responseText,
                    patientFound: !!patient,
                }),
                result: 'SUCCESS',
            },
        });

        // Twilio expects TwiML response
        return new NextResponse(
            `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
            { headers: { 'Content-Type': 'text/xml' } },
        );
    } catch (error) {
        console.error('SMS webhook error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
