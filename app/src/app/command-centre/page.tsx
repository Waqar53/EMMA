'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Cpu, Bot, Globe, Brain, Sparkles, Megaphone, CalendarClock,
    FileText, Activity, CheckCircle2, XCircle, Clock, AlertTriangle,
    ShieldAlert, Zap, RefreshCw, ChevronRight, Play, Loader2,
    Shield, Send, Search, BarChart3
} from 'lucide-react';
import EmmaLogo from '@/components/EmmaLogo';

// ════ TYPE DEFS FOR API RESPONSES ═══

interface SystemStatus {
    agentExecutor: { toolCount: number; status: string };
    browserAgent: { sessionCount: number; allowedDomains: number; status: string };
    memory: { totalPatients: number; totalFacts: number; factsByLayer: Record<string, number>; status: string };
    selfImprove: { testCaseCount: number; lastRunResults: number; status: string };
    outreach: { campaignCount: number; ruleCount: number; status: string };
    schedule: { optimizationCount: number; dnaFactors: number; status: string };
    documents: { pendingReview: number; totalDocuments: number; status: string };
    healthMonitor: { activeAlerts: number; criticalCount: number; urgentCount: number; readingTypes: number; status: string };
}

// ═══ SUPERPOWER CONFIG ═══

const SUPERPOWERS = [
    { id: 'agent', label: 'Agent Executor', desc: 'Groq ReAct + 17 Tools', icon: Bot, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' },
    { id: 'browser', label: 'Browser Agent', desc: 'AI-Driven NHS Automation', icon: Globe, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
    { id: 'memory', label: 'Memory Store', desc: 'Groq Extraction + Persistence', icon: Brain, color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' },
    { id: 'improve', label: 'Self-Improve', desc: 'Real Safety Test Runner', icon: Sparkles, color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
    { id: 'outreach', label: 'Outreach', desc: 'AI-Generated Messages', icon: Megaphone, color: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
    { id: 'schedule', label: 'Schedule AI', desc: 'DNA Prediction + Gap-Fill', icon: CalendarClock, color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' },
    { id: 'documents', label: 'Doc Author', desc: 'AI Clinical Documents', icon: FileText, color: '#F97316', gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' },
    { id: 'health', label: 'Health Monitor', desc: 'Live Alert Processing', icon: Activity, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' },
];

// ═══ API HELPER ═══

async function callAPI(action: string, payload: Record<string, unknown> = {}) {
    const res = await fetch('/api/command-centre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    return res.json();
}

// ═══ STYLES ═══

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
    color: 'white', fontSize: '0.8125rem', outline: 'none',
};

const btnStyle = (color: string, disabled?: boolean): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: '10px', border: 'none', fontWeight: 600,
    fontSize: '0.75rem', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'rgba(255,255,255,0.05)' : color, color: 'white',
    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1, transition: 'all 0.2s',
});

const resultBoxStyle = (color: string): React.CSSProperties => ({
    marginTop: '16px', padding: '16px', borderRadius: '12px',
    background: `${color}08`, border: `1px solid ${color}22`,
    maxHeight: '400px', overflow: 'auto',
});

// ═══ MAIN PAGE ═══

export default function CommandCentrePage() {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [activePanel, setActivePanel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
        setLoading(true);
        fetch('/api/command-centre')
            .then(r => r.json())
            .then(d => { setStatus(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    if (loading || !status) {
        return (
            <main className="zyricon-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <EmmaLogo size={64} showText={false} />
                    <h2 style={{ fontSize: '1.5rem', color: 'white', fontWeight: 500, marginTop: '16px' }}>Initialising Superpowers...</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Loading 8 AI engines</p>
                </div>
            </main>
        );
    }

    const getStatusLine = (id: string) => {
        switch (id) {
            case 'agent': return `${status.agentExecutor.toolCount} tools ready`;
            case 'browser': return `${status.browserAgent.sessionCount} sessions • ${status.browserAgent.allowedDomains} domains`;
            case 'memory': return `${status.memory.totalPatients} patients • ${status.memory.totalFacts} facts`;
            case 'improve': return `${status.selfImprove.testCaseCount} tests • ${status.selfImprove.lastRunResults} results`;
            case 'outreach': return `${status.outreach.campaignCount} campaigns • ${status.outreach.ruleCount} rules`;
            case 'schedule': return `${status.schedule.optimizationCount} runs • ${status.schedule.dnaFactors} DNA factors`;
            case 'documents': return `${status.documents.pendingReview} pending • ${status.documents.totalDocuments} total`;
            case 'health': return `${status.healthMonitor.activeAlerts} alerts • ${status.healthMonitor.readingTypes} types`;
            default: return '';
        }
    };

    return (
        <main className="zyricon-main" style={{ padding: '24px 32px', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.02em' }}>
                        <Cpu size={28} /> Command Centre
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.8125rem' }}>
                        8 AI Superpowers — Real Groq-powered engines — Interactive controls
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '6px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', fontSize: '0.75rem', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} /> All Engines Ready
                    </div>
                    <button style={btnStyle('rgba(255,255,255,0.1)')} onClick={refresh}><RefreshCw size={14} /> Refresh</button>
                </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                {SUPERPOWERS.map(sp => {
                    const Icon = sp.icon;
                    const isActive = activePanel === sp.id;
                    return (
                        <div key={sp.id} onClick={() => setActivePanel(isActive ? null : sp.id)}
                            style={{ padding: '18px', background: isActive ? `${sp.color}11` : 'var(--bg-card)', border: `1px solid ${isActive ? sp.color + '44' : 'var(--border-subtle)'}`, borderRadius: '14px', cursor: 'pointer', transition: 'all 0.3s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: sp.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} color="white" />
                                </div>
                                <ChevronRight size={14} style={{ color: 'var(--text-muted)', transform: isActive ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
                            </div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{sp.label}</div>
                            <div style={{ fontSize: '0.625rem', color: sp.color, marginTop: '2px' }}>{sp.desc}</div>
                            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '4px' }}>{getStatusLine(sp.id)}</div>
                        </div>
                    );
                })}
            </div>

            {/* Expanded Action Panel */}
            {activePanel && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px', marginBottom: '24px', animation: 'fadeIn 0.3s' }}>
                    {activePanel === 'agent' && <AgentPanel />}
                    {activePanel === 'browser' && <BrowserPanel />}
                    {activePanel === 'memory' && <MemoryPanel />}
                    {activePanel === 'improve' && <SafetyPanel />}
                    {activePanel === 'outreach' && <OutreachPanel />}
                    {activePanel === 'schedule' && <SchedulePanel />}
                    {activePanel === 'documents' && <DocumentPanel />}
                    {activePanel === 'health' && <HealthPanel />}
                </div>
            )}
        </main>
    );
}

// ═══ SP1: AGENT EXECUTOR PANEL ═══

function AgentPanel() {
    const [input, setInput] = useState('');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const run = async () => {
        if (!input.trim()) return;
        setRunning(true); setResult(null);
        const res = await callAPI('execute-agent', { message: input });
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#8B5CF6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} /> Autonomous Agent Executor</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Type a patient request → AI plans the tool chain → executes each step via Groq</p>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input style={inputStyle} placeholder="e.g. Book an appointment for Sarah Jenkins who has a persistent cough" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} />
                <button style={btnStyle('#8B5CF6', running)} onClick={run} disabled={running}>
                    {running ? <Loader2 size={14} className="spin" /> : <Play size={14} />} {running ? 'Running...' : 'Execute'}
                </button>
            </div>
            {result && <ResultDisplay data={result} color="#8B5CF6" />}
        </div>
    );
}

// ═══ SP2: BROWSER PANEL ═══

function BrowserPanel() {
    const [task, setTask] = useState('');
    const [domain, setDomain] = useState('e-referral.nhs.uk');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const run = async () => {
        if (!task.trim()) return;
        setRunning(true); setResult(null);
        const res = await callAPI('browser-task', { task, domain });
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#3B82F6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={18} /> Browser Agent</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Describe an NHS system task → AI generates the complete browser action sequence</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input style={inputStyle} placeholder="e.g. Submit a 2-week-wait referral for suspected lung cancer" value={task} onChange={e => setTask(e.target.value)} />
                <select style={{ ...inputStyle, width: '200px' }} value={domain} onChange={e => setDomain(e.target.value)}>
                    <option value="e-referral.nhs.uk">eRS (e-Referral)</option>
                    <option value="spine.nhs.uk">NHS Spine</option>
                    <option value="gp-clinical.nhs.uk">GP Clinical</option>
                    <option value="emis.com">EMIS Web</option>
                </select>
                <button style={btnStyle('#3B82F6', running)} onClick={run} disabled={running}>
                    {running ? <Loader2 size={14} className="spin" /> : <Globe size={14} />} {running ? 'Generating...' : 'Run'}
                </button>
            </div>
            {result && <ResultDisplay data={result} color="#3B82F6" />}
        </div>
    );
}

// ═══ SP3: MEMORY PANEL ═══

function MemoryPanel() {
    const [text, setText] = useState('');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const extract = async () => {
        if (!text.trim()) return;
        setRunning(true); setResult(null);
        const res = await callAPI('extract-memory', { text, nhsNumber: '193 482 9103' });
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#EC4899', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Brain size={18} /> Long-Horizon Memory</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Paste conversation text → AI extracts patient facts → persists to memory file</p>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="e.g. Patient mentioned they prefer morning appointments, allergic to penicillin, works night shifts at a warehouse, and is anxious about blood tests" value={text} onChange={e => setText(e.target.value)} />
            <div style={{ marginTop: '10px' }}>
                <button style={btnStyle('#EC4899', running)} onClick={extract} disabled={running}>
                    {running ? <Loader2 size={14} className="spin" /> : <Search size={14} />} {running ? 'Extracting...' : 'Extract Facts'}
                </button>
            </div>
            {result && <ResultDisplay data={result} color="#EC4899" />}
        </div>
    );
}

// ═══ SP4: SAFETY TEST PANEL ═══

function SafetyPanel() {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const runAll = async () => {
        setRunning(true); setResult(null);
        const res = await callAPI('run-safety-tests');
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F59E0B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={18} /> Self-Improvement Engine</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>12 safety test cases → each sent through Groq as EMMA → AI judge evaluates pass/fail</p>
            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.6875rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} /> 100% red flag detection required to pass safety gate
            </div>
            <button style={btnStyle('#F59E0B', running)} onClick={runAll} disabled={running}>
                {running ? <Loader2 size={14} className="spin" /> : <Play size={14} />} {running ? 'Running 12 tests (this takes ~30s)...' : 'Run All Safety Tests'}
            </button>
            {result && <ResultDisplay data={result} color="#F59E0B" />}
        </div>
    );
}

// ═══ SP5: OUTREACH PANEL ═══

function OutreachPanel() {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const scan = async () => {
        setRunning(true); setResult(null);
        const res = await callAPI('run-outreach-scan');
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#10B981', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Megaphone size={18} /> Proactive Outreach</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Scans patient database → identifies patients needing contact → AI writes personalised messages</p>
            <button style={btnStyle('#10B981', running)} onClick={scan} disabled={running}>
                {running ? <Loader2 size={14} className="spin" /> : <Send size={14} />} {running ? 'Scanning & generating...' : 'Run Daily Outreach Scan'}
            </button>
            {result && <ResultDisplay data={result} color="#10B981" />}
        </div>
    );
}

// ═══ SP6: SCHEDULE PANEL ═══

function SchedulePanel() {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const optimize = async () => {
        setRunning(true); setResult(null);
        const res = await callAPI('optimize-schedule');
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#06B6D4', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarClock size={18} /> Schedule Optimizer</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Generates today&apos;s schedule → 8-factor DNA risk scoring → AI gap-fill SMS messages</p>
            <button style={btnStyle('#06B6D4', running)} onClick={optimize} disabled={running}>
                {running ? <Loader2 size={14} className="spin" /> : <BarChart3 size={14} />} {running ? 'Optimizing...' : 'Optimize Today\'s Schedule'}
            </button>
            {result && <ResultDisplay data={result} color="#06B6D4" />}
        </div>
    );
}

// ═══ SP7: DOCUMENT PANEL ═══

function DocumentPanel() {
    const [docType, setDocType] = useState('referral_letter');
    const [patient, setPatient] = useState('');
    const [context, setContext] = useState('');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const draft = async () => {
        if (!context.trim()) return;
        setRunning(true); setResult(null);
        const res = await callAPI('generate-document', {
            type: docType, nhsNumber: '193 482 9103',
            patientName: patient || 'Sarah Jenkins',
            clinicalContext: context,
        });
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F97316', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> Clinical Document Author</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Select document type → provide clinical context → AI drafts full NHS document</p>
            <div style={{ padding: '10px 14px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.6875rem', color: '#F97316', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} /> HARD LOCK: No document sent without GP_APPROVED status
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select style={{ ...inputStyle, width: '200px' }} value={docType} onChange={e => setDocType(e.target.value)}>
                    <option value="referral_letter">Referral Letter</option>
                    <option value="fit_note">Fit Note (MED3)</option>
                    <option value="two_week_wait">2-Week Wait (Cancer)</option>
                    <option value="insurance_report">Insurance Report</option>
                    <option value="care_plan">Care Plan</option>
                    <option value="discharge_summary">Discharge Summary</option>
                </select>
                <input style={inputStyle} placeholder="Patient name" value={patient} onChange={e => setPatient(e.target.value)} />
            </div>
            <textarea style={{ ...inputStyle, height: '60px', resize: 'vertical' }} placeholder="e.g. 65-year-old male with persistent cough >3 weeks, weight loss 5kg, ex-smoker 30 pack-years. CXR shows 3cm right upper lobe mass." value={context} onChange={e => setContext(e.target.value)} />
            <div style={{ marginTop: '10px' }}>
                <button style={btnStyle('#F97316', running)} onClick={draft} disabled={running}>
                    {running ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} {running ? 'AI drafting...' : 'Draft Document'}
                </button>
            </div>
            {result && <DocumentResult data={result} />}
        </div>
    );
}

// ═══ SP8: HEALTH MONITOR PANEL ═══

function HealthPanel() {
    const [readingType, setReadingType] = useState('blood_pressure_systolic');
    const [value, setValue] = useState('');
    const [name, setName] = useState('');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<Record<string, unknown> | null>(null);

    const submit = async () => {
        if (!value) return;
        setRunning(true); setResult(null);
        const res = await callAPI('process-reading', {
            nhsNumber: '193 482 9103',
            patientName: name || 'Sarah Jenkins',
            readingType, value: parseFloat(value),
        });
        setResult(res.data || res);
        setRunning(false);
    };

    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#EF4444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} /> Health Data Monitor</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Submit a reading → threshold evaluation → Groq AI contextualises the alert</p>
            <div style={{ display: 'flex', gap: '10px' }}>
                <select style={{ ...inputStyle, width: '220px' }} value={readingType} onChange={e => setReadingType(e.target.value)}>
                    <option value="blood_pressure_systolic">BP Systolic (mmHg)</option>
                    <option value="blood_pressure_diastolic">BP Diastolic (mmHg)</option>
                    <option value="heart_rate">Heart Rate (bpm)</option>
                    <option value="blood_glucose">Blood Glucose (mmol/L)</option>
                    <option value="spo2">SpO2 (%)</option>
                    <option value="temperature">Temperature (°C)</option>
                </select>
                <input style={{ ...inputStyle, width: '120px' }} type="number" placeholder="Value" value={value} onChange={e => setValue(e.target.value)} />
                <input style={inputStyle} placeholder="Patient name" value={name} onChange={e => setName(e.target.value)} />
                <button style={btnStyle('#EF4444', running)} onClick={submit} disabled={running}>
                    {running ? <Loader2 size={14} className="spin" /> : <Activity size={14} />} {running ? 'Processing...' : 'Submit'}
                </button>
            </div>
            {result && <ResultDisplay data={result} color="#EF4444" />}
        </div>
    );
}

// ═══ RESULT DISPLAY COMPONENTS ═══

function ResultDisplay({ data, color }: { data: Record<string, unknown>; color: string }) {
    return (
        <div style={resultBoxStyle(color)}>
            <pre style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'monospace', lineHeight: 1.5 }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

function DocumentResult({ data }: { data: Record<string, unknown> }) {
    const content = (data as { content?: string }).content || '';
    const status = (data as { status?: string }).status || '';
    return (
        <div style={resultBoxStyle('#F97316')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{(data as { title?: string }).title || 'Document'}</span>
                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.625rem', fontWeight: 700, background: status === 'GP_APPROVED' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: status === 'GP_APPROVED' ? '#22C55E' : '#F59E0B' }}>{status.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'serif' }}>
                {content}
            </div>
        </div>
    );
}
