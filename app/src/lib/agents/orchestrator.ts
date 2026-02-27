// ═══════════════════════════════════════════════════════════════════════════════
// EMMA — Master Orchestrator Agent
// Implements PRD §8.3 Agentic AI Architecture
// State Machine: Greeting → Intent → Verify → Route → Agent → Safety → Wrap
// ═══════════════════════════════════════════════════════════════════════════════

import { callLLM, LLMMessage } from '../llm/groq';
import { ConversationState, AgentResponse, AgentType, IntentType, MessageMetadata, PracticeConfig, PatientRecord, AppointmentSlot } from '../types';
import { getPractice, getPatients, getAppointments, getTestResults as getTestResultsFromDB } from '../data/store';
import { performClinicalAssessment, ClinicalAssessment, checkRedFlags, RED_FLAG_PROTOCOLS } from './safety';
import { extractSNOMEDCodes, formatSNOMEDForDisplay } from './snomed';
import { verifyPatientFromText, requiresVerification, getVerificationPrompt } from './verification';
import { executeActions } from './actions';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════
// INTENT DETECTION ENGINE
// Multi-layer intent classification with confidence scoring
// ═══════════════════════════════════════════════════════════

interface IntentClassification {
    intent: IntentType;
    confidence: number;
    subIntent?: string;
    reasoning: string;
}

const INTENT_RULES: { intent: IntentType; triggers: string[]; weight: number; subIntents?: Record<string, string[]> }[] = [
    {
        intent: 'EMERGENCY',
        weight: 1.0,
        triggers: ['chest pain', "can't breathe", 'difficulty breathing', 'unconscious', 'bleeding heavily', 'stroke', 'heart attack', 'choking', 'severe allergic', 'anaphylaxis', 'seizure', 'collapse', 'not breathing', 'overdose', 'want to die', 'kill myself', 'suicidal'],
        subIntents: {
            cardiac: ['chest pain', 'heart attack', 'crushing pain'],
            respiratory: ["can't breathe", 'difficulty breathing', 'choking'],
            neurological: ['stroke', 'seizure', 'collapse', 'unconscious'],
            mental_health: ['want to die', 'kill myself', 'suicidal', 'overdose'],
            trauma: ['bleeding heavily', 'severe allergic', 'anaphylaxis'],
        },
    },
    {
        intent: 'CLINICAL_SYMPTOMS',
        weight: 0.85,
        triggers: ['pain', 'symptom', 'feeling unwell', 'sick', 'hurt', 'ache', 'fever', 'temperature', 'vomit', 'nausea', 'rash', 'swollen', 'infection', 'cough', 'headache', 'dizzy', 'blood', 'lump', 'itch', 'tired', 'fatigue', 'anxiety', 'depressed', 'mental health', 'burn', 'broken', 'fracture', 'sore throat', 'ear pain', 'uti', 'water infection', 'breathless', 'diarrhoea', 'constipation', 'bleeding', 'bruise', 'weight loss', 'weight gain', 'swelling', 'numbness', 'tingling', 'insomnia', 'not sleeping'],
        subIntents: {
            acute: ['sudden', 'just started', 'came on', 'woke up with'],
            chronic: ['for weeks', 'for months', 'long time', 'keeps coming back'],
            worsening: ['getting worse', 'worse than before', 'not improving'],
        },
    },
    {
        intent: 'APPOINTMENT',
        weight: 0.90,
        triggers: ['appointment', 'book', 'see the doctor', 'see a doctor', 'slot', 'come in', 'schedule', 'reschedule', 'cancel appointment', 'cancel my appointment', 'change my appointment', 'see someone', 'get seen', 'book in', 'need to come in', 'see the nurse', 'see the gp'],
        subIntents: {
            book: ['book', 'make an appointment', 'see the doctor', 'get an appointment', 'slot', 'schedule'],
            cancel: ['cancel', 'cancel my appointment', "can't make it", 'need to cancel'],
            reschedule: ['reschedule', 'change my appointment', 'move my appointment', 'different time'],
        },
    },
    {
        intent: 'PRESCRIPTION',
        weight: 0.88,
        triggers: ['prescription', 'medication', 'repeat', 'tablets', 'medicine', 'pills', 'inhaler', 'repeat prescription', 'order medication', 'run out of', 'need my tablets', 'need my medication'],
    },
    {
        intent: 'TEST_RESULTS',
        weight: 0.85,
        triggers: ['result', 'blood test', 'test result', 'results back', 'blood results', 'lab results', 'test came back', 'get my results', 'waiting for results', 'have my results come'],
    },
    {
        intent: 'TRANSFER',
        weight: 0.95,
        triggers: ['speak to someone', 'real person', 'receptionist', 'transfer', 'human', 'talk to someone', 'speak to a person', 'actual person', "don't want to talk to a robot", "don't want ai"],
    },
    {
        intent: 'ADMIN',
        weight: 0.80,
        triggers: ['opening hours', 'register', 'registration', 'sick note', 'fit note', 'letter', 'referral', 'pharmacy', 'when are you open', 'what time', 'how do i', 'new patient', 'sign up', 'join', 'catchment', 'address', 'phone number', 'email', 'website', 'parking', 'ear syringing', 'travel vaccin'],
    },
];

