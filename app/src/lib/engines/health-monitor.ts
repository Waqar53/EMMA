// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 8 — HEALTH DATA MONITORING
// Real threshold processing + Groq AI contextualisation — persists to Prisma DB
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { callLLM } from '@/lib/llm/groq';
import { HealthReading, HealthAlert, AlertTier } from '@/lib/types';
import prisma from '@/lib/db';

// ═══ CONTEXTUALISED THRESHOLD RULES ═══

interface ThresholdRule {
    type: string; unit: string;
    critical: { low?: number; high?: number };
    urgent: { low?: number; high?: number };
    monitor: { low?: number; high?: number };
}

const THRESHOLD_RULES: Record<string, ThresholdRule> = {
    blood_pressure_systolic: { type: 'Blood Pressure (Systolic)', unit: 'mmHg', critical: { high: 180 }, urgent: { high: 160, low: 80 }, monitor: { high: 140, low: 90 } },
    blood_pressure_diastolic: { type: 'Blood Pressure (Diastolic)', unit: 'mmHg', critical: { high: 120 }, urgent: { high: 100, low: 50 }, monitor: { high: 90, low: 60 } },
    heart_rate: { type: 'Heart Rate', unit: 'bpm', critical: { high: 150, low: 35 }, urgent: { high: 120, low: 45 }, monitor: { high: 100, low: 50 } },
    blood_glucose: { type: 'Blood Glucose', unit: 'mmol/L', critical: { high: 20, low: 3.0 }, urgent: { high: 14, low: 3.5 }, monitor: { high: 10, low: 4.0 } },
    spo2: { type: 'SpO2', unit: '%', critical: { low: 88 }, urgent: { low: 92 }, monitor: { low: 95 } },
    temperature: { type: 'Temperature', unit: '°C', critical: { high: 41, low: 34 }, urgent: { high: 39.5, low: 35 }, monitor: { high: 38.5, low: 36 } },
};

export class EMMAHealthMonitor {
    evaluateThreshold(readingType: string, value: number): AlertTier | null {
        const rule = THRESHOLD_RULES[readingType];
        if (!rule) return null;
        if ((rule.critical.high && value >= rule.critical.high) || (rule.critical.low && value <= rule.critical.low)) return 'CRITICAL';
        if ((rule.urgent.high && value >= rule.urgent.high) || (rule.urgent.low && value <= rule.urgent.low)) return 'URGENT';
        if ((rule.monitor.high && value >= rule.monitor.high) || (rule.monitor.low && value <= rule.monitor.low)) return 'MONITOR';
        return null;
    }

    async processReading(
        patientNHSNumber: string, patientName: string,
        readingType: string, value: number, patientContext?: string,
    ): Promise<{ reading: HealthReading; alert: HealthAlert | null }> {
        const rule = THRESHOLD_RULES[readingType];
        const tier = this.evaluateThreshold(readingType, value);
        const patient = await prisma.patient.findUnique({ where: { nhsNumber: patientNHSNumber } });
        const patientId = patient?.id || '';

        // Save reading to DB
        const dbReading = await prisma.healthReading.create({
            data: {
                id: uuid(), patientId, patientNHSNumber,
                type: readingType, value, unit: rule?.unit || '',
                source: 'command_centre', timestamp: new Date().toISOString(),
            },
        });

        const reading: HealthReading = {
            id: dbReading.id, patientNHSNumber,
            type: readingType, value, unit: rule?.unit || '',
            timestamp: dbReading.timestamp, source: 'command_centre',
        };

        let alert: HealthAlert | null = null;

        if (tier) {
            const aiContext = await callLLM([
                {
                    role: 'system', content: `You are EMMA's clinical health monitoring AI. Reading: ${rule?.type || readingType} = ${value} ${rule?.unit || ''}, Tier: ${tier}, Patient: ${patientName}. ${patientContext || ''}
Respond ONLY in JSON: {"description": "...", "recommendedAction": "...", "autoResponse": true/false, "clinicalNotes": "..."}` },
                { role: 'user', content: `Process ${tier} alert for ${readingType} = ${value}` },
            ], { temperature: 0.2, maxTokens: 512 });

            let description = `${rule?.type || readingType} ${value}${rule?.unit || ''} — ${tier} threshold breached`;
            let action = 'Review required';
            let autoResponse = tier === 'CRITICAL';
            let contextNotes = `${patientName}: ${readingType} ${value}${rule?.unit || ''}`;

            try {
                const parsed = JSON.parse(aiContext);
                description = parsed.description || description;
                action = parsed.recommendedAction || action;
                autoResponse = parsed.autoResponse ?? autoResponse;
                contextNotes = parsed.clinicalNotes || contextNotes;
            } catch { /* defaults */ }

            const alertId = uuid();
            await prisma.healthAlert.create({
                data: {
                    id: alertId, patientId, patientNHSNumber, patientName,
                    tier, type: readingType, description, context: contextNotes,
                    recommendedAction: action, autoResponseTriggered: autoResponse,
                },
            });
            await prisma.alertReading.create({
                data: { alertId, readingId: dbReading.id },
            });

            alert = {
                id: alertId, patientNHSNumber, patientName, tier: tier as AlertTier,
                type: readingType, description, readings: [reading], context: contextNotes,
                recommendedAction: action, autoResponseTriggered: autoResponse,
                createdAt: new Date().toISOString(),
            };
        }

        return { reading, alert };
    }

    async getReadings(): Promise<HealthReading[]> {
        const rows = await prisma.healthReading.findMany({ orderBy: { createdAt: 'desc' } });
        return rows.map(r => ({
            id: r.id, patientNHSNumber: r.patientNHSNumber, type: r.type,
            value: r.value, unit: r.unit, source: r.source, timestamp: r.timestamp,
        })) as HealthReading[];
    }

    async getAlerts(): Promise<HealthAlert[]> {
        const rows = await prisma.healthAlert.findMany({ orderBy: { createdAt: 'desc' } });
        return rows.map(r => ({
            id: r.id, patientNHSNumber: r.patientNHSNumber, patientName: r.patientName,
            tier: r.tier as AlertTier, type: r.type, description: r.description,
            readings: [], context: r.context, recommendedAction: r.recommendedAction,
            autoResponseTriggered: r.autoResponseTriggered,
            acknowledgedAt: r.acknowledgedAt || undefined, acknowledgedBy: r.acknowledgedBy || undefined,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    async getActiveAlerts(): Promise<HealthAlert[]> {
        const all = await this.getAlerts();
        return all.filter(a => !a.acknowledgedAt);
    }

    async acknowledgeAlert(alertId: string, gpName: string): Promise<HealthAlert | null> {
        const updated = await prisma.healthAlert.update({
            where: { id: alertId },
            data: { acknowledgedAt: new Date().toISOString(), acknowledgedBy: gpName },
        });
        if (!updated) return null;
        return {
            id: updated.id, patientNHSNumber: updated.patientNHSNumber,
            patientName: updated.patientName, tier: updated.tier as AlertTier,
            type: updated.type, description: updated.description, readings: [],
            context: updated.context, recommendedAction: updated.recommendedAction,
            autoResponseTriggered: updated.autoResponseTriggered,
            acknowledgedAt: updated.acknowledgedAt || undefined,
            acknowledgedBy: updated.acknowledgedBy || undefined,
            createdAt: updated.createdAt.toISOString(),
        };
    }

    getAvailableReadingTypes(): string[] { return Object.keys(THRESHOLD_RULES); }
    getThresholds(): Record<string, ThresholdRule> { return THRESHOLD_RULES; }
}
