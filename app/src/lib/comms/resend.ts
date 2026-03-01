// ═══════════════════════════════════════════════════════════════════════════════
// EMMA COMMS — Resend Email
//
// Free tier: 100 emails/day, 1 domain. Env var: RESEND_API_KEY
// ═══════════════════════════════════════════════════════════════════════════════

import { Resend } from 'resend';

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.EMMA_FROM_EMAIL || 'emma@resend.dev'; // Resend test domain

let _resend: Resend | null = null;
function getResend(): Resend | null {
    if (!RESEND_KEY) {
        console.warn('⚠️ Resend API key not configured — email disabled');
        return null;
    }
    if (!_resend) _resend = new Resend(RESEND_KEY);
    return _resend;
}

export interface EmailResult {
    success: boolean;
    emailId?: string;
    to: string;
    subject: string;
    error?: string;
}

export async function sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
): Promise<EmailResult> {
    const resend = getResend();

    if (!resend) {
        console.log(`📧 Email (mock): To ${to}: ${subject}`);
        return { success: true, emailId: `mock-email-${Date.now()}`, to, subject };
    }

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html: htmlBody,
            text: textBody,
        });

        if (result.error) {
            return { success: false, to, subject, error: result.error.message };
        }

        console.log(`✅ Email sent: ${result.data?.id} → ${to}`);
        return { success: true, emailId: result.data?.id, to, subject };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`❌ Email failed to ${to}:`, error);
        return { success: false, to, subject, error };
    }
}

// ── NHS-styled email templates ──

export function appointmentConfirmationEmail(patientName: string, date: string, time: string, clinician: string, practice: string): string {
    return `
    <div style="font-family: 'Frutiger', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: #005eb8; padding: 20px; color: #fff;">
            <h1 style="margin: 0; font-size: 24px;">🏥 ${practice}</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Appointment Confirmation</p>
        </div>
        <div style="padding: 30px;">
            <p>Dear ${patientName},</p>
            <p>Your appointment has been confirmed:</p>
            <div style="background: #f0f4f5; border-left: 4px solid #005eb8; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
                <p style="margin: 5px 0 0;"><strong>Time:</strong> ${time}</p>
                <p style="margin: 5px 0 0;"><strong>With:</strong> ${clinician}</p>
            </div>
            <p>If you need to cancel or change this appointment, reply to this email or call us.</p>
            <p style="color: #666; font-size: 13px; margin-top: 30px;">This message was sent automatically by EMMA, your AI receptionist at ${practice}.</p>
        </div>
    </div>`;
}

export function prescriptionReadyEmail(patientName: string, medication: string, pharmacy: string, readyBy: string): string {
    return `
    <div style="font-family: 'Frutiger', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: #007f3b; padding: 20px; color: #fff;">
            <h1 style="margin: 0; font-size: 24px;">💊 Prescription Update</h1>
        </div>
        <div style="padding: 30px;">
            <p>Dear ${patientName},</p>
            <p>Your repeat prescription has been submitted:</p>
            <div style="background: #f0f4f5; border-left: 4px solid #007f3b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Medication:</strong> ${medication}</p>
                <p style="margin: 5px 0 0;"><strong>Pharmacy:</strong> ${pharmacy}</p>
                <p style="margin: 5px 0 0;"><strong>Ready by:</strong> ${readyBy}</p>
            </div>
            <p style="color: #666; font-size: 13px; margin-top: 30px;">EMMA AI — Automated prescription notification.</p>
        </div>
    </div>`;
}
