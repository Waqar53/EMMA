'use client';

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { HeartPulse, Brain, Droplets, Thermometer, Calendar, Pill, FlaskConical, Clock, User, Stethoscope, ClipboardList, ShieldAlert, Mic, ArrowUp, Paperclip, Settings, Volume2, AlertTriangle, RefreshCw, ChevronLeft, ChevronDown, CheckCircle2, X, PhoneCall, Zap, ChevronRight } from 'lucide-react';
import EmmaLogo from '@/components/EmmaLogo';
import { useVoice } from '@/hooks/useVoice';
import { ConversationState, AgentType, IntentType, UrgencyLevel } from '@/lib/types';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
        agent?: AgentType;
        intent?: IntentType;
        urgency?: UrgencyLevel;
        redFlags?: string[];
        safetyNetting?: string;
        snomedCodes?: { code: string; display: string; isRedFlag?: boolean }[];
        patientVerified?: boolean;
        actionsPerformed?: { type: string; description: string; details?: Record<string, unknown> }[];
    };
}

const SCENARIOS = [
    { icon: <HeartPulse size={16} />, label: 'Chest Pain', msg: "I've been having really bad chest pains for about 20 minutes. It feels like a heaviness and my left arm is tingling." },
    { icon: <Brain size={16} />, label: 'Mental Health', msg: "I've been feeling really low lately. I can't see the point anymore and I've been thinking about ending it all." },
    { icon: <Droplets size={16} />, label: 'UTI', msg: "Hi, I think I might have a water infection. I've been having a burning sensation and going to the toilet a lot more." },
    { icon: <Thermometer size={16} />, label: 'Headache', msg: "I've had a terrible headache for 3 days that won't go away, even with paracetamol. I'm also feeling dizzy." },
    { icon: <Calendar size={16} />, label: 'Appointment', msg: "Hi, I'd like to book a GP appointment please. Nothing urgent, I just need a general check-up." },
    { icon: <Pill size={16} />, label: 'Prescription', msg: "I need to order my repeat prescription. My name is Margaret Wilson, date of birth 18th March 1954. I need my Amlodipine." },
    { icon: <FlaskConical size={16} />, label: 'Test Results', msg: "I'm David Patel, born 3rd December 1975. I had blood tests last week and I'm calling for the results." },
    { icon: <Clock size={16} />, label: 'Hours', msg: "What time are you open? And where is the nearest pharmacy?" },
    { icon: <User size={16} />, label: 'Human', msg: "I'd rather speak to a real person please." },
];

const AGENTS: Record<string, { icon: ReactNode; label: string; color: string }> = {
    orchestrator: { icon: <Brain size={16} />, label: 'Orchestrator', color: '#7C3AED' },
    triage: { icon: <Stethoscope size={16} />, label: 'Clinical Triage', color: '#3B82F6' },
    appointment: { icon: <Calendar size={16} />, label: 'Appointments', color: '#22C55E' },
    prescription: { icon: <Pill size={16} />, label: 'Prescriptions', color: '#F97316' },
    test_results: { icon: <FlaskConical size={16} />, label: 'Test Results', color: '#14B8A6' },
    admin: { icon: <ClipboardList size={16} />, label: 'Admin', color: '#8B5CF6' },
    escalation: { icon: <ShieldAlert size={16} />, label: 'Escalation', color: '#EF4444' },
};

const URG: Record<string, string> = { EMERGENCY: '#EF4444', URGENT: '#F59E0B', SOON: '#3B82F6', ROUTINE: '#22C55E' };

