import { PracticeConfig, PatientRecord, AppointmentSlot, CallRecord, PrescriptionRequest, TestResult, TriageRecordData, AuditLogEntry, DashboardStats } from '../types';

// ═══════════════════════════════════════════════════════════
// PRACTICE CONFIGURATION — From AGENT_INSTRUCTIONS §14
// ═══════════════════════════════════════════════════════════
export const practice: PracticeConfig = {
    id: 'prac-001',
    name: 'Riverside Medical Centre',
    odsCode: 'Y12345',
    address: '45 High Street, London, SE1 4BG',
    phone: '020 7946 0123',
    location: 'London',
    clinicalSystem: 'emis',
    hours: {
        monday: '08:00–18:30', tuesday: '08:00–18:30', wednesday: '08:00–18:30',
        thursday: '08:00–18:30', friday: '08:00–18:30', saturday: 'Closed', sunday: 'Closed',
    },
    oohNumber: '111',
    pharmacyName: 'Boots Pharmacy',
    pharmacyAddress: '47 High Street, London, SE1 4BG',
    pharmacyPhone: '020 7946 0456',
    prescriptionTurnaroundDays: 2,
    fitNoteTurnaroundDays: 3,
    clinicianTypes: ['GP', 'Nurse Practitioner', 'Practice Nurse', 'Healthcare Assistant', 'Pharmacist', 'Physiotherapist'],
    safeguardingLead: 'Dr. Sarah Jones',
    customFAQs: [
        { question: 'Do you do ear syringing?', answer: 'We no longer provide ear syringing at the surgery. We recommend using olive oil drops for 2 weeks first, and if the problem persists, we can refer you to the community ear care service.' },
        { question: 'Can I register online?', answer: 'Yes! Visit our website at riverside-medical.nhs.uk and click on \'Register as a new patient\'.' },
        { question: 'How do I get a sick note?', answer: 'If you\'ve already seen a doctor about this condition, we can submit a request for you. It usually takes about 3 working days. If you haven\'t been seen yet, you may need an appointment first.' },
        { question: 'Where is the nearest pharmacy?', answer: 'Boots Pharmacy is right next door at 47 High Street. They\'re open Monday to Saturday, 9am to 6pm.' },
        { question: 'How do I order a repeat prescription?', answer: 'You can order repeat prescriptions by calling us, using the NHS App, or dropping your repeat slip into the surgery. Prescriptions are usually ready within 2 working days.' },
    ],
    testResultDeliveryRules: {
        normal_bloods: 'emma_can_deliver', abnormal_bloods: 'gp_callback',
        cancer_screening: 'gp_callback_only', sti_results: 'gp_callback_only',
        pregnancy: 'gp_callback_only', normal_urine: 'emma_can_deliver',
    },
    triageProtocols: {
        chest_pain: 'emergency_999', breathing_severe: 'emergency_999', stroke_symptoms: 'emergency_999',
        mental_health_crisis: 'urgent_duty_gp', safeguarding: 'immediate_safeguarding_lead',
    },
};

