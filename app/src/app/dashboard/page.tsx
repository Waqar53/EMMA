'use client';

import Link from 'next/link';

const LIVE_CALLS = [
    { name: 'Sarah J.', badge: 'triage', badgeLabel: 'TRIAGE', snippet: '"Experiencing shortness of breath and chest discomfort..."', time: '02:45 mins', status: 'Monitor Live', statusClass: 'escalating', redline: true },
    { name: 'Robert W.', badge: 'booking', badgeLabel: 'BOOKING', snippet: '"Confirming blood test appointment for Tuesday morning."', time: '01:12 mins', status: '✓ SUCCESS', statusClass: 'success', redline: false },
    { name: 'Maya K.', badge: 'admin', badgeLabel: 'ADMIN', snippet: '"Requesting a copy of last week\'s prescription refill."', time: '00:45 mins', status: 'PROCESSING', statusClass: 'processing', redline: false },
    { name: 'David L.', badge: 'triage', badgeLabel: 'TRIAGE', snippet: '"Skin rash developed after starting new medication..."', time: '04:10 mins', status: 'ESCALATING', statusClass: 'escalating', redline: false },
];

const CHART_DATA = [
    { label: 'Mon', height: 60 },
    { label: 'Tue', height: 75 },
    { label: 'Wed', height: 90 },
    { label: 'Thu (Today)', height: 85, today: true },
    { label: 'Fri', height: 0 },
    { label: 'Sat', height: 0 },
    { label: 'Sun', height: 0 },
];

export default function DashboardPage() {
    return (
        <>
            <main className="page-content">
                <div className="page-header">
                    <div>
                        <h1>Practice Overview</h1>
                        <p className="ph-sub">Welcome back, Dr. Khan. Here is the real-time performance of the NHS AI triage system.</p>
                    </div>
                    <div className="ph-actions">
                        <button className="btn">📅 Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</button>
                        <button className="btn">⬇ Export Report</button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon">📞</div>
                        <div className="kpi-label">Total Calls Answered</div>
                        <div className="kpi-value">1,248</div>
                        <div className="kpi-change up">↗ +5.2% from yesterday</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-icon">⏱</div>
                        <div className="kpi-label">Avg. Wait Time</div>
                        <div className="kpi-value">08s</div>
                        <div className="kpi-change up">↘ -2s improvement</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-icon">✓</div>
                        <div className="kpi-label">Resolution Rate</div>
                        <div className="kpi-value">84%</div>
                        <div className="kpi-change up">↗ +1.5% this week</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-icon">🔴</div>
                        <div className="kpi-label">Red Flags</div>
                        <div className="kpi-value">2</div>
                        <div className="kpi-change down">↗ +1 since AM</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid-2col">
                    {/* Capacity Chart */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h3>Capacity Saved (Receptionist Hours)</h3>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Total hours saved per day through AI automation</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-blue)' }}>42 hrs</div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>AVG DAILY SAVINGS</div>
                            </div>
                        </div>
                        <div className="chart-area">
                            {CHART_DATA.map((d, i) => (
                                <div key={i} className={`chart-bar ${d.today ? 'today' : ''}`} style={{ height: `${d.height}%`, opacity: d.height === 0 ? 0.2 : 1 }} />
                            ))}
                        </div>
                        <div className="chart-labels">
                            {CHART_DATA.map((d, i) => (
                                <span key={i} className={d.today ? 'today' : ''}>{d.label}</span>
                            ))}
                        </div>
                    </div>

                    {/* Live Activity */}
                    <div className="card">
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--red-500)', fontSize: '0.5rem' }}>●</span>
                                <h3>Live Activity</h3>
                            </div>
                            <span className="badge badge-standard">12 Active</span>
                        </div>
                        <div className="card-body" style={{ padding: '12px 16px', maxHeight: '340px', overflowY: 'auto' }}>
                            {LIVE_CALLS.map((call, i) => (
                                <div key={i} className={`live-card ${call.redline ? 'redline' : ''}`}>
                                    <div className="lc-header">
                                        <span className="lc-patient">Patient: {call.name}</span>
                                        <span className={`badge badge-${call.badge}`}>{call.badgeLabel}</span>
                                    </div>
                                    <div className="lc-snippet">{call.snippet}</div>
                                    <div className="lc-footer">
                                        <span>⏱ {call.time}</span>
                                        <span className={`lc-status ${call.statusClass}`}>{call.status}</span>
                                    </div>
                                </div>
                            ))}
                            <div style={{ textAlign: 'center', marginTop: '8px' }}>
                                <Link href="/triage" className="lc-action">View All Activity</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sentiment Chart */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <div>
                            <h3>Patient Sentiment Trend</h3>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Post-call satisfaction score tracking</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--green-500)' }}>92%</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>POSITIVE FEEDBACK</div>
                        </div>
                    </div>
                    <div style={{ padding: '20px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 500 80" style={{ width: '100%', height: '100%' }}>
                            <path d="M 0 60 C 50 60, 80 70, 100 50 C 120 30, 150 20, 200 25 C 250 30, 280 15, 320 10 C 360 5, 380 15, 400 10 C 420 5, 450 8, 500 5" fill="none" stroke="#3B82F6" strokeWidth="2.5" />
                            <path d="M 0 60 C 50 60, 80 70, 100 50 C 120 30, 150 20, 200 25 C 250 30, 280 15, 320 10 C 360 5, 380 15, 400 10 C 420 5, 450 8, 500 5 L 500 80 L 0 80 Z" fill="url(#gradient)" opacity="0.15" />
                            <defs><linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
                        </svg>
                    </div>
                    <div className="chart-labels">
                        <span>WEEK 1</span><span>WEEK 2</span><span>WEEK 3</span><span>WEEK 4</span>
                    </div>
                </div>
            </main>

            {/* Status Footer */}
            <footer className="status-footer">
                <div className="sf-item"><span className="sf-dot online" /> AI Core: Online</div>
                <div className="sf-item"><span className="sf-dot online" /> NHS Spine Link: Connected</div>
                <div className="sf-item">Last updated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                <div className="sf-links">
                    <a href="#">Support</a>
                    <a href="#">System Health</a>
                    <a href="#">Privacy Policy</a>
                </div>
            </footer>
        </>
    );
}
