'use client';

import Link from 'next/link';
import EmmaLogo from '@/components/EmmaLogo';

export default function HomePage() {
  return (
    <div className="landing-hero">
      <EmmaLogo size={64} showText={false} />
      <h1 style={{ marginTop: '24px' }}>Meet EMMA</h1>
      <p>AI GP Receptionist — Ending the 8am Rush, Transforming Patient Care Forever.<br />Built by QuantumLoopAI for NHS Primary Care.</p>
      <Link href="/dashboard" className="btn-hero">📊 Practice Dashboard</Link>
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', position: 'relative', zIndex: 1 }}>
        <Link href="/demo" className="btn-hero" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none' }}>💬 AI Chat Demo</Link>
        <Link href="/triage" className="btn-hero" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none' }}>⚡ Triage Queue</Link>
      </div>
      <p className="hero-sub">Navigate to any section — Dashboard, Triage Queue, Call Audit, AI Chat, or Settings</p>
    </div>
  );
}
