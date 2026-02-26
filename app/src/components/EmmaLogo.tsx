'use client';

export default function EmmaLogo({ size = 40, showText = true }: { size?: number, showText?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.15 + 'px' }}>
            <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', filter: 'drop-shadow(0px 8px 16px rgba(21,78,193,0.3))' }}>
                <rect width="120" height="120" rx="20" fill="#154ec1" />
                {/* A letterform */}
                <path fillRule="evenodd" clipRule="evenodd" d="M 32 86 L 56 24 H 74 V 86 H 58 V 68 H 44 L 38 86 Z M 48 54 H 58 V 38 Z" fill="white" />
                {/* i stem */}
                <rect x="78" y="52" width="16" height="34" fill="white" />
                {/* i dot */}
                <circle cx="86" cy="34" r="8" fill="white" />
            </svg>
            {showText && (
                <div style={{ fontSize: `${size * 0.25}px`, fontWeight: 700, color: '#154ec1', letterSpacing: '0.05em' }}>
                    EMMA AI
                </div>
            )}
        </div>
    );
}
