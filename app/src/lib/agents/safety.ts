// ═══════════════════════════════════════════════════════════════════════════════
// EMMA — Clinical Safety Engine
// Implements DCB0129 Clinical Risk Management requirements
// Red Flag detection, Safety Netting, Clinical Protocol Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { UrgencyLevel, SymptomRecord } from '../types';
import { SNOMEDConcept, extractSNOMEDCodes, getRedFlagConcepts, calculateUrgencyFromCodes } from './snomed';

// ═══ RED FLAG PROTOCOLS ═══
// From AGENT_INSTRUCTIONS §11 — Non-negotiable, zero-tolerance escalation
export interface RedFlagProtocol {
    id: string;
    name: string;
    category: 'cardiac' | 'respiratory' | 'neurological' | 'mental_health' | 'safeguarding' | 'haemorrhage' | 'allergic' | 'oncology';
    triggerPhrases: string[];
    snomedCodes: string[];
    immediateAction: string;
    emmaScript: string;
    urgency: 'EMERGENCY';
    escalationTarget: '999' | 'duty_gp' | 'safeguarding_lead' | 'mental_health_crisis';
    safetyNetting: string;
}

export const RED_FLAG_PROTOCOLS: RedFlagProtocol[] = [
    {
        id: 'rf-cardiac',
        name: 'Cardiac Emergency',
        category: 'cardiac',
        triggerPhrases: ['chest pain', 'chest tightness', 'crushing pain', 'heart attack', 'heavy chest', 'pressure in chest', 'pain radiating to arm', 'pain in jaw', 'sweating with chest pain'],
        snomedCodes: ['29857009', '102556003'],
        immediateAction: 'Call 999 immediately',
        urgency: 'EMERGENCY',
        escalationTarget: '999',
        emmaScript: `I'm concerned about what you're describing. Chest pain needs urgent medical attention. I would strongly recommend you call 999 right now, or if someone is with you, ask them to call. While you wait:
- Try to stay calm and sit upright
- If you have aspirin available and are not allergic, chew one 300mg tablet
- Do not exert yourself
- Keep your phone nearby

Would you like me to stay on the line while you call 999?`,
        safetyNetting: 'If your chest pain gets worse, spreads to your arm or jaw, or you feel faint, call 999 immediately. Do not wait.',
    },
    {
        id: 'rf-respiratory',
        name: 'Acute Respiratory Emergency',
        category: 'respiratory',
        triggerPhrases: ['can\'t breathe', 'difficulty breathing', 'struggling to breathe', 'gasping', 'choking', 'lips turning blue', 'severe asthma attack', 'not getting enough air'],
        snomedCodes: ['267036007'],
        immediateAction: 'Call 999 immediately',
        urgency: 'EMERGENCY',
        escalationTarget: '999',
        emmaScript: `I can hear you're having difficulty breathing, and I want to make sure you're safe. This needs urgent medical attention. Please call 999 now, or ask someone nearby to call for you.

While you wait:
- Try to sit upright — don't lie flat
- If you have a reliever inhaler, use it now
- Try to stay calm and take slow breaths
- If you can, open a window for fresh air

Do you have someone with you who can help?`,
        safetyNetting: 'If your breathing gets any worse, your lips or fingertips turn blue, or you feel confused or drowsy, call 999 immediately.',
    },
    {
        id: 'rf-stroke',
        name: 'Stroke (FAST)',
        category: 'neurological',
        triggerPhrases: ['stroke', 'face drooping', 'face droop', 'arm weakness', 'speech slurred', 'slurred speech', 'can\'t lift arm', 'one side weak', 'facial droop', 'numbness one side', 'sudden confusion'],
        snomedCodes: ['230690007'],
        immediateAction: 'Call 999 — time-critical',
        urgency: 'EMERGENCY',
        escalationTarget: '999',
        emmaScript: `What you're describing could be signs of a stroke, and time is absolutely critical. Please call 999 immediately.

Remember FAST:
- Face: Is one side drooping?
- Arms: Can you raise both arms?
- Speech: Is speech slurred or garbled?
- Time: Call 999 now — every minute matters

Do NOT eat or drink anything. Try to note what time the symptoms started — the ambulance team will ask.

Would you like me to stay on the line?`,
        safetyNetting: 'Time is critical with stroke symptoms. Call 999 immediately — do not wait to see if symptoms improve.',
    },
    {
        id: 'rf-suicidal',
        name: 'Suicidal Ideation / Mental Health Crisis',
        category: 'mental_health',
        triggerPhrases: ['want to die', 'kill myself', 'suicidal', 'end it all', 'no point living', 'better off dead', 'thinking about ending', 'self-harm', 'harming myself', 'cutting myself', 'overdose', 'taken too many pills'],
        snomedCodes: ['225444004'],
        immediateAction: 'Immediate mental health crisis support',
        urgency: 'EMERGENCY',
        escalationTarget: 'mental_health_crisis',
        emmaScript: `I'm really glad you told me that. I want you to know that I hear you, and there is help available right now.

You're not alone in feeling this way. Please contact one of these services who can help you:
- **Samaritans**: Call 116 123 (free, 24/7) — they'll listen without judgement
- **Crisis text line**: Text SHOUT to 85258
- **NHS 111**: Press option 2 for mental health crisis

If you're in immediate danger, please call 999.

Would you like me to arrange an urgent callback from our duty doctor? They can talk to you today.`,
        safetyNetting: 'Please reach out to the Samaritans on 116 123 any time you need to talk. If you feel unsafe at any point, call 999. You matter, and there is support for you.',
    },
    {
        id: 'rf-safeguarding',
        name: 'Safeguarding Concern',
        category: 'safeguarding',
        triggerPhrases: ['being hit', 'partner hurts me', 'domestic violence', 'domestic abuse', 'someone is hurting', 'afraid at home', 'abusive partner', 'child at risk', 'child being hurt', 'worried about a child', 'child neglect', 'elder abuse', 'being controlled'],
        snomedCodes: ['397940009', '95930005'],
        immediateAction: 'Immediate escalation to safeguarding lead',
        urgency: 'EMERGENCY',
        escalationTarget: 'safeguarding_lead',
        emmaScript: `I'm very sorry to hear what you're going through, and I want to make sure you're safe. What you're describing is serious and there is help available.

If you're in immediate danger, please call 999.

Otherwise, I'd like to put you through to someone at the practice who can help confidentially:
- Our safeguarding team can speak with you privately
- Everything you tell them is treated with the strictest confidence
- They can connect you with specialist support services

The National Domestic Abuse Helpline is 0808 2000 247 (free, 24/7).

Would you like me to connect you with our safeguarding lead now?`,
        safetyNetting: 'If you are ever in immediate danger, call 999. You can also call the National Domestic Abuse Helpline on 0808 2000 247 — it\'s free and available 24/7.',
    },
    {
        id: 'rf-haemorrhage',
        name: 'Uncontrolled Bleeding',
        category: 'haemorrhage',
        triggerPhrases: ['heavy bleeding', 'bleeding a lot', 'can\'t stop bleeding', 'won\'t stop bleeding', 'bleeding heavily', 'blood everywhere', 'gushing blood'],
        snomedCodes: ['131148009'],
        immediateAction: 'Call 999 immediately',
        urgency: 'EMERGENCY',
        escalationTarget: '999',
        emmaScript: `That sounds serious and needs immediate attention. Please call 999 right now.

While waiting for the ambulance:
- Apply firm, direct pressure to the wound with a clean cloth
- Keep the pressure on — don't remove the cloth
- If possible, keep the injured area raised above the heart
- Stay as calm as you can

Is there someone with you who can help apply pressure?`,
        safetyNetting: 'If bleeding won\'t stop with firm pressure, or the person becomes pale, cold, or drowsy, call 999 immediately.',
    },
    {
        id: 'rf-anaphylaxis',
        name: 'Anaphylactic Reaction',
        category: 'allergic',
        triggerPhrases: ['allergic reaction', 'anaphylaxis', 'throat closing', 'lips swelling', 'tongue swelling', 'severe allergy', 'face swelling', 'epipen', 'can\'t swallow'],
        snomedCodes: ['39579001'],
        immediateAction: 'Call 999 — use EpiPen if available',
        urgency: 'EMERGENCY',
        escalationTarget: '999',
        emmaScript: `This sounds like it could be a severe allergic reaction. Please call 999 immediately.

If you have an adrenaline auto-injector (EpiPen):
- Use it now — inject into your outer thigh
- You can use it through clothing
- Lie down with your legs raised (unless you're having trouble breathing, then sit up)
- Call 999 even if symptoms improve after the EpiPen

Do you have an EpiPen available?`,
        safetyNetting: 'Severe allergic reactions can worsen rapidly. If you develop any swelling, breathing difficulty, or feel faint, call 999 immediately.',
    },
    {
        id: 'rf-seizure',
        name: 'Active Seizure',
        category: 'neurological',
        triggerPhrases: ['seizure', 'fit', 'convulsion', 'fitting', 'shaking uncontrollably', 'epileptic fit'],
        snomedCodes: ['91175000'],
        immediateAction: 'Call 999 if first seizure or lasting >5 minutes',
        urgency: 'EMERGENCY',
        escalationTarget: '999',
        emmaScript: `If someone is having a seizure right now, please call 999 immediately if:
- This is their first seizure
- The seizure lasts more than 5 minutes
- They don't regain consciousness

While you wait:
- Clear the area of anything they could hurt themselves on
- Do NOT put anything in their mouth
- Do NOT try to restrain them
- Place them on their side once the seizure stops
- Time the seizure if possible

Is the person conscious and breathing?`,
        safetyNetting: 'If another seizure occurs, or the person does not regain consciousness within 5 minutes, call 999 immediately.',
    },
    {
        id: 'rf-lump',
        name: 'Unexplained Lump / Weight Loss',
        category: 'oncology',
        triggerPhrases: ['found a lump', 'unexplained weight loss', 'lump that won\'t go away', 'growing lump'],
        snomedCodes: ['299991000000101', '248062006'],
        immediateAction: 'Urgent GP appointment within 2 weeks',
        urgency: 'EMERGENCY',
        escalationTarget: 'duty_gp',
        emmaScript: `Thank you for telling me about that. Any new, unexplained lump should be checked by a doctor. I'd like to arrange an urgent appointment for you so a GP can examine it properly.

This is standard procedure — most lumps turn out to be nothing serious, but it's always important to get them checked.

I can book you in for an urgent appointment. Would tomorrow work for you?`,
        safetyNetting: 'If the lump changes rapidly — grows quickly, becomes painful, or you notice other symptoms like night sweats or unexplained weight loss — please call us back urgently.',
    },
];

