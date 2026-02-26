'use client';

import { useState, useEffect } from 'react';
import {
    Cpu, Bot, Globe, Brain, Sparkles, Megaphone, CalendarClock,
    FileText, Activity, CheckCircle2, XCircle, Clock, AlertTriangle,
    ShieldAlert, Zap, ArrowUpRight, TrendingUp, RefreshCw, ChevronRight,
    Shield, FlaskConical, Mic, Calendar, Pill, User, Eye
} from 'lucide-react';
import EmmaLogo from '@/components/EmmaLogo';
import type { CommandCentreData } from '@/lib/types';

// ═══ SUPERPOWER CONFIG ═══

const SUPERPOWERS = [
    { id: 'agent', label: 'Agent Executor', icon: Bot, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' },
    { id: 'browser', label: 'Browser Agent', icon: Globe, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
    { id: 'memory', label: 'Memory Store', icon: Brain, color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' },
    { id: 'improve', label: 'Self-Improve', icon: Sparkles, color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
    { id: 'outreach', label: 'Outreach', icon: Megaphone, color: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
    { id: 'schedule', label: 'Schedule AI', icon: CalendarClock, color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' },
    { id: 'documents', label: 'Doc Author', icon: FileText, color: '#F97316', gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' },
    { id: 'health', label: 'Health Monitor', icon: Activity, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' },
];

export default function CommandCentrePage() {
    const [data, setData] = useState<CommandCentreData | null>(null);
    const [activePanel, setActivePanel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/command-centre')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading || !data) {
        return (
            <main className="zyricon-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                    <div style={{ transform: 'scale(1.5)', marginBottom: '24px' }}><EmmaLogo size={64} showText={false} /></div>
                    <h2 style={{ fontSize: '1.5rem', color: 'white', fontWeight: 500 }}>Initialising Command Centre...</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Loading 8 superpowers</p>
                </div>
            </main>
        );
    }

    return (
        <main className="zyricon-main" style={{ padding: '24px 32px', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.02em' }}>
                        <Cpu size={28} /> Command Centre
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.875rem' }}>
                        8 superpowers • {data.masterGraph.totalProcessed.toLocaleString()} tasks processed • Avg {data.masterGraph.avgProcessingMs}ms
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '6px 14px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '20px', fontSize: '0.75rem', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} /> All Systems Operational
                    </div>
                    <button className="zs-card-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => window.location.reload()}><RefreshCw size={14} /> Refresh</button>
                </div>
            </div>

            {/* Superpower Grid — Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                {SUPERPOWERS.map(sp => {
                    const Icon = sp.icon;
                    const isActive = activePanel === sp.id;
                    return (
                        <div key={sp.id} onClick={() => setActivePanel(isActive ? null : sp.id)}
                            style={{ padding: '20px', background: isActive ? `${sp.color}11` : 'var(--bg-card)', border: `1px solid ${isActive ? sp.color + '44' : 'var(--border-subtle)'}`, borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: sp.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={20} color="white" />
                                </div>
                                <ChevronRight size={16} style={{ color: 'var(--text-muted)', transform: isActive ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
                            </div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{sp.label}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                {sp.id === 'agent' && `${data.agentExecutor.totalExecutions.toLocaleString()} executions • ${(data.agentExecutor.successRate * 100).toFixed(1)}% success`}
                                {sp.id === 'browser' && `${data.browserAgent.totalSessions} sessions • ${(data.browserAgent.successRate * 100).toFixed(1)}% success`}
                                {sp.id === 'memory' && `${data.memory.totalPatients} patients • ${data.memory.totalFacts} facts stored`}
                                {sp.id === 'improve' && `${data.selfImprove.totalImprovements} improvements • Safety: ${data.selfImprove.safetyGateStatus}`}
                                {sp.id === 'outreach' && `${data.outreach.activeCampaigns.length} campaigns • ${data.outreach.todayBooked} booked today`}
                                {sp.id === 'schedule' && `Score: ${data.schedule.todayOptimization.optimizationScore}% • ${data.schedule.gapsFilled} gaps filled`}
                                {sp.id === 'documents' && `${data.documents.pendingReview.length} pending • ${data.documents.todayDrafted} drafted today`}
                                {sp.id === 'health' && `${data.healthMonitor.criticalCount} critical • ${data.healthMonitor.urgentCount} urgent alerts`}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Expanded Detail Panel */}
            {activePanel && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px', marginBottom: '24px', animation: 'fadeIn 0.3s' }}>
                    {activePanel === 'agent' && <AgentExecutorPanel data={data} />}
                    {activePanel === 'browser' && <BrowserAgentPanel data={data} />}
                    {activePanel === 'memory' && <MemoryPanel data={data} />}
                    {activePanel === 'improve' && <SelfImprovePanel data={data} />}
                    {activePanel === 'outreach' && <OutreachPanel data={data} />}
                    {activePanel === 'schedule' && <SchedulePanel data={data} />}
                    {activePanel === 'documents' && <DocumentsPanel data={data} />}
                    {activePanel === 'health' && <HealthPanel data={data} />}
                </div>
            )}

            {/* Master Graph Status */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} /> Master Graph Pipeline
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['intake', 'memory_recall', 'intent_classify', 'safety_check', 'triage', 'agent_route', 'tool_execute', 'browser_act', 'document_draft', 'outreach_check', 'schedule_optimize', 'health_scan', 'self_improve_eval', 'snomed_extract', 'urgency_assign', 'response_generate', 'memory_store', 'audit_log', 'checkpoint', 'notification'].map((node, i) => (
                        <div key={node} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: 500, background: i < 18 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)', color: i < 18 ? '#22C55E' : 'var(--text-muted)', border: `1px solid ${i < 18 ? 'rgba(34, 197, 94, 0.2)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {i < 18 ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {node.replace(/_/g, ' ')}
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Total processed: <strong style={{ color: 'white' }}>{data.masterGraph.totalProcessed.toLocaleString()}</strong></span>
                    <span>Avg latency: <strong style={{ color: 'white' }}>{data.masterGraph.avgProcessingMs}ms</strong></span>
                    <span>Nodes: <strong style={{ color: 'white' }}>20</strong></span>
                    <span>Engines: <strong style={{ color: 'white' }}>8</strong></span>
                </div>
            </div>
        </main>
    );
}

// ═══ DETAIL PANELS ═══

function AgentExecutorPanel({ data }: { data: CommandCentreData }) {
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#8B5CF6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} /> Autonomous Agent Executor — 17 Tools</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Total Executions" value={data.agentExecutor.totalExecutions.toLocaleString()} color="#8B5CF6" />
                <StatCard label="Avg Steps/Task" value={data.agentExecutor.avgStepsPerTask.toFixed(1)} color="#8B5CF6" />
                <StatCard label="Success Rate" value={`${(data.agentExecutor.successRate * 100).toFixed(1)}%`} color="#22C55E" />
                <StatCard label="Active Traces" value={data.agentExecutor.activeTraces.length.toString()} color="#F59E0B" />
            </div>
            {data.agentExecutor.activeTraces.map(trace => (
                <div key={trace.id} style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{trace.triggerMessage.slice(0, 60)}...</div>
                        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.625rem', fontWeight: 700, background: trace.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: trace.status === 'completed' ? '#22C55E' : '#F59E0B' }}>{trace.status.toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {trace.steps.map((step, i) => (
                            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.625rem', fontWeight: 500, background: step.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: step.status === 'success' ? '#22C55E' : '#EF4444' }}>
                                {step.status === 'success' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                {step.toolName}
                                <span style={{ color: 'var(--text-muted)' }}>{step.durationMs}ms</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {trace.completedSteps}/{trace.totalSteps} steps • {trace.totalDurationMs}ms total
                    </div>
                </div>
            ))}
        </div>
    );
}

function BrowserAgentPanel({ data }: { data: CommandCentreData }) {
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#3B82F6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={18} /> Browser Agent — NHS System Automation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Total Sessions" value={data.browserAgent.totalSessions.toString()} color="#3B82F6" />
                <StatCard label="Success Rate" value={`${(data.browserAgent.successRate * 100).toFixed(1)}%`} color="#22C55E" />
                <StatCard label="Active" value={data.browserAgent.activeSessions.filter(s => s.status === 'active').length.toString()} color="#F59E0B" />
            </div>
            {data.browserAgent.activeSessions.map(session => (
                <div key={session.id} style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{session.taskDescription}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{session.domain} • {session.actions.length} actions • {session.securityFlags.length === 0 ? '✓ No security flags' : session.securityFlags.join(', ')}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {session.actions.map(action => (
                            <span key={action.id} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                                {action.actionType} → {action.target?.split('/').pop() || action.value?.slice(0, 20) || '...'}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function MemoryPanel({ data }: { data: CommandCentreData }) {
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#EC4899', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Brain size={18} /> Long-Horizon Memory — 4 Layers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {Object.entries(data.memory.factsByLayer).map(([layer, count]) => (
                    <StatCard key={layer} label={layer.charAt(0).toUpperCase() + layer.slice(1)} value={count.toString()} color="#EC4899" />
                ))}
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Recent Patient Facts</div>
            {data.memory.recentFacts.map(fact => (
                <div key={fact.id} style={{ padding: '12px', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.15)', borderRadius: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8125rem', color: 'white' }}>{fact.fact}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {fact.category} • confidence: {(fact.confidence * 100).toFixed(0)}% • accessed {fact.accessCount}x
                        </div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700, background: 'rgba(236,72,153,0.15)', color: '#EC4899' }}>{fact.layer}</span>
                </div>
            ))}
        </div>
    );
}

function SelfImprovePanel({ data }: { data: CommandCentreData }) {
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F59E0B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={18} /> Self-Improvement Engine — Safety-Gated</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Improvements" value={data.selfImprove.totalImprovements.toString()} color="#F59E0B" />
                <StatCard label="Active A/B Tests" value={data.selfImprove.activeTests.length.toString()} color="#3B82F6" />
                <StatCard label="Safety Gate" value={data.selfImprove.safetyGateStatus.toUpperCase()} color={data.selfImprove.safetyGateStatus === 'passing' ? '#22C55E' : '#EF4444'} />
                <StatCard label="Prompt Versions" value={data.selfImprove.currentVersions.length.toString()} color="#8B5CF6" />
            </div>
            {data.selfImprove.currentVersions.map(v => (
                <div key={v.id} style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{v.agentType}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '8px' }}>v{v.version}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Safety: {(v.safetyScore * 100).toFixed(0)}%</span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Red flags: {(v.redFlagCatchRate * 100).toFixed(0)}%</span>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700, background: v.status === 'deployed' ? 'rgba(34,197,94,0.15)' : v.status === 'testing' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)', color: v.status === 'deployed' ? '#22C55E' : v.status === 'testing' ? '#3B82F6' : '#EF4444' }}>{v.status}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function OutreachPanel({ data }: { data: CommandCentreData }) {
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#10B981', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Megaphone size={18} /> Proactive Patient Outreach</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Contacted Today" value={data.outreach.todayContacted.toString()} color="#10B981" />
                <StatCard label="Responded" value={data.outreach.todayResponded.toString()} color="#3B82F6" />
                <StatCard label="Booked" value={data.outreach.todayBooked.toString()} color="#22C55E" />
            </div>
            {data.outreach.activeCampaigns.map(camp => (
                <div key={camp.id} style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{camp.name}</span>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>{camp.status}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ height: '100%', width: `${(camp.bookedCount / camp.targetCount) * 100}%`, background: '#10B981', borderRadius: '4px', transition: 'width 1s' }} />
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                        <span>Target: {camp.targetCount}</span>
                        <span>Sent: {camp.sentCount}</span>
                        <span>Responded: {camp.respondedCount}</span>
                        <span style={{ color: '#22C55E' }}>Booked: {camp.bookedCount}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SchedulePanel({ data }: { data: CommandCentreData }) {
    const opt = data.schedule.todayOptimization;
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#06B6D4', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarClock size={18} /> Autonomous Schedule Optimizer</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Optimization Score" value={`${opt.optimizationScore}%`} color="#06B6D4" />
                <StatCard label="Slots Filled" value={`${opt.optimizedSlots}/${opt.totalSlots}`} color="#22C55E" />
                <StatCard label="DNA Predicted" value={opt.predictedDNAs.toString()} color="#F59E0B" />
                <StatCard label="Avg Fill Time" value={`${opt.avgFillTimeMinutes} min`} color="#8B5CF6" />
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', marginBottom: '12px' }}>DNA Risk Predictions</div>
            {data.schedule.predictedDNAs.map(pred => (
                <div key={pred.slotId} style={{ padding: '12px 16px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.8125rem', color: 'white', fontWeight: 500 }}>{pred.patientName}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '8px' }}>{pred.slotTime}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ width: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pred.dnaProbability * 100}%`, background: pred.dnaProbability > 0.5 ? '#EF4444' : pred.dnaProbability > 0.25 ? '#F59E0B' : '#22C55E', borderRadius: '4px' }} />
                        </div>
                        <span style={{ fontSize: '0.625rem', color: pred.dnaProbability > 0.5 ? '#EF4444' : '#F59E0B', fontWeight: 700 }}>{(pred.dnaProbability * 100).toFixed(0)}%</span>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700, background: pred.recommendation === 'avoid' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: pred.recommendation === 'avoid' ? '#EF4444' : '#F59E0B' }}>{pred.recommendation.replace(/_/g, ' ')}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DocumentsPanel({ data }: { data: CommandCentreData }) {
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F97316', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> Clinical Document Author — GP Approval Lock</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Pending Review" value={data.documents.pendingReview.length.toString()} color="#F97316" />
                <StatCard label="Drafted Today" value={data.documents.todayDrafted.toString()} color="#3B82F6" />
                <StatCard label="Approved Today" value={data.documents.todayApproved.toString()} color="#22C55E" />
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.6875rem', color: '#F97316', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} /> HARD LOCK: No document can be sent without GP_APPROVED status
            </div>
            {data.documents.pendingReview.map(doc => (
                <div key={doc.id} style={{ padding: '16px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{doc.title}</span>
                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700, background: doc.status === 'AWAITING_GP_REVIEW' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: doc.status === 'AWAITING_GP_REVIEW' ? '#F59E0B' : '#22C55E' }}>{doc.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                        <span>Type: {doc.type.replace(/_/g, ' ')}</span>
                        <span>Patient: {doc.patientName}</span>
                        <span>NICE: {doc.niceGuidelinesReferenced.join(', ')}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function HealthPanel({ data }: { data: CommandCentreData }) {
    return (
        <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#EF4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} /> Health Data Monitor — Contextualised Alerts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Critical" value={data.healthMonitor.criticalCount.toString()} color="#EF4444" />
                <StatCard label="Urgent" value={data.healthMonitor.urgentCount.toString()} color="#F59E0B" />
                <StatCard label="Monitor" value={data.healthMonitor.monitorCount.toString()} color="#3B82F6" />
                <StatCard label="Readings Today" value={data.healthMonitor.recentReadings.length.toString()} color="#22C55E" />
            </div>
            {data.healthMonitor.activeAlerts.map(alert => (
                <div key={alert.id} style={{ padding: '14px 16px', background: alert.tier === 'CRITICAL' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.05)', border: `1px solid ${alert.tier === 'CRITICAL' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.15)'}`, borderRadius: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {alert.tier === 'CRITICAL' ? <ShieldAlert size={16} color="#EF4444" /> : <AlertTriangle size={16} color="#F59E0B" />}
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>{alert.patientName}</span>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700, background: alert.tier === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)', color: alert.tier === 'CRITICAL' ? '#EF4444' : '#F59E0B' }}>{alert.tier}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{alert.description}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Action: {alert.recommendedAction.slice(0, 80)}...
                        {alert.autoResponseTriggered && <span style={{ color: '#EF4444', marginLeft: '8px', fontWeight: 600 }}>AUTO-RESPONSE TRIGGERED</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ═══ REUSABLE STAT CARD ═══

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ padding: '14px 16px', background: `${color}08`, border: `1px solid ${color}22`, borderRadius: '12px' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
        </div>
    );
}
