// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 3 — LONG-HORIZON MEMORY
// AI-powered fact extraction via Groq — persists to database via Prisma
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { callLLM } from '@/lib/llm/groq';
import { MemoryFact } from '@/lib/types';
import prisma from '@/lib/db';

export class PatientMemoryStore {
    /** AI extracts facts from conversation text and persists to DB */
    async learnFromConversation(patientNHSNumber: string, conversationText: string): Promise<MemoryFact[]> {
        const response = await callLLM([
            {
                role: 'system', content: `You are EMMA's memory extraction AI. Extract key patient facts from this conversation.

For each fact, determine:
- layer: working (current visit), episodic (specific event), semantic (general knowledge), procedural (how-to)
- category: preference, medical_history, social, behavioural, emotional, administrative
- fact: the extracted information
- confidence: 0.0-1.0

Respond ONLY in JSON:
{"facts": [{"layer": "...", "category": "...", "fact": "...", "confidence": 0.9}, ...]}` },
            { role: 'user', content: conversationText },
        ], { temperature: 0.2, maxTokens: 512 });

        let extracted: { layer: string; category: string; fact: string; confidence: number }[] = [];
        try {
            const parsed = JSON.parse(response);
            extracted = parsed.facts || [];
        } catch { /* use empty */ }

        const now = new Date().toISOString();
        const facts: MemoryFact[] = [];

        for (const e of extracted) {
            const fact: MemoryFact = {
                id: uuid(),
                patientNHSNumber,
                layer: e.layer as MemoryFact['layer'],
                category: e.category as MemoryFact['category'],
                fact: e.fact,
                confidence: e.confidence,
                source: 'ai_extraction',
                extractedAt: now,
                lastAccessedAt: now,
                accessCount: 0,
            };
            facts.push(fact);

            // Find patient by NHS number for foreign key
            const patient = await prisma.patient.findUnique({ where: { nhsNumber: patientNHSNumber } });
            await prisma.memoryFact.create({
                data: {
                    id: fact.id,
                    patientId: patient?.id || '',
                    patientNHSNumber,
                    layer: fact.layer,
                    category: fact.category,
                    fact: fact.fact,
                    confidence: fact.confidence,
                    source: fact.source,
                    extractedAt: fact.extractedAt,
                    lastAccessedAt: fact.lastAccessedAt,
                    accessCount: 0,
                },
            });
        }

        return facts;
    }

    /** Recall relevant facts for a patient given a query */
    async recall(patientNHSNumber: string, query: string): Promise<MemoryFact[]> {
        const allFacts = await prisma.memoryFact.findMany({
            where: { patientNHSNumber },
        });

        if (allFacts.length === 0) return [];

        const response = await callLLM([
            {
                role: 'system', content: `You are EMMA's memory recall AI. Given patient facts and a query, return the indices of relevant facts.
Facts: ${JSON.stringify(allFacts.map((f, i) => ({ index: i, fact: f.fact, layer: f.layer })))}
Respond ONLY in JSON: {"relevant_indices": [0, 2, ...]}` },
            { role: 'user', content: query },
        ], { temperature: 0.1, maxTokens: 256 });

        let indices: number[] = [];
        try {
            indices = JSON.parse(response).relevant_indices || [];
        } catch { /* return all */ indices = allFacts.map((_, i) => i); }

        return indices
            .filter(i => i >= 0 && i < allFacts.length)
            .map(i => ({
                id: allFacts[i].id,
                patientNHSNumber: allFacts[i].patientNHSNumber,
                layer: allFacts[i].layer as MemoryFact['layer'],
                category: allFacts[i].category as MemoryFact['category'],
                fact: allFacts[i].fact,
                confidence: allFacts[i].confidence,
                source: allFacts[i].source,
                extractedAt: allFacts[i].extractedAt,
                lastAccessedAt: allFacts[i].lastAccessedAt,
                accessCount: allFacts[i].accessCount,
            }));
    }

    async getStats() {
        const facts = await prisma.memoryFact.findMany();
        const patients = new Set(facts.map(f => f.patientNHSNumber));
        const factsByLayer: Record<string, number> = {};
        for (const f of facts) {
            factsByLayer[f.layer] = (factsByLayer[f.layer] || 0) + 1;
        }
        return { totalPatients: patients.size, totalFacts: facts.length, factsByLayer };
    }
}
