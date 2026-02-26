// ═══════════════════════════════════════════════════════════
// EMMA — Action Execution Engine
// Actually DOES things: books appointments, processes Rx,
// looks up test results, verifies patients, handles admin
// ═══════════════════════════════════════════════════════════

import { practice, patients, appointments, prescriptions, testResults } from '../data/store';
import { ConversationState, PatientRecord, ActionPerformed, AppointmentSlot } from '../types';

// ─────────────────────────────────────────
// PATIENT LOOKUP & VERIFICATION
// ─────────────────────────────────────────

export function findPatientByName(name: string): PatientRecord | null {
    const n = name.toLowerCase().trim();
    return patients.find(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase() === n ||
        p.firstName.toLowerCase() === n ||
        p.lastName.toLowerCase() === n ||
        n.includes(p.firstName.toLowerCase()) && n.includes(p.lastName.toLowerCase())
    ) || null;
}

export function findPatientByNHS(nhs: string): PatientRecord | null {
    const clean = nhs.replace(/\s+/g, '');
    return patients.find(p => p.nhsNumber.replace(/\s+/g, '') === clean) || null;
}

export function findPatientByDOB(name: string, dob: string): PatientRecord | null {
    const p = findPatientByName(name);
    if (!p) return null;
    // Parse various date formats
    const normalize = (d: string) => {
        // Try ISO
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        // Try DD/MM/YYYY or DD-MM-YYYY
        const m = d.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
        if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        // Try "18th March 1954" / "3rd December 1975"
        const months: Record<string, string> = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
        const spoken = d.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
        if (spoken) return `${spoken[3]}-${months[spoken[2].toLowerCase()]}-${spoken[1].padStart(2, '0')}`;
        return d;
    };
    return normalize(dob) === p.dateOfBirth ? p : null;
}

export function getPatientSummary(p: PatientRecord): string {
    const meds = p.medications.length > 0 ? p.medications.map(m => `${m.name} ${m.dose} (${m.frequency})`).join(', ') : 'None';
    const allergies = p.allergies.length > 0 ? p.allergies.join(', ') : 'None known';
    return `Patient: ${p.firstName} ${p.lastName} | NHS: ${p.nhsNumber} | DOB: ${formatDate(p.dateOfBirth)} | Meds: ${meds} | Allergies: ${allergies}`;
}

// ─────────────────────────────────────────
// APPOINTMENT BOOKING
// ─────────────────────────────────────────

export function getAvailableSlots(type?: string, clinicianType?: string): AppointmentSlot[] {
    return appointments.filter(s => {
        if (!s.available) return false;
        if (type && s.slotType !== type) return false;
        if (clinicianType && !s.clinicianType.toLowerCase().includes(clinicianType.toLowerCase())) return false;
        return true;
    });
}

export function getNextAvailableSlot(type?: string): AppointmentSlot | null {
    const slots = getAvailableSlots(type);
    return slots.length > 0 ? slots[0] : null;
}

export function bookAppointment(slotId: string, patientName: string): { success: boolean; slot?: AppointmentSlot; error?: string } {
    const slot = appointments.find(s => s.id === slotId);
    if (!slot) return { success: false, error: 'Slot not found' };
    if (!slot.available) return { success: false, error: 'Slot is no longer available' };
    slot.available = false; // Mark as booked
    return { success: true, slot };
}

export function formatSlotsForDisplay(slots: AppointmentSlot[]): string {
    if (slots.length === 0) return 'No available appointments at the moment.';
    const grouped: Record<string, AppointmentSlot[]> = {};
    for (const s of slots) {
        const d = formatDate(s.date);
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(s);
    }
    let out = '';
    for (const [date, daySlots] of Object.entries(grouped)) {
        out += `\n📅 ${date}:\n`;
        for (const s of daySlots) {
            out += `  • ${s.time}–${s.endTime} with ${s.clinicianName} (${s.clinicianType}) — ${s.location}\n`;
        }
    }
    return out;
}

