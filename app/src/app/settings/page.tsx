'use client';

import TopNav from '@/components/TopNav';
import Link from 'next/link';
import { useState } from 'react';

export default function SettingsPage() {
    const [escalation999, setEscalation999] = useState(true);
    const [redFlagScreening, setRedFlagScreening] = useState(true);

    return (
        <>
            <TopNav />
            <div className="page-layout">
                <aside className="page-sidebar">
                    <div style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>St. Mary&apos;s Health</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>NHS Primary Care Center (ID: 4429)</div>
                    </div>
                    <button className="sidebar-link active"><span className="link-icon">🎙</span><span>Voice &amp; Language</span></button>
                    <button className="sidebar-link"><span className="link-icon">◇</span><span>Clinical Protocols</span></button>
                    <button className="sidebar-link"><span className="link-icon">📅</span><span>Appointment Booking</span></button>
                    <button className="sidebar-link"><span className="link-icon">📄</span><span>Knowledge Base</span></button>
                    <button className="sidebar-link"><span className="link-icon">🔗</span><span>System Integration</span></button>
                    <button className="sidebar-link"><span className="link-icon">🔒</span><span>Privacy &amp; GDPR</span></button>
                </aside>

                <main className="page-content">
                    <div className="page-header">
                        <div>
                            <h1>AI Agent Configuration</h1>
                            <p className="ph-desc">Customize EMMA&apos;s personality, clinical safety rules, and internal practice logic to best serve your patients.</p>
                        </div>
                    </div>

                    {/* Voice & Language Settings */}
                    <div className="setting-section">
                        <div className="ss-header">
                            <div className="ss-icon">🎙</div>
                            <h3>Voice &amp; Language Settings</h3>
                            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>Save Changes</button>
                        </div>

                        <div className="grid-2col">
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '12px' }}>Default Accent Profile</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div className="accent-card selected">
                                        <div className="ac-icon">🎤</div>
                                        <div>
                                            <div className="ac-name">British Standard (RP)</div>
                                            <div className="ac-desc">Clear, professional, neutral</div>
                                        </div>
                                        <span className="ac-check">✓</span>
                                    </div>
                                    <div className="accent-card">
                                        <div className="ac-icon">🎤</div>
                                        <div>
                                            <div className="ac-name">Regional - London/Estuary</div>
                                            <div className="ac-desc">Approachable, friendly</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>Multi-Language Support</div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginBottom: '12px' }}>Enable AI translation for patients whose primary language is not English.</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                    <span className="lang-tag">Urdu <span className="lt-remove">✕</span></span>
                                    <span className="lang-tag">Punjabi <span className="lt-remove">✕</span></span>
                                    <span className="lang-tag">Polish <span className="lt-remove">✕</span></span>
                                </div>
                                <button className="btn btn-sm" style={{ color: 'var(--blue-600)', borderColor: 'var(--blue-600)' }}>+ Add Language</button>
                            </div>
                        </div>
                    </div>

                    {/* Safety Toggles */}
                    <div className="grid-2col" style={{ marginTop: 0 }}>
                        <div className="safety-toggle">
                            <div className="st-icon red">✳</div>
                            <div className="st-text">
                                <h4>Immediate 999 Escalation</h4>
                                <p>AI will immediately transfer caller to emergency services if chest pain or stroke symptoms are mentioned.</p>
                            </div>
                            <button className={`toggle ${escalation999 ? 'active' : ''}`} onClick={() => setEscalation999(!escalation999)} />
                        </div>
                        <div className="safety-toggle">
                            <div className="st-icon orange">🛡</div>
                            <div className="st-text">
                                <h4>Red Flag Screening</h4>
                                <p>Force clinical triage questionnaire for all minor injury booking requests.</p>
                            </div>
                            <button className={`toggle ${redFlagScreening ? 'active' : ''}`} onClick={() => setRedFlagScreening(!redFlagScreening)} />
                        </div>
                    </div>

                    {/* Knowledge Base */}
                    <div className="setting-section">
                        <div className="ss-header">
                            <div className="ss-icon">📄</div>
                            <h3>Practice Knowledge Base</h3>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                <button className="btn btn-sm">Import PDF/Doc</button>
                                <button className="btn btn-primary btn-sm">+ New Article</button>
                            </div>
                        </div>

                        <div className="kb-article">
                            <span className="kba-icon">🕐</span>
                            <div>
                                <div className="kba-title">Opening Hours &amp; Bank Holidays</div>
                                <div className="kba-meta">Updated 2 days ago • Public</div>
                            </div>
                            <span className="kba-arrow">›</span>
                        </div>
                        <div className="kb-article">
                            <span className="kba-icon">🅿</span>
                            <div>
                                <div className="kba-title">Parking &amp; Accessibility</div>
                                <div className="kba-meta">Updated 1 month ago • Public</div>
                            </div>
                            <span className="kba-arrow">›</span>
                        </div>
                        <div className="kb-article">
                            <span className="kba-icon">💊</span>
                            <div>
                                <div className="kba-title">Prescription Collection Policy</div>
                                <div className="kba-meta">Updated 1 week ago • Public</div>
                            </div>
                            <span className="kba-arrow">›</span>
                        </div>
                        <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <a href="#" style={{ color: 'var(--blue-600)', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none' }}>View all 24 knowledge articles</a>
                        </div>
                    </div>

                    {/* Appointment Mapping Rules */}
                    <div className="setting-section">
                        <div className="ss-header">
                            <div className="ss-icon">📅</div>
                            <h3>Appointment Mapping Rules</h3>
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Symptom/Request Type</th>
                                    <th>Clinician Mapping</th>
                                    <th>EMIS Slot Type</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>New Persistent Cough</td>
                                    <td>GP / Lead Nurse</td>
                                    <td><code style={{ fontSize: '0.6875rem', padding: '2px 6px', background: 'var(--gray-100)', borderRadius: '4px' }}>15MIN_FACE</code></td>
                                    <td><span style={{ color: 'var(--green-600)', fontWeight: 600, fontSize: '0.8125rem' }}>● Active</span></td>
                                </tr>
                                <tr>
                                    <td>Medication Review</td>
                                    <td>Clinical Pharmacist</td>
                                    <td><code style={{ fontSize: '0.6875rem', padding: '2px 6px', background: 'var(--gray-100)', borderRadius: '4px' }}>TEL_REVIEW</code></td>
                                    <td><span style={{ color: 'var(--green-600)', fontWeight: 600, fontSize: '0.8125rem' }}>● Active</span></td>
                                </tr>
                                <tr>
                                    <td>Child Immunisation</td>
                                    <td>Practice Nurse</td>
                                    <td><code style={{ fontSize: '0.6875rem', padding: '2px 6px', background: 'var(--gray-100)', borderRadius: '4px' }}>IMMUN_SLOT</code></td>
                                    <td><span style={{ color: 'var(--gray-400)', fontWeight: 500, fontSize: '0.8125rem' }}>● Disabled</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Version Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: '0.6875rem', color: 'var(--gray-400)' }}>
                        <div>
                            <span style={{ background: 'var(--gray-100)', padding: '4px 10px', borderRadius: '6px', fontWeight: 500 }}>CURRENT VERSION</span>
                            <span style={{ marginLeft: '8px', fontWeight: 600, color: 'var(--gray-600)' }}>EMMA v2.4.12</span>
                            <span style={{ marginLeft: '6px', padding: '2px 8px', background: 'var(--green-50)', color: 'var(--green-600)', borderRadius: '4px', fontWeight: 600 }}>LIVE</span>
                        </div>
                    </div>
                </main>
            </div>

            <footer className="status-footer">
                <div className="sf-item"><span className="sf-dot online" /> AI Voice Engine Online</div>
                <div className="sf-item">↑ Last Sync: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} (EMIS Web)</div>
                <div className="sf-links">
                    <span>© 2024 EMMA AI Health Ltd. NHS Digital Accredited.</span>
                </div>
            </footer>
        </>
    );
}