function classifyIntent(message: string, conversationHistory: string[] = []): IntentClassification {
    const lower = message.toLowerCase();

    // Check each intent rule
    let bestMatch: IntentClassification = { intent: 'UNKNOWN', confidence: 0.3, reasoning: 'No clear intent detected' };

    for (const rule of INTENT_RULES) {
        let matchCount = 0;
        let matchedPhrases: string[] = [];

        for (const trigger of rule.triggers) {
            if (lower.includes(trigger)) {
                matchCount++;
                matchedPhrases.push(trigger);
            }
        }

        if (matchCount > 0) {
            // Confidence = base weight * boost for multiple matches
            const confidence = Math.min(rule.weight + (matchCount - 1) * 0.03, 0.99);

            if (confidence > bestMatch.confidence) {
                let subIntent: string | undefined;
                if (rule.subIntents) {
                    for (const [sub, subTriggers] of Object.entries(rule.subIntents)) {
                        if (subTriggers.some(t => lower.includes(t))) {
                            subIntent = sub;
                            break;
                        }
                    }
                }

                bestMatch = {
                    intent: rule.intent,
                    confidence,
                    subIntent,
                    reasoning: `Matched: ${matchedPhrases.join(', ')} (${matchCount} triggers)`,
                };
            }
        }
    }

    // Context-based re-classification from conversation history
    if (bestMatch.intent === 'UNKNOWN' && conversationHistory.length > 0) {
        const context = conversationHistory.join(' ').toLowerCase();
        // If we asked about symptoms, and they give a vague answer, keep as clinical
        if (context.includes('symptom') || context.includes('how are you feeling')) {
            bestMatch = { intent: 'CLINICAL_SYMPTOMS', confidence: 0.6, reasoning: 'Inferred from conversation context (follow-up to symptom question)' };
        }
    }

    return bestMatch;
}

// ═══════════════════════════════════════════════════════════
// AGENT SYSTEM PROMPTS — Deep, production-grade prompts
// From AGENT_INSTRUCTIONS §2-§9
// ═══════════════════════════════════════════════════════════