// ─────────────────────────────────────────
// PRESCRIPTION PROCESSING
// ─────────────────────────────────────────

export function getPatientMedications(nhsNumber: string): { name: string; dose: string; frequency: string; onRepeat: boolean }[] {
    const patient = findPatientByNHS(nhsNumber);
    if (!patient) return [];
    return patient.medications.map(m => ({ name: m.name, dose: m.dose, frequency: m.frequency, onRepeat: m.onRepeatList }));
}

export function submitRepeatPrescription(
    patientName: string,
    nhsNumber: string,
    medicationNames: string[]
): { success: boolean; prescription?: { id: string; medications: string[]; pharmacy: string; readyBy: string }; error?: string } {
    const patient = findPatientByNHS(nhsNumber);
    if (!patient) return { success: false, error: 'Patient not found in our records.' };

    // Validate all requested meds are on repeat list
    const validMeds = patient.medications.filter(m => m.onRepeatList);
    const requested = medicationNames.length > 0
        ? validMeds.filter(m => medicationNames.some(n => m.name.toLowerCase().includes(n.toLowerCase())))
        : validMeds; // If no specific meds mentioned, order all repeat meds

    if (requested.length === 0) {
        return { success: false, error: `None of the requested medications are on your repeat prescription list. Your repeat medications are: ${validMeds.map(m => m.name).join(', ')}` };
    }

    const readyDate = new Date();
    readyDate.setDate(readyDate.getDate() + practice.prescriptionTurnaroundDays);
    const readyBy = formatDate(readyDate.toISOString().split('T')[0]);

    const rxId = `rx-${Date.now()}`;

    // Add to prescriptions store
    prescriptions.push({
        id: rxId,
        patientName,
        patientNHSNumber: nhsNumber,
        medications: requested.map(m => ({ ...m })),
        status: 'pending',
        requestedAt: new Date().toISOString(),
        pharmacy: practice.pharmacyName,
    });

    return {
        success: true,
        prescription: {
            id: rxId,
            medications: requested.map(m => `${m.name} ${m.dose}`),
            pharmacy: `${practice.pharmacyName} (${practice.pharmacyAddress})`,
            readyBy,
        },
    };
}

// ─────────────────────────────────────────
// TEST RESULTS LOOKUP
// ─────────────────────────────────────────

export function getTestResults(nhsNumber: string): {
    results: { testType: string; date: string; status: string; summary?: string; canDeliver: boolean; deliveryTier: string }[];
    pending: string[];
} {
    const results = testResults.filter(r => r.patientNHSNumber === nhsNumber);
    return {
        results: results.filter(r => r.status !== 'pending').map(r => ({
            testType: r.testType,
            date: formatDate(r.date),
            status: r.status,
            summary: r.summary,
            canDeliver: r.deliveryTier === 'emma_can_deliver',
            deliveryTier: r.deliveryTier,
        })),
        pending: results.filter(r => r.status === 'pending').map(r => r.testType),
    };
}

export function formatTestResultsForPatient(nhsNumber: string): string {
    const { results, pending } = getTestResults(nhsNumber);
    if (results.length === 0 && pending.length === 0) {
        return 'No test results on file.';
    }

    let out = '';

    for (const r of results) {
        if (r.canDeliver) {
            out += `\n✅ ${r.testType} (${r.date}): ${r.status.toUpperCase()}\n   ${r.summary || 'No summary available.'}\n`;
        } else if (r.deliveryTier === 'gp_callback') {
            out += `\n📞 ${r.testType} (${r.date}): Results are available but need to be discussed with a GP. I'll arrange a callback for you.\n`;
        } else {
            out += `\n🔒 ${r.testType} (${r.date}): These results can only be delivered by your GP. I'll arrange for them to call you.\n`;
        }
    }

    if (pending.length > 0) {
        out += `\n⏳ Still waiting for: ${pending.join(', ')}\n`;
    }

    return out;
}

