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

// ═══════════════════════════════════════════════════════════
// SUPERPOWER ENGINE TYPES
// ═══════════════════════════════════════════════════════════

// SP1 — Autonomous Multi-Step Execution
export type ToolStatus = 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'patient' | 'appointment' | 'clinical' | 'communication' | 'admin' | 'document';
  parameters: { name: string; type: string; required: boolean; description: string }[];
  requiresPatientVerification: boolean;
}

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  toolName: string;
  parameters: Record<string, unknown>;
  status: ToolStatus;
  result?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  reasoning: string;
}

export interface ExecutionTrace {
  id: string;
  callId: string;
  patientNHSNumber?: string;
  triggerMessage: string;
  plan: string[];
  steps: ExecutionStep[];
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  totalSteps: number;
  completedSteps: number;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
}

// SP2 — Computer & Browser Use
export type BrowserActionType = 'navigate' | 'click' | 'type' | 'screenshot' | 'extract' | 'submit_form' | 'wait' | 'scroll' | 'select';

export interface BrowserAction {
  id: string;
  actionType: BrowserActionType;
  target?: string;
  value?: string;
  screenshotRef?: string;
  reasoning: string;
  timestamp: string;
  success: boolean;
}

export interface BrowserSession {
  id: string;
  taskDescription: string;
  targetUrl: string;
  domain: string;
  status: 'active' | 'completed' | 'failed' | 'timeout' | 'blocked';
  actions: BrowserAction[];
  startedAt: string;
  completedAt?: string;
  securityFlags: string[];
  auditTrail: string[];
}

// SP3 — Long-Horizon Memory
export type MemoryLayer = 'working' | 'episodic' | 'semantic' | 'procedural';
export type FactCategory = 'preference' | 'medical_history' | 'social' | 'behavioural' | 'emotional' | 'administrative';

export interface MemoryFact {
  id: string;
  patientNHSNumber: string;
  layer: MemoryLayer;
  category: FactCategory;
  fact: string;
  confidence: number;
  source: string;
  extractedAt: string;
  lastAccessedAt: string;
  accessCount: number;
  expiresAt?: string;
}

export interface PatientMemory {
  patientNHSNumber: string;
  patientName: string;
  facts: MemoryFact[];
  workingContext: string[];
  totalInteractions: number;
  firstInteractionAt: string;
  lastInteractionAt: string;
}

// SP4 — Self-Improvement Engine
export type PromptStatus = 'draft' | 'testing' | 'deployed' | 'rolled_back' | 'archived';

export interface PromptVersion {
  id: string;
  version: string;
  agentType: AgentType;
  promptText: string;
  status: PromptStatus;
  performanceScore: number;
  safetyScore: number;
  resolutionRate: number;
  patientSatisfaction: number;
  testCasesPassed: number;
  testCasesTotal: number;
  redFlagCatchRate: number;
  createdAt: string;
  deployedAt?: string;
  rolledBackAt?: string;
  rolledBackReason?: string;
}

export interface ABTestResult {
  id: string;
  controlVersionId: string;
  experimentVersionId: string;
  metric: string;
  controlValue: number;
  experimentValue: number;
  improvement: number;
  statisticalSignificance: number;
  sampleSize: number;
  startedAt: string;
  completedAt?: string;
  decision: 'deploy' | 'rollback' | 'continue' | 'inconclusive';
}

// SP5 — Proactive Patient Outreach
export type OutreachType = 'annual_review' | 'medication_expiry' | 'health_check' | 'post_discharge' | 'cervical_screening' | 'vaccination' | 'follow_up';
export type OutreachStatus = 'identified' | 'queued' | 'gp_approved' | 'sent' | 'delivered' | 'responded' | 'booked' | 'opted_out' | 'failed';

export interface OutreachCampaign {
  id: string;
  type: OutreachType;
  name: string;
  description: string;
  targetCount: number;
  sentCount: number;
  respondedCount: number;
  bookedCount: number;
  createdAt: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
}

export interface OutreachContact {
  id: string;
  campaignId: string;
  patientNHSNumber: string;
  patientName: string;
  outreachType: OutreachType;
  reason: string;
  status: OutreachStatus;
  priority: number;
  messageContent?: string;
  sentAt?: string;
  respondedAt?: string;
  outcome?: string;
}