// ═══ SAFETY NETTING ENGINE ═══
// Mandatory safety advice at end of every clinical interaction
export interface SafetyNet {
    condition: string;
    timeframe: string;
    redFlagsToWatch: string[];
    whenToReturn: string;
    emergencyAction: string;
}

export const SAFETY_NETS: Record<string, SafetyNet> = {
    general_clinical: {
        condition: 'General clinical advice',
        timeframe: '48 hours',
        redFlagsToWatch: ['Symptoms getting worse', 'New symptoms developing', 'High temperature', 'Unable to eat or drink'],
        whenToReturn: 'If your symptoms haven\'t improved within 48 hours, or if they get worse at any point',
        emergencyAction: 'If you develop difficulty breathing, severe pain, or feel very unwell, call 999 or go to A&E',
    },
    uti: {
        condition: 'Suspected UTI',
        timeframe: '48 hours',
        redFlagsToWatch: ['Fever or high temperature', 'Blood in urine', 'Pain in lower back or side', 'Vomiting', 'Feeling confused or drowsy'],
        whenToReturn: 'If symptoms haven\'t improved within 48 hours with treatment',
        emergencyAction: 'If you develop a high fever, severe back pain, or vomiting, call us urgently or go to A&E',
    },
    respiratory: {
        condition: 'Respiratory symptoms',
        timeframe: '72 hours',
        redFlagsToWatch: ['Breathing getting worse', 'Coughing up blood', 'Chest pain', 'High fever', 'Confusion'],
        whenToReturn: 'If a cough lasts more than 3 weeks, or if you\'re coughing up blood',
        emergencyAction: 'If you develop severe breathing difficulty or chest pain, call 999 immediately',
    },
    headache: {
        condition: 'Headache',
        timeframe: '1 week',
        redFlagsToWatch: ['Sudden severe headache', 'Headache with stiff neck', 'Headache with rash', 'Vision changes', 'Confusion', 'Weakness on one side'],
        whenToReturn: 'If headaches persist for more than a week, or become more severe',
        emergencyAction: 'If you get a sudden, severe headache — the worst you\'ve ever had — call 999 immediately',
    },
    mental_health: {
        condition: 'Mental health concerns',
        timeframe: 'Ongoing',
        redFlagsToWatch: ['Feeling unsafe', 'Thoughts of self-harm', 'Unable to cope', 'Not sleeping at all'],
        whenToReturn: 'Any time you need to talk — we\'re here for you',
        emergencyAction: 'If you feel unsafe, call Samaritans 116 123, text SHOUT to 85258, or call 999',
    },
    abdominal: {
        condition: 'Abdominal symptoms',
        timeframe: '24-48 hours',
        redFlagsToWatch: ['Severe pain that gets worse', 'Blood in vomit or stool', 'Unable to keep fluids down', 'Abdominal swelling', 'Fever'],
        whenToReturn: 'If symptoms haven\'t improved within 48 hours, or if pain becomes severe',
        emergencyAction: 'If you develop sudden severe abdominal pain, bloody vomit, or a rigid abdomen, call 999',
    },
    musculoskeletal: {
        condition: 'Pain / Musculoskeletal',
        timeframe: '1-2 weeks',
        redFlagsToWatch: ['Pain waking you at night', 'Inability to bear weight', 'Numbness or tingling', 'Loss of bladder/bowel control'],
        whenToReturn: 'If pain hasn\'t improved with rest and over-the-counter painkillers within 2 weeks',
        emergencyAction: 'If you suddenly lose feeling in your legs, or lose control of your bladder or bowels, call 999 immediately',
    },
    skin: {
        condition: 'Skin symptoms',
        timeframe: '1 week',
        redFlagsToWatch: ['Rash spreading rapidly', 'Rash with fever', 'Rash that doesn\'t blanch (glass test)', 'Blisters', 'Swelling of face/tongue'],
        whenToReturn: 'If the rash spreads, becomes painful, or doesn\'t improve within a week',
        emergencyAction: 'If you develop a rash that doesn\'t fade when you press a glass to it, especially with fever, call 999 — this could be meningitis',
    },
};

