// ═══════════════════════════════════════════════════════════════════════════════
// SUPERPOWER 7 — CLINICAL DOCUMENT AUTHORING
// AI-drafted clinical documents with mandatory GP approval lock
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuid } from 'uuid';
import { ClinicalDocument, DocumentType, DocumentStatus } from '@/lib/types';

// ═══ NHS DOCUMENT TEMPLATES ═══

const DOCUMENT_TEMPLATES: Record<DocumentType, { title: string; template: string; niceGuidelines: string[] }> = {
    referral_letter: {
        title: 'GP Referral Letter',
        niceGuidelines: ['NG12 — Suspected Cancer', 'CG27 — Referral Guidelines'],
        template: `[NHS Practice Letterhead]
[Date]

Dear Colleague,

RE: [PATIENT_NAME] — NHS: [NHS_NUMBER] — DOB: [DOB]

I am writing to refer the above patient to your service.

PRESENTING COMPLAINT:
[SYMPTOMS]

CLINICAL FINDINGS:
[FINDINGS]

RELEVANT HISTORY:
[HISTORY]

CURRENT MEDICATIONS:
[MEDICATIONS]

ALLERGIES:
[ALLERGIES]

INVESTIGATIONS TO DATE:
[INVESTIGATIONS]

I would be grateful for your assessment and management of this patient.

Yours faithfully,
[GP_NAME]
[PRACTICE_NAME]
[ODS_CODE]`,
    },
    fit_note: {
        title: 'Statement of Fitness for Work (MED3)',
        niceGuidelines: ['NG146 — Workplace Health'],
        template: `STATEMENT OF FITNESS FOR WORK
For social security and Statutory Sick Pay

Patient: [PATIENT_NAME]
NHS Number: [NHS_NUMBER]
Date of Birth: [DOB]

I assessed your case on: [DATE]

Because of the following condition(s):
[CONDITIONS]

I advise you that:
☐ you are not fit for work
☐ you may be fit for work taking account of the following advice:
  ☐ a phased return to work
  ☐ altered hours
  ☐ amended duties
  ☐ workplace adaptations

This will be the case for [DURATION] from [START_DATE] to [END_DATE].

[GP_SIGNATURE]
[GMC_NUMBER]`,
    },
    two_week_wait: {
        title: '2-Week Wait Cancer Referral',
        niceGuidelines: ['NG12 — Suspected cancer recognition and referral'],
        template: `URGENT SUSPECTED CANCER REFERRAL
2-WEEK WAIT PATHWAY

Patient: [PATIENT_NAME]
NHS Number: [NHS_NUMBER]
DOB: [DOB]
Phone: [PHONE]

Suspected Cancer Site: [CANCER_SITE]
Specialty: [SPECIALTY]

Qualifying Symptoms/Signs (NG12 criteria):
[QUALIFYING_SYMPTOMS]

Duration of symptoms: [DURATION]
Examination findings: [FINDINGS]
Relevant investigations: [INVESTIGATIONS]

Red flag symptoms: [RED_FLAGS]

Patient has been informed: ☐ Yes ☐ No
Patient has consented to referral: ☐ Yes

URGENCY: 2-WEEK WAIT — NICE NG12 CRITERIA MET

Referring GP: [GP_NAME]
GMC: [GMC_NUMBER]
Practice: [PRACTICE_NAME] ([ODS_CODE])
Date: [DATE]`,
    },
    insurance_report: {
        title: 'Insurance/Medicolegal Report',
        niceGuidelines: ['GMC — Confidentiality Guidance'],
        template: `MEDICAL REPORT
(Prepared for insurance purposes with patient consent)

Patient: [PATIENT_NAME]
NHS Number: [NHS_NUMBER]
Date of Birth: [DOB]

Report requested by: [REQUESTOR]
Patient consent obtained: [DATE]

MEDICAL HISTORY:
[HISTORY]

CURRENT CONDITIONS:
[CONDITIONS]

PROGNOSIS:
[PROGNOSIS]

This report is based on our medical records and clinical assessment.

[GP_NAME] | [GMC_NUMBER] | [DATE]`,
    },
    care_plan: {
        title: 'Care Plan Summary',
        niceGuidelines: ['NICE QS15 — Patient Experience'],
        template: `PERSONALISED CARE PLAN

Patient: [PATIENT_NAME]
NHS Number: [NHS_NUMBER]
Date: [DATE]

CONDITIONS MANAGED:
[CONDITIONS]

GOALS:
[GOALS]

ACTIONS & INTERVENTIONS:
[INTERVENTIONS]

MEDICATIONS:
[MEDICATIONS]

REVIEW DATE: [REVIEW_DATE]

Agreed by: Patient ☐  GP ☐
[GP_NAME] | [PRACTICE_NAME]`,
    },
    discharge_summary: {
        title: 'Hospital Discharge Summary',
        niceGuidelines: ['NG27 — Transition between services'],
        template: `DISCHARGE SUMMARY

Patient: [PATIENT_NAME]
NHS Number: [NHS_NUMBER]
Admitted: [ADMIT_DATE]
Discharged: [DISCHARGE_DATE]

DIAGNOSIS:
[DIAGNOSIS]

PROCEDURES:
[PROCEDURES]

DISCHARGE MEDICATIONS:
[MEDICATIONS]

FOLLOW-UP REQUIRED:
[FOLLOW_UP]

GP ACTIONS REQUIRED:
[GP_ACTIONS]`,
    },
};

