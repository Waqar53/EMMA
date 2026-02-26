'use client';

import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function CallsPage() {
    return (
        <>
            <TopNav />
            <div className="page-layout">
                <aside className="page-sidebar">
                    <div className="sidebar-section-label">Clinical Portal</div>
                    <div style={{ padding: '0 20px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--blue-600)' }}>DCB0129 COMPLIANCE</div>
                    </div>
                    <Link href="/dashboard" className="sidebar-link"><span className="link-icon">📊</span><span>Overview</span></Link>
                    <Link href="/calls" className="sidebar-link active"><span className="link-icon">📋</span><span>Call Audit</span></Link>
                    <button className="sidebar-link"><span className="link-icon">⚠</span><span>Risk Governance</span></button>
                    <button className="sidebar-link"><span className="link-icon">✓</span><span>Compliance</span></button>
                    <button className="sidebar-link"><span className="link-icon">🛡</span><span>Patient Safety</span></button>
                    <Link href="/settings" className="sidebar-link"><span className="link-icon">⚙️</span><span>Settings</span></Link>
                </aside>

                <main className="page-content">
                    <div className="page-header">
                        <div>
                            <h1>Call Audit &amp; Governance</h1>
                            <p className="ph-desc">Review AI clinical triage sessions and patient compliance metrics.</p>
                        </div>
                        <div className="ph-actions">
                            <button className="btn">⬇ Export Audit Log</button>
                            <button className="btn btn-primary">🔍 Filters</button>
                        </div>
                    </div>

                    <div className="tabs">
                        <button className="tab active">All Calls</button>
                        <button className="tab">Clinical Triage</button>
                        <button className="tab">Prescriptions</button>
                        <button className="tab">Administrative</button>
                    </div>

                    {/* Expandable Call Detail */}
                    <div className="card" style={{ marginBottom: '20px' }}>
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
                                {/* Featured Row - Expanded */}
                                <tr style={{ background: 'var(--gray-50)' }}>
                                    <td>
                                        <div className="patient-name">Sarah Jenkins</div>
                                        <div className="patient-nhs">NHS: 485 922 1044</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>Today, 09:42</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>Duration: 4m 12s</div>
                                    </td>
                                    <td><span className="badge badge-triage">Clinical Triage</span></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span className="badge badge-emergency">● EMERGENCY</span>
                                            <span style={{ color: 'var(--gray-400)', cursor: 'pointer' }}>⏱</span>
                                        </div>
                                    </td>
                                    <td><span style={{ color: 'var(--red-600)', fontWeight: 600, fontSize: '0.8125rem' }}>Requires GP<br />Review</span></td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Expanded Detail */}
                        <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid var(--gray-100)' }}>
                            {/* Left - Transcript */}
                            <div className="transcript-section">
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', marginBottom: '12px', marginTop: '16px' }}>Call Transcript</h4>

                                <div className="transcript-bubble emma-msg">
                                    <div className="tb-label emma">EMMA (AI)</div>
                                    <div className="tb-content">&ldquo;Hello Sarah. I&apos;m EMMA. How can I help you today?&rdquo;</div>
                                </div>

                                <div className="transcript-bubble patient-msg">
                                    <div className="tb-label patient">PATIENT</div>
                                    <div className="tb-content">
                                        &ldquo;I&apos;m having some <span className="highlight">sharp chest pains</span> that started about 20 minutes ago. It&apos;s radiating down my left arm.&rdquo;
                                    </div>
                                </div>

                                <div className="transcript-bubble emma-msg">
                                    <div className="tb-label emma">EMMA (AI)</div>
                                    <div className="tb-content">
                                        [Protocol: Cardiac Emergency initiated] &ldquo;I&apos;m concerned about those symptoms. Do you feel breathless or nauseous?&rdquo;
                                    </div>
                                </div>

                                <div className="transcript-bubble patient-msg">
                                    <div className="tb-label patient">PATIENT</div>
                                    <div className="tb-content">
                                        &ldquo;Yes, very <span className="highlight">short of breath</span>.&rdquo;
                                    </div>
                                </div>
                            </div>

                            {/* Right - SNOMED + Red Flags */}
                            <div style={{ marginTop: '16px' }}>
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', marginBottom: '12px' }}>Extracted SNOMED CT Codes</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                                    <span className="snomed-chip"><span className="sc-code">29857009</span> Chest pain</span>
                                    <span className="snomed-chip"><span className="sc-code">267036007</span> Dyspnea</span>
                                    <span className="snomed-chip flagged"><span className="sc-code">41940003</span> Myocardial infarction suspect</span>
                                </div>

                                <div className="redflag-box">
                                    <h4>⚠ SYSTEM FLAGGED &apos;RED FLAGS&apos;</h4>
                                    <div className="rf-item"><span className="rf-icon">⊘</span> Cardiac-related chest pain radiating to arm.</div>
                                    <div className="rf-item"><span className="rf-icon">⊘</span> Acute respiratory distress.</div>
                                </div>

                                <div className="gp-actions">
                                    <h4>GP Action Taken</h4>
                                    <div className="gpa-buttons">
                                        <button className="btn btn-primary btn-sm">Accept Triage &amp; Alert 999</button>
                                        <button className="btn btn-sm">Edit Codes</button>
                                        <button className="btn btn-sm">Dismiss</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* More rows */}
                        <table className="data-table">
                            <tbody>
                                <tr>
                                    <td>
                                        <div className="patient-name">David Miller</div>
                                        <div className="patient-nhs">NHS: 912 338 4851</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>Today, 08:15</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>Duration: 2m 45s</div>
                                    </td>
                                    <td><span className="badge badge-prescription">Prescription</span></td>
                                    <td><span className="badge badge-routine">ROUTINE</span></td>
                                    <td><span className="badge-success">✓ AI Fulfilled</span></td>
                                </tr>
                                <tr>
                                    <td>
                                        <div className="patient-name">Linda Thompson</div>
                                        <div className="patient-nhs">NHS: 224 881 3092</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>Yesterday, 17:30</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>Duration: 6m 08s</div>
                                    </td>
                                    <td><span className="badge badge-triage">Clinical Triage</span></td>
                                    <td><span className="badge badge-urgent">URGENT</span></td>
                                    <td><span style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>⏱ GP Audited</span></td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="pagination">
                            <span className="pg-info">Showing 1-15 of 248 clinical interactions</span>
                            <div className="pg-btns">
                                <button className="pg-btn">Previous</button>
                                <button className="pg-btn active">1</button>
                                <button className="pg-btn">2</button>
                                <button className="pg-btn">Next</button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Metrics */}
                    <div className="metrics-footer">
                        <div className="metric-box">
                            <div className="mb-label">Clinical Safety Score <span className="mb-icon">🛡</span></div>
                            <div className="mb-value">99.8%</div>
                            <div className="mb-trend">+0.2%</div>
                            <div className="mb-desc">DCB0129 Target: &gt;99.5%</div>
                        </div>
                        <div className="metric-box">
                            <div className="mb-label">AI Triage Accuracy <span className="mb-icon">📊</span></div>
                            <div className="mb-value">94.2%</div>
                            <div className="mb-trend">+1.5%</div>
                            <div className="mb-desc">Verified against GP Audit samples</div>
                        </div>
                        <div className="metric-box">
                            <div className="mb-label">Practice Capacity Saved <span className="mb-icon">📈</span></div>
                            <div className="mb-value">42 hrs</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>this week</div>
                            <div className="mb-desc">Equivalent to ~1.2 FTE staff</div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
