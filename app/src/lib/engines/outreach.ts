// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 5 — PROACTIVE OUTREACH
// AI-generated patient outreach — persists to Prisma DB
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { callLLM } from '@/lib/llm/groq';
import prisma from '@/lib/db';

const OUTREACH_RULES = [
    { id: 'rule-flu', name: 'Flu Vaccination (65+)', ageMin: 65, condition: 'age_based' },
    { id: 'rule-diabetes', name: 'Diabetes Annual Review', condition: 'medication_metformin' },
    { id: 'rule-bp', name: 'Hypertension Check', condition: 'medication_amlodipine' },
    { id: 'rule-smear', name: 'Cervical Screening', ageMin: 25, ageMax: 64, gender: 'female', condition: 'age_gender' },
    { id: 'rule-mental', name: 'Mental Health Follow-up', condition: 'medication_sertraline' },
    { id: 'rule-cholesterol', name: 'Cholesterol Review', condition: 'medication_statin' },
];

export interface OutreachCampaignData {
    id: string; name: string; ruleId: string; status: string;
    targetCount: number; sentCount: number; createdAt: string;
}
export interface OutreachContactData {
    id: string; campaignId: string; patientName: string; patientNHSNumber: string;
    channel: string; message: string; status: string; createdAt: string;
}

export class EMMAOutreachEngine {
    getRules() { return OUTREACH_RULES; }

    async generateOutreach(ruleId: string): Promise<{ campaign: OutreachCampaignData; contacts: OutreachContactData[] }> {
        const rule = OUTREACH_RULES.find(r => r.id === ruleId);
        if (!rule) throw new Error(`Rule not found: ${ruleId}`);

        // Find matching patients from DB
        const allPatients = await prisma.patient.findMany();
        // Simple matching based on rule conditions
        const matchedPatients = allPatients.filter(p => {
            if (rule.condition === 'medication_metformin') return p.medications.includes('Metformin');
            if (rule.condition === 'medication_amlodipine') return p.medications.includes('Amlodipine');
            if (rule.condition === 'medication_sertraline') return p.medications.includes('Sertraline');
            if (rule.condition === 'medication_statin') return p.medications.includes('statin') || p.medications.includes('Simvastatin') || p.medications.includes('Atorvastatin');
            if (rule.condition === 'age_based') {
                const age = new Date().getFullYear() - parseInt(p.dateOfBirth.split('-')[0]);
                return rule.ageMin ? age >= rule.ageMin : true;
            }
            if (rule.condition === 'age_gender') {
                const age = new Date().getFullYear() - parseInt(p.dateOfBirth.split('-')[0]);
                return p.gender === rule.gender && (rule.ageMin ? age >= rule.ageMin : true) && (rule.ageMax ? age <= rule.ageMax : true);
            }
            return false;
        });

        const campaignId = uuid();
        const contacts: OutreachContactData[] = [];

        for (const p of matchedPatients) {
            const message = await callLLM([
                { role: 'system', content: `You are EMMA's outreach AI. Generate a personalised, friendly SMS message for a patient about: ${rule.name}. Keep it under 160 characters. Patient: ${p.firstName} ${p.lastName}.` },
                { role: 'user', content: `Generate outreach message for ${rule.name}` },
            ], { temperature: 0.5, maxTokens: 100 });

            const contactId = uuid();
            contacts.push({
                id: contactId, campaignId, patientName: `${p.firstName} ${p.lastName}`,
                patientNHSNumber: p.nhsNumber, channel: 'sms',
                message: message.replace(/"/g, ''), status: 'sent',
                createdAt: new Date().toISOString(),
            });

            await prisma.outreachContact.create({
                data: {
                    id: contactId, campaignId, patientId: p.id,
                    patientNHSNumber: p.nhsNumber, patientName: `${p.firstName} ${p.lastName}`,
                    channel: 'sms', message: message.replace(/"/g, ''),
                    status: 'sent', sentAt: new Date().toISOString(), rule: ruleId,
                },
            });
        }

        const campaign: OutreachCampaignData = {
            id: campaignId, name: rule.name, ruleId,
            status: 'active', targetCount: matchedPatients.length,
            sentCount: contacts.length, createdAt: new Date().toISOString(),
        };

        await prisma.outreachCampaign.create({
            data: {
                id: campaignId, name: rule.name, ruleId,
                status: 'active', targetCount: matchedPatients.length,
                sentCount: contacts.length,
            },
        });

        return { campaign, contacts };
    }

    async getCampaigns(): Promise<OutreachCampaignData[]> {
        const rows = await prisma.outreachCampaign.findMany({ orderBy: { createdAt: 'desc' } });
        return rows.map(r => ({
            id: r.id, name: r.name, ruleId: r.ruleId, status: r.status,
            targetCount: r.targetCount, sentCount: r.sentCount,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    async getContacts(campaignId?: string): Promise<OutreachContactData[]> {
        const rows = await prisma.outreachContact.findMany({
            where: campaignId ? { campaignId } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        return rows.map(r => ({
            id: r.id, campaignId: r.campaignId, patientName: r.patientName,
            patientNHSNumber: r.patientNHSNumber, channel: r.channel,
            message: r.message, status: r.status, createdAt: r.createdAt.toISOString(),
        }));
    }
}