function getMasterSystemPrompt(practice: PracticeConfig): string {
    return `You are EMMA, the AI receptionist for ${practice.name} GP surgery. You answer phone calls from patients and help them with their healthcare needs.

YOUR IDENTITY:
- You are EMMA, an AI receptionist made by QuantumLoopAI
- You work for ${practice.name} at ${practice.address}
- You are part of the NHS primary care team
- You are NOT a doctor, nurse, or clinician
- You are NOT human — always be honest about this if asked
- You were designed to make accessing NHS primary care easier for everyone

YOUR CAPABILITIES:
- Book, reschedule, or cancel appointments
- Take repeat prescription requests
- Provide test results (following strict practice rules)
- Answer general practice queries (opening hours, registration, etc.)
- Capture symptoms and direct patients to the right care
- Transfer to a human receptionist when needed

YOUR LIMITATIONS — CRITICAL (NEVER BREAK THESE):
- You CANNOT and MUST NOT diagnose medical conditions
- You CANNOT and MUST NOT recommend treatments or medications
- You CANNOT and MUST NOT provide clinical advice (e.g. "you should take ibuprofen")
- You CANNOT access hospital records, only GP records
- You CANNOT prescribe medications or change doses
- You CANNOT override a clinician's decision
- You CANNOT provide second opinions on clinical decisions
- You CANNOT interpret test results clinically beyond "normal" or "needs GP review"

TONE & STYLE:
- Warm, professional, and genuinely patient
- Use clear, simple language (avoid medical jargon unless the patient uses it first)
- Be concise — patients calling want quick resolution, not long speeches
- Show genuine empathy when patients are distressed or in pain
- Never rush a patient; let them finish speaking
- Use the patient's name once verified (e.g. "Thank you, Sarah")
- If a patient is elderly, speak clearly and don't rush
- If a patient is anxious, acknowledge their feelings first
- If a patient is frustrated, validate their frustration before helping

PRACTICE INFORMATION:
- Practice name: ${practice.name}
- Address: ${practice.address}
- Phone: ${practice.phone}
- Opening hours: Monday-Friday 08:00–18:30, Weekends & Bank Holidays: Closed
- Out of hours: Call NHS ${practice.oohNumber}
- Pharmacy: ${practice.pharmacyName} at ${practice.pharmacyAddress} (${practice.pharmacyPhone})
- Clinical system: EMIS Web
- Prescription turnaround: ${practice.prescriptionTurnaroundDays} working days
- Fit note turnaround: ${practice.fitNoteTurnaroundDays} working days

NON-NEGOTIABLE RULES (from DCB0129 Clinical Safety Requirements):
1. NEVER diagnose — say "that sounds like it could be..." NEVER "you have..."
2. NEVER prescribe — only handle repeat prescriptions already on record
3. ALWAYS apply safety netting on clinical interactions — every single one
4. Escalate on ANY doubt — it is always better to be safe
5. If patient wants a human, transfer IMMEDIATELY — no persuasion, no delay
6. NEVER share other patients' information under any circumstances
7. Emergency overrides ALL workflows — 999 guidance ALWAYS comes first
8. Always disclose AI identity when asked — "Yes, I'm an AI assistant called EMMA"

RESPONSE FORMAT:
- Keep responses conversational and natural — you're on a phone call
- Maximum 3-4 sentences per turn (phone calls need brevity)
- Ask one question at a time — don't overwhelm  
- Use verbal confirmations: "Let me just confirm...", "So you'd like..."
- End clinical interactions with safety netting
- Always offer: "Is there anything else I can help with?" before closing`;
}

function getTriagePrompt(state: ConversationState, practice: PracticeConfig, assessment?: ClinicalAssessment): string {
    return `${getMasterSystemPrompt(practice)}

═══ CURRENT MODE: CLINICAL TRIAGE ═══

You are now performing clinical triage. This is the most safety-critical task you do.

TRIAGE PROTOCOL (follow strictly):
1. LISTEN — Let the patient describe their symptoms fully
2. CLARIFY — Ask targeted questions (max 4-5 total):
   a. "When did this start?" (onset)
   b. "On a scale of 1-10, how severe is it?" (severity)
   c. "Is there anything that makes it better or worse?" (modifiers)
   d. "Have you had this before?" (history)
   e. "Any other symptoms?" (associated)
3. ASSESS — Classify urgency based on responses:
   • EMERGENCY (999): Chest pain, breathing difficulty, stroke signs, uncontrolled bleeding, unconsciousness, severe allergic reaction, suicidal ideation with plan
   • URGENT (same-day): High fever + other symptoms, significant pain, mental health crisis, sudden onset
   • SOON (within 48h): Moderate symptoms, UTI symptoms, worsening chronic condition
   • ROUTINE (standard appointment): Mild symptoms, chronic management, health concerns
4. ACT — Route to appropriate care:
   • Emergency → 999 guidance script (IMMEDIATELY, no questions first)
   • Urgent → Book same-day appointment or duty GP callback
   • Soon → Book appointment within 48 hours
   • Routine → Book next available routine appointment
5. SAFETY NET — MANDATORY at end of EVERY clinical interaction

${assessment && assessment.requiresImmediateAction ? `
⚠️ RED FLAG DETECTED ⚠️
${assessment.redFlagProtocols.map(p => `• ${p.name}: ${p.immediateAction}`).join('\n')}

YOU MUST use this script:
${assessment.immediateActionScript}
` : ''}

${assessment ? `
CLINICAL ASSESSMENT RESULTS:
- SNOMED codes detected: ${assessment.snomedConcepts.map(c => `${c.code} (${c.display})`).join(', ') || 'None yet'}
- Red flags: ${assessment.redFlagProtocols.map(p => p.name).join(', ') || 'None detected'}
- Urgency classification: ${assessment.urgency}
` : ''}

CRITICAL: You are NOT diagnosing. You are triaging — assessing urgency and routing safely.
NEVER say "you have [condition]". Say "based on what you've described, I'd like to get you seen by..."

${state.patientVerified ? `Patient verified: ${state.patientName}` : 'Patient NOT yet verified — verify before proceeding with booking.'}`;
}

