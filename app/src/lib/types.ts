export type UrgencyLevel = 'EMERGENCY' | 'URGENT' | 'SOON' | 'ROUTINE';
export type ResolutionType = 'automated' | 'human_handoff' | 'emergency' | 'pending';
export type AgentType = 'orchestrator' | 'triage' | 'appointment' | 'prescription' | 'test_results' | 'admin' | 'escalation';
export type IntentType = 'APPOINTMENT' | 'PRESCRIPTION' | 'TEST_RESULTS' | 'CLINICAL_SYMPTOMS' | 'ADMIN' | 'EMERGENCY' | 'TRANSFER' | 'UNKNOWN';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  agent?: AgentType;
  intent?: IntentType;
  urgency?: UrgencyLevel;
  redFlags?: string[];
  safetyNetting?: string;
  snomedCodes?: { code: string; display: string }[];
  actionsPerformed?: ActionPerformed[];
  patientVerified?: boolean;
}

export interface ActionPerformed {
  type: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface ConversationState {
  callId: string;
  practiceId: string;
  patientVerified: boolean;
  patientName?: string;
  patientDOB?: string;
  patientNHSNumber?: string;
  messages: Message[];
  currentIntent?: IntentType;
  intentConfidence: number;
  currentAgent: AgentType;
  symptoms: SymptomRecord[];
  urgencyLevel?: UrgencyLevel;
  redFlags: string[];
  safetyNetsApplied: string[];
  actionsTaken: ActionPerformed[];
  escalationRequired: boolean;
  humanHandoffReason?: string;
  resolved: boolean;
}

export interface SymptomRecord {
  description: string;
  snomedCode?: string;
  snomedDisplay?: string;
  severity?: number;
  duration?: string;
  isRedFlag: boolean;
}

export interface PracticeConfig {
  id: string;
  name: string;
  odsCode: string;
  address: string;
  phone: string;
  location: string;
  clinicalSystem: 'emis' | 'systmone';
  hours: Record<string, string>;
  oohNumber: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  prescriptionTurnaroundDays: number;
  fitNoteTurnaroundDays: number;
  clinicianTypes: string[];
  safeguardingLead: string;
  customFAQs: FAQ[];
  testResultDeliveryRules: Record<string, string>;
  triageProtocols: Record<string, string>;
}

export interface FAQ { question: string; answer: string; }

export interface AppointmentSlot {
  id: string;
  date: string;
  time: string;
  endTime: string;
  clinicianName: string;
  clinicianType: string;
  location: string;
  available: boolean;
  slotType: string;
}

export interface PrescriptionRequest {
  id: string;
  patientName: string;
  patientNHSNumber: string;
  medications: MedicationItem[];
  status: 'pending' | 'approved' | 'rejected' | 'collected';
  requestedAt: string;
  pharmacy: string;
}

export interface MedicationItem {
  name: string;
  dose: string;
  frequency: string;
  snomedCode?: string;
  onRepeatList: boolean;
}

export interface TestResult {
  id: string;
  patientNHSNumber: string;
  testType: string;
  date: string;
  status: 'normal' | 'abnormal' | 'pending' | 'review_required';
  deliveryTier: 'emma_can_deliver' | 'gp_callback' | 'gp_callback_only';
  summary?: string;
  reviewedBy?: string;
}

export interface CallRecord {
  id: string;
  practiceId: string;
  patientName?: string;
  patientNHSNumber?: string;
  callerPhone?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  primaryIntent?: IntentType;
  urgencyLevel?: UrgencyLevel;
  resolutionType: ResolutionType;
  agentUsed: AgentType;
  actionsTaken: ActionPerformed[];
  transcript: Message[];
  satisfaction?: number;
  snomedCodes?: { code: string; display: string }[];
  redFlagsDetected?: string[];
  safetyNettingApplied?: string;
}

export interface TriageRecordData {
  id: string;
  callId: string;
  patientName: string;
  symptoms: SymptomRecord[];
  redFlagsDetected: string[];
  urgencyClassification: UrgencyLevel;
  safetyNettingApplied: string;
  disposition: string;
  clinicalProtocolUsed?: string;
  safetyCheckPassed: boolean;
  humanReviewRequired: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  callId?: string;
  practiceId: string;
  patientNHSNumber?: string;
  agentName?: AgentType;
  action: string;
  details?: Record<string, unknown>;
  result: 'SUCCESS' | 'FAILURE' | 'ESCALATED';
}

export interface PatientRecord {
  id: string;
  nhsNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  postcode: string;
  phone: string;
  registeredPractice: string;
  medications: MedicationItem[];
  allergies: string[];
}

export interface DashboardStats {
  activeCalls: number;
  callsToday: number;
  avgWaitTimeSeconds: number;
  resolutionRate: number;
  safetyNetRate: number;
  callsThisWeek: number[];
  resolutionByType: Record<string, number>;
  urgencyDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
  recentCalls: CallRecord[];
  redFlagsToday: number;
  humanHandoffs: number;
  avgCallDurationSeconds: number;
  patientSatisfaction: number;
  capacitySavedHours: number;
  weeklyCapacitySaved: number[];
  sentimentTrend: number[];
}

export interface AgentResponse {
  message: string;
  agent: AgentType;
  metadata: MessageMetadata;
  state: ConversationState;
}
