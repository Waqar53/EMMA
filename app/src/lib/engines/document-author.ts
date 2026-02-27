// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 7 — CLINICAL DOCUMENT AUTHOR
// Groq generates full NHS clinical documents — persists to Prisma DB
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { callLLM } from '@/lib/llm/groq';
import prisma from '@/lib/db';

export interface ClinicalDoc {
    id: string; type: string; patientNHSNumber: string; patientName: string;
    title: string; content: string; status: string; snomedCodes: string[];
    version: number; createdAt: string;
}

export class ClinicalDocumentAuthor {
    async draftDocument(
        type: string, patientNHSNumber: string, patientName: string,
        clinicalContext: string,
    ): Promise<ClinicalDoc> {
        const response = await callLLM([
            {
                role: 'system', content: `You are EMMA's clinical document author AI. Generate a complete, professional NHS clinical document.
Document type: ${type}
Patient: ${patientName} (NHS: ${patientNHSNumber})
Clinical context: ${clinicalContext}

Generate a comprehensive document with:
- Proper NHS formatting and structure
- SNOMED CT codes where appropriate
- NICE guideline references
- Professional medical language

Respond ONLY in JSON:
{"title": "Document Title", "content": "Full document content...", "snomedCodes": ["12345006"], "niceGuidelines": ["NG123"]}` },
            { role: 'user', content: `Draft ${type} for ${patientName}` },
        ], { temperature: 0.3, maxTokens: 2048 });

        let title = `${type} — ${patientName}`;
        let content = `Clinical document for ${patientName}`;
        let snomedCodes: string[] = [];
        let niceGuidelines: string[] = [];

        try {
            const parsed = JSON.parse(response);
            title = parsed.title || title;
            content = parsed.content || content;
            snomedCodes = parsed.snomedCodes || [];
            niceGuidelines = parsed.niceGuidelines || [];
        } catch { /* defaults */ }

        const patient = await prisma.patient.findUnique({ where: { nhsNumber: patientNHSNumber } });
        const docId = uuid();

        await prisma.clinicalDocument.create({
            data: {
                id: docId, type, patientId: patient?.id || '', patientNHSNumber,
                patientName, title, content, status: 'AWAITING_GP_REVIEW',
                gpApprovalRequired: true, snomedCodes: JSON.stringify(snomedCodes),
                niceGuidelines: JSON.stringify(niceGuidelines),
            },
        });

        return {
            id: docId, type, patientNHSNumber, patientName, title, content,
            status: 'AWAITING_GP_REVIEW', snomedCodes, version: 1,
            createdAt: new Date().toISOString(),
        };
    }

    async getDocuments(): Promise<ClinicalDoc[]> {
        const rows = await prisma.clinicalDocument.findMany({ orderBy: { createdAt: 'desc' } });
        return rows.map(r => ({
            id: r.id, type: r.type, patientNHSNumber: r.patientNHSNumber,
            patientName: r.patientName, title: r.title, content: r.content,
            status: r.status, snomedCodes: JSON.parse(r.snomedCodes),
            version: r.version, createdAt: r.createdAt.toISOString(),
        }));
    }

    async getPendingReview(): Promise<ClinicalDoc[]> {
        const all = await this.getDocuments();
        return all.filter(d => d.status === 'AWAITING_GP_REVIEW');
    }

    async approveDocument(docId: string, gpName: string): Promise<ClinicalDoc | null> {
        const updated = await prisma.clinicalDocument.update({
            where: { id: docId },
            data: { status: 'APPROVED', reviewedBy: gpName, reviewedAt: new Date().toISOString(), approvedAt: new Date().toISOString() },
        });
        return {
            id: updated.id, type: updated.type, patientNHSNumber: updated.patientNHSNumber,
            patientName: updated.patientName, title: updated.title, content: updated.content,
            status: updated.status, snomedCodes: JSON.parse(updated.snomedCodes),
            version: updated.version, createdAt: updated.createdAt.toISOString(),
        };
    }
}
