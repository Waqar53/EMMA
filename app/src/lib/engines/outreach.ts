// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 5 — PROACTIVE PATIENT OUTREACH ENGINE
// Daily patient scans, campaign management, contact pipeline
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { OutreachCampaign, OutreachContact, OutreachType, OutreachStatus } from '@/lib/types';

// ═══ OUTREACH RULES ═══

interface OutreachRule {
    type: OutreachType;
    name: string;
    description: string;
    checkFn: (patient: DemoPatient) => boolean;
    messageTemplate: (patient: DemoPatient) => string;
    priority: number;
}

interface DemoPatient {
    nhsNumber: string;
    name: string;
    dob: string;
    lastAnnualReview?: string;
    lastPrescriptionDate?: string;
    prescriptionDaysSupply?: number;
    lastHealthCheck?: string;
    dischargeDate?: string;
    lastCervicalScreen?: string;
    lastFluVaccine?: string;
    gender: 'male' | 'female' | 'other';
    age: number;
}

const OUTREACH_RULES: OutreachRule[] = [
    {
        type: 'annual_review', name: 'Overdue Annual Review', description: 'Patients with no annual review in 12+ months',
        priority: 3,
        checkFn: (p) => {
            if (!p.lastAnnualReview) return true;
            const monthsSince = (Date.now() - new Date(p.lastAnnualReview).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return monthsSince > 12;
        },
        messageTemplate: (p) => `Dear ${p.name.split(' ')[0]}, it's time for your annual health review at Riverside Medical Centre. Please reply YES to book, or call us on 0121 456 7890. EMMA, your AI receptionist.`,
    },
    {
        type: 'medication_expiry', name: 'Medication Running Out', description: 'Patients whose repeat prescription coverage is ending within 7 days',
        priority: 2,
        checkFn: (p) => {
            if (!p.lastPrescriptionDate || !p.prescriptionDaysSupply) return false;
            const endDate = new Date(p.lastPrescriptionDate);
            endDate.setDate(endDate.getDate() + p.prescriptionDaysSupply);
            const daysRemaining = (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return daysRemaining <= 7 && daysRemaining > 0;
        },
        messageTemplate: (p) => `Dear ${p.name.split(' ')[0]}, your repeat prescription is due for renewal. Reply YES to reorder, or call us. EMMA, Riverside Medical Centre.`,
    },
    {
        type: 'health_check', name: 'NHS Health Check', description: 'Eligible patients aged 40-74 without a recent health check',
        priority: 4,
        checkFn: (p) => {
            if (p.age < 40 || p.age > 74) return false;
            if (!p.lastHealthCheck) return true;
            const monthsSince = (Date.now() - new Date(p.lastHealthCheck).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return monthsSince > 60; // Every 5 years
        },
        messageTemplate: (p) => `Dear ${p.name.split(' ')[0]}, you're eligible for a free NHS Health Check. This helps spot early signs of heart disease, diabetes & more. Reply YES to book. EMMA, Riverside Medical Centre.`,
    },
    {
        type: 'post_discharge', name: 'Post-Discharge Follow-Up', description: 'Patients discharged from hospital within 7 days',
        priority: 1,
        checkFn: (p) => {
            if (!p.dischargeDate) return false;
            const daysSince = (Date.now() - new Date(p.dischargeDate).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 7 && daysSince > 0;
        },
        messageTemplate: (p) => `Dear ${p.name.split(' ')[0]}, we've been notified of your recent hospital discharge. We'd like to check in on you. Reply YES for a callback, or call us. EMMA, Riverside Medical Centre.`,
    },
    {
        type: 'cervical_screening', name: 'Cervical Screening Due', description: 'Women aged 25-64 due for cervical screening',
        priority: 3,
        checkFn: (p) => {
            if (p.gender !== 'female' || p.age < 25 || p.age > 64) return false;
            if (!p.lastCervicalScreen) return true;
            const interval = p.age < 50 ? 36 : 60; // 3 years under 50, 5 years 50-64
            const monthsSince = (Date.now() - new Date(p.lastCervicalScreen).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return monthsSince > interval;
        },
        messageTemplate: (p) => `Dear ${p.name.split(' ')[0]}, you're due for your cervical screening appointment. This important test helps prevent cervical cancer. Reply YES to book. EMMA, Riverside Medical Centre.`,
    },
    {
        type: 'vaccination', name: 'Flu Vaccination Campaign', description: 'Eligible patients without a current flu vaccine',
        priority: 5,
        checkFn: (p) => {
            if (p.age < 65 && p.age > 5) return false; // Simplified eligibility
            if (!p.lastFluVaccine) return true;
            const monthsSince = (Date.now() - new Date(p.lastFluVaccine).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return monthsSince > 10;
        },
        messageTemplate: (p) => `Dear ${p.name.split(' ')[0]}, it's flu season. You're eligible for a free flu jab. Reply YES to book. EMMA, Riverside Medical Centre.`,
    },
];

// ═══ OUTREACH ENGINE CLASS ═══

export class EMMAOutreachEngine {
    private maxContactsPerMonth = 2;

    getRules(): OutreachRule[] { return OUTREACH_RULES; }

    dailyOutreachScan(patients: DemoPatient[]): OutreachContact[] {
        const contacts: OutreachContact[] = [];

        for (const patient of patients) {
            for (const rule of OUTREACH_RULES) {
                if (rule.checkFn(patient)) {
                    contacts.push({
                        id: uuid(), campaignId: `campaign-${rule.type}`,
                        patientNHSNumber: patient.nhsNumber, patientName: patient.name,
                        outreachType: rule.type, reason: rule.description,
                        status: 'identified', priority: rule.priority,
                        messageContent: rule.messageTemplate(patient),
                    });
                }
            }
        }

        return contacts.sort((a, b) => a.priority - b.priority);
    }

    async executeOutreach(contact: OutreachContact): Promise<OutreachContact> {
        // Simulate sending
        contact.status = 'sent';
        contact.sentAt = new Date().toISOString();

        // Simulate response (40% respond, 60% of responders book)
        if (Math.random() > 0.6) {
            contact.status = 'responded';
            contact.respondedAt = new Date(Date.now() + 3600000).toISOString();
            if (Math.random() > 0.4) {
                contact.status = 'booked';
                contact.outcome = 'Appointment booked via automated outreach';
            } else {
                contact.outcome = 'Patient responded, no booking yet';
            }
        }
        return contact;
    }
}

// ═══ DEMO DATA ═══

export function getDemoOutreachCampaigns(): OutreachCampaign[] {
    return [
        { id: 'camp-001', type: 'annual_review', name: 'Q1 Annual Review Drive', description: 'Contacting all patients overdue for annual review', targetCount: 342, sentCount: 215, respondedCount: 128, bookedCount: 89, createdAt: '2026-02-01T00:00:00Z', status: 'active' },
        { id: 'camp-002', type: 'vaccination', name: 'Winter Flu Vaccination', description: 'Flu jab campaign for eligible patients', targetCount: 1205, sentCount: 980, respondedCount: 654, bookedCount: 521, createdAt: '2026-01-15T00:00:00Z', status: 'active' },
        { id: 'camp-003', type: 'cervical_screening', name: 'Cervical Screening Catch-Up', description: 'Women due for cervical screening', targetCount: 189, sentCount: 145, respondedCount: 98, bookedCount: 76, createdAt: '2026-02-10T00:00:00Z', status: 'active' },
        { id: 'camp-004', type: 'medication_expiry', name: 'Daily Rx Renewal Alerts', description: 'Patients with expiring repeat prescriptions', targetCount: 47, sentCount: 38, respondedCount: 31, bookedCount: 28, createdAt: '2026-02-27T06:00:00Z', status: 'active' },
        { id: 'camp-005', type: 'health_check', name: 'NHS Health Check 40-74', description: 'Free NHS Health Check invitations', targetCount: 567, sentCount: 312, respondedCount: 189, bookedCount: 134, createdAt: '2026-01-01T00:00:00Z', status: 'active' },
    ];
}

export function getDemoOutreachContacts(): OutreachContact[] {
    return [
        { id: 'oc-001', campaignId: 'camp-001', patientNHSNumber: '729 401 8362', patientName: 'Margaret Wilson', outreachType: 'annual_review', reason: 'No annual review in 14 months', status: 'booked', priority: 3, messageContent: 'Dear Margaret, it\'s time for your annual health review...', sentAt: '2026-02-25T09:00:00Z', respondedAt: '2026-02-25T11:30:00Z', outcome: 'Booked: Dr. Khan, 3 March 10:00' },
        { id: 'oc-002', campaignId: 'camp-004', patientNHSNumber: '193 482 9103', patientName: 'Sarah Jenkins', outreachType: 'medication_expiry', reason: 'Salbutamol prescription expires in 5 days', status: 'sent', priority: 2, messageContent: 'Dear Sarah, your repeat prescription is due for renewal...', sentAt: '2026-02-27T08:00:00Z' },
        { id: 'oc-003', campaignId: 'camp-003', patientNHSNumber: '847 293 1048', patientName: 'Fatima Begum', outreachType: 'cervical_screening', reason: 'Cervical screening overdue by 4 months', status: 'responded', priority: 3, messageContent: 'Dear Fatima, you\'re due for your cervical screening...', sentAt: '2026-02-26T09:00:00Z', respondedAt: '2026-02-26T14:00:00Z', outcome: 'Requested callback to discuss' },
        { id: 'oc-004', campaignId: 'camp-005', patientNHSNumber: '482 190 3847', patientName: 'Robert Thompson', outreachType: 'health_check', reason: 'Age 57, no NHS Health Check on record', status: 'identified', priority: 4, messageContent: 'Dear Robert, you\'re eligible for a free NHS Health Check...' },
    ];
}
