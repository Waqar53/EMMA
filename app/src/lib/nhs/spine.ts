// ═══════════════════════════════════════════════════════════════════════════════
// EMMA NHS INTEGRATION — Electronic Prescription Service (EPS) + Spine
// Handles prescription status tracking, GP Connect, and Spine Directory lookups
//
// EPS FHIR sandbox: https://sandbox.api.service.nhs.uk/electronic-prescriptions
// Spine Directory: https://sandbox.api.service.nhs.uk/spine-directory/FHIR/R4
// ODS API: https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations
//
// All sandbox endpoints are open-access for development.
// ═══════════════════════════════════════════════════════════════════════════════

const ODS_BASE_URL = 'https://directory.spineservices.nhs.uk/ORD/2-0-0';

// ── Types ──

export interface NHSOrganisation {
    odsCode: string;
    name: string;
    status: string;
    type: string;
    address: {
        line: string[];
        city: string;
        postalCode: string;
        country: string;
    };
    phone?: string;
    fax?: string;
    lastChangeDate?: string;
    primaryRole?: string;
}

export interface NHSPrescriptionStatus {
    prescriptionId: string;
    status: 'created' | 'preparing' | 'ready' | 'collected' | 'cancelled' | 'expired';
    nominatedPharmacy?: string;
    issueDate?: string;
    items: {
        medicationName: string;
        dose: string;
        quantity: string;
        status: string;
    }[];
}

export interface NHSPharmacy {
    odsCode: string;
    name: string;
    address: string;
    phone?: string;
    openingHours?: string;
    distanceKm?: number;
    services: string[];
}

// ═══════════════════════════════════════════════════════════
// 1. ODS Organisation Lookup (GP Practices, Pharmacies, Hospitals)
// ═══════════════════════════════════════════════════════════

