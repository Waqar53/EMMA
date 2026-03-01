// ═══════════════════════════════════════════════════════════════════════════════
// EMMA PROACTIVE SCHEDULER — Recall Campaigns + Post-Appointment Check-ins
//
// Runs daily at 7am (node-cron) or via manual trigger at /api/scheduler/run.
// Handles: recall identification, outreach SMS, check-in scheduling.
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from '@/lib/db';
import { sendSMS } from '@/lib/comms/twilio';

// ── Types ──

interface RecallRule {
    type: string;
    description: string;
    ageRange?: [number, number];
    condition?: string;
    intervalMonths: number;
    smsTemplate: (name: string, practice: string) => string;
    duration: string;
    reason: string;
}

// ── NHS Recall Rules ──

const RECALL_RULES: RecallRule[] = [
    {
        type: 'diabetic_review',
        description: 'Annual diabetic review',
        condition: 'diabetes',
        intervalMonths: 12,
        duration: '20 minutes',
        reason: 'helps us keep your diabetes well managed',
        smsTemplate: (name, practice) =>
            `Hi ${name}, this is EMMA from ${practice}. You're due for your annual diabetic review. It takes 20 mins and helps us keep your diabetes well managed. Reply YES to book the next available slot or CALL to speak to us.`,
    },
    {
        type: 'copd_review',
        description: 'Annual COPD review',
        condition: 'copd',
        intervalMonths: 12,
        duration: '30 minutes',
        reason: 'keeps your lungs monitored and your inhalers correct',
        smsTemplate: (name, practice) =>
            `Hi ${name}, EMMA from ${practice} here. Your annual COPD review is due. It takes 30 mins and keeps your lungs monitored. Reply YES to book or CALL to speak to us.`,
    },
    {
        type: 'bp_check',
        description: 'Blood pressure check for hypertension patients',
        condition: 'hypertension',
        intervalMonths: 6,
        duration: '10 minutes',
        reason: 'keeps your blood pressure monitored',
        smsTemplate: (name, practice) =>
            `Hi ${name}, EMMA from ${practice}. You're due for a blood pressure check. It only takes 10 mins. Reply YES to book or CALL to speak to us.`,
    },
    {
        type: 'medication_review',
        description: 'Medication review for patients on repeat prescriptions',
        intervalMonths: 12,
        duration: '15 minutes',
        reason: 'makes sure your medications are working well for you',
        smsTemplate: (name, practice) =>
            `Hi ${name}, EMMA from ${practice}. You're due for a medication review — it helps us make sure your prescriptions are right for you. Reply YES to book a 15-min appointment.`,
    },
    {
        type: 'nhs_health_check',
        description: 'NHS Health Check (40-74 year olds, every 5 years)',
        ageRange: [40, 74],
        intervalMonths: 60,
        duration: '30 minutes',
        reason: 'checks your heart health, diabetes risk, and more — it\'s free',
        smsTemplate: (name, practice) =>
            `Hi ${name}, you're eligible for a free NHS Health Check at ${practice}. It takes 30 mins and checks your heart health, diabetes risk, and more. Reply YES to book.`,
    },
];

// ═══════════════════════════════════════════════════════════
// 1. Run All Recalls
// ═══════════════════════════════════════════════════════════

export async function runRecallCampaigns(): Promise<{
    processed: number;
    recalled: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let recalled = 0;

    const patients = await prisma.patient.findMany({
        include: { recallCampaigns: true, memoryFacts: true },
    });

    const practice = await prisma.practice.findFirst();
    const practiceName = practice?.name || 'your GP surgery';

    for (const patient of patients) {
        const medications = JSON.parse(patient.medications || '[]');
        const conditions = (patient.memoryFacts || [])
            .filter(f => f.category === 'clinical_episode' || f.layer === 'semantic')
            .map(f => f.fact.toLowerCase());
        const allText = conditions.join(' ') + ' ' + medications.map((m: { name: string }) => m.name).join(' ').toLowerCase();

        for (const rule of RECALL_RULES) {
            // Check age range if specified
            if (rule.ageRange) {
                const dob = new Date(patient.dateOfBirth);
                const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                if (age < rule.ageRange[0] || age > rule.ageRange[1]) continue;
            }

            // Check condition match if specified
            if (rule.condition && !allText.includes(rule.condition)) continue;

            // Check if already recalled recently
            const existingRecall = patient.recallCampaigns.find(
                rc => rc.recallType === rule.type &&
                    new Date(rc.createdAt).getTime() > Date.now() - rule.intervalMonths * 30 * 24 * 60 * 60 * 1000
            );
            if (existingRecall) continue;

            // Create recall + send SMS
            try {
                await prisma.recallCampaign.create({
                    data: {
                        patientId: patient.id,
                        recallType: rule.type,
                        dueDate: new Date().toISOString(),
                        contactedAt: new Date().toISOString(),
                        channel: 'sms',
                    },
                });

                const name = patient.firstName;
                const smsResult = await sendSMS(patient.phone, rule.smsTemplate(name, practiceName));

                if (smsResult.success) {
                    recalled++;
                    console.log(`📋 Recall sent: ${rule.type} → ${patient.firstName} ${patient.lastName}`);
                }
            } catch (err) {
                errors.push(`Recall ${rule.type} for ${patient.firstName} ${patient.lastName}: ${err}`);
            }
        }
    }

    return { processed: patients.length, recalled, errors };
}

