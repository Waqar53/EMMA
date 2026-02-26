// ═══════════════════════════════════════════════════════════════════════════════
// EMMA — SNOMED CT Clinical Coding Service
// Systematised Nomenclature of Medicine — Clinical Terms
// Used by NHS for standardised clinical coding across all interactions
// ═══════════════════════════════════════════════════════════════════════════════

export interface SNOMEDConcept {
    code: string;
    display: string;
    category: 'symptom' | 'condition' | 'finding' | 'procedure' | 'body_site' | 'qualifier';
    isRedFlag: boolean;
    urgencyWeight: number; // 0-10, higher = more urgent
    relatedCodes?: string[];
    triggerPhrases: string[];
}

// ═══ Comprehensive NHS primary care SNOMED CT symptom codeset ═══
export const SNOMED_SYMPTOM_LIBRARY: SNOMEDConcept[] = [
    // ── CARDIOVASCULAR (Red Flag capable) ──
    { code: '29857009', display: 'Chest pain', category: 'symptom', isRedFlag: true, urgencyWeight: 9, triggerPhrases: ['chest pain', 'chest tightness', 'pain in my chest', 'tight chest', 'heavy chest', 'crushing chest', 'chest hurts', 'pressure in chest'], relatedCodes: ['102556003', '267036007'] },
    { code: '102556003', display: 'Upper limb pain', category: 'symptom', isRedFlag: true, urgencyWeight: 8, triggerPhrases: ['arm pain', 'left arm pain', 'arm tingling', 'tingling in my arm', 'numb arm', 'arm feels heavy', 'pain radiating to arm'] },
    { code: '80313002', display: 'Palpitations', category: 'symptom', isRedFlag: false, urgencyWeight: 5, triggerPhrases: ['palpitations', 'heart racing', 'heart pounding', 'heart skipping', 'fluttering heart', 'irregular heartbeat', 'heart beating fast'] },

    // ── RESPIRATORY ──
    { code: '267036007', display: 'Dyspnea (Breathlessness)', category: 'symptom', isRedFlag: true, urgencyWeight: 9, triggerPhrases: ['breathless', 'short of breath', 'can\'t breathe', 'difficulty breathing', 'struggling to breathe', 'gasping', 'out of breath', 'hard to breathe', 'breathing difficulty'] },
    { code: '49727002', display: 'Cough', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['cough', 'coughing', 'persistent cough', 'dry cough', 'chesty cough', 'can\'t stop coughing', 'barking cough'] },
    { code: '35183004', display: 'Wheezing', category: 'symptom', isRedFlag: false, urgencyWeight: 5, triggerPhrases: ['wheezing', 'wheeze', 'whistling when breathing', 'chest wheezing'] },
    { code: '66857006', display: 'Haemoptysis (Coughing blood)', category: 'symptom', isRedFlag: true, urgencyWeight: 8, triggerPhrases: ['coughing blood', 'blood in cough', 'blood when I cough', 'spitting blood', 'blood in phlegm'] },

    // ── NEUROLOGICAL ──
    { code: '25064002', display: 'Headache', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['headache', 'head hurts', 'pain in my head', 'migraine', 'bad headache', 'splitting headache', 'throbbing headache'] },
    { code: '95415006', display: 'Thunderclap headache', category: 'symptom', isRedFlag: true, urgencyWeight: 10, triggerPhrases: ['worst headache', 'thunderclap headache', 'sudden severe headache', 'worst headache of my life', 'like being hit on the head'] },
    { code: '404640003', display: 'Dizziness', category: 'symptom', isRedFlag: false, urgencyWeight: 4, triggerPhrases: ['dizzy', 'dizziness', 'lightheaded', 'room spinning', 'vertigo', 'feeling faint', 'unsteady'] },
    { code: '230690007', display: 'Stroke symptoms', category: 'condition', isRedFlag: true, urgencyWeight: 10, triggerPhrases: ['stroke', 'face drooping', 'face droop', 'arm weakness', 'speech slurred', 'slurred speech', 'can\'t lift arm', 'one side weak', 'facial droop', 'numbness one side'] },
    { code: '91175000', display: 'Seizure', category: 'symptom', isRedFlag: true, urgencyWeight: 9, triggerPhrases: ['seizure', 'fit', 'convulsion', 'fitting', 'epileptic fit', 'shaking uncontrollably'] },
    { code: '271594007', display: 'Loss of consciousness', category: 'symptom', isRedFlag: true, urgencyWeight: 10, triggerPhrases: ['unconscious', 'fainted', 'blacked out', 'collapsed', 'passed out', 'lost consciousness', 'not responding'] },

    // ── GASTROINTESTINAL ──
    { code: '422587007', display: 'Nausea', category: 'symptom', isRedFlag: false, urgencyWeight: 2, triggerPhrases: ['nausea', 'feeling sick', 'nauseous', 'queasy', 'want to be sick'] },
    { code: '422400008', display: 'Vomiting', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['vomiting', 'being sick', 'throwing up', 'can\'t keep anything down', 'vomited'] },
    { code: '21522001', display: 'Abdominal pain', category: 'symptom', isRedFlag: false, urgencyWeight: 4, triggerPhrases: ['stomach pain', 'tummy pain', 'abdominal pain', 'belly ache', 'gut pain', 'pain in stomach', 'stomach ache', 'cramps'] },
    { code: '62315008', display: 'Diarrhoea', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['diarrhoea', 'diarrhea', 'loose stools', 'watery stools', 'can\'t stop going to the toilet', 'stomach bug'] },
    { code: '2901004', display: 'Melena (Blood in stool)', category: 'symptom', isRedFlag: true, urgencyWeight: 7, triggerPhrases: ['blood in stool', 'black stool', 'blood in poo', 'blood when going to toilet', 'rectal bleeding', 'bleeding from bottom'] },

    // ── UROLOGICAL ──
    { code: '49650001', display: 'Dysuria (Painful urination)', category: 'symptom', isRedFlag: false, urgencyWeight: 4, triggerPhrases: ['burning when I pee', 'painful urination', 'stinging when I wee', 'hurts to pee', 'burning sensation'] },
    { code: '162116003', display: 'Urinary frequency', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['going to the toilet a lot', 'frequent urination', 'peeing a lot', 'needing to wee all the time', 'urinary frequency'] },
    { code: '68566005', display: 'Urinary tract infection', category: 'condition', isRedFlag: false, urgencyWeight: 5, triggerPhrases: ['uti', 'water infection', 'urine infection', 'bladder infection', 'cystitis'] },

    // ── MUSCULOSKELETAL ──
    { code: '161891005', display: 'Back pain', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['back pain', 'sore back', 'lower back pain', 'upper back pain', 'back ache', 'spine pain'] },
    { code: '57676002', display: 'Joint pain', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['joint pain', 'knee pain', 'shoulder pain', 'hip pain', 'ankle pain', 'elbow pain', 'wrist pain', 'joints aching'] },

    // ── DERMATOLOGICAL ──
    { code: '271807003', display: 'Skin rash', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['rash', 'skin rash', 'spots', 'hives', 'itchy skin', 'red patches', 'bumps on skin'] },
    { code: '39579001', display: 'Anaphylaxis', category: 'condition', isRedFlag: true, urgencyWeight: 10, triggerPhrases: ['allergic reaction', 'anaphylaxis', 'throat closing', 'lips swelling', 'tongue swelling', 'severe allergy', 'face swelling', 'epipen'] },

    // ── MENTAL HEALTH ──
    { code: '48694002', display: 'Anxiety', category: 'symptom', isRedFlag: false, urgencyWeight: 4, triggerPhrases: ['anxiety', 'anxious', 'panic attack', 'panic', 'worried all the time', 'can\'t stop worrying', 'nervous', 'anxiety attack'] },
    { code: '35489007', display: 'Depression', category: 'condition', isRedFlag: false, urgencyWeight: 5, triggerPhrases: ['depression', 'depressed', 'low mood', 'feeling down', 'no energy', 'can\'t get out of bed', 'hopeless', 'lost interest'] },
    { code: '225444004', display: 'Suicidal ideation', category: 'finding', isRedFlag: true, urgencyWeight: 10, triggerPhrases: ['want to die', 'kill myself', 'suicidal', 'end it all', 'no point living', 'better off dead', 'thinking about ending', 'self-harm', 'harming myself', 'cutting myself', 'overdose'] },

    // ── ENT ──
    { code: '162397003', display: 'Sore throat', category: 'symptom', isRedFlag: false, urgencyWeight: 2, triggerPhrases: ['sore throat', 'throat pain', 'painful throat', 'throat hurts', 'difficulty swallowing', 'tonsillitis'] },
    { code: '16001004', display: 'Ear pain', category: 'symptom', isRedFlag: false, urgencyWeight: 3, triggerPhrases: ['ear pain', 'earache', 'ear hurts', 'ear infection', 'blocked ear', 'ear ache'] },

    // ── GENERAL ──
    { code: '386661006', display: 'Fever', category: 'symptom', isRedFlag: false, urgencyWeight: 4, triggerPhrases: ['fever', 'temperature', 'high temperature', 'running a temperature', 'hot', 'burning up', 'chills', 'shivering'] },
    { code: '84229001', display: 'Fatigue', category: 'symptom', isRedFlag: false, urgencyWeight: 2, triggerPhrases: ['tired', 'exhausted', 'fatigue', 'no energy', 'constantly tired', 'shattered', 'knackered', 'worn out'] },
    { code: '248062006', display: 'Weight loss', category: 'symptom', isRedFlag: true, urgencyWeight: 6, triggerPhrases: ['losing weight', 'weight loss', 'lost weight without trying', 'unexplained weight loss', 'clothes fitting loose'] },
    { code: '299991000000101', display: 'Lump', category: 'finding', isRedFlag: true, urgencyWeight: 7, triggerPhrases: ['lump', 'swelling', 'growth', 'mass', 'bump', 'found a lump', 'hard lump'] },

    // ── SAFEGUARDING ──
    { code: '397940009', display: 'Domestic violence concern', category: 'finding', isRedFlag: true, urgencyWeight: 9, triggerPhrases: ['being hit', 'partner hurts me', 'domestic violence', 'domestic abuse', 'someone is hurting', 'afraid at home', 'abusive partner', 'beaten'] },
    { code: '95930005', display: 'Child at risk', category: 'finding', isRedFlag: true, urgencyWeight: 10, triggerPhrases: ['child at risk', 'child being hurt', 'worried about a child', 'child neglect', 'child abuse', 'child is in danger'] },

    // ── BLEEDING ──
    { code: '131148009', display: 'Haemorrhage (Bleeding)', category: 'symptom', isRedFlag: true, urgencyWeight: 8, triggerPhrases: ['heavy bleeding', 'bleeding a lot', 'can\'t stop bleeding', 'won\'t stop bleeding', 'bleeding heavily', 'blood everywhere', 'gushing blood'] },
];

