// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 2 — COMPUTER & BROWSER USE ENGINE
// EMMAbrowserAgent: Autonomous browser automation for NHS systems
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { BrowserAction, BrowserSession } from '@/lib/types';

// ═══ SECURITY CONSTRAINTS ═══

const NHS_DOMAIN_ALLOWLIST = [
    '*.nhs.uk', '*.systmone.tpp-uk.com', '*.emishealth.com',
    '*.ers.ncrs.nhs.uk', '*.spine2.ncrs.nhs.uk', '*.gpconnect.nhs.uk',
];

const MAX_SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ACTIONS_PER_SESSION = 50;

// ═══ BROWSER AGENT CLASS ═══

export class EMMAbrowserAgent {
    private allowlist = NHS_DOMAIN_ALLOWLIST;

    isDomainAllowed(url: string): boolean {
        try {
            const hostname = new URL(url).hostname;
            return this.allowlist.some(pattern => {
                const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                return regex.test(hostname);
            });
        } catch { return false; }
    }

    createSession(taskDescription: string, targetUrl: string): BrowserSession {
        const domain = (() => { try { return new URL(targetUrl).hostname; } catch { return 'unknown'; } })();
        const allowed = this.isDomainAllowed(targetUrl);

        return {
            id: uuid(), taskDescription, targetUrl, domain,
            status: allowed ? 'active' : 'blocked',
            actions: [], startedAt: new Date().toISOString(),
            securityFlags: allowed ? [] : [`BLOCKED: Domain ${domain} not in NHS allowlist`],
            auditTrail: [`Session created for: ${taskDescription}`, `Target: ${targetUrl}`, `Domain check: ${allowed ? 'PASSED' : 'BLOCKED'}`],
        };
    }

    executeAction(session: BrowserSession, actionType: BrowserAction['actionType'], target?: string, value?: string, reasoning?: string): BrowserAction {
        const action: BrowserAction = {
            id: uuid(), actionType, target, value, reasoning: reasoning || `Execute ${actionType}`,
            timestamp: new Date().toISOString(), success: session.status === 'active',
        };

        if (session.status !== 'active') {
            action.success = false;
            session.auditTrail.push(`ACTION BLOCKED: Session is ${session.status}`);
            return action;
        }

        // Check session timeout
        const elapsed = Date.now() - new Date(session.startedAt).getTime();
        if (elapsed > MAX_SESSION_DURATION_MS) {
            session.status = 'timeout';
            action.success = false;
            session.securityFlags.push('SESSION_TIMEOUT: Exceeded 5-minute limit');
            session.auditTrail.push('Session terminated: timeout');
            return action;
        }

        if (session.actions.length >= MAX_ACTIONS_PER_SESSION) {
            session.status = 'failed';
            action.success = false;
            session.securityFlags.push('MAX_ACTIONS: Exceeded 50-action limit');
            return action;
        }

        // Simulate action
        action.success = true;
        action.screenshotRef = `screenshot-${session.actions.length + 1}.png`;
        session.actions.push(action);
        session.auditTrail.push(`${actionType.toUpperCase()}: ${target || 'N/A'} → ${value || 'N/A'}`);
        return action;
    }

    completeSession(session: BrowserSession): BrowserSession {
        session.status = 'completed';
        session.completedAt = new Date().toISOString();
        session.auditTrail.push(`Session completed: ${session.actions.length} actions executed`);
        return session;
    }
}

// ═══ DEMO DATA ═══