// ═══════════════════════════════════════════════════════════
// 2. Schedule Post-Appointment Check-ins
// ═══════════════════════════════════════════════════════════

export async function scheduleCheckIns(): Promise<{ scheduled: number }> {
    // Find completed appointments in last 48h without a check-in scheduled
    const recentCompleted = await prisma.appointment.findMany({
        where: {
            available: false,
            bookedReason: { not: { startsWith: 'CANCELLED' } },
            createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
    });

    let scheduled = 0;

    for (const apt of recentCompleted) {
        // Check if a check-in task already exists for this appointment
        const existing = await prisma.scheduledTask.findFirst({
            where: {
                taskType: 'checkin',
                payload: { contains: apt.id },
                status: 'pending',
            },
        });
        if (existing) continue;

        // Schedule check-in 36 hours after appointment
        const executeAt = new Date(apt.createdAt.getTime() + 36 * 60 * 60 * 1000);
        if (executeAt < new Date()) continue; // Don't schedule in past

        if (apt.patientId) {
            await prisma.scheduledTask.create({
                data: {
                    taskType: 'checkin',
                    patientId: apt.patientId,
                    executeAt,
                    payload: JSON.stringify({
                        appointmentId: apt.id,
                        clinician: apt.clinicianName || 'your clinician',
                        date: apt.date,
                    }),
                },
            });
            scheduled++;
        }
    }

    return { scheduled };
}

// ═══════════════════════════════════════════════════════════
// 3. Execute Pending Scheduled Tasks
// ═══════════════════════════════════════════════════════════

export async function executePendingTasks(): Promise<{ executed: number; errors: string[] }> {
    const pending = await prisma.scheduledTask.findMany({
        where: {
            status: 'pending',
            executeAt: { lte: new Date() },
        },
        include: { patient: true },
    });

    let executed = 0;
    const errors: string[] = [];

    for (const task of pending) {
        try {
            const payload = JSON.parse(task.payload || '{}');

            if (task.taskType === 'checkin' && task.patient) {
                const practice = await prisma.practice.findFirst();
                const practiceName = practice?.name || 'your GP surgery';
                const msg = `Hi ${task.patient.firstName}, this is EMMA from ${practiceName}. Just checking in after your appointment on ${payload.date} with ${payload.clinician}. How are you feeling? Reply GOOD, SAME, or WORSE.`;
                await sendSMS(task.patient.phone, msg);
            }

            if (task.taskType === 'recall_sms' && task.patient) {
                const msg = payload.message || `Hi ${task.patient.firstName}, you have a health recall due. Reply YES to book.`;
                await sendSMS(task.patient.phone, msg);
            }

            if (task.taskType === 'reminder' && task.patient) {
                const msg = payload.message || `Reminder from your GP surgery.`;
                await sendSMS(task.patient.phone, msg);
            }

            await prisma.scheduledTask.update({
                where: { id: task.id },
                data: { status: 'executed', executedAt: new Date(), result: 'SMS sent' },
            });
            executed++;
        } catch (err) {
            errors.push(`Task ${task.id}: ${err}`);
            await prisma.scheduledTask.update({
                where: { id: task.id },
                data: { status: 'failed', result: String(err) },
            });
        }
    }

    return { executed, errors };
}

// ═══════════════════════════════════════════════════════════
// 4. Full Scheduler Run (all jobs)
// ═══════════════════════════════════════════════════════════

export async function runFullScheduler(): Promise<{
    recalls: { processed: number; recalled: number; errors: string[] };
    checkins: { scheduled: number };
    tasks: { executed: number; errors: string[] };
    timestamp: string;
}> {
    console.log('⏰ EMMA Scheduler running...');

    const recalls = await runRecallCampaigns();
    const checkins = await scheduleCheckIns();
    const tasks = await executePendingTasks();

    console.log(`⏰ Scheduler complete: ${recalls.recalled} recalls, ${checkins.scheduled} check-ins, ${tasks.executed} tasks executed`);

    return {
        recalls,
        checkins,
        tasks,
        timestamp: new Date().toISOString(),
    };
}
