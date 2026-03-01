// ═══════════════════════════════════════════════════════════════════════════════
// EMMA COMMS — Twilio SMS + WhatsApp
//
// Free tier: $15.50 trial credit. ~1000 SMS or unlimited sandbox WhatsApp.
// Env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
// WhatsApp sandbox: TWILIO_WHATSAPP_NUMBER (default: whatsapp:+14155238886)
// ═══════════════════════════════════════════════════════════════════════════════

import twilio from 'twilio';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Lazy client — only created when needed (avoids crash if env vars missing)
let _client: twilio.Twilio | null = null;
function getClient(): twilio.Twilio | null {
    if (!TWILIO_SID || !TWILIO_TOKEN) {
        console.warn('⚠️ Twilio credentials not configured — SMS/WhatsApp disabled');
        return null;
    }
    if (!_client) _client = twilio(TWILIO_SID, TWILIO_TOKEN);
    return _client;
}

// ── Types ──

export interface SMSResult {
    success: boolean;
    messageId?: string;
    to: string;
    body: string;
    error?: string;
    channel: 'sms' | 'whatsapp';
}

// ═══════════════════════════════════════════════════════════
// 1. Send SMS
// ═══════════════════════════════════════════════════════════

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
    const client = getClient();

    // Normalise UK phone numbers
    let phone = to.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '+44' + phone.slice(1);
    if (!phone.startsWith('+')) phone = '+44' + phone;

    if (!client) {
        console.log(`📱 SMS (mock): To ${phone}: ${message}`);
        return { success: true, messageId: `mock-${Date.now()}`, to: phone, body: message, channel: 'sms' };
    }

    try {
        const msg = await client.messages.create({
            body: message,
            from: TWILIO_PHONE,
            to: phone,
        });

        console.log(`✅ SMS sent: ${msg.sid} → ${phone}`);
        return { success: true, messageId: msg.sid, to: phone, body: message, channel: 'sms' };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`❌ SMS failed to ${phone}:`, error);
        return { success: false, to: phone, body: message, error, channel: 'sms' };
    }
}

// ═══════════════════════════════════════════════════════════
// 2. Send WhatsApp
// ═══════════════════════════════════════════════════════════

export async function sendWhatsApp(to: string, message: string): Promise<SMSResult> {
    const client = getClient();

    let phone = to.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '+44' + phone.slice(1);
    if (!phone.startsWith('+')) phone = '+44' + phone;
    const waTo = `whatsapp:${phone}`;

    if (!client) {
        console.log(`💬 WhatsApp (mock): To ${phone}: ${message}`);
        return { success: true, messageId: `mock-wa-${Date.now()}`, to: phone, body: message, channel: 'whatsapp' };
    }

    try {
        const msg = await client.messages.create({
            body: message,
            from: TWILIO_WHATSAPP,
            to: waTo,
        });

        console.log(`✅ WhatsApp sent: ${msg.sid} → ${phone}`);
        return { success: true, messageId: msg.sid, to: phone, body: message, channel: 'whatsapp' };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`❌ WhatsApp failed to ${phone}:`, error);
        return { success: false, to: phone, body: message, error, channel: 'whatsapp' };
    }
}

// ═══════════════════════════════════════════════════════════
// 3. Parse Inbound Webhook (Twilio → EMMA)
// ═══════════════════════════════════════════════════════════

export interface InboundMessage {
    from: string;
    body: string;
    channel: 'sms' | 'whatsapp';
    messageId: string;
    timestamp: Date;
}

export function parseInboundWebhook(body: Record<string, string>): InboundMessage {
    const from = (body.From || '').replace('whatsapp:', '');
    const isWhatsApp = (body.From || '').startsWith('whatsapp:');

    return {
        from,
        body: body.Body || '',
        channel: isWhatsApp ? 'whatsapp' : 'sms',
        messageId: body.MessageSid || '',
        timestamp: new Date(),
    };
}
