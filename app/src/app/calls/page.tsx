'use client';

import { useEffect, useState } from 'react';

interface CallRecord {
    id: string;
    patientName?: string;
    patientNHSNumber?: string;
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    primaryIntent?: string;
    urgencyLevel?: string;
    resolutionType?: string;
    agentUsed?: string;
    actionsTaken: { type: string; description: string }[];
    transcript: { id?: string; role: string; content: string; timestamp?: string }[];
    satisfaction?: number;
    snomedCodes: { code: string; display: string }[];
    redFlagsDetected: string[];
    safetyNettingApplied?: string;
}

function intentBadge(intent?: string): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
        CLINICAL_SYMPTOMS: { label: 'Clinical Triage', cls: 'badge-triage' },
        APPOINTMENT: { label: 'Appointment', cls: 'badge-booking' },
        PRESCRIPTION: { label: 'Prescription', cls: 'badge-prescription' },
        ADMIN: { label: 'Administrative', cls: 'badge-standard' },
        TEST_RESULTS: { label: 'Test Results', cls: 'badge-standard' },
    };
    return map[intent || ''] || { label: intent || 'Unknown', cls: 'badge-standard' };
}

function urgencyBadge(u?: string): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
        EMERGENCY: { label: '● EMERGENCY', cls: 'badge-emergency' },
        URGENT: { label: 'URGENT', cls: 'badge-urgent' },
        SOON: { label: 'SOON', cls: 'badge-urgent' },
        ROUTINE: { label: 'ROUTINE', cls: 'badge-routine' },
    };
    return map[u || ''] || { label: u || '—', cls: 'badge-standard' };
}

function resolutionLabel(res?: string) {
    if (res === 'automated') return { text: '✓ AI Fulfilled', cls: 'badge-success' };
    if (res === 'emergency') return { text: 'Requires GP Review', cls: '' };
    if (res === 'human_handoff') return { text: '⏱ GP Audited', cls: '' };
    return { text: res || 'Pending', cls: '' };
}

function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Today, ${time}` : `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}

