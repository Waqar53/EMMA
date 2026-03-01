// ═══════════════════════════════════════════════════════════════════════════════
// EMMA NHS INTEGRATION — Personal Demographics Service (PDS) FHIR R4 API
// Real NHS sandbox integration for patient demographics lookup
//
// Sandbox: https://sandbox.api.service.nhs.uk/personal-demographics/FHIR/R4
// Docs: https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-fhir
//
// The sandbox is open-access — no authentication needed for testing.
// Production requires NHS Login + OAuth 2.0 + ASID registration.
// ═══════════════════════════════════════════════════════════════════════════════

const PDS_SANDBOX_URL = 'https://sandbox.api.service.nhs.uk/personal-demographics/FHIR/R4';
const PDS_INT_URL = 'https://int.api.service.nhs.uk/personal-demographics/FHIR/R4';

// Use sandbox by default, production requires NHS_PDS_ACCESS_TOKEN
const PDS_BASE_URL = process.env.NHS_PDS_BASE_URL || PDS_SANDBOX_URL;
const PDS_ACCESS_TOKEN = process.env.NHS_PDS_ACCESS_TOKEN || '';

// ── Types ──

export interface NHSPatientDemographics {
    nhsNumber: string;
    title?: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    address?: {
        line: string[];
        city: string;
        postalCode: string;
    };
    phone?: string;
    email?: string;
    gpPractice?: {
        odsCode: string;
        name: string;
        period?: { start: string; end?: string };
    };
    deathDate?: string;
    isDeceased: boolean;
    securitySensitive: boolean;
}

export interface NHSSearchResult {
    found: boolean;
    totalResults: number;
    patients: NHSPatientDemographics[];
    error?: string;
}

// ── Helper: Parse FHIR Patient Resource ──

function parseFHIRPatient(resource: Record<string, unknown>): NHSPatientDemographics {
    const name = (resource.name as Record<string, unknown>[])?.[0] || {};
    const nameUse = (resource.name as Record<string, unknown>[])?.find(n => n.use === 'usual') || name;

    const address = (resource.address as Record<string, unknown>[])?.[0] || {};
    const telecom = (resource.telecom as Record<string, unknown>[]) || [];
    const phone = telecom.find(t => t.system === 'phone');
    const email = telecom.find(t => t.system === 'email');

    // GP Practice from generalPractitioner
    const gp = (resource.generalPractitioner as Record<string, unknown>[])?.[0];
    let gpPractice: NHSPatientDemographics['gpPractice'];
    if (gp) {
        const gpId = (gp.identifier as Record<string, unknown>)?.value as string;
        gpPractice = {
            odsCode: gpId || '',
            name: (gp.display as string) || '',
        };
    }

    // Check security/sensitivity flags
    const meta = resource.meta as Record<string, unknown>;
    const security = ((meta?.security as Record<string, unknown>[]) || []);
    const isRestricted = security.some(s => s.code === 'R' || s.code === 'S');

    return {
        nhsNumber: (resource.id as string) || '',
        title: ((nameUse.prefix as string[]) || [])[0] || '',
        firstName: ((nameUse.given as string[]) || [])[0] || '',
        lastName: (nameUse.family as string) || '',
        dateOfBirth: (resource.birthDate as string) || '',
        gender: (resource.gender as string) || '',
        address: (address.line as string[]) ? {
            line: (address.line as string[]) || [],
            city: (address.city as string) || '',
            postalCode: (address.postalCode as string) || '',
        } : undefined,
        phone: (phone?.value as string) || undefined,
        email: (email?.value as string) || undefined,
        gpPractice,
        deathDate: (resource.deceasedDateTime as string) || undefined,
        isDeceased: !!resource.deceasedDateTime || resource.deceasedBoolean === true,
        securitySensitive: isRestricted,
    };
}

// ── API Headers ──

function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'application/fhir+json',
        'X-Request-ID': crypto.randomUUID(),
    };

    if (PDS_ACCESS_TOKEN) {
        headers['Authorization'] = `Bearer ${PDS_ACCESS_TOKEN}`;
    }

    return headers;
}

// ═══════════════════════════════════════════════════════════
// 1. Look Up Patient by NHS Number
// ═══════════════════════════════════════════════════════════

