// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 8 — HEALTH DATA MONITORING
// FHIR streams, contextualised deterioration, autonomous alerts
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { HealthReading, HealthAlert, AlertTier, HealthDataSource } from '@/lib/types';

// ═══ CONTEXTUAL THRESHOLDS ═══

interface PatientContext {
    nhsNumber: string;
    name: string;
    age: number;
    conditions: string[];
    medications: string[];
    baselineReadings?: Record<string, number>;
}

interface ThresholdRule {
    type: string;
    unit: string;
    evaluate: (value: number, context: PatientContext) => { tier: AlertTier; reason: string } | null;
}

const THRESHOLD_RULES: ThresholdRule[] = [
    {
        type: 'blood_pressure_systolic', unit: 'mmHg',
        evaluate: (value, ctx) => {
            const onAntihypertensives = ctx.medications.some(m => ['amlodipine', 'ramipril', 'lisinopril', 'losartan'].includes(m.toLowerCase()));
            if (value >= 180) return { tier: 'CRITICAL', reason: `Systolic BP ${value}mmHg — hypertensive crisis. ${onAntihypertensives ? 'Already on antihypertensives — possible medication failure.' : 'Not on treatment — urgent assessment needed.'}` };
            if (value >= 160 && !onAntihypertensives) return { tier: 'URGENT', reason: `Systolic BP ${value}mmHg, untreated — GP review within 24 hours` };
            if (value >= 160 && onAntihypertensives) return { tier: 'MONITOR', reason: `Systolic BP ${value}mmHg on treatment — dose review may be needed` };
            if (value >= 140 && ctx.age < 50) return { tier: 'URGENT', reason: `Systolic BP ${value}mmHg in patient aged ${ctx.age} — early hypertension, needs assessment` };
            if (value >= 140) return { tier: 'MONITOR', reason: `Systolic BP ${value}mmHg — borderline, recheck in 1 week` };
            return null;
        },
    },
    {
        type: 'heart_rate', unit: 'bpm',
        evaluate: (value, ctx) => {
            const onBetaBlockers = ctx.medications.some(m => ['atenolol', 'bisoprolol', 'propranolol'].includes(m.toLowerCase()));
            if (value >= 150) return { tier: 'CRITICAL', reason: `HR ${value}bpm — tachycardia. ${ctx.conditions.includes('Atrial fibrillation') ? 'Known AF — possible decompensation.' : 'Possible new arrhythmia.'}` };
            if (value >= 120) return { tier: 'URGENT', reason: `HR ${value}bpm — sustained tachycardia, requires assessment` };
            if (value < 40 && !onBetaBlockers) return { tier: 'CRITICAL', reason: `HR ${value}bpm — severe bradycardia` };
            if (value < 50 && onBetaBlockers) return { tier: 'MONITOR', reason: `HR ${value}bpm on beta-blockers — expected but monitor` };
            if (value < 50) return { tier: 'URGENT', reason: `HR ${value}bpm — bradycardia, needs review` };
            return null;
        },
    },
    {
        type: 'blood_glucose', unit: 'mmol/L',
        evaluate: (value, ctx) => {
            const isDiabetic = ctx.conditions.some(c => c.toLowerCase().includes('diabetes'));
            if (value < 3.5) return { tier: 'CRITICAL', reason: `Blood glucose ${value}mmol/L — hypoglycaemia. ${isDiabetic ? 'Known diabetic — check insulin/medication timing.' : 'Non-diabetic hypoglycaemia — urgent investigation.'}` };
            if (value > 20) return { tier: 'CRITICAL', reason: `Blood glucose ${value}mmol/L — severe hyperglycaemia, DKA risk` };
            if (value > 15 && isDiabetic) return { tier: 'URGENT', reason: `Blood glucose ${value}mmol/L — poor diabetic control, medication review needed` };
            if (value > 11 && !isDiabetic) return { tier: 'URGENT', reason: `Blood glucose ${value}mmol/L — possible undiagnosed diabetes` };
            return null;
        },
    },
    {
        type: 'oxygen_saturation', unit: '%',
        evaluate: (value, ctx) => {
            const hasCOPD = ctx.conditions.some(c => c.toLowerCase().includes('copd'));
            if (value < 88 && hasCOPD) return { tier: 'CRITICAL', reason: `SpO2 ${value}% — COPD exacerbation, target 88-92%` };
            if (value < 92 && !hasCOPD) return { tier: 'CRITICAL', reason: `SpO2 ${value}% — significant hypoxia` };
            if (value < 94 && !hasCOPD) return { tier: 'URGENT', reason: `SpO2 ${value}% — below normal, assessment needed` };
            if (value < 92 && hasCOPD) return { tier: 'MONITOR', reason: `SpO2 ${value}% — borderline for COPD target range` };
            return null;
        },
    },
    {
        type: 'temperature', unit: '°C',
        evaluate: (value, ctx) => {
            if (value >= 40) return { tier: 'CRITICAL', reason: `Temperature ${value}°C — high-grade pyrexia. ${ctx.age > 70 ? 'Elderly patient — sepsis risk.' : 'Assess for source of infection.'}` };
            if (value >= 38.5 && ctx.age > 70) return { tier: 'URGENT', reason: `Temperature ${value}°C in elderly patient — lower threshold for concern` };
            if (value >= 38) return { tier: 'MONITOR', reason: `Temperature ${value}°C — mild pyrexia, monitor and safety net` };
            if (value < 35) return { tier: 'URGENT', reason: `Temperature ${value}°C — hypothermia` };
            return null;
        },
    },
    {
        type: 'weight', unit: 'kg',
        evaluate: (value, ctx) => {
            const baseline = ctx.baselineReadings?.weight;
            if (!baseline) return null;
            const change = ((value - baseline) / baseline) * 100;
            if (change < -10) return { tier: 'URGENT', reason: `Weight loss of ${Math.abs(change).toFixed(1)}% from baseline — investigate malignancy, thyroid, malabsorption` };
            if (change > 5 && ctx.conditions.includes('Heart failure')) return { tier: 'URGENT', reason: `Weight gain of ${change.toFixed(1)}% — possible fluid retention in heart failure patient` };
            return null;
        },
    },
];