/**
 * Extract SNOMED codes from patient message text.
 * Uses phrase matching against the clinical concept library.
 */
export function extractSNOMEDCodes(text: string): SNOMEDConcept[] {
    const lower = text.toLowerCase();
    const matched: SNOMEDConcept[] = [];
    const seenCodes = new Set<string>();

    for (const concept of SNOMED_SYMPTOM_LIBRARY) {
        for (const phrase of concept.triggerPhrases) {
            if (lower.includes(phrase) && !seenCodes.has(concept.code)) {
                matched.push(concept);
                seenCodes.add(concept.code);
                break;
            }
        }
    }

    // Sort by urgency weight (highest first)
    return matched.sort((a, b) => b.urgencyWeight - a.urgencyWeight);
}

/**
 * Get red flag concepts from extracted codes.
 */
export function getRedFlagConcepts(concepts: SNOMEDConcept[]): SNOMEDConcept[] {
    return concepts.filter(c => c.isRedFlag);
}

/**
 * Calculate overall urgency from matched concepts.
 */
export function calculateUrgencyFromCodes(concepts: SNOMEDConcept[]): 'EMERGENCY' | 'URGENT' | 'SOON' | 'ROUTINE' {
    if (concepts.length === 0) return 'ROUTINE';

    const maxWeight = Math.max(...concepts.map(c => c.urgencyWeight));

    if (maxWeight >= 9) return 'EMERGENCY';
    if (maxWeight >= 7) return 'URGENT';
    if (maxWeight >= 4) return 'SOON';
    return 'ROUTINE';
}

/**
 * Search for a specific SNOMED concept by code.
 */
export function lookupSNOMED(code: string): SNOMEDConcept | undefined {
    return SNOMED_SYMPTOM_LIBRARY.find(c => c.code === code);
}

/**
 * Format SNOMED codes for display in transcripts.
 */
export function formatSNOMEDForDisplay(concepts: SNOMEDConcept[]): { code: string; display: string; isRedFlag: boolean }[] {
    return concepts.map(c => ({
        code: c.code,
        display: c.display,
        isRedFlag: c.isRedFlag,
    }));
}
