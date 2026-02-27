-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "odsCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "clinicalSystem" TEXT NOT NULL DEFAULT 'emis',
    "hours" TEXT NOT NULL,
    "oohNumber" TEXT NOT NULL DEFAULT '111',
    "pharmacyName" TEXT NOT NULL DEFAULT '',
    "pharmacyPhone" TEXT NOT NULL DEFAULT '',
    "pharmacyAddr" TEXT NOT NULL DEFAULT '',
    "rxTurnaround" INTEGER NOT NULL DEFAULT 2,
    "fitNoteDays" INTEGER NOT NULL DEFAULT 3,
    "faqs" TEXT NOT NULL DEFAULT '[]',
    "testRules" TEXT NOT NULL DEFAULT '{}',
    "triageProtos" TEXT NOT NULL DEFAULT '{}',
    "clinicianTypes" TEXT NOT NULL DEFAULT '[]',
    "safeguardLead" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nhsNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "medications" TEXT NOT NULL DEFAULT '[]',
    "allergies" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "clinicianName" TEXT NOT NULL,
    "clinicianType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "slotType" TEXT NOT NULL DEFAULT 'routine',
    "patientId" TEXT,
    "bookedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT,
    "patientNHSNumber" TEXT,
    "callerPhone" TEXT,
    "startedAt" TEXT NOT NULL,
    "endedAt" TEXT,
    "durationSeconds" INTEGER,
    "primaryIntent" TEXT,
    "urgencyLevel" TEXT,
    "resolutionType" TEXT NOT NULL DEFAULT 'pending',
    "agentUsed" TEXT NOT NULL DEFAULT 'orchestrator',
    "actionsTaken" TEXT NOT NULL DEFAULT '[]',
    "transcript" TEXT NOT NULL DEFAULT '[]',
    "satisfaction" INTEGER,
    "snomedCodes" TEXT NOT NULL DEFAULT '[]',
    "redFlagsDetected" TEXT NOT NULL DEFAULT '[]',
    "safetyNetting" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientNHSNumber" TEXT NOT NULL,
    "medications" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TEXT NOT NULL,
    "pharmacy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "patientNHSNumber" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deliveryTier" TEXT NOT NULL DEFAULT 'emma_can_deliver',
    "summary" TEXT,
    "reviewedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TriageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL DEFAULT '[]',
    "redFlagsDetected" TEXT NOT NULL DEFAULT '[]',
    "urgencyClassification" TEXT NOT NULL,
    "safetyNetting" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "clinicalProtocol" TEXT,
    "safetyCheckPassed" BOOLEAN NOT NULL DEFAULT true,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TriageRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "callId" TEXT,
    "practiceId" TEXT NOT NULL,
    "patientNHSNumber" TEXT,
    "agentName" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MemoryFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "patientNHSNumber" TEXT NOT NULL,
    "layer" TEXT NOT NULL DEFAULT 'episodic',
    "category" TEXT NOT NULL DEFAULT 'preference',
    "fact" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "source" TEXT NOT NULL DEFAULT 'ai_extraction',
    "extractedAt" TEXT NOT NULL,
    "lastAccessedAt" TEXT NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoryFact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "patientNHSNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'command_centre',
    "timestamp" TEXT NOT NULL,
    "normalRangeLow" REAL,
    "normalRangeHigh" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "patientNHSNumber" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "autoResponseTriggered" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TEXT,
    "acknowledgedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthAlert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertReading" (
    "alertId" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,

    PRIMARY KEY ("alertId", "readingId"),
    CONSTRAINT "AlertReading_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "HealthAlert" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AlertReading_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "HealthReading" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClinicalDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientNHSNumber" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_GP_REVIEW',
    "gpApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "templateUsed" TEXT,
    "snomedCodes" TEXT NOT NULL DEFAULT '[]',
    "niceGuidelines" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersions" TEXT NOT NULL DEFAULT '[]',
    "reviewedBy" TEXT,
    "reviewedAt" TEXT,
    "approvedAt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicalDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "respondedCount" INTEGER NOT NULL DEFAULT 0,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OutreachContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientNHSNumber" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'sms',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TEXT,
    "rule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachContact_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OutreachContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafetyTestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "judgeReasoning" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BrowserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskDescription" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "securityFlags" TEXT NOT NULL DEFAULT '[]',
    "auditTrail" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TEXT NOT NULL,
    "completedAt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScheduleOptimization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "optimizedSlots" INTEGER NOT NULL,
    "gapsFilled" INTEGER NOT NULL DEFAULT 0,
    "predictedDNAs" INTEGER NOT NULL DEFAULT 0,
    "optimizationScore" INTEGER NOT NULL DEFAULT 0,
    "avgFillTime" REAL NOT NULL DEFAULT 0,
    "actions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DNAPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optimizationId" TEXT,
    "slotTime" TEXT NOT NULL,
    "slotDate" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientNHSNumber" TEXT NOT NULL,
    "clinicianName" TEXT NOT NULL,
    "dnaProbability" REAL NOT NULL,
    "riskFactors" TEXT NOT NULL DEFAULT '[]',
    "recommendation" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Practice_odsCode_key" ON "Practice"("odsCode");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_nhsNumber_key" ON "Patient"("nhsNumber");