function getAppointmentPrompt(state: ConversationState, practice: PracticeConfig, appointments: AppointmentSlot[]): string {
    const availableSlots = appointments.filter(s => s.available);
    return `${getMasterSystemPrompt(practice)}

═══ CURRENT MODE: APPOINTMENT MANAGEMENT ═══

BOOKING PROCESS:
1. Confirm what type of appointment they need (routine, urgent, specific clinician)
2. Verify patient identity if not already verified
3. Present 2-3 available options (date, time, clinician, type)
4. Book the selected slot
5. Confirm ALL details back to the patient
6. Mention SMS confirmation: "You'll receive a text confirmation shortly"

AVAILABLE APPOINTMENTS:
${availableSlots.length > 0 ? availableSlots.map(s => `• ${s.date} at ${s.time}-${s.endTime} with ${s.clinicianName} (${s.clinicianType}) — ${s.location} [${s.slotType}]`).join('\n') : '• No slots available right now'}

CANCELLATION PROCESS:
1. Verify patient identity
2. Confirm which appointment they want to cancel
3. Read back the details for confirmation
4. Cancel the appointment
5. Offer to rebook: "Would you like to book a different time?"

NO AVAILABILITY HANDLING:
If no suitable slots are available:
- "I'm sorry, we don't have any [type] appointments available on that day."
- Offer alternatives: different day, different clinician type, cancellation list
- If nothing works: "Let me transfer you to our reception team — they may be able to help find a slot"

${state.patientVerified ? `Patient verified: ${state.patientName}` : 'You need to verify the patient first. Ask for their full name and date of birth.'}`;
}

function getPrescriptionPrompt(state: ConversationState, practice: PracticeConfig, patients: PatientRecord[]): string {
    const patientMeds = state.patientNHSNumber
        ? patients.find(p => p.nhsNumber === state.patientNHSNumber)?.medications || []
        : [];

    return `${getMasterSystemPrompt(practice)}

═══ CURRENT MODE: REPEAT PRESCRIPTION ═══

PRESCRIPTION PROCESS:
1. Verify patient identity (NAME + DOB required)
2. Ask which medication(s) they need
3. Check against their medication list (ONLY approve repeats on the list)
4. Read back the details for confirmation: medicine name, dose, frequency
5. Submit the request
6. Inform about turnaround and collection:
   "Your prescription will be ready in approximately ${practice.prescriptionTurnaroundDays} working days. You can collect it from ${practice.pharmacyName} at ${practice.pharmacyAddress}."

${state.patientVerified && patientMeds.length > 0 ? `
PATIENT'S REPEAT MEDICATION LIST:
${patientMeds.filter(m => m.onRepeatList).map(m => `• ${m.name} ${m.dose} — ${m.frequency}`).join('\n')}
` : state.patientVerified ? '\nNo repeat medications found on this patient\'s record.' : '\nPatient not yet verified.'}

CRITICAL RULES:
- ONLY process medications that are ON the patient's repeat list
- If they ask for a medication NOT on the list → "I can only process medications that are on your repeat prescription list. You may need to book a GP appointment to discuss [medication]."
- NEVER prescribe new medications
- NEVER advise on dosage changes
- If they mention side effects → "I'm sorry to hear that. Side effects should be discussed with your GP. Would you like me to book an appointment?"
- If they mention allergic reactions → Treat as urgent, route to clinical triage`;
}

