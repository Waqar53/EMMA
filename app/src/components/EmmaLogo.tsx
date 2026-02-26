'use client';

export default function EmmaLogo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" rx="24" fill="#2563EB" />
                {/* "A" letter */}
                <path d="M30 90L52 30H58L80 90H72L66 74H44L38 90H30ZM46.5 67H63.5L55 42L46.5 67Z" fill="white" />
                {/* "i" dot */}
                <circle cx="90" cy="38" r="6" fill="white" />
                {/* "i" stem */}
                <rect x="84" y="50" width="12" height="40" rx="4" fill="white" />
            </svg>
            {showText && (
                <div style={{ lineHeight: 1.1 }}>
                    <div style={{ fontSize: `${size * 0.5}px`, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>EMMA</div>
                    <div style={{ fontSize: `${size * 0.28}px`, fontWeight: 500, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>AI</div>
                </div>
            )}
        </div>
    );
}
