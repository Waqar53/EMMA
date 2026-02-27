// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 2 — BROWSER AGENT
// AI-driven action sequence generation — persists to Prisma DB
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { callLLM } from '@/lib/llm/groq';
import { BrowserAction, BrowserSession } from '@/lib/types';
import prisma from '@/lib/db';

const ALLOWED_DOMAINS = [
    'nhs.uk', 'spine.nhs.uk', 'e-referral.nhs.uk', 'gp-clinical.nhs.uk',
    'emis.com', 'tpp-uk.com', 'visionhealth.co.uk', 'pcse.england.nhs.uk',
];

export class EMMAbrowserAgent {
    isDomainAllowed(url: string): boolean {
        return ALLOWED_DOMAINS.some(d => url.includes(d));
    }

    async executeTask(taskDescription: string, domain: string): Promise<BrowserSession> {
        if (!this.isDomainAllowed(domain)) {
            throw new Error(`Domain not allowed: ${domain}. Only NHS-approved domains permitted.`);
        }

        const response = await callLLM([
            {
                role: 'system', content: `You are EMMA's browser automation AI. Generate browser actions for an NHS system task.
Target domain: ${domain}
Action types: navigate, click, type, select, wait, screenshot, extract
Respond ONLY in JSON:
{"actions": [{"actionType": "navigate", "target": "https://...", "value": null, "description": "..."}], "securityNotes": ["..."]}` },
            { role: 'user', content: taskDescription },
        ], { temperature: 0.2, maxTokens: 1024 });

        const sessionId = uuid();
        let actions: BrowserAction[] = [];
        let securityFlags: string[] = [];

        try {
            const parsed = JSON.parse(response);
            actions = (parsed.actions || []).map((a: { actionType: string; target?: string; value?: string; description?: string }, i: number) => ({
                id: `act-${uuid().slice(0, 8)}`,
                actionType: a.actionType || 'navigate',
                target: a.target || '',
                value: a.value || undefined,
                reasoning: a.description || `Action ${i + 1}`,
                timestamp: new Date(Date.now() + i * 2000).toISOString(),
                success: true,
                screenshotRef: a.actionType === 'screenshot' ? `screenshot-${uuid().slice(0, 8)}` : undefined,
            }));
            securityFlags = parsed.securityNotes || [];
        } catch {
            actions = [{
                id: `act-${uuid().slice(0, 8)}`,
                actionType: 'navigate', target: `https://${domain}`,
                reasoning: 'Fallback navigation to target domain',
                timestamp: new Date().toISOString(), success: false,
            }];
        }

        const session: BrowserSession = {
            id: sessionId, taskDescription, domain,
            targetUrl: `https://${domain}`,
            actions, status: 'completed',
            securityFlags, auditTrail: [`Session created: ${taskDescription}`],
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
        };

        // Persist to DB
        await prisma.browserSession.create({
            data: {
                id: sessionId, taskDescription, domain,
                targetUrl: `https://${domain}`, status: 'completed',
                actions: JSON.stringify(actions),
                securityFlags: JSON.stringify(securityFlags),
                auditTrail: JSON.stringify([`Session created: ${taskDescription}`]),
                startedAt: session.startedAt, completedAt: session.completedAt,
            },
        });

        return session;
    }

    async getSessions(): Promise<BrowserSession[]> {
        const rows = await prisma.browserSession.findMany({ orderBy: { createdAt: 'desc' } });
        return rows.map(r => ({
            id: r.id, taskDescription: r.taskDescription, domain: r.domain,
            targetUrl: r.targetUrl, status: r.status as BrowserSession['status'],
            actions: JSON.parse(r.actions), securityFlags: JSON.parse(r.securityFlags),
            auditTrail: JSON.parse(r.auditTrail),
            startedAt: r.startedAt, completedAt: r.completedAt || undefined,
        }));
    }
}