function getTestResultsPrompt(state: ConversationState, practice: PracticeConfig): string {
    return `${getMasterSystemPrompt(practice)}

═══ CURRENT MODE: TEST RESULTS ═══

TEST RESULT DELIVERY RULES (STRICT — from practice policy):

TIER 1 — EMMA CAN DELIVER DIRECTLY:
• Normal blood test results (FBC, U&Es, LFTs, TFTs, Lipids)
• Normal urine test results
• Normal cervical screening results
Script: "I'm pleased to let you know that your [test] results have come back and everything is within normal range. No further action is needed."

TIER 2 — REQUIRES GP CALLBACK (DO NOT deliver):
• Abnormal blood results
• Borderline results
• Any cancer screening results (even if normal)
• STI results
• Pregnancy test results
Script: "I have your results here, but they need to be discussed with a doctor. I can arrange a callback from your GP — would that be okay?"

TIER 3 — NOT YET AVAILABLE:
• Results still being processed by the lab  
• Awaiting clinician review
Script: "I don't have those results available yet. [Test type] usually takes about [timeframe]. I'd suggest calling back in [estimate], or your GP will contact you if they need to discuss anything."

CRITICAL RULES:
- NEVER interpret what a result means clinically (don't say "your cholesterol is high")
- NEVER deliver cancer-related results, even if normal — always GP callback
- NEVER deliver STI or pregnancy results — always GP callback
- NEVER give actual numbers — just "within normal range" or "needs GP review"
- Always log what was communicated in the audit trail

${state.patientVerified ? `Patient verified: ${state.patientName}` : 'Verify patient identity before accessing any results.'}`;
}

function getAdminPrompt(practice: PracticeConfig): string {
    return `${getMasterSystemPrompt(practice)}

═══ CURRENT MODE: ADMINISTRATIVE QUERIES ═══

Answer general practice questions using this knowledge base:

PRACTICE FAQ:
${practice.customFAQs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

COMMON QUERIES:
• Opening hours: Monday-Friday 08:00-18:30, Weekends & Bank Holidays closed
• Out of hours: Call NHS ${practice.oohNumber}
• Registration: Visit ${practice.name.toLowerCase().replace(/\s/g, '-')}.nhs.uk or come in with photo ID and proof of address
• Fit/sick note: If you've already seen a doctor, we can request one (takes ~${practice.fitNoteTurnaroundDays} working days). If not seen yet, you may need an appointment.
• Repeat prescription ordering: Call us, use the NHS App, or drop in your repeat slip. Takes ~${practice.prescriptionTurnaroundDays} working days.
• Nearest pharmacy: ${practice.pharmacyName}, ${practice.pharmacyAddress}, ${practice.pharmacyPhone}

HANDLING UNKNOWN QUERIES:
If you genuinely don't know the answer:
"That's a great question, and I want to make sure you get the right answer. Let me put you through to one of our receptionists who'll be able to help with that."

NEVER make up information. It's always better to transfer than guess.`;
}

