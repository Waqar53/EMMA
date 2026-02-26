// ═══════════════════════════════════════════════════════════════════════════════
// EMMA — Patient Verification Protocol
// Implements PRD §7 F4 identity verification + AGENT_INSTRUCTIONS §10
// ═══════════════════════════════════════════════════════════════════════════════

import { patients } from '../data/store';
import { PatientRecord } from '../types';

export interface VerificationResult {
    verified: boolean;
    patient?: PatientRecord;
    method?: 'name_dob' | 'nhs_dob' | 'name_nhs' | 'full_match';
    attemptsUsed: number;
    failureReason?: string;
}

/**
 * Attempt to verify a patient from their message text.
 * Supports multiple verification methods:
 * - Name + DOB
 * - NHS Number + DOB  
 * - Name + NHS Number
 * 
 * Per AGENT_INSTRUCTIONS §10: Max 3 verification attempts.
 * After 3 failures → escalate to human receptionist.
 */
export function verifyPatientFromText(text: string, attempt: number = 1): VerificationResult {
    const lower = text.toLowerCase().replace(/[^\w\s\/\-\.]/g, '');

    for (const patient of patients) {
        const firstNameMatch = lower.includes(patient.firstName.toLowerCase());
        const lastNameMatch = lower.includes(patient.lastName.toLowerCase());
        const nameMatch = firstNameMatch && lastNameMatch;

        // DOB matching — support multiple formats
        const dob = patient.dateOfBirth; // YYYY-MM-DD
        const [year, month, day] = dob.split('-');
        const dobFormats = [
            dob,                                          // 1954-03-18
            `${day}/${month}/${year}`,                    // 18/03/1954
            `${day}-${month}-${year}`,                    // 18-03-1954
            `${parseInt(day)}/${parseInt(month)}/${year}`, // 18/3/1954
            `${day}.${month}.${year}`,                    // 18.03.1954
            `${day} ${month} ${year}`,                    // 18 03 1954
        ];

        // Also match spoken dates
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthName = months[parseInt(month) - 1];
        const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const shortMonth = shortMonths[parseInt(month) - 1];
        dobFormats.push(
            `${parseInt(day)} ${monthName} ${year}`,      // 18 march 1954
            `${parseInt(day)}${getOrdinal(parseInt(day))} ${monthName} ${year}`, // 18th march 1954
            `${parseInt(day)} ${shortMonth} ${year}`,     // 18 mar 1954
            `${parseInt(day)}${getOrdinal(parseInt(day))} of ${monthName} ${year}`, // 18th of march 1954
            `${monthName} ${parseInt(day)} ${year}`,      // march 18 1954
        );

        const dobMatch = dobFormats.some(fmt => lower.includes(fmt.toLowerCase()));

        // NHS number matching — strip spaces
        const nhsClean = patient.nhsNumber.replace(/\s/g, '');
        const nhsMatch = lower.replace(/\s/g, '').includes(nhsClean) || lower.includes(patient.nhsNumber.toLowerCase());

        // Full match (all three)
        if (nameMatch && dobMatch && nhsMatch) {
            return { verified: true, patient, method: 'full_match', attemptsUsed: attempt };
        }
        // Name + DOB
        if (nameMatch && dobMatch) {
            return { verified: true, patient, method: 'name_dob', attemptsUsed: attempt };
        }
        // NHS + DOB
        if (nhsMatch && dobMatch) {
            return { verified: true, patient, method: 'nhs_dob', attemptsUsed: attempt };
        }
        // Name + NHS
        if (nameMatch && nhsMatch) {
            return { verified: true, patient, method: 'name_nhs', attemptsUsed: attempt };
        }
    }

    if (attempt >= 3) {
        return {
            verified: false,
            attemptsUsed: attempt,
            failureReason: 'Maximum verification attempts (3) exceeded. Escalating to human receptionist.',
        };
    }

    return {
        verified: false,
        attemptsUsed: attempt,
        failureReason: 'Could not match patient details. Please provide your full name and date of birth.',
    };
}

function getOrdinal(n: number): string {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
}

/**
 * Generate the verification prompt EMMA should use.
 */
export function getVerificationPrompt(attempt: number): string {
    if (attempt === 1) {
        return "For security, I need to verify your identity. Could you please tell me your full name and date of birth?";
    } else if (attempt === 2) {
        return "I wasn't able to match those details. Could you try again? I need your full name as registered with the practice, and your date of birth.";
    } else {
        return "I'm sorry, I'm having trouble verifying your identity. Could you also provide your NHS number? It's the 10-digit number on any letter from the NHS.";
    }
}

/**
 * Check if the intent requires patient verification.
 */
export function requiresVerification(intent: string): boolean {
    const requiresAuth = ['CLINICAL_SYMPTOMS', 'APPOINTMENT', 'PRESCRIPTION', 'TEST_RESULTS'];
    return requiresAuth.includes(intent);
}