// ═══════════════════════════════════════════════════════════
// DEMO PATIENTS — From PRD §5 Personas
// ═══════════════════════════════════════════════════════════
export const patients: PatientRecord[] = [
    { id: 'pat-001', nhsNumber: '485 922 1044', firstName: 'Margaret', lastName: 'Wilson', dateOfBirth: '1954-03-18', gender: 'female', postcode: 'SE1 4BG', phone: '07700 900001', registeredPractice: 'prac-001', medications: [{ name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Simvastatin', dose: '20mg', frequency: 'Once daily at night', onRepeatList: true }], allergies: ['Penicillin'] },
    { id: 'pat-002', nhsNumber: '392 841 2033', firstName: 'Fatima', lastName: 'Khan', dateOfBirth: '1992-07-22', gender: 'female', postcode: 'SE1 5RJ', phone: '07700 900002', registeredPractice: 'prac-001', medications: [{ name: 'Salbutamol inhaler', dose: '100mcg', frequency: 'As needed', onRepeatList: true }], allergies: [] },
    { id: 'pat-003', nhsNumber: '284 193 4821', firstName: 'James', lastName: 'Bennett', dateOfBirth: '1998-11-05', gender: 'male', postcode: 'SE1 3QR', phone: '07700 900003', registeredPractice: 'prac-001', medications: [], allergies: [] },
    { id: 'pat-004', nhsNumber: '193 482 9103', firstName: 'Sarah', lastName: 'Jenkins', dateOfBirth: '1985-03-14', gender: 'female', postcode: 'SE1 2PL', phone: '07700 900004', registeredPractice: 'prac-001', medications: [{ name: 'Metformin', dose: '500mg', frequency: 'Twice daily', onRepeatList: true }, { name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', onRepeatList: true }], allergies: ['Codeine'] },
    { id: 'pat-005', nhsNumber: '482 190 3847', firstName: 'Robert', lastName: 'Thompson', dateOfBirth: '1960-08-29', gender: 'male', postcode: 'SE1 6HN', phone: '07700 900005', registeredPractice: 'prac-001', medications: [{ name: 'Ramipril', dose: '10mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Metformin', dose: '1000mg', frequency: 'Twice daily', onRepeatList: true }, { name: 'Atorvastatin', dose: '40mg', frequency: 'Once daily at night', onRepeatList: true }], allergies: [] },
    { id: 'pat-006', nhsNumber: '583 291 4720', firstName: 'Amira', lastName: 'Hassan', dateOfBirth: '2001-01-15', gender: 'female', postcode: 'SE1 8WE', phone: '07700 900006', registeredPractice: 'prac-001', medications: [{ name: 'Cerazette', dose: '75mcg', frequency: 'Once daily', onRepeatList: true }], allergies: ['Latex'] },
    { id: 'pat-007', nhsNumber: '691 483 2019', firstName: 'David', lastName: 'Patel', dateOfBirth: '1975-12-03', gender: 'male', postcode: 'SE1 7GD', phone: '07700 900007', registeredPractice: 'prac-001', medications: [{ name: 'Omeprazole', dose: '20mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Sertraline', dose: '50mg', frequency: 'Once daily', onRepeatList: true }], allergies: [] },
    { id: 'pat-008', nhsNumber: '748 392 1856', firstName: 'Elena', lastName: 'Popescu', dateOfBirth: '1988-05-20', gender: 'female', postcode: 'SE1 9TY', phone: '07700 900008', registeredPractice: 'prac-001', medications: [], allergies: ['Aspirin'] },
];

// ═══════════════════════════════════════════════════════════
// APPOINTMENT SLOTS
// ═══════════════════════════════════════════════════════════
export const appointments: AppointmentSlot[] = [
    { id: 'slot-001', date: '2026-02-25', time: '09:00', endTime: '09:15', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'routine' },
    { id: 'slot-002', date: '2026-02-25', time: '09:30', endTime: '09:45', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'routine' },
    { id: 'slot-003', date: '2026-02-25', time: '10:00', endTime: '10:15', clinicianName: 'Dr. Lucy Chen', clinicianType: 'GP', location: 'Room 5', available: true, slotType: 'routine' },
    { id: 'slot-004', date: '2026-02-25', time: '10:30', endTime: '10:45', clinicianName: 'Nurse Helen Brooks', clinicianType: 'Nurse Practitioner', location: 'Room 2', available: true, slotType: 'routine' },
    { id: 'slot-005', date: '2026-02-25', time: '11:00', endTime: '11:15', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: false, slotType: 'urgent' },
    { id: 'slot-006', date: '2026-02-25', time: '14:00', endTime: '14:15', clinicianName: 'Dr. Lucy Chen', clinicianType: 'GP', location: 'Room 5', available: true, slotType: 'routine' },
    { id: 'slot-007', date: '2026-02-25', time: '15:00', endTime: '15:30', clinicianName: 'Pharmacist Mike Davis', clinicianType: 'Pharmacist', location: 'Room 1', available: true, slotType: 'medication_review' },
    { id: 'slot-008', date: '2026-02-26', time: '08:30', endTime: '08:45', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'urgent' },
    { id: 'slot-009', date: '2026-02-26', time: '09:00', endTime: '09:15', clinicianName: 'Nurse Helen Brooks', clinicianType: 'Nurse Practitioner', location: 'Room 2', available: true, slotType: 'routine' },
    { id: 'slot-010', date: '2026-02-26', time: '10:00', endTime: '10:15', clinicianName: 'Dr. Lucy Chen', clinicianType: 'GP', location: 'Room 5', available: true, slotType: 'routine' },
    { id: 'slot-011', date: '2026-02-26', time: '11:30', endTime: '11:45', clinicianName: 'Physiotherapist Jane Lee', clinicianType: 'Physiotherapist', location: 'Room 4', available: true, slotType: 'routine' },
    { id: 'slot-012', date: '2026-02-27', time: '09:00', endTime: '09:15', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'routine' },
];

// ═══════════════════════════════════════════════════════════
// CALL RECORDS
// ═══════════════════════════════════════════════════════════
export const calls: CallRecord[] = [
    { id: 'call-001', practiceId: 'prac-001', patientName: 'Sarah Jenkins', patientNHSNumber: '193 482 9103', callerPhone: '07700 900004', startedAt: '2026-02-24T09:42:00Z', endedAt: '2026-02-24T09:45:32Z', durationSeconds: 212, primaryIntent: 'CLINICAL_SYMPTOMS', urgencyLevel: 'EMERGENCY', resolutionType: 'emergency', agentUsed: 'triage', actionsTaken: [{ type: 'emergency_999', description: '999 guidance provided — chest pain with arm radiation' }], transcript: [{ id: 'm1', role: 'assistant', content: "Good morning, you've reached Riverside Medical Centre. My name's EMMA, and I'm here to help. How can I help you today?", timestamp: '2026-02-24T09:42:00Z' }, { id: 'm2', role: 'user', content: "I'm having some sharp chest pains that started about 20 minutes ago.", timestamp: '2026-02-24T09:42:15Z' }, { id: 'm3', role: 'assistant', content: "I'm sorry to hear that. I need to ask you a few important questions. Can you describe the pain — is it sharp, dull, or does it feel like pressure?", timestamp: '2026-02-24T09:42:18Z' }, { id: 'm4', role: 'user', content: "It's like a tightness, like something heavy on my chest. And my left arm feels tingly.", timestamp: '2026-02-24T09:42:35Z' }, { id: 'm5', role: 'assistant', content: "Thank you for telling me that, Sarah. I want to make sure you're safe. Chest tightness with arm symptoms needs urgent medical attention. I would strongly recommend you call 999 right now. They'll be able to assess you properly. Would you like me to stay on the line while you call?", timestamp: '2026-02-24T09:42:38Z' }], satisfaction: undefined, snomedCodes: [{ code: '29857009', display: 'Chest pain' }, { code: '102556003', display: 'Upper limb pain' }], redFlagsDetected: ['Chest pain with arm radiation — suspected cardiac'], safetyNettingApplied: 'If your symptoms get worse, call 999 immediately.' },
    { id: 'call-002', practiceId: 'prac-001', patientName: 'James Bennett', patientNHSNumber: '284 193 4821', callerPhone: '07700 900003', startedAt: '2026-02-24T10:15:00Z', endedAt: '2026-02-24T10:18:45Z', durationSeconds: 225, primaryIntent: 'APPOINTMENT', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'appointment', actionsTaken: [{ type: 'appointment_booked', description: 'Booked with Dr. Lucy Chen on Tue 25 Feb at 10:00' }], transcript: [{ id: 'm1', role: 'assistant', content: "Good morning, Riverside Medical Centre. I'm EMMA. How can I help?", timestamp: '2026-02-24T10:15:00Z' }, { id: 'm2', role: 'user', content: 'Hi, I need to book a GP appointment please.', timestamp: '2026-02-24T10:15:08Z' }, { id: 'm3', role: 'assistant', content: "Of course. Let me verify your identity first. Could you tell me your full name and date of birth please?", timestamp: '2026-02-24T10:15:11Z' }], satisfaction: 5, snomedCodes: [], redFlagsDetected: [], safetyNettingApplied: undefined },
    { id: 'call-003', practiceId: 'prac-001', patientName: 'Margaret Wilson', patientNHSNumber: '485 922 1044', callerPhone: '07700 900001', startedAt: '2026-02-24T08:02:00Z', endedAt: '2026-02-24T08:06:20Z', durationSeconds: 260, primaryIntent: 'PRESCRIPTION', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'prescription', actionsTaken: [{ type: 'prescription_submitted', description: 'Repeat prescription submitted: Amlodipine 5mg, Simvastatin 20mg' }], transcript: [], satisfaction: 4, snomedCodes: [], redFlagsDetected: [], safetyNettingApplied: undefined },
    { id: 'call-004', practiceId: 'prac-001', patientName: 'Robert Thompson', patientNHSNumber: '482 190 3847', callerPhone: '07700 900005', startedAt: '2026-02-24T11:30:00Z', endedAt: '2026-02-24T11:34:12Z', durationSeconds: 252, primaryIntent: 'CLINICAL_SYMPTOMS', urgencyLevel: 'SOON', resolutionType: 'automated', agentUsed: 'triage', actionsTaken: [{ type: 'appointment_booked', description: 'Booked urgent appointment for UTI symptoms' }], transcript: [], satisfaction: 4, snomedCodes: [{ code: '68566005', display: 'Urinary tract infection' }], redFlagsDetected: [], safetyNettingApplied: 'If you develop a fever, notice blood in your urine, or get pain in your lower back, please call us back straight away or contact NHS 111.' },
    { id: 'call-005', practiceId: 'prac-001', patientName: 'Fatima Khan', patientNHSNumber: '392 841 2033', callerPhone: '07700 900002', startedAt: '2026-02-24T12:45:00Z', endedAt: '2026-02-24T12:47:30Z', durationSeconds: 150, primaryIntent: 'ADMIN', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'admin', actionsTaken: [{ type: 'info_provided', description: 'Opening hours and registration info provided' }], transcript: [], satisfaction: 5, snomedCodes: [], redFlagsDetected: [], safetyNettingApplied: undefined },
    { id: 'call-006', practiceId: 'prac-001', patientName: 'David Patel', patientNHSNumber: '691 483 2019', callerPhone: '07700 900007', startedAt: '2026-02-24T14:20:00Z', endedAt: '2026-02-24T14:23:45Z', durationSeconds: 225, primaryIntent: 'TEST_RESULTS', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'test_results', actionsTaken: [{ type: 'results_delivered', description: 'Normal blood test results communicated' }], transcript: [], satisfaction: 5, snomedCodes: [], redFlagsDetected: [], safetyNettingApplied: undefined },
    { id: 'call-007', practiceId: 'prac-001', patientName: 'Elena Popescu', patientNHSNumber: '748 392 1856', callerPhone: '07700 900008', startedAt: '2026-02-24T15:10:00Z', endedAt: '2026-02-24T15:14:00Z', durationSeconds: 240, primaryIntent: 'CLINICAL_SYMPTOMS', urgencyLevel: 'URGENT', resolutionType: 'automated', agentUsed: 'triage', actionsTaken: [{ type: 'urgent_callback', description: 'Arranged urgent duty GP callback for mental health concerns' }], transcript: [], satisfaction: 4, snomedCodes: [{ code: '48694002', display: 'Anxiety' }], redFlagsDetected: [], safetyNettingApplied: 'If you feel unsafe or are in crisis, please call the Samaritans on 116 123 or call 999.' },
    { id: 'call-008', practiceId: 'prac-001', patientName: 'Amira Hassan', patientNHSNumber: '583 291 4720', callerPhone: '07700 900006', startedAt: '2026-02-24T16:00:00Z', endedAt: '2026-02-24T16:02:30Z', durationSeconds: 150, primaryIntent: 'TRANSFER', urgencyLevel: 'ROUTINE', resolutionType: 'human_handoff', agentUsed: 'escalation', actionsTaken: [{ type: 'human_transfer', description: 'Patient requested to speak to a human receptionist' }], transcript: [], satisfaction: 3, snomedCodes: [], redFlagsDetected: [], safetyNettingApplied: undefined },
    { id: 'call-009', practiceId: 'prac-001', patientName: 'Robert Thompson', patientNHSNumber: '482 190 3847', callerPhone: '07700 900005', startedAt: '2026-02-24T09:05:00Z', endedAt: '2026-02-24T09:08:20Z', durationSeconds: 200, primaryIntent: 'PRESCRIPTION', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'prescription', actionsTaken: [{ type: 'prescription_submitted', description: 'Repeat prescription: Ramipril 10mg, Metformin 1000mg, Atorvastatin 40mg' }], transcript: [], satisfaction: 5, snomedCodes: [], redFlagsDetected: [], safetyNettingApplied: undefined },
    { id: 'call-010', practiceId: 'prac-001', patientName: 'Unknown Caller', callerPhone: '07700 900099', startedAt: '2026-02-24T13:20:00Z', endedAt: '2026-02-24T13:22:00Z', durationSeconds: 120, primaryIntent: 'ADMIN', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'admin', actionsTaken: [{ type: 'info_provided', description: 'Registration process explained' }], transcript: [], satisfaction: 4, snomedCodes: [], redFlagsDetected: [], safetyNettingApplied: undefined },
];

// ═══════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════
export const prescriptions: PrescriptionRequest[] = [
    { id: 'rx-001', patientName: 'Margaret Wilson', patientNHSNumber: '485 922 1044', medications: [{ name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Simvastatin', dose: '20mg', frequency: 'Once daily at night', onRepeatList: true }], status: 'approved', requestedAt: '2026-02-24T08:06:00Z', pharmacy: 'Boots Pharmacy' },
    { id: 'rx-002', patientName: 'Robert Thompson', patientNHSNumber: '482 190 3847', medications: [{ name: 'Ramipril', dose: '10mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Metformin', dose: '1000mg', frequency: 'Twice daily', onRepeatList: true }, { name: 'Atorvastatin', dose: '40mg', frequency: 'Once daily at night', onRepeatList: true }], status: 'pending', requestedAt: '2026-02-24T09:08:00Z', pharmacy: 'Boots Pharmacy' },
    { id: 'rx-003', patientName: 'David Patel', patientNHSNumber: '691 483 2019', medications: [{ name: 'Omeprazole', dose: '20mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Sertraline', dose: '50mg', frequency: 'Once daily', onRepeatList: true }], status: 'collected', requestedAt: '2026-02-22T10:00:00Z', pharmacy: 'Boots Pharmacy' },
    { id: 'rx-004', patientName: 'Sarah Jenkins', patientNHSNumber: '193 482 9103', medications: [{ name: 'Metformin', dose: '500mg', frequency: 'Twice daily', onRepeatList: true }], status: 'approved', requestedAt: '2026-02-23T14:30:00Z', pharmacy: 'Boots Pharmacy' },
];

// ═══════════════════════════════════════════════════════════
// TEST RESULTS
// ═══════════════════════════════════════════════════════════
export const testResults: TestResult[] = [
    { id: 'tr-001', patientNHSNumber: '691 483 2019', testType: 'Full Blood Count (FBC)', date: '2026-02-20', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'All values within normal range. No further action needed.' },
    { id: 'tr-002', patientNHSNumber: '193 482 9103', testType: 'HbA1c', date: '2026-02-19', status: 'abnormal', deliveryTier: 'gp_callback', summary: 'HbA1c 58 mmol/mol — above target. GP review recommended.' },
    { id: 'tr-003', patientNHSNumber: '485 922 1044', testType: 'Liver Function Tests (LFT)', date: '2026-02-21', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'All liver function markers within normal range.' },
    { id: 'tr-004', patientNHSNumber: '482 190 3847', testType: 'Kidney Function (eGFR)', date: '2026-02-22', status: 'review_required', deliveryTier: 'gp_callback', summary: 'eGFR 52 — stage 3a CKD. Clinician review required.' },
    { id: 'tr-005', patientNHSNumber: '284 193 4821', testType: 'Cholesterol Panel', date: '2026-02-23', status: 'pending', deliveryTier: 'emma_can_deliver' },
    { id: 'tr-006', patientNHSNumber: '583 291 4720', testType: 'Cervical Screening', date: '2026-02-18', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'No abnormal cells detected. Routine recall in 3 years.' },
    { id: 'tr-007', patientNHSNumber: '748 392 1856', testType: 'Thyroid Function (TFT)', date: '2026-02-17', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'TSH and T4 within normal range.' },
    { id: 'tr-008', patientNHSNumber: '392 841 2033', testType: 'Urine Culture', date: '2026-02-23', status: 'pending', deliveryTier: 'emma_can_deliver' },
];

// ═══════════════════════════════════════════════════════════
// TRIAGE RECORDS
// ═══════════════════════════════════════════════════════════
export const triageRecords: TriageRecordData[] = [
    { id: 'tr-rec-001', callId: 'call-001', patientName: 'Sarah Jenkins', symptoms: [{ description: 'Sharp chest pain', snomedCode: '29857009', snomedDisplay: 'Chest pain', severity: 8, duration: '20 minutes', isRedFlag: true }, { description: 'Left arm tingling', snomedCode: '102556003', snomedDisplay: 'Upper limb pain', isRedFlag: true }], redFlagsDetected: ['Cardiac chest pain with arm radiation'], urgencyClassification: 'EMERGENCY', safetyNettingApplied: 'If your symptoms get worse, call 999 immediately.', disposition: '999 guidance provided — suspected cardiac event', clinicalProtocolUsed: 'Chest Pain Emergency Protocol', safetyCheckPassed: true, humanReviewRequired: true, createdAt: '2026-02-24T09:42:00Z' },
    { id: 'tr-rec-002', callId: 'call-004', patientName: 'Robert Thompson', symptoms: [{ description: 'Burning on urination', snomedCode: '49650001', snomedDisplay: 'Dysuria', severity: 5, duration: '2 days', isRedFlag: false }, { description: 'Urinary frequency', snomedCode: '162116003', snomedDisplay: 'Frequency of urination', isRedFlag: false }], redFlagsDetected: [], urgencyClassification: 'SOON', safetyNettingApplied: 'If you develop a fever, notice blood in your urine, or get pain in your lower back, please call us back straight away or contact NHS 111. If things haven\'t improved within 48 hours, please call us again.', disposition: 'Appointment booked — suspected uncomplicated UTI', clinicalProtocolUsed: 'UTI Assessment Protocol', safetyCheckPassed: true, humanReviewRequired: false, createdAt: '2026-02-24T11:30:00Z' },
    { id: 'tr-rec-003', callId: 'call-007', patientName: 'Elena Popescu', symptoms: [{ description: 'Persistent anxiety and low mood', snomedCode: '48694002', snomedDisplay: 'Anxiety', severity: 7, duration: '3 weeks', isRedFlag: false }], redFlagsDetected: [], urgencyClassification: 'URGENT', safetyNettingApplied: 'If you feel unsafe or are in crisis, please call the Samaritans on 116 123, text SHOUT to 85258, or call 999.', disposition: 'Urgent duty GP callback arranged', clinicalProtocolUsed: 'Mental Health Assessment Protocol', safetyCheckPassed: true, humanReviewRequired: true, createdAt: '2026-02-24T15:10:00Z' },
];

// ═══════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════
export const dashboardStats: DashboardStats = {
    activeCalls: 3,
    callsToday: 47,
    avgWaitTimeSeconds: 8,
    resolutionRate: 84,
    safetyNetRate: 100,
    callsThisWeek: [38, 42, 45, 51, 47, 12, 0],
    resolutionByType: { Appointment: 34, Triage: 22, Prescription: 18, Admin: 15, 'Test Results': 8, Escalation: 3 },
    urgencyDistribution: { ROUTINE: 62, SOON: 18, URGENT: 15, EMERGENCY: 5 },
    intentDistribution: { APPOINTMENT: 34, CLINICAL_SYMPTOMS: 22, PRESCRIPTION: 18, ADMIN: 15, TEST_RESULTS: 8, TRANSFER: 3 },
    recentCalls: [],
    redFlagsToday: 2,
    humanHandoffs: 7,
    avgCallDurationSeconds: 210,
    patientSatisfaction: 92,
    capacitySavedHours: 42,
    weeklyCapacitySaved: [38, 40, 42, 44, 42, 8, 0],
    sentimentTrend: [88, 89, 90, 91, 92, 92, 93, 91, 92, 93, 92, 94, 92, 93],
};
dashboardStats.recentCalls = calls.slice(0, 5);