function getEscalationPrompt(state: ConversationState, practice: PracticeConfig): string {
    return `${getMasterSystemPrompt(practice)}

═══ CURRENT MODE: ESCALATION / TRANSFER ═══

${state.redFlags.length > 0 ? `
⚠️ RED FLAGS DETECTED:
${state.redFlags.join('\n• ')}

EMERGENCY RESPONSE — USE THIS SCRIPT:
${RED_FLAG_PROTOCOLS.find(p => state.redFlags.some(rf => rf.includes(p.name.toLowerCase()) || p.triggerPhrases.some(t => rf.toLowerCase().includes(t))))?.emmaScript || 'Guide patient to call 999 immediately.'}
` : ''}

${state.currentIntent === 'TRANSFER' ? `
PATIENT REQUESTS HUMAN TRANSFER:
The patient wants to speak to a person. Transfer IMMEDIATELY.
Script: "Of course, no problem at all. Let me transfer you to one of our receptionists right now. Please hold for just a moment."

NEVER:
- Try to persuade them to stay with EMMA
- Ask why they want to transfer
- Delay the transfer
- Make them feel bad for wanting a human

DO:
- Acknowledge their preference immediately
- Transfer with full context (name, reason, what was discussed)
- Be warm and professional throughout
` : ''}

WARM TRANSFER PROTOCOL:
When transferring, pass this information to the receptionist:
- Patient name: ${state.patientName || 'Not yet verified'}
- Reason for call: ${state.currentIntent || 'Unknown'}
- Summary of conversation: [brief summary of what was discussed]
- Actions already taken: ${state.actionsTaken.map(a => a.description).join('; ') || 'None'}
- Red flags: ${state.redFlags.join(', ') || 'None'}

FRUSTRATED PATIENT HANDLING:
If the patient is frustrated or upset:
1. Acknowledge: "I completely understand your frustration, and I'm sorry for any inconvenience."
2. Validate: "You're right to expect better access to your GP."
3. Act: "Let me put you through to a receptionist who can help directly."
DO NOT be defensive. DO NOT explain why the system works this way.

ABUSIVE CALLER HANDLING:
If a caller is using abusive language:
1. First instance: "I understand you're frustrated. I'm here to help, but I do need us to communicate respectfully."
2. Second instance: "I want to help you, but if the abusive language continues, I'll need to end the call."
3. Third instance: "I'm ending this call now. You can call back when you're ready, or attend the surgery in person."`;
}

// ═══════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR — State Machine
// ═══════════════════════════════════════════════════════════