// ─────────────────────────────────────────
// ADMIN QUERIES
// ─────────────────────────────────────────

export function answerAdminQuery(query: string): string {
    const q = query.toLowerCase();

    // Opening hours
    if (q.includes('open') || q.includes('hour') || q.includes('time') || q.includes('close') || q.includes('when')) {
        const hours = Object.entries(practice.hours).map(([day, time]) =>
            `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${time}`
        ).join('\n');
        return `Our opening hours are:\n${hours}\n\nOutside these hours, please contact NHS 111 on ${practice.oohNumber}.`;
    }

    // Registration
    if (q.includes('register') || q.includes('new patient') || q.includes('sign up') || q.includes('join')) {
        const faq = practice.customFAQs.find(f => f.question.toLowerCase().includes('register'));
        return faq?.answer || 'You can register at reception or online through our website.';
    }

    // Pharmacy
    if (q.includes('pharmacy') || q.includes('chemist')) {
        return `The nearest pharmacy is ${practice.pharmacyName} at ${practice.pharmacyAddress}. Phone: ${practice.pharmacyPhone}.`;
    }

    // Sick note / fit note
    if (q.includes('sick note') || q.includes('fit note') || q.includes('sick')) {
        const faq = practice.customFAQs.find(f => f.question.toLowerCase().includes('sick note'));
        return faq?.answer || `Fit notes usually take ${practice.fitNoteTurnaroundDays} working days.`;
    }

    // Ear syringing
    if (q.includes('ear') || q.includes('syringe') || q.includes('wax')) {
        const faq = practice.customFAQs.find(f => f.question.toLowerCase().includes('ear'));
        return faq?.answer || 'Please speak to reception about ear care services.';
    }

    // Address / location
    if (q.includes('address') || q.includes('where') || q.includes('location') || q.includes('direction') || q.includes('find')) {
        return `We're located at ${practice.address}. Our phone number is ${practice.phone}.`;
    }

    // Prescription ordering
    if (q.includes('repeat prescription') || q.includes('order prescription') || q.includes('how do i order')) {
        const faq = practice.customFAQs.find(f => f.question.toLowerCase().includes('repeat prescription'));
        return faq?.answer || 'You can order repeat prescriptions by calling us, using the NHS App, or through our website.';
    }

    // Services
    if (q.includes('service') || q.includes('what do you') || q.includes('offer')) {
        return `We offer a range of services including:\n• GP consultations\n• Nurse appointments\n• Blood tests\n• Cervical screening\n• Vaccinations\n• Physiotherapy\n• Pharmacy consultations\n• Mental health support\n\nWould you like to book any of these?`;
    }

    // GP / doctor names
    if (q.includes('doctor') || q.includes('gp') || q.includes('clinician') || q.includes('staff')) {
        const clinicians = [...new Set(appointments.map(a => `${a.clinicianName} (${a.clinicianType})`))];
        return `Our clinical team includes:\n${clinicians.map(c => `• ${c}`).join('\n')}`;
    }

    // Check custom FAQs
    for (const faq of practice.customFAQs) {
        const keywords = faq.question.toLowerCase().split(' ').filter(w => w.length > 3);
        if (keywords.some(kw => q.includes(kw))) {
            return faq.answer;
        }
    }

    return `I can help with opening hours, registration, prescriptions, pharmacy information, and general practice queries. Let me know what you'd like to know about ${practice.name}.`;
}

// ─────────────────────────────────────────
// FULL ACTION EXECUTOR
// ─────────────────────────────────────────

export interface ActionResult {
    actions: ActionPerformed[];
    contextForLLM: string;
    dataForSidebar: Record<string, unknown>;
}