// SP6 — Autonomous Schedule Management
export interface DNAPrediction {
  patientNHSNumber: string;
  patientName: string;
  slotId: string;
  slotTime: string;
  dnaProbability: number;
  riskFactors: { factor: string; weight: number }[];
  recommendation: 'book' | 'double_book' | 'confirm_24h' | 'confirm_2h' | 'avoid';
}

export interface ScheduleOptimization {
  id: string;
  date: string;
  totalSlots: number;
  filledSlots: number;
  optimizedSlots: number;
  predictedDNAs: number;
  gapsFilled: number;
  avgFillTimeMinutes: number;
  waitlistContacted: number;
  optimizationScore: number;
  actions: { type: string; description: string; timestamp: string; result: string }[];
}

// SP7 — Clinical Document Authoring
export type DocumentType = 'referral_letter' | 'fit_note' | 'two_week_wait' | 'insurance_report' | 'care_plan' | 'discharge_summary';
export type DocumentStatus = 'DRAFTING' | 'AWAITING_GP_REVIEW' | 'GP_APPROVED' | 'SENT' | 'REJECTED' | 'ARCHIVED';

export interface ClinicalDocument {
  id: string;
  type: DocumentType;
  patientNHSNumber: string;
  patientName: string;
  title: string;
  content: string;
  status: DocumentStatus;
  gpApprovalRequired: true;
  templateUsed: string;
  snomedCodes: { code: string; display: string }[];
  niceGuidelinesReferenced: string[];
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  version: number;
  previousVersions: { version: number; content: string; editedAt: string; editedBy: string }[];
}

// SP8 — Health Data Monitoring
export type HealthDataSource = 'fhir' | 'wearable' | 'lab_result' | 'nhs_111' | 'nhs_999' | 'discharge' | 'gp_entry' | 'patient_reported';
export type AlertTier = 'CRITICAL' | 'URGENT' | 'MONITOR' | 'INFO';

export interface HealthReading {
  id: string;
  patientNHSNumber: string;
  source: HealthDataSource;
  type: string;
  value: number;
  unit: string;
  normalRangeLow?: number;
  normalRangeHigh?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface HealthAlert {
  id: string;
  patientNHSNumber: string;
  patientName: string;
  tier: AlertTier;
  type: string;
  description: string;
  readings: HealthReading[];
  context: string;
  recommendedAction: string;
  autoResponseTriggered: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  createdAt: string;
}

// Master Graph
export type GraphNodeStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'error';

export interface GraphNode {
  id: string;
  name: string;
  engine: string;
  status: GraphNodeStatus;
  input?: unknown;
  output?: unknown;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface MasterGraphState {
  id: string;
  callId: string;
  nodes: GraphNode[];
  currentNode: string;
  checkpointData: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
}

// Command Centre
export interface CommandCentreData {
  agentExecutor: { activeTraces: ExecutionTrace[]; totalExecutions: number; avgStepsPerTask: number; successRate: number };
  browserAgent: { activeSessions: BrowserSession[]; totalSessions: number; successRate: number };
  memory: { totalPatients: number; totalFacts: number; factsByLayer: Record<MemoryLayer, number>; recentFacts: MemoryFact[] };
  selfImprove: { currentVersions: PromptVersion[]; activeTests: ABTestResult[]; totalImprovements: number; safetyGateStatus: 'passing' | 'failing' };
  outreach: { activeCampaigns: OutreachCampaign[]; todayContacted: number; todayResponded: number; todayBooked: number };
  schedule: { todayOptimization: ScheduleOptimization; predictedDNAs: DNAPrediction[]; gapsFilled: number };
  documents: { pendingReview: ClinicalDocument[]; todayDrafted: number; todayApproved: number };
  healthMonitor: { activeAlerts: HealthAlert[]; criticalCount: number; urgentCount: number; monitorCount: number; recentReadings: HealthReading[] };
  masterGraph: { activeGraphs: MasterGraphState[]; totalProcessed: number; avgProcessingMs: number };
}
