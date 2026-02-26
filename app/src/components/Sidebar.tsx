'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, LayoutDashboard, Zap, PhoneCall, Settings, Crown, Cpu } from 'lucide-react';
import EmmaLogo from './EmmaLogo';

const NAV_LINKS = [
    { href: '/demo', label: 'AI Chat', icon: <MessageSquare size={18} /> },
    { href: '/command-centre', label: 'Command Centre', icon: <Cpu size={18} /> },
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/triage', label: 'Triage Queue', icon: <Zap size={18} /> },
    { href: '/calls', label: 'Call Audit', icon: <PhoneCall size={18} /> },
    { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

export default function Sidebar() {
    const pathname = usePathname();

    // Do not show sidebar on landing page
    if (pathname === '/') return null;

    return (
        <aside className="zyricon-sidebar">
            <div className="zs-header">
                <Link href="/" className="zs-logo">
                    <EmmaLogo size={36} />
                </Link>
            </div>

            <div className="zs-nav-section">
                <div className="zs-section-title">Features</div>
                {NAV_LINKS.map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`zs-link ${pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? 'active' : ''}`}
                    >
                        <span className="zs-icon">{link.icon}</span>
                        {link.label}
                    </Link>
                ))}
            </div>

            <div className="zs-spacer" />

            {/* Bottom Upgrade/Profile Card mimicking Zyricon design */}
            <div className="zs-bottom-card">
                <div className="zs-card-icon"><Crown size={20} color="#EAB308" /></div>
                <h4>Dr. Khan</h4>
                <p>GP Lead • NHS Spine Connected</p>
                <Link href="/settings" className="zs-card-btn">Profile Settings</Link>
            </div>
        </aside>
    );
}