export default function DemoPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'greet', role: 'assistant',
        content: `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, you've reached Riverside Medical Centre. My name's EMMA, and I'm here to help. How can I help you today?`,
        timestamp: new Date().toISOString(),
        metadata: { agent: 'orchestrator' },
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [convState, setConvState] = useState<ConversationState | null>(null);
    const [meta, setMeta] = useState<ChatMessage['metadata']>({});
    const [syms, setSyms] = useState<{ code: string; display: string; isRedFlag?: boolean }[]>([]);
    const [acts, setActs] = useState<{ type: string; description: string }[]>([]);
    const [rfs, setRfs] = useState<string[]>([]);
    const [showVoicePanel, setShowVoicePanel] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [cortexMode, setCortexMode] = useState(true);
    const [cortexPlan, setCortexPlan] = useState<{ step: number; tool: string; result: string; success: boolean; durationMs: number }[] | null>(null);
    const [selfScore, setSelfScore] = useState<number | null>(null);
    const [showVersionMenu, setShowVersionMenu] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const voice = useVoice();

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        if (voice.voiceEnabled && voice.autoSpeak && messages.length === 1) {
            setTimeout(() => voice.speak(messages[0].content), 500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voice.availableVoices]);

    useEffect(() => {
        if (voice.isListening && voice.transcript) setInput(voice.transcript);
    }, [voice.transcript, voice.isListening]);

    useEffect(() => {
        if (!voice.isListening && voice.transcript.trim()) send(voice.transcript.trim());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voice.isListening]);

    const send = useCallback(async (text: string) => {
        if (!text.trim() || loading) return;
        const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
        setMessages(p => [...p, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const endpoint = cortexMode ? '/api/cortex' : '/api/chat';
            const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text.trim(), conversationState: convState }) });
            const d = await res.json();

            if (d.error) {
                setMessages(p => [...p, { id: `e${Date.now()}`, role: 'assistant', content: d.error, timestamp: new Date().toISOString() }]);
            } else {
                const aMsg: ChatMessage = { id: `a${Date.now()}`, role: 'assistant', content: d.response, timestamp: new Date().toISOString(), metadata: d.metadata };
                setMessages(p => [...p, aMsg]);
                setConvState(d.conversationState);
                setMeta(d.metadata || {});
                if (d.plan?.steps) setCortexPlan(d.plan.steps);
                if (d.evaluation?.overallScore) setSelfScore(d.evaluation.overallScore);

                if (d.metadata?.snomedCodes) setSyms(p => { const s = new Set(p.map(x => x.code)); return [...p, ...d.metadata.snomedCodes.filter((c: { code: string }) => !s.has(c.code))]; });
                if (d.metadata?.actionsPerformed) setActs(p => [...p, ...d.metadata.actionsPerformed]);
                if (d.metadata?.redFlags) setRfs(p => { const s = new Set(p); return [...p, ...d.metadata.redFlags.filter((r: string) => !s.has(r))]; });

                if (voice.voiceEnabled && voice.autoSpeak) voice.speak(d.response);
            }
        } catch {
            setMessages(p => [...p, { id: `e${Date.now()}`, role: 'assistant', content: "I apologize, I'm experiencing a temporary issue. Let me transfer you to a receptionist.", timestamp: new Date().toISOString() }]);
        }
        setLoading(false);
        inputRef.current?.focus();
    }, [loading, convState, voice, cortexMode]);

    const reset = () => {
        voice.stopSpeaking();
        const greeting = `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, you've reached Riverside Medical Centre. My name's EMMA, and I'm here to help. How can I help you today?`;
        setMessages([{ id: 'greet', role: 'assistant', content: greeting, timestamp: new Date().toISOString(), metadata: { agent: 'orchestrator' } }]);
        setConvState(null); setMeta({}); setSyms([]); setActs([]); setRfs([]); setInput('');
        setCortexPlan(null); setSelfScore(null);
        if (voice.voiceEnabled && voice.autoSpeak) setTimeout(() => voice.speak(greeting), 300);
    };

    const handleMicClick = () => {
        if (voice.isListening) voice.stopListening();
        else voice.startListening();
    };

    const ag = AGENTS[meta?.agent || 'orchestrator'];

    return (
        <main className="zyricon-chat-layout" style={{ display: 'flex', height: '100%', position: 'relative', width: '100%', overflow: 'hidden' }}>
            {/* ═══ Chat Main ═══ */}
            <div className="z-chat-container">
                {/* Top Right Header (Zyricon style config dropdown area) */}
                <div style={{ padding: '24px 32px 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => setShowVersionMenu(!showVersionMenu)} style={{ padding: '8px 16px', background: cortexMode ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.8125rem', color: cortexMode ? '#A78BFA' : 'var(--text-secondary)', border: `1px solid ${cortexMode ? 'rgba(124,58,237,0.3)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                            {cortexMode ? <Zap size={14} /> : <Brain size={14} />}
                            <span>{cortexMode ? 'EMMA Cortex v5.0' : 'EMMA Core v4.0'}</span>
                            <ChevronDown size={14} />
                        </div>
                        {showVersionMenu && (
                            <div style={{ position: 'absolute', top: '40px', left: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '8px 0', zIndex: 100, minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                                <div onClick={() => { setCortexMode(false); setShowVersionMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: !cortexMode ? '#A78BFA' : 'var(--text-secondary)' }}>
                                    <Brain size={14} /> EMMA Core v4.0 <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Linear</span>
                                </div>
                                <div onClick={() => { setCortexMode(true); setShowVersionMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: cortexMode ? '#A78BFA' : 'var(--text-secondary)' }}>
                                    <Zap size={14} /> EMMA Cortex v5.0 <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Autonomous</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="zs-card-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Right Panel {!sidebarOpen && <ChevronLeft size={14} />}</div>
                    </button>
                    <button className="zs-card-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={reset}>
                        <RefreshCw size={14} /> Reset
                    </button>
                </div>

                {/* Messages */}
                <div className="z-chat-messages">
                    {messages.length === 1 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', animation: 'fadeIn 0.5s' }}>
                            <div style={{ transform: 'scale(1.5)', opacity: 0.9 }}>
                                <EmmaLogo size={64} showText={false} />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'white' }}>
                                How can I help you today?
                            </h2>
                        </div>
                    ) : (
                        messages.map(m => (
                            <div key={m.id} className={`chat-msg ${m.role}`}>
                                <div className="chat-avatar">
                                    {m.role === 'assistant' ? <EmmaLogo size={20} showText={false} /> : <div style={{ background: 'var(--bg-glass)', borderRadius: '50%', padding: '2px' }}><User size={16} /></div>}
                                </div>
                                <div className="chat-bubble">
                                    {m.role === 'assistant' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>EMMA</span>
                                            {m.metadata?.agent && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 700, background: AGENTS[m.metadata.agent]?.color || 'var(--brand-purple)', color: '#fff' }}>{AGENTS[m.metadata.agent]?.label}</span>}
                                            {voice.voiceEnabled && (
                                                <button onClick={() => voice.speak(m.content)} title="Replay" style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.4, padding: '0 2px', display: 'flex', alignItems: 'center' }}><Volume2 size={12} /></button>
                                            )}
                                        </div>
                                    )}
                                    {m.content.split('\n').map((line, i) => <span key={i}>{line}{i < m.content.split('\n').length - 1 && <br />}</span>)}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="chat-msg assistant">
                            <div className="chat-avatar"><EmmaLogo size={20} showText={false} /></div>
                            <div className="chat-bubble" style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '16px 24px' }}>
                                <span className="typing-dot" />
                                <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
                                <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}

                    {/* Voice listening indicator */}
                    {voice.isListening && (
                        <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', fontSize: '0.8125rem', color: '#EF4444', animation: 'fadeIn 0.3s' }}>
                            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} style={{ width: '3px', borderRadius: '2px', background: '#EF4444', animation: `voiceBar 0.${4 + i}s ease-in-out infinite alternate` }} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}><Mic size={14} /> Speak now, EMMA is listening...</div>
                            {voice.transcript && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '6px' }}>{voice.transcript}</span>}
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Zyricon Floating Input */}
                <div className="z-chat-input-wrapper">
                    <div className="z-chat-input-box">
                        <textarea
                            ref={inputRef}
                            className="z-input-textarea"
                            placeholder={voice.isListening ? "Listening..." : "Ask EMMA anything..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    send(input);
                                }
                            }}
                        />
                        <div className="z-input-actions">
                            <div className="z-action-left">
                                <button className="z-action-btn" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Paperclip size={14} /> Attach</button>
                                <button className="z-action-btn" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowVoicePanel(!showVoicePanel)}><Settings size={14} /> Settings</button>
                            </div>
                            <div className="z-action-right">
                                <button className={`z-circle-btn mic ${voice.isListening ? 'recording' : ''}`} onClick={handleMicClick}>
                                    🎙
                                </button>
                                <button className="z-circle-btn send" onClick={() => send(input)} disabled={!input.trim() || loading}>
                                    ↑
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Expandable Voice Settings inline panel (if activated) */}
                    {showVoicePanel && (
                        <div style={{ width: '100%', maxWidth: '800px', marginTop: '12px', padding: '16px', background: 'rgba(22, 18, 30, 0.4)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid var(--border-subtle)', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Voice:</label>
                                <select style={{ padding: '4px 8px', border: '1px solid var(--border-medium)', borderRadius: '6px', background: 'var(--bg-input)', color: 'white' }}
                                    value={voice.selectedVoice?.name || ''}
                                    onChange={e => { const v = voice.availableVoices.find(x => x.name === e.target.value); if (v) voice.setVoice(v); }}>
                                    {voice.availableVoices.filter(v => v.lang.startsWith('en')).map(v => (
                                        <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Speed:</label>
                                <input type="range" min="0.5" max="1.5" step="0.05" value={voice.rate}
                                    onChange={e => voice.setRate(parseFloat(e.target.value))} />
                                <span style={{ color: 'var(--text-muted)' }}>{voice.rate.toFixed(2)}x</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Auto-speak:</label>
                                <button onClick={voice.toggleAutoSpeak} className={`toggle ${voice.autoSpeak ? 'active' : ''}`} style={{ width: '36px', height: '20px' }} />
                            </div>
                            {voice.error && <div style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> {voice.error}</div>}
                        </div>
                    )}

                    {/* Suggestion Cards */}
                    {messages.length === 1 && (
                        <div className="z-scenarios">
                            {SCENARIOS.slice(0, 4).map((s, i) => (
                                <div key={i} className="z-scenario-card" onClick={() => { setInput(s.msg); send(s.msg); }}>
                                    <div className="z-scenario-icon">{s.icon}</div>
                                    <div className="z-scenario-title">{s.label}</div>
                                    <div className="z-scenario-desc">{s.msg}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Sidebar ═══ */}
            {sidebarOpen && (
                <div style={{ width: '340px', background: 'rgba(22, 18, 30, 0.6)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderLeft: '1px solid var(--border-subtle)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', transition: 'all 0.3s', zIndex: 10 }}>
                    {/* Cortex Execution Plan */}
                    {cortexMode && cortexPlan && cortexPlan.length > 0 && (
                        <div className="cs-section">
                            <h4 style={{ fontSize: '0.8125rem', color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} /> Cortex Plan ({cortexPlan.length} steps)</h4>
                            {cortexPlan.map((s, i) => (
                                <div key={i} style={{ fontSize: '0.75rem', padding: '8px 10px', display: 'flex', gap: '8px', alignItems: 'flex-start', background: s.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${s.success ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: '10px', marginBottom: '6px' }}>
                                    <span style={{ color: s.success ? '#22C55E' : '#EF4444', fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{s.tool.replace(/_/g, ' ')}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', lineHeight: 1.3 }}>{s.result?.slice(0, 80)}{s.result?.length > 80 ? '...' : ''}</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem', flexShrink: 0 }}>{s.durationMs}ms</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Self-Evaluation Score */}
                    {cortexMode && selfScore !== null && (
                        <div className="cs-section">
                            <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Self-Evaluation</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `conic-gradient(${selfScore >= 7 ? '#22C55E' : selfScore >= 5 ? '#F59E0B' : '#EF4444'} ${selfScore * 36}deg, rgba(255,255,255,0.1) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selfScore}</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>{selfScore >= 8 ? 'Excellent' : selfScore >= 6 ? 'Good' : selfScore >= 4 ? 'Adequate' : 'Needs Improvement'}</div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Clinical safety + efficiency + empathy</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Agent */}
                    <div className="cs-section">
                        <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Active Agent</h4>
                        <div className="cs-agent-box" style={{ borderColor: ag.color, background: 'var(--bg-card)' }}>
                            <span className="csab-icon">{ag.icon}</span>
                            <div>
                                <div className="csab-name" style={{ color: ag.color }}>{ag.label}</div>
                                <div className="csab-desc" style={{ color: 'var(--text-muted)' }}>{meta?.agent === 'triage' ? 'Assessing symptoms' : meta?.agent === 'appointment' ? 'Managing appointments' : meta?.agent === 'prescription' ? 'Processing Rx' : meta?.agent === 'test_results' ? 'Retrieving results' : meta?.agent === 'admin' ? 'Practice queries' : meta?.agent === 'escalation' ? 'Emergency handling' : 'Ready to route'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Voice Status */}
                    <div className="cs-section" style={{ background: voice.isSpeaking ? 'rgba(37,99,235,0.06)' : voice.isListening ? 'rgba(239,68,68,0.06)' : 'var(--bg-glass)', borderRadius: '16px', padding: '16px' }}>
                        <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Voice Status</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
                            <div className="cs-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>TTS (EMMA)</span><span style={{ color: voice.voiceEnabled ? '#22C55E' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>{voice.voiceEnabled ? <><Volume2 size={12} /> ON</> : <><Volume2 size={12} opacity={0.5} /> OFF</>}</span></div>
                            <div className="cs-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>STT (Mic)</span><span style={{ color: voice.isListening ? '#EF4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>{voice.isListening ? <><Mic size={12} /> LIVE</> : <><Mic size={12} opacity={0.5} /> Ready</>}</span></div>
                            <div className="cs-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Auto-Speak</span><span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>{voice.autoSpeak ? <><CheckCircle2 size={12} color="#22C55E" /> ON</> : <><X size={12} /> OFF</>}</span></div>
                            {voice.selectedVoice && <div className="cs-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Voice</span><span style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>{voice.selectedVoice.name.split(' ').slice(0, 2).join(' ')}</span></div>}
                        </div>
                    </div>

                    {/* Classification */}
                    <div className="cs-section">
                        <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Classification</h4>
                        <div className="cs-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: 'var(--text-secondary)' }}>Intent</span><span><span className="badge badge-standard">{meta?.intent || 'Listening...'}</span></span></div>
                        <div className="cs-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: 'var(--text-secondary)' }}>Urgency</span>{meta?.urgency ? <span className="badge" style={{ background: `${URG[meta.urgency]}22`, color: URG[meta.urgency] }}>{meta.urgency}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>}</div>
                        <div className="cs-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Patient</span><span style={{ color: meta?.patientVerified ? '#22C55E' : 'var(--text-muted)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '4px' }}>{meta?.patientVerified ? <><CheckCircle2 size={14} /> Verified</> : <><Clock size={14} /> Not verified</>}</span></div>
                    </div>

                    {/* Red Flags */}
                    {rfs.length > 0 && (
                        <div className="cs-section">
                            <h4 style={{ fontSize: '0.8125rem', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldAlert size={14} /> Red Flags</h4>
                            {rfs.map((f, i) => <div key={i} style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> <span>{f}</span></div>)}
                        </div>
                    )}

                    {/* SNOMED */}
                    <div className="cs-section">
                        <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>SNOMED CT Codes</h4>
                        {syms.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {syms.map((s, i) => <span key={i} className={`snomed-chip ${s.isRedFlag ? 'flagged' : ''}`}>{s.display} <span className="sc-code">{s.code}</span></span>)}
                            </div>
                        ) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No codes extracted</div>}
                    </div>

                    {/* Actions */}
                    <div className="cs-section">
                        <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Actions Performed</h4>
                        {acts.length > 0 ? acts.map((a, i) => {
                            const IconCmp = a.type === 'appointment_booked' || a.type === 'slots_offered' ? Calendar : a.type === 'prescription_submitted' ? Pill : a.type === 'patient_verified' ? CheckCircle2 : a.type === 'results_delivered' || a.type === 'results_pending' ? FlaskConical : a.type === 'gp_callback_arranged' ? PhoneCall : a.type === 'info_provided' ? ClipboardList : a.type === 'emergency_999' ? ShieldAlert : a.type === 'human_transfer' ? User : CheckCircle2;
                            return (
                                <div key={i} style={{ fontSize: '0.75rem', padding: '10px', display: 'flex', gap: '8px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                    <IconCmp size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                    <span style={{ lineHeight: 1.4 }}>{a.description}</span>
                                </div>
                            );
                        }) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting for actions...</div>}
                    </div>

                    {/* Agent List */}
                    <div className="cs-section">
                        <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Agent Pipeline</h4>
                        <div className="cs-agent-list">
                            {Object.entries(AGENTS).map(([k, v]) => (
                                <div key={k} className={`csa-item ${meta?.agent === k ? 'active' : ''}`}>
                                    <span>{v.icon}</span> {v.label}
                                    {meta?.agent === k && <span className="csa-badge" style={{ background: v.color, color: '#fff' }}>ACTIVE</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="cs-section" style={{ borderBottom: 'none', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '24px' }}>
                        <div>Call ID: {convState?.callId?.slice(0, 8) || '—'}</div>
                        <div>Messages: {messages.length} • Codes: {syms.length}</div>
                    </div>
                </div>
            )}
        </main>
    );
}
