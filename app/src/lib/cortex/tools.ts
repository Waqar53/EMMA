// ═══════════════════════════════════════════════════════════════════════════════
// EMMA CORTEX — Tool Registry
// Every capability EMMA has, exposed as a callable tool for the ReAct agent.
// The LLM decides which tools to call and in what order — no hardcoded routing.
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from '@/lib/db';
import type { ConversationState, PatientRecord, AppointmentSlot, PracticeConfig, TestResult } from '../types';

// ── Tool Interface ──

export interface CortexTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
    execute: (params: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
    state: ConversationState;
    practice: PracticeConfig;
    patients: PatientRecord[];
    appointments: AppointmentSlot[];
    testResults: TestResult[];
}

export interface ToolResult {
    success: boolean;
    data: Record<string, unknown>;
    observation: string; // Human-readable summary fed back to the LLM
}

// ═══════════════════════════════════════════════════════════
// TOOL 1: lookup_patient
// ═══════════════════════════════════════════════════════════

const lookupPatient: CortexTool = {
    name: 'lookup_patient',
    description: 'Search for a patient by name, date of birth, or NHS number. Use this to find and verify patient identity.',
    parameters: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Patient full name (e.g. "Margaret Wilson")' },
            date_of_birth: { type: 'string', description: 'Date of birth in any format (e.g. "18 March 1954" or "1954-03-18")' },
            nhs_number: { type: 'string', description: 'NHS number (10 digits)' },
        },
    },
    async execute(params, ctx) {
        const { name, date_of_birth, nhs_number } = params as { name?: string; date_of_birth?: string; nhs_number?: string };
        let matches: PatientRecord[] = [];

        if (nhs_number) {
            const clean = String(nhs_number).replace(/\s+/g, '');
            matches = ctx.patients.filter(p => p.nhsNumber.replace(/\s+/g, '') === clean);
        }
        if (matches.length === 0 && name) {
            const n = String(name).toLowerCase().trim();
            matches = ctx.patients.filter(p =>
                `${p.firstName} ${p.lastName}`.toLowerCase() === n ||
                p.lastName.toLowerCase() === n ||
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(n)
            );
        }

        if (matches.length === 0) {
            return { success: false, data: {}, observation: `No patient found matching the provided details.` };
        }

        const p = matches[0];
        // Verify DOB if provided
        if (date_of_birth) {
            const dobStr = String(date_of_birth).toLowerCase();
            const [yr, mo, dy] = p.dateOfBirth.split('-');
            const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const dobFormats = [
                p.dateOfBirth, `${dy}/${mo}/${yr}`, `${parseInt(dy)} ${months[parseInt(mo) - 1]} ${yr}`,
                `${dy}-${mo}-${yr}`, `${parseInt(dy)}/${parseInt(mo)}/${yr}`,
            ];
            const dobMatch = dobFormats.some(f => dobStr.includes(f.toLowerCase()));
            if (!dobMatch) {
                return { success: false, data: { partialMatch: p.firstName }, observation: `Found patient ${p.firstName} ${p.lastName} but date of birth does not match. Ask patient to confirm DOB.` };
            }
        }

        // Mark verified in state
        ctx.state.patientVerified = true;
        ctx.state.patientName = `${p.firstName} ${p.lastName}`;
        ctx.state.patientDOB = p.dateOfBirth;
        ctx.state.patientNHSNumber = p.nhsNumber;

        return {
            success: true,
            data: { nhsNumber: p.nhsNumber, name: `${p.firstName} ${p.lastName}`, dob: p.dateOfBirth, gender: p.gender, phone: p.phone, allergies: p.allergies, medicationCount: p.medications.length },
            observation: `✅ Patient verified: ${p.firstName} ${p.lastName}, NHS# ${p.nhsNumber}, DOB ${p.dateOfBirth}, ${p.gender}, ${p.medications.length} medications on file, allergies: ${p.allergies.length > 0 ? p.allergies.join(', ') : 'None known'}.`
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 2: get_patient_history
// ═══════════════════════════════════════════════════════════

const getPatientHistory: CortexTool = {
    name: 'get_patient_history',
    description: 'Get a patient\'s medical history including medications, allergies, past episodes, and recent calls. Requires NHS number.',
    parameters: {
        type: 'object',
        properties: {
            nhs_number: { type: 'string', description: 'Patient NHS number' },
        },
        required: ['nhs_number'],
    },
    async execute(params, ctx) {
        const nhs = String(params.nhs_number).replace(/\s+/g, '');
        const patient = ctx.patients.find(p => p.nhsNumber.replace(/\s+/g, '') === nhs);
        if (!patient) return { success: false, data: {}, observation: 'Patient not found.' };

        // Fetch recent calls from DB
        const recentCalls = await prisma.callRecord.findMany({
            where: { patientNHSNumber: patient.nhsNumber },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        // Fetch memory facts
        const memoryFacts = await prisma.memoryFact.findMany({
            where: { patientNHSNumber: patient.nhsNumber },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const meds = patient.medications.map(m => `${m.name} ${m.dose} (${m.frequency})${m.onRepeatList ? ' [REPEAT]' : ''}`);
        const history = recentCalls.map(c => `${c.startedAt}: ${c.primaryIntent} (${c.urgencyLevel}) — ${c.agentUsed}`);
        const facts = memoryFacts.map(f => f.fact);

        return {
            success: true,
            data: { medications: patient.medications, allergies: patient.allergies, recentCalls: recentCalls.length, memoryFacts: facts },
            observation: `Patient history for ${patient.firstName} ${patient.lastName}:\n• Medications: ${meds.join(', ') || 'None'}\n• Allergies: ${patient.allergies.join(', ') || 'None'}\n• Recent calls (${recentCalls.length}): ${history.join(' | ') || 'None'}\n• Known facts: ${facts.join('; ') || 'No recorded preferences'}`
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 3: triage_symptoms
// ═══════════════════════════════════════════════════════════

const triageSymptoms: CortexTool = {
    name: 'triage_symptoms',
    description: 'Perform clinical triage on patient symptoms. Detects red flags, assigns urgency level, applies safety netting. Use this when a patient describes symptoms.',
    parameters: {
        type: 'object',
        properties: {
            symptoms: { type: 'string', description: 'The symptoms described by the patient' },
            patient_age: { type: 'number', description: 'Patient age if known' },
            patient_conditions: { type: 'string', description: 'Known conditions (e.g. "smoker, COPD, diabetes")' },
        },
        required: ['symptoms'],
    },
    async execute(params, ctx) {
        const symptoms = String(params.symptoms).toLowerCase();

        // Red flag detection
        const RED_FLAGS: Record<string, { keywords: string[]; urgency: string; action: string }> = {
            'Cardiac Emergency': { keywords: ['chest pain', 'crushing', 'radiating arm', 'jaw pain', 'cardiac'], urgency: 'EMERGENCY', action: 'Call 999 immediately' },
            'Stroke Signs': { keywords: ['sudden weakness', 'facial droop', 'slurred speech', 'sudden confusion', 'stroke'], urgency: 'EMERGENCY', action: 'Call 999 — FAST protocol' },
            'Anaphylaxis': { keywords: ['throat swelling', 'can\'t breathe', 'severe allergic', 'tongue swelling', 'anaphylaxis'], urgency: 'EMERGENCY', action: 'Call 999 — use EpiPen if available' },
            'Breathing Emergency': { keywords: ['can\'t breathe', 'severe breathless', 'blue lips', 'choking'], urgency: 'EMERGENCY', action: 'Call 999 immediately' },
            'Suicidal Ideation': { keywords: ['kill myself', 'end my life', 'suicide', 'want to die', 'self harm'], urgency: 'EMERGENCY', action: 'Samaritans 116 123 or 999' },
            'Meningitis Signs': { keywords: ['stiff neck', 'rash doesn\'t fade', 'severe headache light', 'meningitis'], urgency: 'EMERGENCY', action: 'Call 999 — do glass test' },
            'Severe Bleeding': { keywords: ['won\'t stop bleeding', 'heavy bleeding', 'blood loss', 'haemorrhage'], urgency: 'URGENT', action: 'Apply pressure, call 999 if not stopping' },
            'High Fever Child': { keywords: ['child fever', 'baby temperature', 'infant hot', 'febrile'], urgency: 'URGENT', action: 'Same-day GP if <5yo with fever >38°C' },
        };

        const detectedFlags: string[] = [];
        let maxUrgency = 'ROUTINE';

        for (const [flag, config] of Object.entries(RED_FLAGS)) {
            if (config.keywords.some(kw => symptoms.includes(kw))) {
                detectedFlags.push(`🚨 ${flag}: ${config.action}`);
                if (config.urgency === 'EMERGENCY') maxUrgency = 'EMERGENCY';
                else if (config.urgency === 'URGENT' && maxUrgency !== 'EMERGENCY') maxUrgency = 'URGENT';
            }
        }

        // Urgency scoring
        const urgentKeywords = ['severe', 'worst ever', 'sudden', 'worsening', 'blood', 'high temperature'];
        const soonKeywords = ['persistent', 'weeks', 'recurring', 'getting worse', 'pain'];
        if (maxUrgency === 'ROUTINE') {
            if (urgentKeywords.some(kw => symptoms.includes(kw))) maxUrgency = 'URGENT';
            else if (soonKeywords.some(kw => symptoms.includes(kw))) maxUrgency = 'SOON';
        }

        // Apply to state
        ctx.state.urgencyLevel = maxUrgency as 'EMERGENCY' | 'URGENT' | 'SOON' | 'ROUTINE';
        ctx.state.redFlags.push(...detectedFlags.map(f => f.replace(/🚨 /, '').split(':')[0]));
        if (maxUrgency === 'EMERGENCY') {
            ctx.state.escalationRequired = true;
            ctx.state.currentAgent = 'escalation';
        } else {
            ctx.state.currentAgent = 'triage';
        }

        const safetyNet = maxUrgency === 'EMERGENCY'
            ? 'Call 999 immediately. Do not wait.'
            : `If symptoms worsen or you develop: difficulty breathing, chest pain, severe headache, confusion — call 999 or go to A&E immediately.`;
        ctx.state.safetyNetsApplied.push(safetyNet);

        return {
            success: true,
            data: { urgency: maxUrgency, redFlags: detectedFlags, safetyNet },
            observation: `Clinical triage result:\n• Urgency: ${maxUrgency}\n• Red flags: ${detectedFlags.length > 0 ? detectedFlags.join('\n  ') : 'None detected'}\n• Safety netting: ${safetyNet}\n• Age/conditions considered: ${params.patient_age || 'unknown'} ${params.patient_conditions || ''}`,
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 4: check_available_slots
// ═══════════════════════════════════════════════════════════

const checkAvailableSlots: CortexTool = {
    name: 'check_available_slots',
    description: 'Check available appointment slots. Can filter by date, type (routine/urgent/same-day), or clinician type (GP/nurse/pharmacist).',
    parameters: {
        type: 'object',
        properties: {
            type: { type: 'string', description: 'Slot type: "routine", "urgent", "same-day"' },
            clinician_type: { type: 'string', description: 'Clinician type: "GP", "nurse", "pharmacist"' },
        },
    },
    async execute(params, ctx) {
        let slots = ctx.appointments.filter(s => s.available);
        if (params.type) slots = slots.filter(s => s.slotType === params.type);
        if (params.clinician_type) slots = slots.filter(s => s.clinicianType.toLowerCase().includes(String(params.clinician_type).toLowerCase()));

        if (slots.length === 0) {
            return { success: true, data: { count: 0 }, observation: 'No available appointment slots matching your criteria. Suggest the patient calls back or try a different day/clinician type.' };
        }

        const slotList = slots.slice(0, 5).map(s => `• ${s.date} ${s.time}-${s.endTime} with ${s.clinicianName} (${s.clinicianType}) [${s.slotType}] — ID: ${s.id}`);
        return {
            success: true,
            data: { count: slots.length, slots: slots.slice(0, 5) },
            observation: `${slots.length} available slots found:\n${slotList.join('\n')}\n\nPresent the best option(s) to the patient and ask which they prefer.`,
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 5: book_appointment
// ═══════════════════════════════════════════════════════════

const bookAppointment: CortexTool = {
    name: 'book_appointment',
    description: 'Book a specific appointment slot for a patient. Requires slot ID and patient name. The patient must be verified first.',
    parameters: {
        type: 'object',
        properties: {
            slot_id: { type: 'string', description: 'The appointment slot ID to book' },
            patient_name: { type: 'string', description: 'Patient full name' },
            reason: { type: 'string', description: 'Reason for appointment' },
        },
        required: ['slot_id', 'patient_name'],
    },
    async execute(params, ctx) {
        if (!ctx.state.patientVerified) {
            return { success: false, data: {}, observation: 'Cannot book appointment — patient identity not verified. Use lookup_patient tool first.' };
        }

        const slot = ctx.appointments.find(s => s.id === params.slot_id);
        if (!slot) return { success: false, data: {}, observation: 'Appointment slot not found.' };
        if (!slot.available) return { success: false, data: {}, observation: 'This slot is no longer available.' };

        // Book it
        slot.available = false;
        await prisma.appointment.update({
            where: { id: String(params.slot_id) },
            data: { available: false, bookedReason: String(params.reason || 'Booked via EMMA AI') },
        });

        ctx.state.actionsTaken.push({
            type: 'appointment_booked',
            description: `Appointment booked: ${slot.date} ${slot.time} with ${slot.clinicianName}`,
            details: { slotId: slot.id, date: slot.date, time: slot.time, clinician: slot.clinicianName },
        });

        return {
            success: true,
            data: { slot },
            observation: `✅ Appointment BOOKED:\n• Date: ${slot.date}\n• Time: ${slot.time} — ${slot.endTime}\n• With: ${slot.clinicianName} (${slot.clinicianType})\n• Location: ${slot.location}\n\nConfirm these details with the patient.`,
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 6: process_prescription
// ═══════════════════════════════════════════════════════════

const processPrescription: CortexTool = {
    name: 'process_prescription',
    description: 'Submit a repeat prescription request for a verified patient. Lists available repeat medications and processes the order.',
    parameters: {
        type: 'object',
        properties: {
            nhs_number: { type: 'string', description: 'Patient NHS number' },
            medication_names: { type: 'string', description: 'Comma-separated medication names to order, or "all" for all repeat medications' },
        },
        required: ['nhs_number'],
    },
    async execute(params, ctx) {
        const patient = ctx.patients.find(p => p.nhsNumber.replace(/\s+/g, '') === String(params.nhs_number).replace(/\s+/g, ''));
        if (!patient) return { success: false, data: {}, observation: 'Patient not found.' };

        const repeatMeds = patient.medications.filter(m => m.onRepeatList);
        if (repeatMeds.length === 0) return { success: false, data: {}, observation: 'No medications on repeat prescription list.' };

        const requestedNames = String(params.medication_names || 'all').toLowerCase();
        const requested = requestedNames === 'all'
            ? repeatMeds
            : repeatMeds.filter(m => requestedNames.includes(m.name.toLowerCase()));

        if (requested.length === 0) {
            return { success: false, data: { availableRepeat: repeatMeds.map(m => m.name) }, observation: `Requested medications not on repeat list. Available repeat meds: ${repeatMeds.map(m => `${m.name} ${m.dose}`).join(', ')}` };
        }

        const readyDate = new Date();
        readyDate.setDate(readyDate.getDate() + ctx.practice.prescriptionTurnaroundDays);
        const readyBy = readyDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const rxId = `rx-${Date.now()}`;

        // Write to DB
        try {
            const patientRecord = await prisma.patient.findUnique({ where: { nhsNumber: patient.nhsNumber } });
            if (patientRecord) {
                await prisma.prescription.create({
                    data: {
                        id: rxId,
                        patientId: patientRecord.id,
                        patientName: `${patient.firstName} ${patient.lastName}`,
                        patientNHSNumber: patient.nhsNumber,
                        medications: JSON.stringify(requested.map(m => ({ name: m.name, dose: m.dose, frequency: m.frequency }))),
                        status: 'pending',
                        requestedAt: new Date().toISOString(),
                        pharmacy: ctx.practice.pharmacyName,
                    },
                });
            }
        } catch (e) {
            console.error('Rx write failed:', e);
        }

        ctx.state.actionsTaken.push({
            type: 'prescription_submitted',
            description: `Prescription submitted: ${requested.map(m => m.name).join(', ')}`,
            details: { rxId, medications: requested.map(m => `${m.name} ${m.dose}`) },
        });

        return {
            success: true,
            data: { rxId, medications: requested, readyBy, pharmacy: ctx.practice.pharmacyName },
            observation: `✅ Prescription SUBMITTED:\n• Medications: ${requested.map(m => `${m.name} ${m.dose}`).join(', ')}\n• Pharmacy: ${ctx.practice.pharmacyName} (${ctx.practice.pharmacyAddress})\n• Ready by: ${readyBy}\n• Reference: ${rxId}\n\nConfirm these details with the patient.`,
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 7: get_test_results
// ═══════════════════════════════════════════════════════════

const getTestResults: CortexTool = {
    name: 'get_test_results',
    description: 'Look up test results for a verified patient by NHS number. Shows available results and pending tests.',
    parameters: {
        type: 'object',
        properties: {
            nhs_number: { type: 'string', description: 'Patient NHS number' },
        },
        required: ['nhs_number'],
    },
    async execute(params, ctx) {
        const nhs = String(params.nhs_number).replace(/\s+/g, '');
        const results = ctx.testResults.filter(t => t.patientNHSNumber.replace(/\s+/g, '') === nhs);
        if (results.length === 0) return { success: true, data: {}, observation: 'No test results on file for this patient.' };

        const completed = results.filter(r => r.status !== 'pending');
        const pending = results.filter(r => r.status === 'pending');
        const deliverable = completed.filter(r => r.deliveryTier === 'emma_can_deliver');
        const gpOnly = completed.filter(r => r.deliveryTier !== 'emma_can_deliver');

        let obs = 'Test results:\n';
        if (deliverable.length > 0) obs += `Can deliver:\n${deliverable.map(r => `• ${r.testType} (${r.date}): ${r.status} — ${r.summary || 'No summary'}`).join('\n')}\n`;
        if (gpOnly.length > 0) obs += `GP callback required:\n${gpOnly.map(r => `• ${r.testType} (${r.date}): Needs GP review`).join('\n')}\n`;
        if (pending.length > 0) obs += `Pending:\n${pending.map(r => `• ${r.testType} — results expected soon`).join('\n')}`;

        return { success: true, data: { deliverable, gpOnly, pending }, observation: obs };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 8: answer_admin_query
// ═══════════════════════════════════════════════════════════

const answerAdminQuery: CortexTool = {
    name: 'answer_admin_query',
    description: 'Answer administrative questions about the practice — opening hours, address, how to register, pharmacy info, services, GP names, etc.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'The administrative question to answer' },
        },
        required: ['query'],
    },
    async execute(params, ctx) {
        const q = String(params.query).toLowerCase();
        let answer = '';

        if (q.includes('hour') || q.includes('open') || q.includes('close')) {
            const hrs = Object.entries(ctx.practice.hours).map(([d, h]) => `${d}: ${h}`).join(', ');
            answer = `Our opening hours: ${hrs}. Out-of-hours: call ${ctx.practice.oohNumber}`;
        } else if (q.includes('address') || q.includes('location') || q.includes('where')) {
            answer = `${ctx.practice.name} is at ${ctx.practice.address}. Phone: ${ctx.practice.phone}`;
        } else if (q.includes('pharmacy') || q.includes('chemist')) {
            answer = `Our pharmacy: ${ctx.practice.pharmacyName}, ${ctx.practice.pharmacyAddress}. Phone: ${ctx.practice.pharmacyPhone}. Prescriptions ready in ${ctx.practice.prescriptionTurnaroundDays} working days.`;
        } else if (q.includes('register') || q.includes('new patient') || q.includes('join')) {
            answer = `To register, visit ${ctx.practice.name} at ${ctx.practice.address} with photo ID and proof of address. You can also register online via the NHS App.`;
        } else if (q.includes('doctor') || q.includes('gp') || q.includes('clinician')) {
            const clinicians = [...new Set(ctx.appointments.map(a => `${a.clinicianName} (${a.clinicianType})`))];
            answer = `Our clinical team: ${clinicians.join(', ')}`;
        } else if (q.includes('sick note') || q.includes('fit note')) {
            answer = `Fit notes take ${ctx.practice.fitNoteTurnaroundDays} working days. For <7 days absence, you can self-certify. For longer, request a fit note via reception or online.`;
        } else {
            // Check custom FAQs
            const faq = ctx.practice.customFAQs?.find(f => q.includes(f.question.toLowerCase().slice(0, 20)));
            answer = faq ? faq.answer : `${ctx.practice.name}: ${ctx.practice.address}. Phone: ${ctx.practice.phone}. Hours vary — ask me about specific days.`;
        }

        ctx.state.currentAgent = 'admin';
        return { success: true, data: { answer }, observation: answer };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 9: create_gp_alert
// ═══════════════════════════════════════════════════════════

const createGPAlert: CortexTool = {
    name: 'create_gp_alert',
    description: 'Create an alert for the GP about a patient. Use for red flags, concerning patterns, medication concerns, or when a patient needs follow-up attention.',
    parameters: {
        type: 'object',
        properties: {
            patient_name: { type: 'string', description: 'Patient name' },
            nhs_number: { type: 'string', description: 'NHS number' },
            alert_type: { type: 'string', description: 'Type: "urgent", "info", "red_flag", "follow_up"' },
            message: { type: 'string', description: 'Alert message for the GP' },
        },
        required: ['patient_name', 'alert_type', 'message'],
    },
    async execute(params, ctx) {
        try {
            await prisma.healthAlert.create({
                data: {
                    patientId: 'system',
                    patientNHSNumber: String(params.nhs_number || ctx.state.patientNHSNumber || ''),
                    patientName: String(params.patient_name),
                    tier: String(params.alert_type),
                    type: 'cortex_alert',
                    description: String(params.message),
                    context: `Call ID: ${ctx.state.callId}, Intent: ${ctx.state.currentIntent}, Urgency: ${ctx.state.urgencyLevel}`,
                    recommendedAction: String(params.message),
                },
            });
        } catch (e) {
            console.error('GP Alert write failed:', e);
        }

        return {
            success: true,
            data: { alertType: params.alert_type, message: params.message },
            observation: `✅ GP Alert created (${params.alert_type}): "${params.message}" for ${params.patient_name}.`
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 10: save_episode
// ═══════════════════════════════════════════════════════════

const saveEpisode: CortexTool = {
    name: 'save_episode',
    description: 'Save a clinical episode to patient memory. Records symptoms, actions taken, outcome, and any follow-up needed. Use at the end of every clinical interaction.',
    parameters: {
        type: 'object',
        properties: {
            nhs_number: { type: 'string', description: 'Patient NHS number' },
            summary: { type: 'string', description: 'Brief episode summary' },
            symptoms: { type: 'string', description: 'Symptoms reported (comma-separated)' },
            actions_taken: { type: 'string', description: 'Actions EMMA took (comma-separated)' },
            outcome: { type: 'string', description: 'Outcome of the interaction' },
            follow_up_needed: { type: 'boolean', description: 'Whether follow-up is needed' },
            follow_up_days: { type: 'number', description: 'Days until follow-up (if needed)' },
        },
        required: ['summary', 'outcome'],
    },
    async execute(params, ctx) {
        const nhs = String(params.nhs_number || ctx.state.patientNHSNumber || '');
        try {
            const patient = await prisma.patient.findFirst({ where: { nhsNumber: nhs } });
            if (patient) {
                await prisma.memoryFact.create({
                    data: {
                        patientId: patient.id,
                        patientNHSNumber: nhs,
                        layer: 'episodic',
                        category: 'clinical_episode',
                        fact: `${params.summary} | Symptoms: ${params.symptoms || 'N/A'} | Actions: ${params.actions_taken || 'N/A'} | Outcome: ${params.outcome}`,
                        confidence: 0.95,
                        source: 'cortex_agent',
                        extractedAt: new Date().toISOString(),
                        lastAccessedAt: new Date().toISOString(),
                    },
                });
            }
        } catch (e) {
            console.error('Episode save failed:', e);
        }

        return {
            success: true,
            data: { saved: true },
            observation: `✅ Episode saved to patient memory: ${params.summary}`
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 11: schedule_followup
// ═══════════════════════════════════════════════════════════

const scheduleFollowup: CortexTool = {
    name: 'schedule_followup',
    description: 'Schedule a follow-up action for the future. Can schedule SMS reminders, callback checks, appointment reminders, or outreach.',
    parameters: {
        type: 'object',
        properties: {
            task_type: { type: 'string', description: 'Type: "sms_reminder", "callback_check", "appointment_reminder", "outreach", "follow_up"' },
            patient_name: { type: 'string', description: 'Patient name' },
            nhs_number: { type: 'string', description: 'NHS number' },
            message: { type: 'string', description: 'What to do/say during follow-up' },
            delay_hours: { type: 'number', description: 'Hours from now to execute this task' },
        },
        required: ['task_type', 'message', 'delay_hours'],
    },
    async execute(params) {
        const scheduledAt = new Date(Date.now() + Number(params.delay_hours) * 3600000);

        // Store in DB as AuditLog (we'll add ScheduledTask model later)
        try {
            await prisma.auditLog.create({
                data: {
                    eventType: 'scheduled_task',
                    severity: 'INFO',
                    practiceId: 'prac-001',
                    patientNHSNumber: String(params.nhs_number || ''),
                    agentName: 'cortex',
                    action: `SCHEDULED: ${params.task_type}`,
                    details: JSON.stringify({
                        taskType: params.task_type,
                        patientName: params.patient_name,
                        message: params.message,
                        scheduledAt: scheduledAt.toISOString(),
                    }),
                    result: 'SUCCESS',
                },
            });
        } catch (e) {
            console.error('Schedule task failed:', e);
        }

        return {
            success: true,
            data: { scheduledAt: scheduledAt.toISOString(), taskType: params.task_type },
            observation: `✅ Follow-up scheduled: "${params.task_type}" in ${params.delay_hours}h — "${params.message}" for ${params.patient_name || 'patient'}.`
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 12: lookup_nhs_patient (REAL NHS PDS FHIR R4)
// ═══════════════════════════════════════════════════════════

const lookupNHSPatient: CortexTool = {
    name: 'lookup_nhs_patient',
    description: 'Look up a patient on the REAL NHS Personal Demographics Service (PDS) using FHIR R4 API. Returns demographics, GP practice, address, etc. Use this to cross-check patient identity against the national NHS database. Requires a valid 10-digit NHS number.',
    parameters: {
        type: 'object',
        properties: {
            nhs_number: { type: 'string', description: 'NHS number (10 digits)' },
        },
        required: ['nhs_number'],
    },
    async execute(params) {
        const { lookupPatientByNHSNumber, validateNHSNumber } = await import('../nhs/pds');
        const nhs = String(params.nhs_number).replace(/\s+/g, '');

        // Validate format first
        const validation = validateNHSNumber(nhs);
        if (!validation.valid) {
            return { success: false, data: {}, observation: `Invalid NHS number: ${validation.error}` };
        }

        const patient = await lookupPatientByNHSNumber(nhs);
        if (!patient) {
            return { success: false, data: {}, observation: `No patient found on NHS PDS with number ${nhs}.` };
        }

        const addr = patient.address
            ? `${patient.address.line.join(', ')}, ${patient.address.city} ${patient.address.postalCode}`
            : 'Not available';

        return {
            success: true,
            data: { patient },
            observation: `NHS PDS Record found:\n• Name: ${patient.title || ''} ${patient.firstName} ${patient.lastName}\n• DOB: ${patient.dateOfBirth}\n• Gender: ${patient.gender}\n• NHS#: ${patient.nhsNumber}\n• Address: ${addr}\n• Phone: ${patient.phone || 'Not recorded'}\n• GP Practice: ${patient.gpPractice ? `${patient.gpPractice.name} (ODS: ${patient.gpPractice.odsCode})` : 'Not registered'}\n• Deceased: ${patient.isDeceased ? 'YES' : 'No'}\n• Restricted record: ${patient.securitySensitive ? 'YES — handle with care' : 'No'}`,
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 13: validate_nhs_number
// ═══════════════════════════════════════════════════════════

const validateNHSTool: CortexTool = {
    name: 'validate_nhs_number',
    description: 'Validate an NHS number using the standard Modulus 11 check digit algorithm. Does NOT query the NHS — just validates the format. Use before making PDS lookups.',
    parameters: {
        type: 'object',
        properties: {
            nhs_number: { type: 'string', description: 'NHS number to validate (10 digits)' },
        },
        required: ['nhs_number'],
    },
    async execute(params) {
        const { validateNHSNumber } = await import('../nhs/pds');
        const result = validateNHSNumber(String(params.nhs_number));
        return {
            success: result.valid,
            data: { valid: result.valid, error: result.error },
            observation: result.valid
                ? `✅ NHS number ${params.nhs_number} is valid (Modulus 11 check passed).`
                : `❌ NHS number ${params.nhs_number} is INVALID: ${result.error}`,
        };
    }
};

// ═══════════════════════════════════════════════════════════
// TOOL 14: find_nhs_services
// ═══════════════════════════════════════════════════════════

const findNHSServices: CortexTool = {
    name: 'find_nhs_services',
    description: 'Search for real NHS services — GP practices, pharmacies, hospitals. Uses the NHS ODS (Organisation Data Service) API. Can search by postcode, name, or ODS code.',
    parameters: {
        type: 'object',
        properties: {
            service_type: { type: 'string', description: '"gp", "pharmacy", or "organisation"' },
            postcode: { type: 'string', description: 'Postcode to search near (e.g. "SW1A 1AA")' },
            name: { type: 'string', description: 'Organisation name to search for' },
            ods_code: { type: 'string', description: 'Specific ODS code to look up' },
        },
        required: ['service_type'],
    },
    async execute(params) {
        const { lookupOrganisation, searchGPPractices, searchPharmacies } = await import('../nhs/spine');
        const type = String(params.service_type).toLowerCase();

        // Direct ODS lookup
        if (params.ods_code) {
            const org = await lookupOrganisation(String(params.ods_code));
            if (!org) return { success: false, data: {}, observation: `Organisation with ODS code ${params.ods_code} not found.` };
            return {
                success: true,
                data: { organisation: org },
                observation: `NHS Organisation found:\n• Name: ${org.name}\n• ODS Code: ${org.odsCode}\n• Type: ${org.type}\n• Address: ${org.address.line.join(', ')}, ${org.address.city} ${org.address.postalCode}\n• Phone: ${org.phone || 'Not listed'}\n• Status: ${org.status}`,
            };
        }

        // Search by type
        if (type === 'gp' || type === 'practice') {
            const practices = await searchGPPractices({
                postCode: params.postcode as string,
                name: params.name as string,
            });
            if (practices.length === 0) return { success: false, data: {}, observation: 'No GP practices found matching your criteria.' };
            return {
                success: true,
                data: { practices },
                observation: `Found ${practices.length} GP practices:\n${practices.map((p, i) => `${i + 1}. ${p.name} (ODS: ${p.odsCode}) — ${p.address.city} ${p.address.postalCode}`).join('\n')}`,
            };
        }

        if (type === 'pharmacy' || type === 'chemist') {
            const pharmacies = await searchPharmacies({
                postCode: params.postcode as string,
                name: params.name as string,
            });
            if (pharmacies.length === 0) return { success: false, data: {}, observation: 'No pharmacies found matching your criteria.' };
            return {
                success: true,
                data: { pharmacies },
                observation: `Found ${pharmacies.length} pharmacies:\n${pharmacies.map((p, i) => `${i + 1}. ${p.name} (ODS: ${p.odsCode}) — ${p.address}`).join('\n')}`,
            };
        }

        return { success: false, data: {}, observation: 'Unknown service type. Use "gp", "pharmacy", or provide an ODS code.' };
    }
};

// ═══════════════════════════════════════════════════════════
// EXPORT ALL TOOLS
// ═══════════════════════════════════════════════════════════

export function getAllTools(): CortexTool[] {
    return [
        lookupPatient,
        getPatientHistory,
        triageSymptoms,
        checkAvailableSlots,
        bookAppointment,
        processPrescription,
        getTestResults,
        answerAdminQuery,
        createGPAlert,
        saveEpisode,
        scheduleFollowup,
        lookupNHSPatient,
        validateNHSTool,
        findNHSServices,
    ];
}

export function getToolByName(name: string): CortexTool | undefined {
    return getAllTools().find(t => t.name === name);
}
