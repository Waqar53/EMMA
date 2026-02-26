import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'EMMA — AI GP Receptionist | QuantumLoopAI',
  description: 'EMMA is an AI-powered GP receptionist that eliminates the 8am rush for NHS practices. Built by QuantumLoopAI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