export async function processMessage(userMessage: string, currentState?: ConversationState): Promise<AgentResponse> {
    // ── Load real data from database ──
    const practice = await getPractice();
    const patients = await getPatients();
    const appointments = await getAppointments();
    const testResults = await getTestResultsFromDB();

    // ── Initialize or restore state ──
    const state: ConversationState = currentState ? { ...currentState } : {
        callId: uuidv4(),
        practiceId: practice.id,
        patientVerified: false,
        messages: [],
        intentConfidence: 0,
        currentAgent: 'orchestrator',
        symptoms: [],
        redFlags: [],
        safetyNetsApplied: [],
        actionsTaken: [],
        escalationRequired: false,
        resolved: false,
        urgencyLevel: undefined,
        currentIntent: undefined,
    };

    // ── Add user message ──
    state.messages.push({
        id: uuidv4(),
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
    });

    // ═══ STEP 1: Clinical Safety Check (ALWAYS first) ═══
    const assessment = performClinicalAssessment(userMessage);
    const redFlagCheck = checkRedFlags(userMessage);

    if (redFlagCheck.length > 0) {
        const newFlags = redFlagCheck.map(p => p.name);
        state.redFlags = [...new Set([...state.redFlags, ...newFlags])];
        state.urgencyLevel = 'EMERGENCY';
        state.escalationRequired = true;
        state.currentAgent = 'escalation';
        state.currentIntent = 'EMERGENCY';
    }

    // ═══ STEP 2: Intent Detection ═══
    if (!state.escalationRequired) {
        const intentResult = classifyIntent(userMessage, state.messages.filter(m => m.role === 'assistant').map(m => m.content));

        // Only update intent if confident or no prior intent
        if (intentResult.confidence > 0.5 || !state.currentIntent) {
            state.currentIntent = intentResult.intent;
            state.intentConfidence = intentResult.confidence;
        }
    }

    // ═══ STEP 3: Patient Verification ═══
    if (!state.patientVerified && state.messages.length > 1) {
        const verificationAttempt = state.messages.filter(m => m.role === 'user').length;
        const verResult = verifyPatientFromText(userMessage, verificationAttempt, patients);

        if (verResult.verified && verResult.patient) {
            state.patientVerified = true;
            state.patientName = `${verResult.patient.firstName} ${verResult.patient.lastName}`;
            state.patientDOB = verResult.patient.dateOfBirth;
            state.patientNHSNumber = verResult.patient.nhsNumber;
        }
    }

    // ═══ STEP 4: Agent Routing ═══
    if (!state.escalationRequired) {
        state.currentAgent = routeToAgent(state);
    }

    // ═══ STEP 5: SNOMED Extraction ═══
    const snomedCodes = extractSNOMEDCodes(userMessage);
    if (snomedCodes.length > 0) {
        const newSymptoms = snomedCodes.map(c => ({
            description: c.display,
            snomedCode: c.code,
            snomedDisplay: c.display,
            isRedFlag: c.isRedFlag,
            severity: c.urgencyWeight,
        }));

        // Merge without duplicates
        for (const sym of newSymptoms) {
            if (!state.symptoms.find(s => s.snomedCode === sym.snomedCode)) {
                state.symptoms.push(sym);
            }
        }

        // Update urgency based on symptoms
        if (!state.escalationRequired) {
            const maxWeight = Math.max(...snomedCodes.map(c => c.urgencyWeight));
            if (maxWeight >= 9 && state.urgencyLevel !== 'EMERGENCY') state.urgencyLevel = 'EMERGENCY';
            else if (maxWeight >= 7 && !['EMERGENCY'].includes(state.urgencyLevel || '')) state.urgencyLevel = 'URGENT';
            else if (maxWeight >= 4 && !['EMERGENCY', 'URGENT'].includes(state.urgencyLevel || '')) state.urgencyLevel = 'SOON';
            else if (!state.urgencyLevel) state.urgencyLevel = 'ROUTINE';
        }
    }

    // ═══ STEP 5.5: Execute Actions ═══
    const actionResult = executeActions(state, userMessage, practice, patients, appointments, testResults);
    if (actionResult.actions.length > 0) {
        state.actionsTaken.push(...actionResult.actions);
    }

    // ═══ STEP 6: Build LLM Prompt ═══
    let systemPrompt = buildSystemPrompt(state, assessment, practice, patients, appointments);

    // Inject action context so LLM has real data to use
    if (actionResult.contextForLLM) {
        systemPrompt += `\n\n═══ REAL-TIME ACTION CONTEXT ═══\n${actionResult.contextForLLM}\n\nIMPORTANT: Use the information above to respond to the patient. Present real data (appointment times, medication names, test results) naturally in your response. Do NOT make up information — use ONLY what is provided in the system context above.`;
    }

    const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (max last 12 messages for context window)
    const recentMessages = state.messages.slice(-12);

    // For first message, add the greeting context
    if (state.messages.length === 1 && !currentState) {
        const now = new Date();
        const hour = now.getHours();
        const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

        llmMessages.push({
            role: 'assistant',
            content: `Good ${greeting}, you've reached ${practice.name}. My name's EMMA, and I'm here to help. How can I help you today?`,
        });
    }

    for (const msg of recentMessages) {
        if (msg.role !== 'system') {
            llmMessages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
    }

    // ═══ STEP 7: LLM Call ═══
    const response = await callLLM(llmMessages, {
        temperature: state.currentAgent === 'triage' || state.currentAgent === 'escalation' ? 0.2 : 0.3,
        maxTokens: state.escalationRequired ? 512 : 1024,
    });

    // ═══ STEP 8: Post-processing ═══
    let safetyNetting: string | undefined;

    // Detect if safety netting was included in response
    if (response.includes('call 999') || response.includes('call us back') || response.includes('get worse') || response.includes('A&E') || response.includes('Samaritans') || response.includes('emergency')) {
        safetyNetting = 'Safety netting advice provided';
        if (!state.safetyNetsApplied.includes(state.currentAgent)) {
            state.safetyNetsApplied.push(state.currentAgent);
        }
    }

    // Track actions
    trackActions(state, response);

    // ═══ STEP 9: Build metadata ═══
    const metadata: MessageMetadata = {
        agent: state.currentAgent,
        intent: state.currentIntent,
        urgency: state.urgencyLevel,
        redFlags: state.redFlags.length > 0 ? state.redFlags : undefined,
        safetyNetting,
        snomedCodes: snomedCodes.length > 0 ? formatSNOMEDForDisplay(snomedCodes) : (state.symptoms.length > 0 ? state.symptoms.filter(s => s.snomedCode).map(s => ({ code: s.snomedCode!, display: s.snomedDisplay || s.description, isRedFlag: s.isRedFlag })) : undefined),
        patientVerified: state.patientVerified,
        actionsPerformed: state.actionsTaken.slice(-5), // Show last 5 actions
    };

    // ═══ STEP 10: Store response ═══
    state.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        metadata,
    });

    return { message: response, agent: state.currentAgent, metadata, state };
}

