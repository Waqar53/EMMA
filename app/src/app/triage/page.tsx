'use client';

import Link from 'next/link';

const QUEUE_ITEMS = [
    { priority: 'RED FLAG', priorityClass: 'badge-red-flag', name: 'Johnathan Doe', age: '65 M', nhs: '483 291 0041', summary: 'AI detected <hl>chest pain</hl> & <hl>shortness of breath</hl>. Patient has history of hypertension. Recommended immediate transfer to clinical lead.', wait: '2m 14s', waitUrgent: true, action: '📞 Take Call', actionClass: 'btn-take-call' },
    { priority: 'URGENT', priorityClass: 'badge-urgent', name: 'Jane Smith', age: '28 F', nhs: '993 002 8177', summary: 'Complex mental health medication interaction query. Patient reports mild dizziness but stable. Requires pharmacist review.', wait: '5m 45s', waitUrgent: false, action: '💬 Send SMS', actionClass: 'btn-send-sms' },
    { priority: 'STANDARD', priorityClass: 'badge-standard', name: 'Robert Brown', age: '45 M', nhs: '112 884 0932', summary: 'Requesting sick note extension for chronic back pain. System verification failed for auto-approval. Manual check needed.', wait: '12m 10s', waitUrgent: false, action: '✏ Action', actionClass: 'btn' },
];

export default function TriagePage() {
    return (
        <main className="page-content">
            <div className="page-header">
                <div>
                    <div className="ph-live"><div className="dot" /> LIVE QUEUE</div>
                    <h1>Patient Triage Queue</h1>
                    <p className="ph-desc">Real-time AI escalations requiring practice intervention</p>
                </div>
                <div className="ph-actions">
                    <button className="btn">⏸ Pause Intake</button>
                    <button className="btn btn-primary">🔄 Refresh Queue</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className="tab active">All Escalations <span className="tab-count">12</span></button>
                <button className="tab">High Priority <span className="tab-count">4</span></button>
                <button className="tab">Red Flags <span className="tab-count red">2</span></button>
                <button className="tab">Assigned to Me <span className="tab-count">3</span></button>
            </div>

            {/* Queue Table */}
            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Priority</th>
                            <th>Patient Details</th>
                            <th>AI Summary &amp; Context</th>
                            <th>Wait Time</th>
                            <th>Direct Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {QUEUE_ITEMS.map((item, i) => (
                            <tr key={i}>
                                <td><span className={`badge ${item.priorityClass}`}>{item.priority}</span></td>
                                <td>
                                    <div className="patient-name">{item.name}</div>
                                    <div className="patient-nhs">{item.age} • NHS: {item.nhs}</div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                        <span style={{ color: 'var(--brand-blue)', marginRight: '6px' }}>🤖</span>
                                        <span dangerouslySetInnerHTML={{ __html: item.summary.replace(/<hl>/g, '<span style="color:var(--red-500);font-weight:600;text-decoration:underline dotted">').replace(/<\/hl>/g, '</span>') }} />
                                    </div>
                                </td>
                                <td>
                                    <span className={`tr-wait ${item.waitUrgent ? 'urgent' : ''}`}>
                                        {item.waitUrgent ? '⏱ ' : '⏱ '}{item.wait}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button className={`btn btn-sm ${item.actionClass}`}>{item.action}</button>
                                        <button className="btn btn-sm" style={{ padding: '4px 8px' }}>👁</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                        <h4>Pre-Verified</h4>
                        <p>Patients are ID verified by AI before reaching the queue.</p>
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
                <div className="sf-item"><span className="sf-dot online" /> NHS Spine Link: Connected</div>
                <div className="sf-links">
                    <a href="#">Support</a>
                    <a href="#">System Health</a>
                </div>
            </footer>
        </main>
    );
}