export async function lookupPatientByNHSNumber(nhsNumber: string): Promise<NHSPatientDemographics | null> {
    const cleanNHS = nhsNumber.replace(/\s+/g, '');

    if (!/^\d{10}$/.test(cleanNHS)) {
        console.error('❌ Invalid NHS number format — must be 10 digits');
        return null;
    }

    try {
        const res = await fetch(`${PDS_BASE_URL}/Patient/${cleanNHS}`, {
            headers: getHeaders(),
            signal: AbortSignal.timeout(10000),
        });

        if (res.status === 404) {
            console.log(`NHS PDS: Patient ${cleanNHS} not found`);
            return null;
        }

        if (!res.ok) {
            console.error(`NHS PDS error: ${res.status} ${res.statusText}`);
            return null;
        }

        const fhir = await res.json();
        return parseFHIRPatient(fhir);
    } catch (err) {
        console.error('NHS PDS lookup failed:', err);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// 2. Search Patients by Demographics
// ═══════════════════════════════════════════════════════════

export async function searchPatients(params: {
    family?: string;       // Last name
    given?: string;        // First name
    birthdate?: string;    // YYYY-MM-DD
    gender?: string;       // male, female, other
    postalCode?: string;   // Postcode
}): Promise<NHSSearchResult> {
    const query = new URLSearchParams();
    if (params.family) query.set('family', params.family);
    if (params.given) query.set('given', params.given);
    if (params.birthdate) query.set('birthdate', `eq${params.birthdate}`);
    if (params.gender) query.set('gender', params.gender);
    if (params.postalCode) query.set('address-postalcode', params.postalCode);

    // PDS requires at least family name + DOB or gender
    if (!params.family) {
        return { found: false, totalResults: 0, patients: [], error: 'Family name is required for search' };
    }

    try {
        const res = await fetch(`${PDS_BASE_URL}/Patient?${query.toString()}`, {
            headers: getHeaders(),
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
            return { found: false, totalResults: 0, patients: [], error: `PDS search error: ${res.status}` };
        }

        const bundle = await res.json();
        const entries = (bundle.entry || []) as { resource: Record<string, unknown> }[];
        const patients = entries.map(e => parseFHIRPatient(e.resource));

        return {
            found: patients.length > 0,
            totalResults: bundle.total || patients.length,
            patients,
        };
    } catch (err) {
        return { found: false, totalResults: 0, patients: [], error: `PDS search failed: ${err}` };
    }
}

// ═══════════════════════════════════════════════════════════
// 3. Verify NHS Number (Modulus 11 Check)
// ═══════════════════════════════════════════════════════════

export function validateNHSNumber(nhsNumber: string): { valid: boolean; error?: string } {
    const clean = nhsNumber.replace(/\s+/g, '');

    if (!/^\d{10}$/.test(clean)) {
        return { valid: false, error: 'NHS number must be exactly 10 digits' };
    }

    // Modulus 11 check digit validation (standard NHS algorithm)
    const digits = clean.split('').map(Number);
    const weights = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    let total = 0;

    for (let i = 0; i < 9; i++) {
        total += digits[i] * weights[i];
    }

    const remainder = total % 11;
    const checkDigit = 11 - remainder;

    if (checkDigit === 11 && digits[9] === 0) return { valid: true };
    if (checkDigit === 10) return { valid: false, error: 'Invalid NHS number (check digit = 10)' };
    if (checkDigit === digits[9]) return { valid: true };

    return { valid: false, error: 'NHS number failed Modulus 11 check digit validation' };
}

// ═══════════════════════════════════════════════════════════
// 4. Health Check — Verify PDS Connectivity
// ═══════════════════════════════════════════════════════════

export async function checkPDSHealth(): Promise<{ status: string; environment: string; latencyMs: number }> {
    const start = Date.now();
    try {
        const res = await fetch(`${PDS_BASE_URL}/_ping`, {
            signal: AbortSignal.timeout(5000),
        });

        return {
            status: res.ok ? 'healthy' : `error_${res.status}`,
            environment: PDS_BASE_URL.includes('sandbox') ? 'sandbox' : PDS_BASE_URL.includes('int') ? 'integration' : 'production',
            latencyMs: Date.now() - start,
        };
    } catch {
        return { status: 'unreachable', environment: 'unknown', latencyMs: Date.now() - start };
    }
}

// ═══════════════════════════════════════════════════════════
// 5. Get Patient's Registered GP Practice
// ═══════════════════════════════════════════════════════════

export async function getPatientGPPractice(nhsNumber: string): Promise<{ odsCode: string; name: string } | null> {
    const patient = await lookupPatientByNHSNumber(nhsNumber);
    if (!patient || !patient.gpPractice) return null;
    return patient.gpPractice;
}
