'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import TopNav from '@/components/TopNav';
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
    { icon: '🔴', label: 'Chest Pain', msg: "I've been having really bad chest pains for about 20 minutes. It feels like a heaviness and my left arm is tingling." },
    { icon: '😰', label: 'Mental Health', msg: "I've been feeling really low lately. I can't see the point anymore and I've been thinking about ending it all." },
    { icon: '🤒', label: 'UTI', msg: "Hi, I think I might have a water infection. I've been having a burning sensation and going to the toilet a lot more." },
    { icon: '🤕', label: 'Headache', msg: "I've had a terrible headache for 3 days that won't go away, even with paracetamol. I'm also feeling dizzy." },
    { icon: '📅', label: 'Appointment', msg: "Hi, I'd like to book a GP appointment please. Nothing urgent, I just need a general check-up." },
    { icon: '💊', label: 'Prescription', msg: "I need to order my repeat prescription. My name is Margaret Wilson, date of birth 18th March 1954. I need my Amlodipine." },
    { icon: '🔬', label: 'Test Results', msg: "I'm David Patel, born 3rd December 1975. I had blood tests last week and I'm calling for the results." },
    { icon: '🕐', label: 'Hours', msg: "What time are you open? And where is the nearest pharmacy?" },
    { icon: '👤', label: 'Human', msg: "I'd rather speak to a real person please." },
];