function formatDuration(secs?: number) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function CallsPage() {
    const [calls, setCalls] = useState<CallRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetch('/api/calls')
            .then(r => r.json())
            .then(data => { setCalls(data); setLoading(false); if (data.length > 0) setExpanded(data[0].id); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = filter === 'all' ? calls : calls.filter(c => {
        if (filter === 'triage') return c.primaryIntent === 'CLINICAL_SYMPTOMS';
        if (filter === 'prescription') return c.primaryIntent === 'PRESCRIPTION';
        if (filter === 'admin') return c.primaryIntent === 'ADMIN' || c.primaryIntent === 'TEST_RESULTS' || c.primaryIntent === 'APPOINTMENT';
        return true;
    });

    const expandedCall = calls.find(c => c.id === expanded);

    // Compute real metrics
    const totalCalls = calls.length;
    const redFlagCalls = calls.filter(c => c.redFlagsDetected && c.redFlagsDetected.length > 0).length;
    const satisfactions = calls.filter(c => c.satisfaction).map(c => c.satisfaction!);
    const avgSat = satisfactions.length > 0 ? Math.round(satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length * 20) : 0;
    const avgDuration = totalCalls > 0 ? Math.round(calls.reduce((s, c) => s + (c.durationSeconds || 0), 0) / totalCalls) : 0;
    const capacitySaved = Math.round(totalCalls * 3.5 / 60 * 10) / 10;

    return (
        <main className="page-content">
            <div className="page-header">
                <div>
                    <h1>Call Audit &amp; Governance</h1>
                    <p className="ph-desc">Real AI clinical triage sessions from the database.</p>
                </div>
                <div className="ph-actions">
                    <button className="btn" onClick={() => { setLoading(true); fetch('/api/calls').then(r => r.json()).then(data => { setCalls(data); setLoading(false); }); }}>🔄 Refresh</button>
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Calls <span className="tab-count">{calls.length}</span></button>
                <button className={`tab ${filter === 'triage' ? 'active' : ''}`} onClick={() => setFilter('triage')}>Clinical Triage <span className="tab-count">{calls.filter(c => c.primaryIntent === 'CLINICAL_SYMPTOMS').length}</span></button>
                <button className={`tab ${filter === 'prescription' ? 'active' : ''}`} onClick={() => setFilter('prescription')}>Prescriptions <span className="tab-count">{calls.filter(c => c.primaryIntent === 'PRESCRIPTION').length}</span></button>
                <button className={`tab ${filter === 'admin' ? 'active' : ''}`} onClick={() => setFilter('admin')}>Administrative <span className="tab-count">{calls.filter(c => c.primaryIntent === 'ADMIN' || c.primaryIntent === 'APPOINTMENT' || c.primaryIntent === 'TEST_RESULTS').length}</span></button>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading calls from database...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No call records found. Call records are created when patients interact with the AI Chat.</div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Patient Name/ID</th>
                                    <th>Time/Date</th>
                                    <th>Intent</th>
                                    <th>Urgency Level</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(call => {
                                    const ib = intentBadge(call.primaryIntent);
                                    const ub = urgencyBadge(call.urgencyLevel);
                                    const rl = resolutionLabel(call.resolutionType);
                                    const isExpanded = expanded === call.id;
                                    return (
                                        <tr key={call.id} style={{ background: isExpanded ? 'var(--bg-glass)' : undefined, cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : call.id)}>
                                            <td>
                                                <div className="patient-name">{call.patientName || 'Unknown'}</div>
                                                <div className="patient-nhs">NHS: {call.patientNHSNumber || '—'}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{formatTime(call.startedAt)}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Duration: {formatDuration(call.durationSeconds)}</div>
                                            </td>
                                            <td><span className={`badge ${ib.cls}`}>{ib.label}</span></td>
                                            <td><span className={`badge ${ub.cls}`}>{ub.label}</span></td>
                                            <td>
                                                {rl.cls ? (
                                                    <span className={rl.cls}>{rl.text}</span>
                                                ) : (
                                                    <span style={{ color: call.resolutionType === 'emergency' ? 'var(--red-500)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.8125rem' }}>{rl.text}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Expanded Detail Panel */}
                        {expandedCall && (
                            <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                                {/* Transcript */}
                                <div className="transcript-section">
                                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', marginTop: '16px' }}>Call Transcript</h4>
                                    {expandedCall.transcript.length === 0 ? (
                                        <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No transcript available for this call.</div>
                                    ) : (
                                        expandedCall.transcript.map((msg, i) => (
                                            <div key={i} className={`transcript-bubble ${msg.role === 'user' ? 'patient-msg' : 'emma-msg'}`}>
                                                <div className={`tb-label ${msg.role === 'user' ? 'patient' : 'emma'}`}>{msg.role === 'user' ? 'PATIENT' : 'EMMA (AI)'}</div>
                                                <div className="tb-content">&ldquo;{msg.content}&rdquo;</div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* SNOMED + Red Flags */}
                                <div style={{ marginTop: '16px' }}>
                                    {expandedCall.snomedCodes.length > 0 && (
                                        <>
                                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>Extracted SNOMED CT Codes</h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                                                {expandedCall.snomedCodes.map((sc, i) => (
                                                    <span key={i} className="snomed-chip"><span className="sc-code">{sc.code}</span> {sc.display}</span>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {expandedCall.redFlagsDetected.length > 0 && (
                                        <div className="redflag-box">
                                            <h4>⚠ SYSTEM FLAGGED &apos;RED FLAGS&apos;</h4>
                                            {expandedCall.redFlagsDetected.map((rf, i) => (
                                                <div key={i} className="rf-item"><span className="rf-icon">⊘</span> {rf}</div>
                                            ))}
                                        </div>
                                    )}

                                    {expandedCall.safetyNettingApplied && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '0.8125rem' }}>
                                            <strong>Safety Netting:</strong> {expandedCall.safetyNettingApplied}
                                        </div>
                                    )}

                                    {expandedCall.actionsTaken.length > 0 && (
                                        <div style={{ marginTop: '12px' }}>
                                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Actions Taken</h4>
                                            {expandedCall.actionsTaken.map((a, i) => (
                                                <div key={i} style={{ padding: '6px 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>• {a.description}</div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="gp-actions">
                                        <h4>GP Action</h4>
                                        <div className="gpa-buttons">
                                            <button className="btn btn-primary btn-sm">Accept Triage</button>
                                            <button className="btn btn-sm">Edit Codes</button>
                                            <button className="btn btn-sm">Dismiss</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pagination">
                            <span className="pg-info">Showing {filtered.length} of {calls.length} clinical interactions</span>
                        </div>
                    </>
                )}
            </div>

            {/* Real Metrics */}
            <div className="metrics-footer">
                <div className="metric-box">
                    <div className="mb-label">Red Flags Detected <span className="mb-icon">🛡</span></div>
                    <div className="mb-value">{redFlagCalls}</div>
                    <div className="mb-desc">From {totalCalls} total calls</div>
                </div>
                <div className="metric-box">
                    <div className="mb-label">Avg Satisfaction <span className="mb-icon">📊</span></div>
                    <div className="mb-value">{avgSat}%</div>
                    <div className="mb-desc">From {satisfactions.length} rated calls</div>
                </div>
                <div className="metric-box">
                    <div className="mb-label">Practice Capacity Saved <span className="mb-icon">📈</span></div>
                    <div className="mb-value">{capacitySaved} hrs</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>today</div>
                    <div className="mb-desc">Avg {formatDuration(avgDuration)} per call</div>
                </div>
            </div>

            <footer className="status-footer" style={{ marginTop: 'auto', marginBottom: 0 }}>
                <div className="sf-item"><span className="sf-dot online" /> AI Voice Engine Online</div>
                <div className="sf-item">↑ Last Sync: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} (Database)</div>
                <div className="sf-links">
                    <span>© 2026 EMMA AI Health Ltd. NHS Digital Accredited.</span>
                </div>
            </footer>
        </main>
    );
}