/**
 * Determine the appropriate safety net based on detected symptoms.
 */
export function getSafetyNet(symptoms: SNOMEDConcept[]): SafetyNet {
    // Check categories to find most appropriate safety net
    for (const symptom of symptoms) {
        if (symptom.category === 'symptom' || symptom.category === 'condition') {
            // Map SNOMED categories to safety nets
            if (['49650001', '162116003', '68566005'].includes(symptom.code)) return SAFETY_NETS.uti;
            if (['267036007', '49727002', '35183004', '66857006'].includes(symptom.code)) return SAFETY_NETS.respiratory;
            if (['25064002', '95415006', '404640003'].includes(symptom.code)) return SAFETY_NETS.headache;
            if (['48694002', '35489007', '225444004'].includes(symptom.code)) return SAFETY_NETS.mental_health;
            if (['21522001', '422587007', '422400008', '62315008', '2901004'].includes(symptom.code)) return SAFETY_NETS.abdominal;
            if (['161891005', '57676002'].includes(symptom.code)) return SAFETY_NETS.musculoskeletal;
            if (['271807003'].includes(symptom.code)) return SAFETY_NETS.skin;
        }
    }
    return SAFETY_NETS.general_clinical;
}

/**
 * Generate full safety netting text for the patient.
 */
export function generateSafetyNettingText(symptoms: SNOMEDConcept[]): string {
    const safetyNet = getSafetyNet(symptoms);

    const redFlagsList = safetyNet.redFlagsToWatch.map(rf => `• ${rf}`).join('\n');

    return `Before I let you go, I want to make sure you know what to watch out for.

Please call us back or seek urgent help if you notice:
${redFlagsList}

${safetyNet.whenToReturn}, please call us back.

${safetyNet.emergencyAction}.

Is there anything else I can help you with?`;
}