const AGENTS: Record<string, { icon: string; label: string; color: string }> = {
    orchestrator: { icon: '🧠', label: 'Orchestrator', color: '#7C3AED' },
    triage: { icon: '🏥', label: 'Clinical Triage', color: '#3B82F6' },
    appointment: { icon: '📅', label: 'Appointments', color: '#22C55E' },
    prescription: { icon: '💊', label: 'Prescriptions', color: '#F97316' },
    test_results: { icon: '🔬', label: 'Test Results', color: '#14B8A6' },
    admin: { icon: '📋', label: 'Admin', color: '#8B5CF6' },
    escalation: { icon: '🚨', label: 'Escalation', color: '#EF4444' },
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
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text.trim(), conversationState: convState }) });
            const d = await res.json();

            if (d.error) {
                setMessages(p => [...p, { id: `e${Date.now()}`, role: 'assistant', content: d.error, timestamp: new Date().toISOString() }]);
            } else {
                const aMsg: ChatMessage = { id: `a${Date.now()}`, role: 'assistant', content: d.response, timestamp: new Date().toISOString(), metadata: d.metadata };
                setMessages(p => [...p, aMsg]);
                setConvState(d.conversationState);
                setMeta(d.metadata || {});

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
    }, [loading, convState, voice]);

    const reset = () => {
        voice.stopSpeaking();
        const greeting = `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, you've reached Riverside Medical Centre. My name's EMMA, and I'm here to help. How can I help you today?`;
        setMessages([{ id: 'greet', role: 'assistant', content: greeting, timestamp: new Date().toISOString(), metadata: { agent: 'orchestrator' } }]);
        setConvState(null); setMeta({}); setSyms([]); setActs([]); setRfs([]); setInput('');
        if (voice.voiceEnabled && voice.autoSpeak) setTimeout(() => voice.speak(greeting), 300);
    };

    const handleMicClick = () => {
        if (voice.isListening) voice.stopListening();
        else voice.startListening();
    };

    const ag = AGENTS[meta?.agent || 'orchestrator'];

    return (
        <>
            <TopNav />
            <div style={{ display: 'flex', height: 'calc(100vh - 56px)', position: 'relative' }}>
                {/* ═══ Chat Main ═══ */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minWidth: 0 }}>
                    {/* Header */}
                    <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '12px', overflow: 'hidden',
                            background: voice.isSpeaking ? 'linear-gradient(135deg,#2563EB,#7C3AED)' : 'var(--brand-blue)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s',
                            boxShadow: voice.isSpeaking ? '0 0 20px rgba(37,99,235,0.4)' : 'none'
                        }}>
                            {voice.isSpeaking ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <rect x="3" y="8" width="3" height="8" rx="1" fill="white"><animate attributeName="height" values="8;16;8" dur="0.6s" repeatCount="indefinite" /><animate attributeName="y" values="8;4;8" dur="0.6s" repeatCount="indefinite" /></rect>
                                    <rect x="8" y="5" width="3" height="14" rx="1" fill="white"><animate attributeName="height" values="14;6;14" dur="0.5s" repeatCount="indefinite" /><animate attributeName="y" values="5;9;5" dur="0.5s" repeatCount="indefinite" /></rect>
                                    <rect x="13" y="7" width="3" height="10" rx="1" fill="white"><animate attributeName="height" values="10;18;10" dur="0.7s" repeatCount="indefinite" /><animate attributeName="y" values="7;3;7" dur="0.7s" repeatCount="indefinite" /></rect>
                                    <rect x="18" y="9" width="3" height="6" rx="1" fill="white"><animate attributeName="height" values="6;12;6" dur="0.4s" repeatCount="indefinite" /><animate attributeName="y" values="9;6;9" dur="0.4s" repeatCount="indefinite" /></rect>
                                </svg>
                            ) : <EmmaLogo size={24} showText={false} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>EMMA — AI GP Receptionist</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Riverside Medical Centre •{' '}
                                {voice.isSpeaking && <span style={{ color: '#3B82F6', fontWeight: 600 }}>🔊 Speaking...</span>}
                                {voice.isListening && <span style={{ color: '#EF4444', fontWeight: 600 }}>🎙 Listening...</span>}
                                {loading && <span style={{ color: '#F59E0B', fontWeight: 600 }}>⏳ Thinking...</span>}
                                {!voice.isSpeaking && !voice.isListening && !loading && <span style={{ color: '#22C55E' }}>● Online</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={voice.toggleVoice} title={voice.voiceEnabled ? 'Mute EMMA' : 'Unmute EMMA'}
                                style={{ padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: '8px', background: voice.voiceEnabled ? 'rgba(37,99,235,0.15)' : 'var(--bg-glass)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: voice.voiceEnabled ? '#93C5FD' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                                {voice.voiceEnabled ? '🔊' : '🔇'}
                            </button>
                            <button onClick={() => setShowVoicePanel(!showVoicePanel)} title="Voice Settings"
                                style={{ padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: '8px', background: showVoicePanel ? 'rgba(37,99,235,0.15)' : 'var(--bg-glass)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                ⚙
                            </button>
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Sidebar"
                                style={{ padding: '6px 10px', border: '1px solid var(--border-medium)', borderRadius: '8px', background: 'var(--bg-glass)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {sidebarOpen ? '◀' : '▶'}
                            </button>
                            <button className="btn btn-sm" onClick={reset}>🔄 New Call</button>
                        </div>
                    </div>

                    {/* Voice Settings Panel */}
                    {showVoicePanel && (
                        <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Voice:</label>
                                <select style={{ padding: '4px 8px', border: '1px solid var(--border-medium)', borderRadius: '6px', fontSize: '0.6875rem', maxWidth: '180px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
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
                                    onChange={e => voice.setRate(parseFloat(e.target.value))}
                                    style={{ width: '80px' }} />
                                <span style={{ color: 'var(--text-muted)', width: '30px' }}>{voice.rate.toFixed(2)}x</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Auto-speak:</label>
                                <button onClick={voice.toggleAutoSpeak}
                                    className={`toggle ${voice.autoSpeak ? 'active' : ''}`}
                                    style={{ width: '36px', height: '20px' }} />
                            </div>
                            {voice.error && <div style={{ color: '#EF4444', fontWeight: 500 }}>⚠ {voice.error}</div>}
                        </div>
                    )}

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {messages.map(m => (
                            <div key={m.id} className={`chat-msg ${m.role === 'assistant' ? 'emma' : 'patient'}`}>
                                {m.role === 'assistant' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>EMMA</span>
                                        {m.metadata?.agent && <span style={{ padding: '1px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 700, background: AGENTS[m.metadata.agent]?.color || '#7C3AED', color: '#fff' }}>{AGENTS[m.metadata.agent]?.label}</span>}
                                        {voice.voiceEnabled && (
                                            <button onClick={() => voice.speak(m.content)} title="Replay" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.4, padding: '0 2px' }}>🔊</button>
                                        )}
                                    </div>
                                )}
                                {m.role === 'user' && <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '4px' }}>You</div>}
                                {m.content.split('\n').map((line, i) => <span key={i}>{line}{i < m.content.split('\n').length - 1 && <br />}</span>)}
                            </div>
                        ))}
                        {loading && <div className="typing-dots"><span /><span /><span /></div>}

                        {/* Voice listening indicator */}
                        {voice.isListening && (
                            <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '0.8125rem', color: '#EF4444', animation: 'fadeIn 0.3s' }}>
                                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} style={{ width: '3px', borderRadius: '2px', background: '#EF4444', animation: `voiceBar 0.${4 + i}s ease-in-out infinite alternate` }} />
                                    ))}
                                </div>
                                <span style={{ fontWeight: 500 }}>🎙 Listening...</span>
                                {voice.transcript && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{voice.transcript}</span>}
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Scenarios */}
                    <div className="chat-scenarios">
                        {SCENARIOS.map((s, i) => (
                            <button key={i} className="scenario-pill" onClick={() => send(s.msg)} disabled={loading}>{s.icon} {s.label}</button>
                        ))}
                    </div>

                    {/* Input */}
                    <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={handleMicClick} disabled={loading}
                            title={voice.isListening ? 'Stop listening' : 'Start speaking'}
                            style={{
                                width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: voice.isListening ? '#EF4444' : 'var(--bg-glass-hover)',
                                color: voice.isListening ? '#fff' : 'var(--text-muted)',
                                fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                                boxShadow: voice.isListening ? '0 0 20px rgba(239,68,68,0.3)' : 'none',
                                animation: voice.isListening ? 'micPulse 2s infinite' : 'none',
                                flexShrink: 0,
                            }}>
                            🎙
                        </button>
                        <input ref={inputRef} className="chat-input" placeholder={voice.isListening ? '🎙 Speak now — EMMA is listening...' : 'Type your message as a patient calling the GP...'}
                            value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
                            disabled={loading}
                            style={{ flex: 1 }} />
                        <button className="btn btn-primary" onClick={() => send(input)} disabled={loading || !input.trim()}
                            style={{ height: 44, paddingLeft: 20, paddingRight: 20, flexShrink: 0 }}>
                            Send
                        </button>
                    </div>
                </div>

                {/* ═══ Sidebar ═══ */}
                {sidebarOpen && (
                    <div className="chat-sidebar" style={{ transition: 'all 0.3s' }}>
                        {/* Active Agent */}
                        <div className="cs-section">
                            <h4>Active Agent</h4>
                            <div className="cs-agent-box" style={{ borderColor: ag.color }}>
                                <span className="csab-icon">{ag.icon}</span>
                                <div>
                                    <div className="csab-name" style={{ color: ag.color }}>{ag.label}</div>
                                    <div className="csab-desc">{meta?.agent === 'triage' ? 'Assessing symptoms' : meta?.agent === 'appointment' ? 'Managing appointments' : meta?.agent === 'prescription' ? 'Processing Rx' : meta?.agent === 'test_results' ? 'Retrieving results' : meta?.agent === 'admin' ? 'Practice queries' : meta?.agent === 'escalation' ? 'Emergency handling' : 'Ready to route'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Voice Status */}
                        <div className="cs-section" style={{ background: voice.isSpeaking ? 'rgba(37,99,235,0.06)' : voice.isListening ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                            <h4>Voice Status</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem' }}>
                                <div className="cs-row"><span className="csr-label">TTS (EMMA Speaks)</span><span className="csr-value" style={{ color: voice.voiceEnabled ? '#22C55E' : 'var(--text-muted)' }}>{voice.voiceEnabled ? '🔊 ON' : '🔇 OFF'}</span></div>
                                <div className="cs-row"><span className="csr-label">STT (Mic Input)</span><span className="csr-value" style={{ color: voice.isListening ? '#EF4444' : 'var(--text-muted)' }}>{voice.isListening ? '🎙 LIVE' : '⏹ Ready'}</span></div>
                                <div className="cs-row"><span className="csr-label">Auto-Speak</span><span className="csr-value">{voice.autoSpeak ? '✅ ON' : '❌ OFF'}</span></div>
                                {voice.selectedVoice && <div className="cs-row"><span className="csr-label">Voice</span><span className="csr-value" style={{ fontSize: '0.6875rem' }}>{voice.selectedVoice.name.split(' ').slice(0, 2).join(' ')}</span></div>}
                            </div>
                        </div>

                        {/* Classification */}
                        <div className="cs-section">
                            <h4>Classification</h4>
                            <div className="cs-row"><span className="csr-label">Intent</span><span className="csr-value"><span className="badge badge-standard">{meta?.intent || 'Listening...'}</span></span></div>
                            <div className="cs-row"><span className="csr-label">Urgency</span>{meta?.urgency ? <span className="badge" style={{ background: `${URG[meta.urgency]}22`, color: URG[meta.urgency] }}>{meta.urgency === 'EMERGENCY' ? '🚨 ' : ''}{meta.urgency}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>}</div>
                            <div className="cs-row"><span className="csr-label">Patient</span><span className="csr-value" style={{ color: meta?.patientVerified ? '#22C55E' : 'var(--text-muted)', fontSize: '0.8125rem' }}>{meta?.patientVerified ? `✅ ${convState?.patientName || 'Verified'}` : '⏳ Not verified'}</span></div>
                        </div>

                        {/* Red Flags */}
                        {rfs.length > 0 && (
                            <div className="cs-section cs-redflag-section">
                                <h4>🚨 Red Flags</h4>
                                {rfs.map((f, i) => <div key={i} className="cs-rf-item">⚠️ {f}</div>)}
                            </div>
                        )}

                        {/* SNOMED */}
                        <div className="cs-section">
                            <h4>SNOMED CT Codes</h4>
                            {syms.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {syms.map((s, i) => <span key={i} className={`snomed-chip ${s.isRedFlag ? 'flagged' : ''}`}>{s.display} <span className="sc-code">{s.code}</span></span>)}
                                </div>
                            ) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No codes extracted</div>}
                        </div>

                        {/* Actions */}
                        <div className="cs-section">
                            <h4>Actions Performed</h4>
                            {acts.length > 0 ? acts.map((a, i) => {
                                const icon = a.type === 'appointment_booked' ? '📅' : a.type === 'slots_offered' ? '🗓️' : a.type === 'prescription_submitted' ? '💊' : a.type === 'patient_verified' ? '✅' : a.type === 'results_delivered' ? '🔬' : a.type === 'gp_callback_arranged' ? '📞' : a.type === 'results_pending' ? '⏳' : a.type === 'info_provided' ? '📋' : a.type === 'emergency_999' ? '🚨' : a.type === 'human_transfer' ? '👤' : '✓';
                                const bg = a.type.includes('emergency') || a.type.includes('999') ? 'rgba(239,68,68,0.08)' : a.type.includes('appointment') || a.type.includes('slot') ? 'rgba(34,197,94,0.08)' : a.type.includes('prescription') ? 'rgba(249,115,22,0.08)' : a.type.includes('result') ? 'rgba(59,130,246,0.08)' : a.type.includes('verified') ? 'rgba(34,197,94,0.08)' : a.type.includes('transfer') ? 'rgba(239,68,68,0.08)' : 'var(--bg-glass)';
                                const border = a.type.includes('emergency') || a.type.includes('999') ? 'rgba(239,68,68,0.2)' : a.type.includes('appointment') || a.type.includes('slot') ? 'rgba(34,197,94,0.2)' : a.type.includes('prescription') ? 'rgba(249,115,22,0.2)' : a.type.includes('result') ? 'rgba(59,130,246,0.2)' : a.type.includes('verified') ? 'rgba(34,197,94,0.2)' : a.type.includes('transfer') ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)';
                                return (
                                    <div key={i} style={{ fontSize: '0.75rem', padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: bg, border: `1px solid ${border}`, borderRadius: '8px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                        <span style={{ fontSize: '0.875rem', lineHeight: 1 }}>{icon}</span>
                                        <span style={{ lineHeight: 1.4 }}>{a.description}</span>
                                    </div>
                                );
                            }) : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No actions yet — EMMA is listening</div>}
                        </div>

                        {/* Agent List */}
                        <div className="cs-section">
                            <h4>Agent Pipeline</h4>
                            <div className="cs-agent-list">
                                {Object.entries(AGENTS).map(([k, v]) => (
                                    <div key={k} className={`csa-item ${meta?.agent === k ? 'active' : ''}`}>
                                        <span>{v.icon}</span> {v.label}
                                        {meta?.agent === k && <span className="csa-badge" style={{ background: v.color, color: '#fff' }}>ACTIVE</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="cs-section" style={{ borderBottom: 'none', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            <div>Call ID: {convState?.callId?.slice(0, 8) || '—'}</div>
                            <div>Messages: {messages.length} • Codes: {syms.length}</div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