// ═══ DOCUMENT AUTHOR CLASS ═══

export class ClinicalDocumentAuthor {
    // HARD SAFETY LOCK — Documents can NEVER be sent without GP approval
    private static readonly SAFETY_LOCK = 'HARD_LOCK — NO DOCUMENT SENT WITHOUT GP_APPROVED STATUS';

    getTemplates(): Record<DocumentType, { title: string; niceGuidelines: string[] }> {
        const result: Record<string, { title: string; niceGuidelines: string[] }> = {};
        for (const [key, val] of Object.entries(DOCUMENT_TEMPLATES)) {
            result[key] = { title: val.title, niceGuidelines: val.niceGuidelines };
        }
        return result as Record<DocumentType, { title: string; niceGuidelines: string[] }>;
    }

    draftDocument(type: DocumentType, patientNHSNumber: string, patientName: string, details: Record<string, string>): ClinicalDocument {
        const template = DOCUMENT_TEMPLATES[type];
        let content = template.template;

        // Fill in template variables
        content = content.replace('[PATIENT_NAME]', patientName);
        content = content.replace('[NHS_NUMBER]', patientNHSNumber);
        content = content.replace('[DATE]', new Date().toLocaleDateString('en-GB'));
        content = content.replace('[PRACTICE_NAME]', 'Riverside Medical Centre');
        content = content.replace('[ODS_CODE]', 'Y12345');
        content = content.replace('[GP_NAME]', 'Dr. Khan');
        content = content.replace('[GMC_NUMBER]', '7654321');

        for (const [key, value] of Object.entries(details)) {
            content = content.replace(`[${key.toUpperCase()}]`, value);
        }

        return {
            id: uuid(), type, patientNHSNumber, patientName,
            title: `${template.title} — ${patientName}`,
            content, status: 'AWAITING_GP_REVIEW' as DocumentStatus,
            gpApprovalRequired: true, templateUsed: type,
            snomedCodes: [], niceGuidelinesReferenced: template.niceGuidelines,
            createdAt: new Date().toISOString(), version: 1, previousVersions: [],
        };
    }

    approveDocument(doc: ClinicalDocument, gpName: string): ClinicalDocument {
        doc.status = 'GP_APPROVED';
        doc.approvedAt = new Date().toISOString();
        doc.reviewedBy = gpName;
        doc.reviewedAt = new Date().toISOString();
        return doc;
    }