// ═══ HEALTH DATA MONITOR CLASS ═══

export class HealthDataMonitor {
    private rules = THRESHOLD_RULES;

    processReading(reading: HealthReading, patientContext: PatientContext): HealthAlert | null {
        for (const rule of this.rules) {
            if (rule.type === reading.type) {
                const result = rule.evaluate(reading.value, patientContext);
                if (result) {
                    return {
                        id: uuid(), patientNHSNumber: patientContext.nhsNumber,
                        patientName: patientContext.name, tier: result.tier,
                        type: reading.type, description: result.reason,
                        readings: [reading], context: `Patient: ${patientContext.name}, Age: ${patientContext.age}, Conditions: ${patientContext.conditions.join(', ')}`,
                        recommendedAction: this.getRecommendedAction(result.tier),
                        autoResponseTriggered: result.tier === 'CRITICAL',
                        createdAt: new Date().toISOString(),
                    };
                }
            }
        }
        return null;
    }

    private getRecommendedAction(tier: AlertTier): string {
        switch (tier) {
            case 'CRITICAL': return 'EMMA autonomous response: immediate patient contact + GP notification + 999 guidance if needed';
            case 'URGENT': return 'GP notification within 1 hour, patient contact for symptoms check';
            case 'MONITOR': return 'Logged for next GP review, patient reminded to recheck in 7 days';
            case 'INFO': return 'Noted in patient record, no action required';
        }
    }

