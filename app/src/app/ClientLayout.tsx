'use client';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // The landing page doesn't use the app layout
    if (pathname === '/') return <>{children}</>;

    return (
        <div className="zyricon-app-container">
            <Sidebar />
            <main className="zyricon-main-content">
                {children}
            </main>
        </div>
    );
}