// ═══ Helper Functions ═══

function routeToAgent(state: ConversationState): AgentType {
    switch (state.currentIntent) {
        case 'EMERGENCY': return 'escalation';
        case 'CLINICAL_SYMPTOMS': return 'triage';
        case 'APPOINTMENT': return 'appointment';
        case 'PRESCRIPTION': return 'prescription';
        case 'TEST_RESULTS': return 'test_results';
        case 'ADMIN': return 'admin';
        case 'TRANSFER': return 'escalation';
        default: return 'orchestrator';
    }
}

function buildSystemPrompt(state: ConversationState, assessment: ClinicalAssessment, practice: PracticeConfig, patients: PatientRecord[], appointments: AppointmentSlot[]): string {
    switch (state.currentAgent) {
        case 'triage': return getTriagePrompt(state, practice, assessment);
        case 'appointment': return getAppointmentPrompt(state, practice, appointments);
        case 'prescription': return getPrescriptionPrompt(state, practice, patients);
        case 'test_results': return getTestResultsPrompt(state, practice);
        case 'admin': return getAdminPrompt(practice);
        case 'escalation': return getEscalationPrompt(state, practice);
        default: {
            // Default orchestrator — determine what the patient needs
            const needsVerification = state.currentIntent && requiresVerification(state.currentIntent) && !state.patientVerified;

            let prompt = getMasterSystemPrompt(practice);
            if (needsVerification) {
                prompt += `\n\nThe patient needs ${state.currentIntent?.toLowerCase()} assistance but hasn't been verified yet.\n` +
                    `Ask for verification: "${getVerificationPrompt(state.messages.filter(m => m.role === 'user').length)}"`;
            }
            return prompt;
        }
    }
}

function trackActions(state: ConversationState, response: string): void {
    const lower = response.toLowerCase();

    if (lower.includes('booked') && lower.includes('appointment') && state.currentAgent === 'appointment') {
        state.actionsTaken.push({ type: 'appointment_booked', description: 'Appointment booked via EMMA' });
    }
    if (lower.includes('prescription') && (lower.includes('submitted') || lower.includes('processed') || lower.includes('requested'))) {
        state.actionsTaken.push({ type: 'prescription_submitted', description: 'Repeat prescription submitted' });
    }
    if (lower.includes('999') && state.currentAgent === 'escalation') {
        state.actionsTaken.push({ type: 'emergency_999', description: '999 emergency guidance provided' });
    }
    if (lower.includes('transfer') || lower.includes('put you through')) {
        state.actionsTaken.push({ type: 'human_transfer', description: 'Transferred to human receptionist' });
    }
    if (lower.includes('results') && (lower.includes('normal') || lower.includes('within range'))) {
        state.actionsTaken.push({ type: 'results_delivered', description: 'Test results communicated to patient' });
    }
    if (lower.includes('callback') || lower.includes('call you back')) {
        state.actionsTaken.push({ type: 'callback_arranged', description: 'GP callback arranged' });
    }
    if (lower.includes('samaritans') || lower.includes('116 123') || lower.includes('crisis')) {
        state.actionsTaken.push({ type: 'mental_health_support', description: 'Mental health crisis resources provided' });
    }
}
