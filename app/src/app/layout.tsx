import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMMA — AI GP Receptionist | QuantumLoopAI",
  description: "EMMA is an AI-powered GP receptionist that eliminates the 8am rush for NHS practices. Built by QuantumLoopAI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
