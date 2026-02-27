// ═══════════════════════════════════════════════════════════════════════════════
// EMMA — Database Seed
// Migrates all hardcoded store.ts data into the database
// Run: npx prisma db seed
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding EMMA database...\n');

    // ═══ PRACTICE ═══
    const practice = await prisma.practice.upsert({
        where: { odsCode: 'Y12345' },
        update: {},
        create: {
            id: 'prac-001',
            name: 'Riverside Medical Centre',
            odsCode: 'Y12345',
            address: '45 High Street, London, SE1 4BG',
            phone: '020 7946 0123',
            location: 'London',
            clinicalSystem: 'emis',
            hours: JSON.stringify({
                monday: '08:00–18:30', tuesday: '08:00–18:30', wednesday: '08:00–18:30',
                thursday: '08:00–18:30', friday: '08:00–18:30', saturday: 'Closed', sunday: 'Closed',
            }),
            pharmacyName: 'Boots Pharmacy',
            pharmacyAddr: '47 High Street, London, SE1 4BG',
            pharmacyPhone: '020 7946 0456',
            rxTurnaround: 2,
            fitNoteDays: 3,
            clinicianTypes: JSON.stringify(['GP', 'Nurse Practitioner', 'Practice Nurse', 'Healthcare Assistant', 'Pharmacist', 'Physiotherapist']),
            safeguardLead: 'Dr. Sarah Jones',
            faqs: JSON.stringify([
                { question: 'Do you do ear syringing?', answer: "We no longer provide ear syringing. Use olive oil drops for 2 weeks first." },
                { question: 'Can I register online?', answer: "Yes! Visit riverside-medical.nhs.uk." },
                { question: 'How do I get a sick note?', answer: "If you've seen a doctor, we can submit a request. Takes 3 working days." },
                { question: 'Where is the nearest pharmacy?', answer: "Boots Pharmacy next door. Mon–Sat 9am–6pm." },
                { question: 'How do I order a repeat prescription?', answer: "Call us, use NHS App, or drop repeat slip in. Ready within 2 working days." },
            ]),
            testRules: JSON.stringify({ normal_bloods: 'emma_can_deliver', abnormal_bloods: 'gp_callback', cancer_screening: 'gp_callback_only' }),
            triageProtos: JSON.stringify({ chest_pain: 'emergency_999', breathing_severe: 'emergency_999', stroke_symptoms: 'emergency_999' }),
        },
    });
    console.log(`✅ Practice: ${practice.name}`);

    // ═══ PATIENTS ═══
    const patientsData = [
        { id: 'pat-001', nhsNumber: '485 922 1044', firstName: 'Margaret', lastName: 'Wilson', dateOfBirth: '1954-03-18', gender: 'female', postcode: 'SE1 4BG', phone: '07700 900001', practiceId: 'prac-001', medications: JSON.stringify([{ name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Simvastatin', dose: '20mg', frequency: 'Once daily at night', onRepeatList: true }]), allergies: JSON.stringify(['Penicillin']) },
        { id: 'pat-002', nhsNumber: '392 841 2033', firstName: 'Fatima', lastName: 'Khan', dateOfBirth: '1992-07-22', gender: 'female', postcode: 'SE1 5RJ', phone: '07700 900002', practiceId: 'prac-001', medications: JSON.stringify([{ name: 'Salbutamol inhaler', dose: '100mcg', frequency: 'As needed', onRepeatList: true }]), allergies: JSON.stringify([]) },
        { id: 'pat-003', nhsNumber: '284 193 4821', firstName: 'James', lastName: 'Bennett', dateOfBirth: '1998-11-05', gender: 'male', postcode: 'SE1 3QR', phone: '07700 900003', practiceId: 'prac-001', medications: JSON.stringify([]), allergies: JSON.stringify([]) },
        { id: 'pat-004', nhsNumber: '193 482 9103', firstName: 'Sarah', lastName: 'Jenkins', dateOfBirth: '1985-03-14', gender: 'female', postcode: 'SE1 2PL', phone: '07700 900004', practiceId: 'prac-001', medications: JSON.stringify([{ name: 'Metformin', dose: '500mg', frequency: 'Twice daily', onRepeatList: true }, { name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', onRepeatList: true }]), allergies: JSON.stringify(['Codeine']) },
        { id: 'pat-005', nhsNumber: '482 190 3847', firstName: 'Robert', lastName: 'Thompson', dateOfBirth: '1960-08-29', gender: 'male', postcode: 'SE1 6HN', phone: '07700 900005', practiceId: 'prac-001', medications: JSON.stringify([{ name: 'Ramipril', dose: '10mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Metformin', dose: '1000mg', frequency: 'Twice daily', onRepeatList: true }, { name: 'Atorvastatin', dose: '40mg', frequency: 'Once daily at night', onRepeatList: true }]), allergies: JSON.stringify([]) },
        { id: 'pat-006', nhsNumber: '583 291 4720', firstName: 'Amira', lastName: 'Hassan', dateOfBirth: '2001-01-15', gender: 'female', postcode: 'SE1 8WE', phone: '07700 900006', practiceId: 'prac-001', medications: JSON.stringify([{ name: 'Cerazette', dose: '75mcg', frequency: 'Once daily', onRepeatList: true }]), allergies: JSON.stringify(['Latex']) },
        { id: 'pat-007', nhsNumber: '691 483 2019', firstName: 'David', lastName: 'Patel', dateOfBirth: '1975-12-03', gender: 'male', postcode: 'SE1 7GD', phone: '07700 900007', practiceId: 'prac-001', medications: JSON.stringify([{ name: 'Omeprazole', dose: '20mg', frequency: 'Once daily', onRepeatList: true }, { name: 'Sertraline', dose: '50mg', frequency: 'Once daily', onRepeatList: true }]), allergies: JSON.stringify([]) },
        { id: 'pat-008', nhsNumber: '748 392 1856', firstName: 'Elena', lastName: 'Popescu', dateOfBirth: '1988-05-20', gender: 'female', postcode: 'SE1 9TY', phone: '07700 900008', practiceId: 'prac-001', medications: JSON.stringify([]), allergies: JSON.stringify(['Aspirin']) },
    ];

    for (const p of patientsData) {
        await prisma.patient.upsert({ where: { nhsNumber: p.nhsNumber }, update: {}, create: p });
    }
    console.log(`✅ Patients: ${patientsData.length} seeded`);

    // ═══ APPOINTMENTS ═══
    const appts = [
        { id: 'slot-001', date: '2026-02-27', time: '09:00', endTime: '09:15', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'routine' },
        { id: 'slot-002', date: '2026-02-27', time: '09:30', endTime: '09:45', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'routine' },
        { id: 'slot-003', date: '2026-02-27', time: '10:00', endTime: '10:15', clinicianName: 'Dr. Lucy Chen', clinicianType: 'GP', location: 'Room 5', available: true, slotType: 'routine' },
        { id: 'slot-004', date: '2026-02-27', time: '10:30', endTime: '10:45', clinicianName: 'Nurse Helen Brooks', clinicianType: 'Nurse Practitioner', location: 'Room 2', available: true, slotType: 'routine' },
        { id: 'slot-005', date: '2026-02-27', time: '11:00', endTime: '11:15', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: false, slotType: 'urgent', patientId: 'pat-004', bookedReason: 'Diabetes review' },
        { id: 'slot-006', date: '2026-02-27', time: '14:00', endTime: '14:15', clinicianName: 'Dr. Lucy Chen', clinicianType: 'GP', location: 'Room 5', available: true, slotType: 'routine' },
        { id: 'slot-007', date: '2026-02-27', time: '15:00', endTime: '15:30', clinicianName: 'Pharmacist Mike Davis', clinicianType: 'Pharmacist', location: 'Room 1', available: true, slotType: 'medication_review' },
        { id: 'slot-008', date: '2026-02-28', time: '08:30', endTime: '08:45', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'urgent' },
        { id: 'slot-009', date: '2026-02-28', time: '09:00', endTime: '09:15', clinicianName: 'Nurse Helen Brooks', clinicianType: 'Nurse Practitioner', location: 'Room 2', available: true, slotType: 'routine' },
        { id: 'slot-010', date: '2026-02-28', time: '10:00', endTime: '10:15', clinicianName: 'Dr. Lucy Chen', clinicianType: 'GP', location: 'Room 5', available: true, slotType: 'routine' },
        { id: 'slot-011', date: '2026-02-28', time: '11:30', endTime: '11:45', clinicianName: 'Physiotherapist Jane Lee', clinicianType: 'Physiotherapist', location: 'Room 4', available: true, slotType: 'routine' },
        { id: 'slot-012', date: '2026-03-01', time: '09:00', endTime: '09:15', clinicianName: 'Dr. Ahmad Khan', clinicianType: 'GP', location: 'Room 3', available: true, slotType: 'routine' },
    ];

    for (const a of appts) {
        await prisma.appointment.upsert({ where: { id: a.id }, update: {}, create: a });
    }
    console.log(`✅ Appointments: ${appts.length} slots created`);

    // ═══ CALL RECORDS ═══
    const callsData = [
        { id: 'call-001', practiceId: 'prac-001', patientId: 'pat-004', patientName: 'Sarah Jenkins', patientNHSNumber: '193 482 9103', callerPhone: '07700 900004', startedAt: '2026-02-26T09:42:00Z', endedAt: '2026-02-26T09:45:32Z', durationSeconds: 212, primaryIntent: 'CLINICAL_SYMPTOMS', urgencyLevel: 'EMERGENCY', resolutionType: 'emergency', agentUsed: 'triage', snomedCodes: JSON.stringify([{ code: '29857009', display: 'Chest pain' }]), redFlagsDetected: JSON.stringify(['Cardiac chest pain with arm radiation']), safetyNetting: 'If symptoms worsen, call 999.', actionsTaken: JSON.stringify([{ type: 'emergency_999', description: '999 guidance provided' }]), transcript: JSON.stringify([{ id: 'm1', role: 'assistant', content: "Good morning, Riverside Medical Centre.", timestamp: '2026-02-26T09:42:00Z' }, { id: 'm2', role: 'user', content: "I'm having sharp chest pains.", timestamp: '2026-02-26T09:42:15Z' }]) },
        { id: 'call-002', practiceId: 'prac-001', patientId: 'pat-003', patientName: 'James Bennett', patientNHSNumber: '284 193 4821', callerPhone: '07700 900003', startedAt: '2026-02-26T10:15:00Z', endedAt: '2026-02-26T10:18:45Z', durationSeconds: 225, primaryIntent: 'APPOINTMENT', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'appointment', satisfaction: 5, actionsTaken: JSON.stringify([{ type: 'appointment_booked', description: 'Booked with Dr. Lucy Chen' }]), transcript: JSON.stringify([]) },
        { id: 'call-003', practiceId: 'prac-001', patientId: 'pat-001', patientName: 'Margaret Wilson', patientNHSNumber: '485 922 1044', callerPhone: '07700 900001', startedAt: '2026-02-26T08:02:00Z', endedAt: '2026-02-26T08:06:20Z', durationSeconds: 260, primaryIntent: 'PRESCRIPTION', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'prescription', satisfaction: 4, actionsTaken: JSON.stringify([{ type: 'prescription_submitted', description: 'Repeat: Amlodipine 5mg, Simvastatin 20mg' }]), transcript: JSON.stringify([]) },
        { id: 'call-004', practiceId: 'prac-001', patientId: 'pat-005', patientName: 'Robert Thompson', patientNHSNumber: '482 190 3847', callerPhone: '07700 900005', startedAt: '2026-02-26T11:30:00Z', endedAt: '2026-02-26T11:34:12Z', durationSeconds: 252, primaryIntent: 'CLINICAL_SYMPTOMS', urgencyLevel: 'SOON', resolutionType: 'automated', agentUsed: 'triage', satisfaction: 4, snomedCodes: JSON.stringify([{ code: '68566005', display: 'UTI' }]), safetyNetting: 'If fever or blood in urine, call back.', actionsTaken: JSON.stringify([{ type: 'appointment_booked', description: 'Booked urgent for UTI' }]), transcript: JSON.stringify([]) },
        { id: 'call-005', practiceId: 'prac-001', patientId: 'pat-002', patientName: 'Fatima Khan', patientNHSNumber: '392 841 2033', callerPhone: '07700 900002', startedAt: '2026-02-26T12:45:00Z', endedAt: '2026-02-26T12:47:30Z', durationSeconds: 150, primaryIntent: 'ADMIN', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'admin', satisfaction: 5, actionsTaken: JSON.stringify([{ type: 'info_provided', description: 'Hours and registration' }]), transcript: JSON.stringify([]) },
        { id: 'call-006', practiceId: 'prac-001', patientId: 'pat-007', patientName: 'David Patel', patientNHSNumber: '691 483 2019', callerPhone: '07700 900007', startedAt: '2026-02-26T14:20:00Z', endedAt: '2026-02-26T14:23:45Z', durationSeconds: 225, primaryIntent: 'TEST_RESULTS', urgencyLevel: 'ROUTINE', resolutionType: 'automated', agentUsed: 'test_results', satisfaction: 5, actionsTaken: JSON.stringify([{ type: 'results_delivered', description: 'Normal blood results' }]), transcript: JSON.stringify([]) },
        { id: 'call-007', practiceId: 'prac-001', patientId: 'pat-008', patientName: 'Elena Popescu', patientNHSNumber: '748 392 1856', callerPhone: '07700 900008', startedAt: '2026-02-26T15:10:00Z', endedAt: '2026-02-26T15:14:00Z', durationSeconds: 240, primaryIntent: 'CLINICAL_SYMPTOMS', urgencyLevel: 'URGENT', resolutionType: 'automated', agentUsed: 'triage', satisfaction: 4, snomedCodes: JSON.stringify([{ code: '48694002', display: 'Anxiety' }]), safetyNetting: 'Samaritans 116 123 if in crisis.', actionsTaken: JSON.stringify([{ type: 'urgent_callback', description: 'Mental health duty GP callback' }]), transcript: JSON.stringify([]) },
    ];

    for (const c of callsData) {
        await prisma.callRecord.upsert({ where: { id: c.id }, update: {}, create: c });
    }
    console.log(`✅ Calls: ${callsData.length} records`);

    // ═══ PRESCRIPTIONS ═══
    const rxData = [
        { id: 'rx-001', patientId: 'pat-001', patientName: 'Margaret Wilson', patientNHSNumber: '485 922 1044', medications: JSON.stringify([{ name: 'Amlodipine', dose: '5mg' }, { name: 'Simvastatin', dose: '20mg' }]), status: 'approved', requestedAt: '2026-02-26T08:06:00Z', pharmacy: 'Boots Pharmacy' },
        { id: 'rx-002', patientId: 'pat-005', patientName: 'Robert Thompson', patientNHSNumber: '482 190 3847', medications: JSON.stringify([{ name: 'Ramipril', dose: '10mg' }, { name: 'Metformin', dose: '1000mg' }]), status: 'pending', requestedAt: '2026-02-26T09:08:00Z', pharmacy: 'Boots Pharmacy' },
        { id: 'rx-003', patientId: 'pat-007', patientName: 'David Patel', patientNHSNumber: '691 483 2019', medications: JSON.stringify([{ name: 'Omeprazole', dose: '20mg' }, { name: 'Sertraline', dose: '50mg' }]), status: 'collected', requestedAt: '2026-02-24T10:00:00Z', pharmacy: 'Boots Pharmacy' },
        { id: 'rx-004', patientId: 'pat-004', patientName: 'Sarah Jenkins', patientNHSNumber: '193 482 9103', medications: JSON.stringify([{ name: 'Metformin', dose: '500mg' }]), status: 'approved', requestedAt: '2026-02-25T14:30:00Z', pharmacy: 'Boots Pharmacy' },
    ];

    for (const rx of rxData) {
        await prisma.prescription.upsert({ where: { id: rx.id }, update: {}, create: rx });
    }
    console.log(`✅ Prescriptions: ${rxData.length} seeded`);

    // ═══ TEST RESULTS ═══
    const tests = [
        { id: 'tr-001', patientId: 'pat-007', patientNHSNumber: '691 483 2019', testType: 'Full Blood Count', date: '2026-02-22', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'All values normal.' },
        { id: 'tr-002', patientId: 'pat-004', patientNHSNumber: '193 482 9103', testType: 'HbA1c', date: '2026-02-21', status: 'abnormal', deliveryTier: 'gp_callback', summary: 'HbA1c 58 mmol/mol — above target.' },
        { id: 'tr-003', patientId: 'pat-001', patientNHSNumber: '485 922 1044', testType: 'Liver Function Tests', date: '2026-02-23', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'All markers normal.' },
        { id: 'tr-004', patientId: 'pat-005', patientNHSNumber: '482 190 3847', testType: 'Kidney Function (eGFR)', date: '2026-02-24', status: 'review_required', deliveryTier: 'gp_callback', summary: 'eGFR 52 — stage 3a CKD.' },
        { id: 'tr-005', patientId: 'pat-003', patientNHSNumber: '284 193 4821', testType: 'Cholesterol Panel', date: '2026-02-25', status: 'pending', deliveryTier: 'emma_can_deliver' },
        { id: 'tr-006', patientId: 'pat-006', patientNHSNumber: '583 291 4720', testType: 'Cervical Screening', date: '2026-02-20', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'No abnormal cells.' },
        { id: 'tr-007', patientId: 'pat-008', patientNHSNumber: '748 392 1856', testType: 'Thyroid Function', date: '2026-02-19', status: 'normal', deliveryTier: 'emma_can_deliver', summary: 'TSH and T4 normal.' },
        { id: 'tr-008', patientId: 'pat-002', patientNHSNumber: '392 841 2033', testType: 'Urine Culture', date: '2026-02-25', status: 'pending', deliveryTier: 'emma_can_deliver' },
    ];

    for (const t of tests) {
        await prisma.testResult.upsert({ where: { id: t.id }, update: {}, create: t });
    }
    console.log(`✅ Test Results: ${tests.length} seeded`);

    // ═══ TRIAGE RECORDS ═══
    const triages = [
        { id: 'tr-rec-001', callId: 'call-001', patientId: 'pat-004', patientName: 'Sarah Jenkins', symptoms: JSON.stringify([{ description: 'Chest pain', snomedCode: '29857009', severity: 8, isRedFlag: true }]), redFlagsDetected: JSON.stringify(['Cardiac chest pain']), urgencyClassification: 'EMERGENCY', safetyNetting: 'Call 999 if worsens.', disposition: '999 guidance — cardiac', safetyCheckPassed: true, humanReviewRequired: true },
        { id: 'tr-rec-002', callId: 'call-004', patientId: 'pat-005', patientName: 'Robert Thompson', symptoms: JSON.stringify([{ description: 'Dysuria', snomedCode: '49650001', severity: 5, isRedFlag: false }]), redFlagsDetected: JSON.stringify([]), urgencyClassification: 'SOON', safetyNetting: 'Fever or blood → call back.', disposition: 'Appointment booked — UTI', safetyCheckPassed: true, humanReviewRequired: false },
        { id: 'tr-rec-003', callId: 'call-007', patientId: 'pat-008', patientName: 'Elena Popescu', symptoms: JSON.stringify([{ description: 'Anxiety', snomedCode: '48694002', severity: 7, isRedFlag: false }]), redFlagsDetected: JSON.stringify([]), urgencyClassification: 'URGENT', safetyNetting: 'Samaritans 116 123.', disposition: 'Duty GP callback', safetyCheckPassed: true, humanReviewRequired: true },
    ];

    for (const tr of triages) {
        await prisma.triageRecord.upsert({ where: { id: tr.id }, update: {}, create: tr });
    }
    console.log(`✅ Triage Records: ${triages.length} seeded`);

    console.log('\n🎉 Database seeded successfully!');
    console.log(`   • 1 Practice  • ${patientsData.length} Patients  • ${appts.length} Appointments`);
    console.log(`   • ${callsData.length} Calls  • ${rxData.length} Prescriptions  • ${tests.length} Tests  • ${triages.length} Triages`);
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error('Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