    detectTrend(readings: HealthReading[]): { trend: 'improving' | 'stable' | 'deteriorating'; description: string } | null {
        if (readings.length < 3) return null;
        const sorted = [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const recent = sorted.slice(-5);
        const values = recent.map(r => r.value);

        let increasing = 0, decreasing = 0;
        for (let i = 1; i < values.length; i++) {
            if (values[i] > values[i - 1]) increasing++;
            else if (values[i] < values[i - 1]) decreasing++;
        }

        if (increasing >= values.length - 1) return { trend: 'deteriorating', description: `${readings[0].type} consistently rising over ${values.length} readings` };
        if (decreasing >= values.length - 1) return { trend: 'improving', description: `${readings[0].type} consistently improving over ${values.length} readings` };
        return { trend: 'stable', description: `${readings[0].type} stable over ${values.length} readings` };
    }
}

// ═══ DEMO DATA ═══

export function getDemoHealthReadings(): HealthReading[] {
    const now = new Date();
    return [
        { id: 'hr-001', patientNHSNumber: '193 482 9103', source: 'wearable', type: 'heart_rate', value: 72, unit: 'bpm', normalRangeLow: 60, normalRangeHigh: 100, timestamp: new Date(now.getTime() - 3600000).toISOString() },
        { id: 'hr-002', patientNHSNumber: '193 482 9103', source: 'wearable', type: 'blood_pressure_systolic', value: 128, unit: 'mmHg', normalRangeLow: 90, normalRangeHigh: 140, timestamp: new Date(now.getTime() - 3600000).toISOString() },
        { id: 'hr-003', patientNHSNumber: '193 482 9103', source: 'wearable', type: 'oxygen_saturation', value: 97, unit: '%', normalRangeLow: 95, normalRangeHigh: 100, timestamp: new Date(now.getTime() - 3600000).toISOString() },
        { id: 'hr-004', patientNHSNumber: '482 190 3847', source: 'lab_result', type: 'blood_glucose', value: 14.2, unit: 'mmol/L', normalRangeLow: 4, normalRangeHigh: 7, timestamp: new Date(now.getTime() - 7200000).toISOString() },
        { id: 'hr-005', patientNHSNumber: '482 190 3847', source: 'wearable', type: 'blood_pressure_systolic', value: 162, unit: 'mmHg', normalRangeLow: 90, normalRangeHigh: 140, timestamp: new Date(now.getTime() - 1800000).toISOString() },
        { id: 'hr-006', patientNHSNumber: '729 401 8362', source: 'patient_reported', type: 'temperature', value: 38.8, unit: '°C', normalRangeLow: 36, normalRangeHigh: 37.5, timestamp: new Date(now.getTime() - 900000).toISOString() },
        { id: 'hr-007', patientNHSNumber: '312 847 2910', source: 'wearable', type: 'heart_rate', value: 132, unit: 'bpm', normalRangeLow: 60, normalRangeHigh: 100, timestamp: new Date(now.getTime() - 600000).toISOString() },
        { id: 'hr-008', patientNHSNumber: '312 847 2910', source: 'wearable', type: 'oxygen_saturation', value: 91, unit: '%', normalRangeLow: 95, normalRangeHigh: 100, timestamp: new Date(now.getTime() - 600000).toISOString() },
    ];
}

export function getDemoHealthAlerts(): HealthAlert[] {
    const now = new Date();
    return [
        { id: 'ha-001', patientNHSNumber: '312 847 2910', patientName: 'James Clarke', tier: 'CRITICAL', type: 'oxygen_saturation', description: 'SpO2 91% — significant hypoxia', readings: [{ id: 'hr-008', patientNHSNumber: '312 847 2910', source: 'wearable', type: 'oxygen_saturation', value: 91, unit: '%', normalRangeLow: 95, normalRangeHigh: 100, timestamp: new Date(now.getTime() - 600000).toISOString() }], context: 'Patient: James Clarke, Age: 22, Conditions: Asthma', recommendedAction: 'EMMA autonomous response: immediate patient contact + GP notification + 999 guidance if needed', autoResponseTriggered: true, createdAt: new Date(now.getTime() - 600000).toISOString() },
        { id: 'ha-002', patientNHSNumber: '482 190 3847', patientName: 'Robert Thompson', tier: 'URGENT', type: 'blood_glucose', description: 'Blood glucose 14.2mmol/L — poor diabetic control, medication review needed', readings: [{ id: 'hr-004', patientNHSNumber: '482 190 3847', source: 'lab_result', type: 'blood_glucose', value: 14.2, unit: 'mmol/L', normalRangeLow: 4, normalRangeHigh: 7, timestamp: new Date(now.getTime() - 7200000).toISOString() }], context: 'Patient: Robert Thompson, Age: 57, Conditions: Type 2 Diabetes, Hypertension', recommendedAction: 'GP notification within 1 hour, patient contact for symptoms check', autoResponseTriggered: false, createdAt: new Date(now.getTime() - 7200000).toISOString() },
        { id: 'ha-003', patientNHSNumber: '482 190 3847', patientName: 'Robert Thompson', tier: 'URGENT', type: 'blood_pressure_systolic', description: 'Systolic BP 162mmHg on treatment — dose review may be needed', readings: [{ id: 'hr-005', patientNHSNumber: '482 190 3847', source: 'wearable', type: 'blood_pressure_systolic', value: 162, unit: 'mmHg', normalRangeLow: 90, normalRangeHigh: 140, timestamp: new Date(now.getTime() - 1800000).toISOString() }], context: 'Patient: Robert Thompson, Age: 57, Conditions: Hypertension. On Amlodipine.', recommendedAction: 'GP notification within 1 hour, patient contact for symptoms check', autoResponseTriggered: false, createdAt: new Date(now.getTime() - 1800000).toISOString() },
        { id: 'ha-004', patientNHSNumber: '729 401 8362', patientName: 'Margaret Wilson', tier: 'URGENT', type: 'temperature', description: 'Temperature 38.8°C in elderly patient — lower threshold for concern', readings: [{ id: 'hr-006', patientNHSNumber: '729 401 8362', source: 'patient_reported', type: 'temperature', value: 38.8, unit: '°C', normalRangeLow: 36, normalRangeHigh: 37.5, timestamp: new Date(now.getTime() - 900000).toISOString() }], context: 'Patient: Margaret Wilson, Age: 71, Conditions: Hypertension, Osteoarthritis', recommendedAction: 'GP notification within 1 hour, patient contact for symptoms check', autoResponseTriggered: false, createdAt: new Date(now.getTime() - 900000).toISOString() },
        { id: 'ha-005', patientNHSNumber: '312 847 2910', patientName: 'James Clarke', tier: 'URGENT', type: 'heart_rate', description: 'HR 132bpm — sustained tachycardia, requires assessment', readings: [{ id: 'hr-007', patientNHSNumber: '312 847 2910', source: 'wearable', type: 'heart_rate', value: 132, unit: 'bpm', normalRangeLow: 60, normalRangeHigh: 100, timestamp: new Date(now.getTime() - 600000).toISOString() }], context: 'Patient: James Clarke, Age: 22, Conditions: Asthma', recommendedAction: 'GP notification within 1 hour, patient contact for symptoms check', autoResponseTriggered: false, createdAt: new Date(now.getTime() - 600000).toISOString() },
    ];
}