    canSend(doc: ClinicalDocument): { allowed: boolean; reason: string } {
        if (doc.status !== 'GP_APPROVED') {
            return { allowed: false, reason: `${ClinicalDocumentAuthor.SAFETY_LOCK}. Current status: ${doc.status}` };
        }
        return { allowed: true, reason: 'Document approved by GP — cleared for sending' };
    }
}

// ═══ DEMO DATA ═══

export function getDemoDocuments(): ClinicalDocument[] {
    return [
        {
            id: 'doc-001', type: 'two_week_wait', patientNHSNumber: '193 482 9103', patientName: 'Sarah Jenkins',
            title: '2-Week Wait Cancer Referral — Sarah Jenkins',
            content: 'URGENT SUSPECTED CANCER REFERRAL\n2-WEEK WAIT PATHWAY\n\nPatient: Sarah Jenkins\nNHS Number: 193 482 9103\n\nSuspected Cancer Site: Dermatology\nQualifying Symptoms: Irregular pigmented lesion, left forearm, 6-week history of growth. Irregular borders, colour variation.\n\nURGENCY: 2-WEEK WAIT — NICE NG12 CRITERIA MET\n\nReferring GP: Dr. Khan\nDate: 27/02/2026',
            status: 'AWAITING_GP_REVIEW', gpApprovalRequired: true, templateUsed: 'two_week_wait',
            snomedCodes: [{ code: '255028007', display: 'Skin lesion' }],
            niceGuidelinesReferenced: ['NG12 — Suspected cancer recognition and referral'],
            createdAt: '2026-02-27T08:30:00Z', version: 1, previousVersions: [],
        },
        {
            id: 'doc-002', type: 'referral_letter', patientNHSNumber: '482 190 3847', patientName: 'Robert Thompson',
            title: 'GP Referral Letter — Robert Thompson',
            content: 'Dear Colleague,\n\nRE: Robert Thompson — NHS: 482 190 3847 — DOB: 22/11/1968\n\nI am writing to refer the above patient for urology assessment.\n\nPresenting Complaint: Recurrent UTIs (3 episodes in 6 months), haematuria on last occasion.\n\nI would be grateful for your assessment.\n\nYours faithfully,\nDr. Khan\nRiverside Medical Centre',
            status: 'GP_APPROVED', gpApprovalRequired: true, templateUsed: 'referral_letter',
            snomedCodes: [{ code: '68566005', display: 'Urinary tract infection' }],
            niceGuidelinesReferenced: ['CG27 — Referral Guidelines'],
            createdAt: '2026-02-26T14:00:00Z', reviewedAt: '2026-02-26T16:30:00Z', reviewedBy: 'Dr. Khan', approvedAt: '2026-02-26T16:30:00Z',
            version: 2, previousVersions: [{ version: 1, content: 'Draft version...', editedAt: '2026-02-26T14:00:00Z', editedBy: 'EMMA AI' }],
        },
        {
            id: 'doc-003', type: 'fit_note', patientNHSNumber: '847 293 1048', patientName: 'Fatima Begum',
            title: 'Fit Note (MED3) — Fatima Begum',
            content: 'STATEMENT OF FITNESS FOR WORK\n\nPatient: Fatima Begum\nNHS Number: 847 293 1048\n\nCondition: Acute lower back pain\nAdvice: Not fit for work for 2 weeks.\n\nDr. Khan | GMC: 7654321 | 27/02/2026',
            status: 'AWAITING_GP_REVIEW', gpApprovalRequired: true, templateUsed: 'fit_note',
            snomedCodes: [{ code: '279039007', display: 'Low back pain' }],
            niceGuidelinesReferenced: ['NG146 — Workplace Health'],
            createdAt: '2026-02-27T09:15:00Z', version: 1, previousVersions: [],
        },
    ];
}