export function executeActions(state: ConversationState, userMessage: string): ActionResult {
    const actions: ActionPerformed[] = [];
    let contextForLLM = '';
    const dataForSidebar: Record<string, unknown> = {};
    const msg = userMessage.toLowerCase();

    // ── 1. Patient Verification ──
    if (!state.patientVerified) {
        // Try to extract name + DOB from message
        const nameMatch = extractNameFromMessage(userMessage);
        const dobMatch = extractDOBFromMessage(userMessage);

        if (nameMatch && dobMatch) {
            const patient = findPatientByDOB(nameMatch, dobMatch);
            if (patient) {
                state.patientVerified = true;
                state.patientName = `${patient.firstName} ${patient.lastName}`;
                state.patientDOB = patient.dateOfBirth;
                state.patientNHSNumber = patient.nhsNumber;
                actions.push({ type: 'patient_verified', description: `Identity verified: ${patient.firstName} ${patient.lastName}`, details: { nhsNumber: patient.nhsNumber } });
                contextForLLM += `\n[SYSTEM: Patient verified — ${getPatientSummary(patient)}]\n`;
                dataForSidebar.patientVerified = true;
                dataForSidebar.patientName = `${patient.firstName} ${patient.lastName}`;
            }
        } else if (nameMatch) {
            const patient = findPatientByName(nameMatch);
            if (patient) {
                contextForLLM += `\n[SYSTEM: Name "${nameMatch}" matches patient ${patient.firstName} ${patient.lastName}. Ask for date of birth to verify identity.]\n`;
            }
        }

        // Try NHS number
        const nhsMatch = userMessage.match(/\d{3}\s?\d{3}\s?\d{4}/);
        if (nhsMatch) {
            const patient = findPatientByNHS(nhsMatch[0]);
            if (patient) {
                state.patientVerified = true;
                state.patientName = `${patient.firstName} ${patient.lastName}`;
                state.patientDOB = patient.dateOfBirth;
                state.patientNHSNumber = patient.nhsNumber;
                actions.push({ type: 'patient_verified', description: `Identity verified via NHS number: ${patient.firstName} ${patient.lastName}`, details: { nhsNumber: patient.nhsNumber } });
                contextForLLM += `\n[SYSTEM: Patient verified via NHS number — ${getPatientSummary(patient)}]\n`;
                dataForSidebar.patientVerified = true;
            }
        }
    }

    // ── 2. Appointment Booking ──
    if (state.currentIntent === 'APPOINTMENT' || msg.includes('appointment') || msg.includes('book') || msg.includes('see a doctor') || msg.includes('see the gp')) {
        const available = getAvailableSlots();
        if (available.length > 0) {
            // Check if user is confirming a booking
            if ((msg.includes('yes') || msg.includes('that') || msg.includes('book') || msg.includes('please') || msg.includes('confirm') || msg.includes('sounds good') || msg.includes('perfect')) && state.actionsTaken.some(a => a.type === 'slots_offered')) {
                // Book the first offered slot
                const slot = available[0];
                const result = bookAppointment(slot.id, state.patientName || 'Patient');
                if (result.success && result.slot) {
                    actions.push({
                        type: 'appointment_booked',
                        description: `Appointment booked: ${formatDate(result.slot.date)} at ${result.slot.time} with ${result.slot.clinicianName}`,
                        details: { slotId: result.slot.id, date: result.slot.date, time: result.slot.time, clinician: result.slot.clinicianName, location: result.slot.location },
                    });
                    contextForLLM += `\n[SYSTEM: APPOINTMENT SUCCESSFULLY BOOKED. Details: ${formatDate(result.slot.date)} at ${result.slot.time} with ${result.slot.clinicianName} (${result.slot.clinicianType}) in ${result.slot.location}. Confirm this to the patient warmly and tell them the details.]\n`;
                    dataForSidebar.appointmentBooked = { date: result.slot.date, time: result.slot.time, clinician: result.slot.clinicianName, location: result.slot.location };
                }
            } else if (!state.actionsTaken.some(a => a.type === 'slots_offered')) {
                // Offer available slots
                const slotsText = formatSlotsForDisplay(available.slice(0, 6)); // Show max 6
                actions.push({ type: 'slots_offered', description: `${available.length} slots shown to patient`, details: { count: available.length } });
                contextForLLM += `\n[SYSTEM: Available appointment slots found. Show these to the patient and ask which they'd prefer:\n${slotsText}\nOffer the earliest convenient time. ${state.patientVerified ? '' : 'You need to verify the patient first before booking — ask for name and date of birth.'}]\n`;
                dataForSidebar.availableSlots = available.slice(0, 6).map(s => ({ date: s.date, time: s.time, clinician: s.clinicianName, type: s.clinicianType }));
            }
        } else {
            contextForLLM += `\n[SYSTEM: No appointments currently available. Offer to add the patient to the cancellation list or suggest they call back.]\n`;
        }
    }

    // ── 3. Repeat Prescription ──
    if (state.currentIntent === 'PRESCRIPTION' || msg.includes('prescription') || msg.includes('medication') || msg.includes('repeat') || msg.includes('medicine') || msg.includes('pills')) {
        if (state.patientVerified && state.patientNHSNumber) {
            const meds = getPatientMedications(state.patientNHSNumber);
            const repeatMeds = meds.filter(m => m.onRepeat);

            if (repeatMeds.length > 0) {
                // Check if user wants to order
                if (msg.includes('order') || msg.includes('need') || msg.includes('please') || msg.includes('repeat') || msg.includes('refill') || msg.includes('yes') || msg.includes('all')) {
                    // Extract specific med names or order all
                    const specificMeds = repeatMeds.filter(m => msg.includes(m.name.toLowerCase())).map(m => m.name);
                    const result = submitRepeatPrescription(state.patientName || '', state.patientNHSNumber, specificMeds);

                    if (result.success && result.prescription) {
                        actions.push({
                            type: 'prescription_submitted',
                            description: `Repeat prescription submitted: ${result.prescription.medications.join(', ')}`,
                            details: { rxId: result.prescription.id, medications: result.prescription.medications, pharmacy: result.prescription.pharmacy, readyBy: result.prescription.readyBy },
                        });
                        contextForLLM += `\n[SYSTEM: PRESCRIPTION SUCCESSFULLY SUBMITTED. Confirmation:\n• Medications: ${result.prescription.medications.join(', ')}\n• Collection: ${result.prescription.pharmacy}\n• Ready by: ${result.prescription.readyBy}\nConfirm these details to the patient.]\n`;
                        dataForSidebar.prescriptionSubmitted = result.prescription;
                    } else if (result.error) {
                        contextForLLM += `\n[SYSTEM: Prescription error — ${result.error}]\n`;
                    }
                } else {
                    // Show what's on repeat
                    contextForLLM += `\n[SYSTEM: Patient's repeat medications are:\n${repeatMeds.map(m => `• ${m.name} ${m.dose} (${m.frequency})`).join('\n')}\nAsk which medications they'd like to order, or if they want all of them.]\n`;
                    dataForSidebar.repeatMedications = repeatMeds;
                }
            }
        } else if (!state.patientVerified) {
            contextForLLM += `\n[SYSTEM: Patient needs to be verified before processing prescriptions. Ask for their full name and date of birth.]\n`;
        }
    }

    // ── 4. Test Results ──
    if (state.currentIntent === 'TEST_RESULTS' || msg.includes('test result') || msg.includes('blood test') || msg.includes('results') || msg.includes('blood')) {
        if (state.patientVerified && state.patientNHSNumber) {
            const resultsText = formatTestResultsForPatient(state.patientNHSNumber);
            const { results, pending } = getTestResults(state.patientNHSNumber);

            const deliverable = results.filter(r => r.canDeliver);
            const needsGP = results.filter(r => !r.canDeliver);

            if (deliverable.length > 0) {
                actions.push({
                    type: 'results_delivered',
                    description: `${deliverable.length} test result(s) delivered to patient`,
                    details: { delivered: deliverable.map(r => r.testType) },
                });
            }
            if (needsGP.length > 0) {
                actions.push({
                    type: 'gp_callback_arranged',
                    description: `GP callback arranged for ${needsGP.length} result(s)`,
                    details: { needsGP: needsGP.map(r => r.testType) },
                });
            }
            if (pending.length > 0) {
                actions.push({
                    type: 'results_pending',
                    description: `${pending.length} test(s) still pending`,
                    details: { pending },
                });
            }

            contextForLLM += `\n[SYSTEM: Here are ${state.patientName}'s test results:\n${resultsText}\nCommunicate the normal results clearly and reassuringly. For abnormal/GP-callback results, explain you'll arrange a GP callback. For pending results, explain they're not back yet.]\n`;
            dataForSidebar.testResults = { deliverable, needsGP, pending };
        } else if (!state.patientVerified) {
            contextForLLM += `\n[SYSTEM: Patient needs to be verified before releasing test results. Ask for their full name and date of birth.]\n`;
        }
    }

    // ── 5. Admin Queries ──
    if (state.currentIntent === 'ADMIN' || msg.includes('hours') || msg.includes('open') || msg.includes('register') || msg.includes('pharmacy') || msg.includes('address') || msg.includes('location') || msg.includes('sick note') || msg.includes('ear') || msg.includes('service')) {
        const answer = answerAdminQuery(userMessage);
        actions.push({ type: 'info_provided', description: 'Practice information provided', details: { query: userMessage.slice(0, 50) } });
        contextForLLM += `\n[SYSTEM: Here is the answer to the patient's query:\n${answer}\nDeliver this information naturally and helpfully. Ask if they need anything else.]\n`;
        dataForSidebar.adminResponse = answer;
    }

    // ── 6. Human Transfer ──
    if (state.currentIntent === 'TRANSFER' || msg.includes('speak to a person') || msg.includes('speak to a human') || msg.includes('real person') || msg.includes('receptionist') || msg.includes('speak to someone')) {
        state.escalationRequired = true;
        state.humanHandoffReason = 'Patient requested human receptionist';
        state.currentAgent = 'escalation';
        actions.push({
            type: 'human_transfer',
            description: 'Transferring to human receptionist',
            details: { reason: 'Patient request' },
        });
        contextForLLM += `\n[SYSTEM: Patient has requested to speak to a human. Acknowledge their preference warmly — say you'll transfer them right now, thank them for calling, and wish them well.]\n`;
        dataForSidebar.transferring = true;
    }

    return { actions, contextForLLM, dataForSidebar };
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function extractNameFromMessage(msg: string): string | null {
    // Try "My name is X" / "I'm X" / "This is X"
    const patterns = [
        /(?:my name is|i'm|i am|this is|it's|name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /(?:^|\.\s*)([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s*,|\s+here|\s+speaking)/i,
    ];
    for (const p of patterns) {
        const m = msg.match(p);
        if (m) return m[1].trim();
    }
    // Try to match any known patient name in the message
    for (const p of patients) {
        const full = `${p.firstName} ${p.lastName}`.toLowerCase();
        if (msg.toLowerCase().includes(full)) return `${p.firstName} ${p.lastName}`;
        if (msg.toLowerCase().includes(p.firstName.toLowerCase()) && msg.toLowerCase().includes(p.lastName.toLowerCase())) return `${p.firstName} ${p.lastName}`;
    }
    return null;
}

function extractDOBFromMessage(msg: string): string | null {
    // ISO: 1954-03-18
    const iso = msg.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
    // DD/MM/YYYY
    const slash = msg.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/);
    if (slash) return slash[0];
    // Spoken: "18th March 1954", "3rd December 1975"
    const spoken = msg.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
    if (spoken) return `${spoken[1]}${spoken[1].length === 1 ? '' : ''}${spoken[2]} ${spoken[3]}`;
    return null;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