export function getDemoBrowserSessions(): BrowserSession[] {
    const now = new Date();

    return [
        {
            id: 'bs-001', taskDescription: 'Submit 2-week wait referral via eRS',
            targetUrl: 'https://ers.ncrs.nhs.uk/referral/new', domain: 'ers.ncrs.nhs.uk',
            status: 'completed',
            actions: [
                { id: 'ba-01', actionType: 'navigate', target: 'https://ers.ncrs.nhs.uk/referral/new', reasoning: 'Open eRS referral form', timestamp: new Date(now.getTime() - 300000).toISOString(), success: true },
                { id: 'ba-02', actionType: 'screenshot', reasoning: 'Capture initial form state', timestamp: new Date(now.getTime() - 299000).toISOString(), success: true, screenshotRef: 'screenshot-1.png' },
                { id: 'ba-03', actionType: 'select', target: '#referral-type', value: '2-week-wait', reasoning: 'Select 2WW referral type', timestamp: new Date(now.getTime() - 298000).toISOString(), success: true },
                { id: 'ba-04', actionType: 'type', target: '#patient-nhs-number', value: '193 482 9103', reasoning: 'Enter patient NHS number', timestamp: new Date(now.getTime() - 297000).toISOString(), success: true },
                { id: 'ba-05', actionType: 'type', target: '#clinical-info', value: 'Suspected malignant lesion on left forearm. 6-week history of growth. Irregular borders, colour variation.', reasoning: 'Enter clinical information', timestamp: new Date(now.getTime() - 295000).toISOString(), success: true },
                { id: 'ba-06', actionType: 'select', target: '#specialty', value: 'Dermatology', reasoning: 'Select referral specialty', timestamp: new Date(now.getTime() - 294000).toISOString(), success: true },
                { id: 'ba-07', actionType: 'click', target: '#submit-referral', reasoning: 'Submit the referral form', timestamp: new Date(now.getTime() - 293000).toISOString(), success: true },
                { id: 'ba-08', actionType: 'screenshot', reasoning: 'Capture confirmation screen', timestamp: new Date(now.getTime() - 292000).toISOString(), success: true, screenshotRef: 'screenshot-2.png' },
                { id: 'ba-09', actionType: 'extract', target: '.confirmation-number', value: 'REF-2WW-2026-04821', reasoning: 'Extract referral confirmation number', timestamp: new Date(now.getTime() - 291000).toISOString(), success: true },
            ],
            startedAt: new Date(now.getTime() - 300000).toISOString(), completedAt: new Date(now.getTime() - 291000).toISOString(),
            securityFlags: [],
            auditTrail: ['Session created for: Submit 2-week wait referral via eRS', 'Domain check: PASSED', 'NAVIGATE: eRS referral form', 'SCREENSHOT: Initial state', 'SELECT: 2WW type', 'TYPE: NHS number', 'TYPE: Clinical info', 'SELECT: Dermatology', 'CLICK: Submit', 'SCREENSHOT: Confirmation', 'EXTRACT: REF-2WW-2026-04821', 'Session completed: 9 actions executed'],
        },
        {
            id: 'bs-002', taskDescription: 'Update patient medication in SystmOne',
            targetUrl: 'https://clinical.systmone.tpp-uk.com/patient/medications', domain: 'clinical.systmone.tpp-uk.com',
            status: 'completed',
            actions: [
                { id: 'ba-10', actionType: 'navigate', target: 'https://clinical.systmone.tpp-uk.com/patient/medications', reasoning: 'Open medication list', timestamp: new Date(now.getTime() - 180000).toISOString(), success: true },
                { id: 'ba-11', actionType: 'click', target: '#add-medication', reasoning: 'Click add new medication', timestamp: new Date(now.getTime() - 179000).toISOString(), success: true },
                { id: 'ba-12', actionType: 'type', target: '#drug-search', value: 'Amlodipine 5mg', reasoning: 'Search for medication', timestamp: new Date(now.getTime() - 178000).toISOString(), success: true },
                { id: 'ba-13', actionType: 'click', target: '.drug-result:first-child', reasoning: 'Select first matching result', timestamp: new Date(now.getTime() - 177000).toISOString(), success: true },
                { id: 'ba-14', actionType: 'submit_form', target: '#medication-form', reasoning: 'Submit medication update', timestamp: new Date(now.getTime() - 176000).toISOString(), success: true },
            ],
            startedAt: new Date(now.getTime() - 180000).toISOString(), completedAt: new Date(now.getTime() - 176000).toISOString(),
            securityFlags: [],
            auditTrail: ['Session created for: Update patient medication in SystmOne', 'Domain check: PASSED', 'Session completed: 5 actions executed'],
        },
    ];
}