/**
 * Check if a message triggers any red flag protocol.
 */
export function checkRedFlags(text: string): RedFlagProtocol[] {
    const lower = text.toLowerCase();
    const triggered: RedFlagProtocol[] = [];

    for (const protocol of RED_FLAG_PROTOCOLS) {
        for (const phrase of protocol.triggerPhrases) {
            if (lower.includes(phrase)) {
                triggered.push(protocol);
                break;
            }
        }
    }

    return triggered;
}

/**
 * Full clinical assessment: extract symptoms, check red flags, classify urgency, generate safety netting.
 */
export interface ClinicalAssessment {
    snomedConcepts: SNOMEDConcept[];
    redFlagProtocols: RedFlagProtocol[];
    urgency: UrgencyLevel;
    safetyNetting: string;
    symptoms: SymptomRecord[];
    requiresImmediateAction: boolean;
    immediateActionScript?: string;
}

export function performClinicalAssessment(text: string): ClinicalAssessment {
    const snomedConcepts = extractSNOMEDCodes(text);
    const redFlagProtocols = checkRedFlags(text);
    const urgency = redFlagProtocols.length > 0 ? 'EMERGENCY' : calculateUrgencyFromCodes(snomedConcepts);
    const safetyNetting = generateSafetyNettingText(snomedConcepts);

    const symptoms: SymptomRecord[] = snomedConcepts.map(c => ({
        description: c.display,
        snomedCode: c.code,
        snomedDisplay: c.display,
        isRedFlag: c.isRedFlag,
        severity: c.urgencyWeight,
    }));

    return {
        snomedConcepts,
        redFlagProtocols,
        urgency,
        safetyNetting,
        symptoms,
        requiresImmediateAction: redFlagProtocols.length > 0,
        immediateActionScript: redFlagProtocols.length > 0 ? redFlagProtocols[0].emmaScript : undefined,
    };
}