export async function lookupOrganisation(odsCode: string): Promise<NHSOrganisation | null> {
    try {
        const res = await fetch(`${ODS_BASE_URL}/organisations/${odsCode}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            console.error(`ODS lookup failed for ${odsCode}: ${res.status}`);
            return null;
        }

        const data = await res.json();
        const org = data.Organisation || data;
        const geo = org.GeoLoc?.Location || {};
        const contacts = org.Contacts?.Contact || [];

        const phoneContact = Array.isArray(contacts)
            ? contacts.find((c: Record<string, string>) => c.type === 'tel')
            : null;

        const addr = org.GeoLoc?.Location || {};

        return {
            odsCode: org.OrgId?.extension || odsCode,
            name: org.Name || '',
            status: org.Status || '',
            type: org.orgRecordClass || '',
            address: {
                line: [addr.AddrLn1, addr.AddrLn2, addr.AddrLn3].filter(Boolean),
                city: addr.Town || geo.Town || '',
                postalCode: addr.PostCode || geo.PostCode || '',
                country: addr.Country || 'England',
            },
            phone: phoneContact?.value || undefined,
            lastChangeDate: org.LastChangeDate || undefined,
            primaryRole: org.PrimaryRoleId?.id || undefined,
        };
    } catch (err) {
        console.error('ODS organisation lookup failed:', err);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// 2. Search Pharmacies Near a Postcode
// ═══════════════════════════════════════════════════════════

export async function searchPharmacies(params: {
    postCode?: string;
    name?: string;
    limit?: number;
}): Promise<NHSPharmacy[]> {
    try {
        const query = new URLSearchParams();
        if (params.postCode) query.set('PostCode', params.postCode);
        if (params.name) query.set('Name', params.name);
        query.set('PrimaryRoleId', 'RO182'); // Community Pharmacy role code
        query.set('Limit', String(params.limit || 5));
        query.set('Status', 'Active');

        const res = await fetch(`${ODS_BASE_URL}/organisations?${query.toString()}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return [];

        const data = await res.json();
        const orgs = data.Organisations || [];

        return orgs.map((org: Record<string, unknown>) => ({
            odsCode: (org as Record<string, Record<string, string>>).OrgId?.extension || '',
            name: (org as Record<string, string>).Name || '',
            address: ((org as Record<string, Record<string, Record<string, string>>>).GeoLoc?.Location?.AddrLn1 || '') + ', ' +
                ((org as Record<string, Record<string, Record<string, string>>>).GeoLoc?.Location?.Town || ''),
            phone: undefined,
            services: ['dispensing'],
        }));
    } catch (err) {
        console.error('Pharmacy search failed:', err);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// 3. Search GP Practices
// ═══════════════════════════════════════════════════════════

export async function searchGPPractices(params: {
    postCode?: string;
    name?: string;
    limit?: number;
}): Promise<NHSOrganisation[]> {
    try {
        const query = new URLSearchParams();
        if (params.postCode) query.set('PostCode', params.postCode);
        if (params.name) query.set('Name', params.name);
        query.set('PrimaryRoleId', 'RO76'); // GP Practice role code
        query.set('Status', 'Active');
        query.set('Limit', String(params.limit || 10));

        const res = await fetch(`${ODS_BASE_URL}/organisations?${query.toString()}`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return [];

        const data = await res.json();
        const orgs = data.Organisations || [];

        return orgs.map((org: Record<string, unknown>) => ({
            odsCode: (org as Record<string, Record<string, string>>).OrgId?.extension || '',
            name: (org as Record<string, string>).Name || '',
            status: (org as Record<string, string>).Status || '',
            type: 'GP Practice',
            address: {
                line: [(org as Record<string, Record<string, Record<string, string>>>).GeoLoc?.Location?.AddrLn1].filter(Boolean),
                city: (org as Record<string, Record<string, Record<string, string>>>).GeoLoc?.Location?.Town || '',
                postalCode: (org as Record<string, Record<string, Record<string, string>>>).GeoLoc?.Location?.PostCode || '',
                country: 'England',
            },
        }));
    } catch (err) {
        console.error('GP search failed:', err);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// 4. NHS Service Search (NHS.UK API — e.g., find nearest A&E)
// ═══════════════════════════════════════════════════════════

export interface NHSService {
    name: string;
    type: string;
    address: string;
    phone: string;
    distance?: string;
    openNow?: boolean;
}

export async function searchNHSServices(params: {
    postCode: string;
    serviceType: 'gp' | 'pharmacy' | 'urgent-care' | 'hospital' | 'dentist';
}): Promise<NHSService[]> {
    // NHS.UK service search API
    try {
        const typeMap: Record<string, string> = {
            'gp': 'GP',
            'pharmacy': 'Pharmacy',
            'urgent-care': 'Urgent care',
            'hospital': 'Hospital',
            'dentist': 'Dentist',
        };

        const res = await fetch(
            `https://api.nhs.uk/service-search/search?api-version=2&search=${typeMap[params.serviceType]}&top=5&$filter=OrganisationTypeID eq '%27${params.serviceType}%27'`,
            {
                headers: {
                    'subscription-key': process.env.NHS_SERVICE_SEARCH_KEY || '',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(10000),
            }
        );

        if (!res.ok) {
            // Fallback: just return empty — the service search API requires a subscription key
            return [];
        }

        const data = await res.json();
        return (data.value || []).map((s: Record<string, unknown>) => ({
            name: s.OrganisationName || '',
            type: s.OrganisationType || '',
            address: s.Address1 || '',
            phone: s.telephone || '',
        }));
    } catch {
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// 5. NHS Spine Health Check
// ═══════════════════════════════════════════════════════════

export async function checkSpineHealth(): Promise<Record<string, { status: string; latencyMs: number }>> {
    const services = {
        'ODS': `${ODS_BASE_URL}/organisations/Y12345`,
        'PDS Sandbox': 'https://sandbox.api.service.nhs.uk/personal-demographics/FHIR/R4/_ping',
    };

    const results: Record<string, { status: string; latencyMs: number }> = {};

    for (const [name, url] of Object.entries(services)) {
        const start = Date.now();
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            results[name] = {
                status: res.ok ? 'healthy' : `error_${res.status}`,
                latencyMs: Date.now() - start,
            };
        } catch {
            results[name] = { status: 'unreachable', latencyMs: Date.now() - start };
        }
    }

    return results;
}
