'use client';

import { useEffect, useState } from 'react';

interface TriageRecord {
    id: string;
    callId: string;
    patientName: string;
    symptoms: { description: string; snomedCode?: string; severity: number; isRedFlag?: boolean }[];
    redFlagsDetected: string[];
    urgencyClassification: string;
    safetyNettingApplied: string;
    disposition: string;
    clinicalProtocolUsed?: string;
    safetyCheckPassed: boolean;
    humanReviewRequired: boolean;
    createdAt: string;
}

function urgencyBadge(urgency: string) {
    const map: Record<string, { label: string; cls: string }> = {
        EMERGENCY: { label: 'RED FLAG', cls: 'badge-red-flag' },
        URGENT: { label: 'URGENT', cls: 'badge-urgent' },
        SOON: { label: 'SOON', cls: 'badge-urgent' },
        ROUTINE: { label: 'STANDARD', cls: 'badge-standard' },
    };
    return map[urgency] || { label: urgency, cls: 'badge-standard' };
}

function timeSince(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
}

export default function TriagePage() {
    const [records, setRecords] = useState<TriageRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/triage')
            .then(r => r.json())
            .then(data => { setRecords(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const redFlagCount = records.filter(r => r.redFlagsDetected.length > 0).length;
    const urgentCount = records.filter(r => r.urgencyClassification === 'URGENT' || r.urgencyClassification === 'EMERGENCY').length;

    return (
        <main className="page-content">
            <div className="page-header">
                <div>
                    <div className="ph-live"><div className="dot" /> LIVE QUEUE</div>
                    <h1>Patient Triage Queue</h1>
                    <p className="ph-desc">AI triage records from the database — real patient escalations</p>
                </div>
                <div className="ph-actions">
                    <button className="btn" onClick={() => { setLoading(true); fetch('/api/triage').then(r => r.json()).then(data => { setRecords(data); setLoading(false); }); }}>🔄 Refresh Queue</button>
                </div>
            </div>

            {/* Tabs — real counts */}
            <div className="tabs">
                <button className="tab active">All Escalations <span className="tab-count">{records.length}</span></button>
                <button className="tab">High Priority <span className="tab-count">{urgentCount}</span></button>
                <button className="tab">Red Flags <span className="tab-count red">{redFlagCount}</span></button>
            </div>

            {/* Queue Table */}
            <div className="card">
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        ⏳ Loading triage queue from database...
                    </div>
                ) : records.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No triage records in the database. Triage records are created when patients report clinical symptoms via AI Chat.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Priority</th>
                                <th>Patient Details</th>
                                <th>AI Summary &amp; Context</th>
                                <th>Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((rec) => {
                                const badge = urgencyBadge(rec.urgencyClassification);
                                const hasRedFlags = rec.redFlagsDetected.length > 0;
                                return (
                                    <tr key={rec.id}>
                                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                                        <td>
                                            <div className="patient-name">{rec.patientName}</div>
                                            <div className="patient-nhs">{rec.disposition}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                                <span style={{ color: 'var(--brand-blue)', marginRight: '6px' }}>🤖</span>
                                                <strong>Symptoms:</strong> {rec.symptoms.map(s => s.description).join(', ')}.
                                                {hasRedFlags && (
                                                    <span style={{ color: 'var(--red-500)', fontWeight: 600 }}> ⚠ Red flags: {rec.redFlagsDetected.join(', ')}</span>
                                                )}
                                                <br /><strong>Safety:</strong> {rec.safetyNettingApplied}
                                                {rec.clinicalProtocolUsed && <><br /><strong>Protocol:</strong> {rec.clinicalProtocolUsed}</>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`tr-wait ${hasRedFlags ? 'urgent' : ''}`}>
                                                ⏱ {timeSince(rec.createdAt)}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {hasRedFlags ? (
                                                    <button className="btn btn-sm btn-take-call">📞 Take Call</button>
                                                ) : rec.humanReviewRequired ? (
                                                    <button className="btn btn-sm btn-send-sms">📋 Review</button>
                                                ) : (
                                                    <button className="btn btn-sm">✏ Action</button>
                                                )}
                                                <button className="btn btn-sm" style={{ padding: '4px 8px' }}>👁</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Helper Cards */}
            <div className="helper-cards">
                <div className="helper-card">
                    <div className="hc-icon blue">🧠</div>
                    <div>
                        <h4>Smart Context</h4>
                        <p>EMMA pulls history automatically so you don&apos;t have to search.</p>
                    </div>
                </div>
                <div className="helper-card">
                    <div className="hc-icon green">✓</div>
                    <div>
                        <h4>Database Backed</h4>
                        <p>All triage records are stored in the Prisma database.</p>
                    </div>
                </div>
                <div className="helper-card">
                    <div className="hc-icon gray">❓</div>
                    <div>
                        <h4>Need Help?</h4>
                        <p>Click any entry to view the full AI conversation transcript.</p>
                    </div>
                </div>
            </div>

            <footer className="status-footer" style={{ marginTop: 'auto', marginBottom: 0 }}>
                <div className="sf-item"><span className="sf-dot online" /> AI Core: Online</div>
                <div className="sf-item"><span className="sf-dot online" /> Database: Connected</div>
                <div className="sf-links">
                    <a href="#">Support</a>
                    <a href="#">System Health</a>
                </div>
            </footer>
        </main>
    );
}
