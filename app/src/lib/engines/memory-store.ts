// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 3 — LONG-HORIZON MEMORY ENGINE
// Four-layer patient memory: Working → Episodic → Semantic → Procedural
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { MemoryFact, PatientMemory, MemoryLayer, FactCategory } from '@/lib/types';

// ═══ SEMANTIC KNOWLEDGE BASE (NICE Guidelines) ═══

const SEMANTIC_KNOWLEDGE: MemoryFact[] = [
    { id: 'sem-001', patientNHSNumber: '__GLOBAL__', layer: 'semantic', category: 'medical_history', fact: 'NICE CG181: Cardiovascular disease risk assessment — all adults aged 40+ without CVD should have risk assessed every 5 years', confidence: 1.0, source: 'NICE Guidelines', extractedAt: '2026-01-01T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 245 },
    { id: 'sem-002', patientNHSNumber: '__GLOBAL__', layer: 'semantic', category: 'medical_history', fact: 'NICE NG12: Suspected cancer — 2-week-wait referral pathway for qualifying symptoms', confidence: 1.0, source: 'NICE Guidelines', extractedAt: '2026-01-01T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 189 },
    { id: 'sem-003', patientNHSNumber: '__GLOBAL__', layer: 'semantic', category: 'medical_history', fact: 'NICE CG90/CG91: Depression — stepped care model. Step 1: assessment, Step 2: low-intensity interventions, Step 3: medication/therapy', confidence: 1.0, source: 'NICE Guidelines', extractedAt: '2026-01-01T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 156 },
    { id: 'sem-004', patientNHSNumber: '__GLOBAL__', layer: 'semantic', category: 'medical_history', fact: 'BTS/SIGN: Asthma management — stepwise approach. All patients should have a written asthma action plan', confidence: 1.0, source: 'BTS/SIGN Guidelines', extractedAt: '2026-01-01T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 132 },
    { id: 'sem-005', patientNHSNumber: '__GLOBAL__', layer: 'semantic', category: 'medical_history', fact: 'NICE NG136: Hypertension — clinic BP ≥140/90 or ABPM/HBPM ≥135/85. Stage 1: lifestyle + treatment if 10-year CVD risk ≥10%', confidence: 1.0, source: 'NICE Guidelines', extractedAt: '2026-01-01T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 198 },
];

// ═══ PROCEDURAL PATTERNS ═══

const PROCEDURAL_PATTERNS: MemoryFact[] = [
    { id: 'proc-001', patientNHSNumber: '__GLOBAL__', layer: 'procedural', category: 'behavioural', fact: 'When patient mentions "chest pain" + "arm" → immediately escalate to 999 pathway, do NOT continue triage', confidence: 1.0, source: 'Clinical Safety Protocol', extractedAt: '2026-01-15T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 42 },
    { id: 'proc-002', patientNHSNumber: '__GLOBAL__', layer: 'procedural', category: 'behavioural', fact: 'After booking appointment → always send SMS confirmation + add to daily GP task list', confidence: 0.95, source: 'Successful Pattern Analysis', extractedAt: '2026-01-20T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 312 },
    { id: 'proc-003', patientNHSNumber: '__GLOBAL__', layer: 'procedural', category: 'behavioural', fact: 'For anxious patients → use softer language, provide extra reassurance, mention safety net explicitly', confidence: 0.92, source: 'Patient Satisfaction Analysis', extractedAt: '2026-02-01T00:00:00Z', lastAccessedAt: '2026-02-27T00:00:00Z', accessCount: 87 },
];

// ═══ FACT EXTRACTION PATTERNS ═══

const EXTRACTION_PATTERNS: { pattern: RegExp; category: FactCategory; template: (match: RegExpMatchArray) => string }[] = [
    { pattern: /prefer(?:s)?\s+(morning|afternoon|evening|early|late)\s+appointment/i, category: 'preference', template: (m) => `Prefers ${m[1]} appointments` },
    { pattern: /work(?:s)?\s+(?:at\s+)?night/i, category: 'social', template: () => 'Works night shifts — avoid early morning appointments' },
    { pattern: /anxious\s+about\s+(.+?)(?:\.|,|$)/i, category: 'emotional', template: (m) => `Anxious about ${m[1]} — use reassuring language` },
    { pattern: /(?:father|mother|parent|dad|mum)\s+(?:had|died|suffered)\s+(.+?)(?:\.|,|$)/i, category: 'medical_history', template: (m) => `Family history: parent had ${m[1]}` },
    { pattern: /allergic\s+to\s+(.+?)(?:\.|,|$)/i, category: 'medical_history', template: (m) => `Allergy: ${m[1]}` },
    { pattern: /(?:can't|cannot|unable to)\s+(?:come|attend|make it)\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, category: 'preference', template: (m) => `Cannot attend on ${m[1]}s` },
    { pattern: /(?:deaf|hearing\s+impair|hard\s+of\s+hearing)/i, category: 'administrative', template: () => 'Hearing impairment — prefer written communication' },
    { pattern: /(?:interpreter|translate|speak\s+(?:limited|no)\s+english)/i, category: 'administrative', template: () => 'May need interpreter — limited English proficiency' },
    { pattern: /(?:pregnant|expecting|baby\s+(?:on\s+the\s+way|due))/i, category: 'medical_history', template: () => 'Currently pregnant — check medication safety' },
];

// ═══ PATIENT MEMORY STORE CLASS ═══

export class PatientMemoryStore {
    private workingMemory: Map<string, string[]> = new Map();
    private episodicMemory: Map<string, MemoryFact[]> = new Map();
    private semanticKnowledge = SEMANTIC_KNOWLEDGE;
    private proceduralPatterns = PROCEDURAL_PATTERNS;

    extractFacts(patientNHSNumber: string, conversationText: string): MemoryFact[] {
        const extracted: MemoryFact[] = [];

        for (const pattern of EXTRACTION_PATTERNS) {
            const match = conversationText.match(pattern.pattern);
            if (match) {
                const existing = this.episodicMemory.get(patientNHSNumber) || [];
                const factText = pattern.template(match);

                // Dedup — don't store the same fact twice
                if (!existing.some(f => f.fact === factText)) {
                    const fact: MemoryFact = {
                        id: uuid(), patientNHSNumber, layer: 'episodic', category: pattern.category,
                        fact: factText, confidence: 0.85, source: 'conversation_extraction',
                        extractedAt: new Date().toISOString(), lastAccessedAt: new Date().toISOString(), accessCount: 0,
                    };
                    extracted.push(fact);
                    existing.push(fact);
                    this.episodicMemory.set(patientNHSNumber, existing);
                }
            }
        }
        return extracted;
    }

    recallRelevant(patientNHSNumber: string, context: string): MemoryFact[] {
        const results: MemoryFact[] = [];
        const lowerContext = context.toLowerCase();

        // Working memory
        const working = this.workingMemory.get(patientNHSNumber) || [];
        if (working.length > 0) {
            results.push({
                id: 'wm-current', patientNHSNumber, layer: 'working', category: 'administrative',
                fact: `Current session context: ${working.join('; ')}`, confidence: 1.0,
                source: 'working_memory', extractedAt: new Date().toISOString(),
                lastAccessedAt: new Date().toISOString(), accessCount: 1,
            });
        }

        // Episodic memory (patient-specific)
        const episodic = this.episodicMemory.get(patientNHSNumber) || [];
        results.push(...episodic.map(f => { f.lastAccessedAt = new Date().toISOString(); f.accessCount++; return f; }));

        // Semantic knowledge (context-relevant)
        for (const fact of this.semanticKnowledge) {
            const keywords = ['cardiovascular', 'cancer', 'depression', 'asthma', 'hypertension', 'blood pressure'];
            if (keywords.some(k => lowerContext.includes(k) && fact.fact.toLowerCase().includes(k))) {
                results.push(fact);
            }
        }

        // Procedural patterns (always relevant for agent behaviour)
        for (const pattern of this.proceduralPatterns) {
            const triggers = ['chest pain', 'appointment', 'anxious'];
            if (triggers.some(t => lowerContext.includes(t) && pattern.fact.toLowerCase().includes(t))) {
                results.push(pattern);
            }
        }

        return results;
    }

    addWorkingContext(patientNHSNumber: string, context: string): void {
        const existing = this.workingMemory.get(patientNHSNumber) || [];
        existing.push(context);
        if (existing.length > 20) existing.splice(0, existing.length - 20);
        this.workingMemory.set(patientNHSNumber, existing);
    }

    getPatientMemory(patientNHSNumber: string): PatientMemory {
        const facts = this.episodicMemory.get(patientNHSNumber) || [];
        const working = this.workingMemory.get(patientNHSNumber) || [];
        return {
            patientNHSNumber, patientName: '',
            facts: [...facts, ...this.semanticKnowledge.filter(f => facts.length > 0), ...this.proceduralPatterns],
            workingContext: working, totalInteractions: facts.length,
            firstInteractionAt: facts[0]?.extractedAt || new Date().toISOString(),
            lastInteractionAt: facts[facts.length - 1]?.extractedAt || new Date().toISOString(),
        };
    }

    clearWorkingMemory(patientNHSNumber: string): void {
        this.workingMemory.delete(patientNHSNumber);
    }
}

// ═══ DEMO DATA ═══

export function getDemoPatientMemories(): PatientMemory[] {
    return [
        {
            patientNHSNumber: '193 482 9103', patientName: 'Sarah Jenkins',
            facts: [
                { id: 'ep-001', patientNHSNumber: '193 482 9103', layer: 'episodic', category: 'preference', fact: 'Prefers morning appointments', confidence: 0.92, source: 'conversation_extraction', extractedAt: '2026-02-10T10:00:00Z', lastAccessedAt: '2026-02-27T09:00:00Z', accessCount: 5 },
                { id: 'ep-002', patientNHSNumber: '193 482 9103', layer: 'episodic', category: 'emotional', fact: 'Anxious about chest symptoms — father died of heart attack aged 52', confidence: 0.88, source: 'conversation_extraction', extractedAt: '2026-02-15T14:00:00Z', lastAccessedAt: '2026-02-24T09:42:00Z', accessCount: 3 },
                { id: 'ep-003', patientNHSNumber: '193 482 9103', layer: 'episodic', category: 'medical_history', fact: 'Family history: parent had heart attack at age 52', confidence: 0.95, source: 'conversation_extraction', extractedAt: '2026-02-15T14:00:00Z', lastAccessedAt: '2026-02-24T09:42:00Z', accessCount: 3 },
                { id: 'ep-004', patientNHSNumber: '193 482 9103', layer: 'episodic', category: 'social', fact: 'Works night shifts — avoid early morning appointments', confidence: 0.80, source: 'conversation_extraction', extractedAt: '2026-02-10T10:00:00Z', lastAccessedAt: '2026-02-27T09:00:00Z', accessCount: 2 },
                ...SEMANTIC_KNOWLEDGE.slice(0, 2),
                ...PROCEDURAL_PATTERNS.slice(0, 1),
            ],
            workingContext: ['Called about chest pain', 'Escalated to 999'], totalInteractions: 12,
            firstInteractionAt: '2026-01-05T09:30:00Z', lastInteractionAt: '2026-02-24T09:45:00Z',
        },
        {
            patientNHSNumber: '482 190 3847', patientName: 'Robert Thompson',
            facts: [
                { id: 'ep-010', patientNHSNumber: '482 190 3847', layer: 'episodic', category: 'preference', fact: 'Prefers afternoon appointments', confidence: 0.90, source: 'conversation_extraction', extractedAt: '2026-02-08T15:00:00Z', lastAccessedAt: '2026-02-24T11:30:00Z', accessCount: 4 },
                { id: 'ep-011', patientNHSNumber: '482 190 3847', layer: 'episodic', category: 'preference', fact: 'Cannot attend on Fridays', confidence: 0.85, source: 'conversation_extraction', extractedAt: '2026-02-08T15:00:00Z', lastAccessedAt: '2026-02-24T11:30:00Z', accessCount: 2 },
                { id: 'ep-012', patientNHSNumber: '482 190 3847', layer: 'episodic', category: 'medical_history', fact: 'Allergy: Amoxicillin — confirmed penicillin allergy', confidence: 0.98, source: 'clinical_record', extractedAt: '2026-01-15T00:00:00Z', lastAccessedAt: '2026-02-24T11:30:00Z', accessCount: 6 },
            ],
            workingContext: [], totalInteractions: 8,
            firstInteractionAt: '2026-01-20T11:00:00Z', lastInteractionAt: '2026-02-24T11:35:00Z',
        },
        {
            patientNHSNumber: '729 401 8362', patientName: 'Margaret Wilson',
            facts: [
                { id: 'ep-020', patientNHSNumber: '729 401 8362', layer: 'episodic', category: 'administrative', fact: 'Hearing impairment — prefer written communication', confidence: 0.95, source: 'conversation_extraction', extractedAt: '2026-01-28T10:00:00Z', lastAccessedAt: '2026-02-25T10:00:00Z', accessCount: 8 },
                { id: 'ep-021', patientNHSNumber: '729 401 8362', layer: 'episodic', category: 'preference', fact: 'Prefers early morning appointments (before 9am)', confidence: 0.88, source: 'conversation_extraction', extractedAt: '2026-02-05T09:00:00Z', lastAccessedAt: '2026-02-25T10:00:00Z', accessCount: 3 },
                { id: 'ep-022', patientNHSNumber: '729 401 8362', layer: 'episodic', category: 'social', fact: 'Lives alone, daughter checks in weekly. Emergency contact: daughter Sarah 07700-110022', confidence: 0.90, source: 'conversation_extraction', extractedAt: '2026-02-05T09:00:00Z', lastAccessedAt: '2026-02-25T10:00:00Z', accessCount: 2 },
            ],
            workingContext: [], totalInteractions: 15,
            firstInteractionAt: '2025-11-10T09:00:00Z', lastInteractionAt: '2026-02-25T10:15:00Z',
        },
    ];
}
