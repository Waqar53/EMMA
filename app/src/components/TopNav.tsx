'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import EmmaLogo from './EmmaLogo';

const NAV_LINKS = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/triage', label: 'Triage', icon: '⚡' },
    { href: '/calls', label: 'Calls', icon: '📞' },
    { href: '/demo', label: 'AI Chat', icon: '💬' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function TopNav() {
    const pathname = usePathname();

    return (
        <nav className="topnav">
            <Link href="/" className="topnav-logo">
                <EmmaLogo size={28} showText={true} />
            </Link>

            <div className="topnav-links">
                {NAV_LINKS.map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href)) ? 'active' : ''}
                    >
                        <span className="nav-icon">{link.icon}</span>
                        {link.label}
                    </Link>
                ))}
            </div>

            <div className="topnav-spacer" />

            <button className="topnav-redflag">
                <span className="rf-dot" />
                Red Flags (2)
            </button>

            <div className="topnav-user">
                <div className="user-info">
                    <span className="user-name">Dr. Khan</span>
                    <span className="user-role">GP Lead</span>
                </div>
                <div className="avatar">DK</div>
            </div>
        </nav>
    );
}
