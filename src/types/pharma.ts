export type ApplicationType = 'NDA' | 'BLA' | 'ANDA' | 'Other';

export type ActionCategory =
  | 'Original Approval (Potential New Launch)'
  | 'Supplemental Approval (Label/Indication Expansion)'
  | 'Generic Approval (ANDA)'
  | 'Tentative Approval (Awaiting Final Patent/Exclusivity Clearance)'
  | 'Other Regulatory Action';

export type ScoreTier =
  | 'High priority'
  | 'Moderate priority'
  | 'Watchlist'
  | 'Low priority or insufficient evidence';

export type ConfidenceLevel = 'High' | 'Moderate' | 'Low — Verification Needed';

export type OpportunityStatus =
  | 'New'
  | 'Research Required'
  | 'Under Review'
  | 'Approved Internally'
  | 'CRM Pending'
  | 'Added to CRM'
  | 'Outreach Pending'
  | 'Contacted'
  | 'Qualified'
  | 'Disqualified';

export interface DimensionAssessment {
  name: string;
  key:
    | 'diseaseBurden'
    | 'accessComplexity'
    | 'treatmentComplexity'
    | 'affordabilityComplexity'
    | 'evidenceConfidence';
  score: number; // 0 to 100
  weight: number; // 0.25, 0.20, 0.20, 0.20, 0.15
  weightedPoints: number;
  rationale: string[];
  verifiedFactors: string[];
  unknownFactors: string[];
}

export interface PSPScoreBreakdown {
  totalScore: number; // 0 to 100 whole number
  tier: ScoreTier;
  preliminaryLabel: string;
  confidenceLevel: ConfidenceLevel;
  modelVersion: string;
  calculatedAt: string;
  dimensions: {
    diseaseBurden: DimensionAssessment;
    accessComplexity: DimensionAssessment;
    treatmentComplexity: DimensionAssessment;
    affordabilityComplexity: DimensionAssessment;
    evidenceConfidence: DimensionAssessment;
  };
  supportingEvidence: string[];
  missingInformation: string[];
  suggestedNextSteps: string[];
}

export interface EvidenceSource {
  id: string;
  title: string;
  sourceType:
    | 'FDA Drugs@FDA Application Record'
    | 'FDA Approval Letter / Review'
    | 'Official Prescribing Information (DailyMed / FDA Label)'
    | 'openFDA API Endpoint'
    | 'FDA Purple Book / Orange Book';
  url: string;
  retrievedAt: string;
  verified: boolean;
  citationNote: string;
}

export interface InternalNote {
  id: string;
  drugId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  drugId: string;
  previousStatus: OpportunityStatus | null;
  newStatus: OpportunityStatus;
  changedBy: string;
  reason: string;
  timestamp: string;
}

export interface InternalApprovalDecision {
  approvedBy: string;
  approvedAt: string;
  decision: 'Approved Internally' | 'Disqualified';
  notes: string;
  crmSyncStatus: string;
  crmRecordId: string | null;
}

export interface OpportunityRecord {
  drugId: string;
  status: OpportunityStatus;
  savedInPipeline: boolean;
  owner: string;
  followUpDate: string | null;
  lastAction: string;
  lastUpdatedAt: string;
  internalApproval: InternalApprovalDecision | null;
  crmRecordId: string | null;
  crmSyncStatus: 'Not Connected' | 'Pending' | 'Synced' | 'Failed';
  notes: InternalNote[];
  statusHistory: StatusHistoryEntry[];
}

export interface DrugRecord {
  id: string; // Stable deterministic ID: e.g. NDA218730-ORIG-1-20250919
  applicationNumber: string; // e.g. NDA218730, BLA761389
  applicationType: ApplicationType;
  submissionType: string; // ORIG, SUPPL
  submissionNumber: string;
  submissionStatus: string; // AP, TA
  approvalActionDate: string; // YYYY-MM-DD
  actionCategory: ActionCategory;
  isPotentialNewLaunch: boolean;
  drugName: string;
  brandName: string | null;
  activeIngredient: string;
  sponsorName: string;
  indication: string;
  indicationVerified: boolean;
  indicationSource: string;
  treatmentCategory: string;
  dosageForm: string;
  routeOfAdministration: string;
  marketingStatus: string;
  submissionClassCode: string | null;
  submissionClassDescription: string | null;
  reviewPriority: 'PRIORITY' | 'STANDARD' | 'ORPHAN' | 'UNKNOWN';
  pharmacologicClass: string[];
  boxedWarningPresent: boolean | null;
  remsRequired: boolean | null;
  pspScore: PSPScoreBreakdown;
  sources: EvidenceSource[];
  opportunity: OpportunityRecord;
  lastSyncedAt: string;
}

export interface PendingDrugRecord {
  id: string;
  productName: string;
  sponsorName: string;
  indication: string;
  submissionType: string;
  applicationNumber: string | null;
  expectedDecisionDate: string | null;
  decisionDateType: 'Official FDA Tentative Approval' | 'PDUFA Target Action Date (Analyst Tracked)' | 'Not Publicly Disclosed by FDA';
  currentStatus: string;
  sourceTitle: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  analystNotes: string;
  pspScore: number | null;
  pspTier: ScoreTier | 'Insufficient Evidence';
}

export interface PharmaceuticalCompanySummary {
  companyId: string;
  sponsorName: string;
  totalApprovalActions: number;
  originalLaunchCount: number;
  supplementalCount: number;
  genericCount: number;
  highPriorityCount: number;
  averagePspScore: number;
  highestPspScore: number;
  activeOpportunitiesCount: number;
  approvedInternallyCount: number;
  latestApprovalDate: string;
  therapeuticAreas: string[];
  drugIds: string[];
}

export interface RefreshHistoryEntry {
  id: string;
  startedAt: string;
  completedAt: string;
  status: 'Success' | 'Partial / Cached Fallback' | 'Failed';
  recordsFetched: number;
  newRecordsDiscovered: number;
  updatedRecords: number;
  sourceEndpoint: string;
  errorMessage: string | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actionType:
    | 'OPPORTUNITY_APPROVED'
    | 'OPPORTUNITY_REJECTED'
    | 'STATUS_UPDATED'
    | 'NOTE_ADDED'
    | 'FDA_DATA_REFRESH'
    | 'CRM_SYNC_ATTEMPT'
    | 'EMAIL_DRAFT_GENERATED'
    | 'SETTINGS_UPDATED';
  targetId: string;
  summary: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface IntegrationSettings {
  geminiConfigured: boolean;
  geminiModel: string;
  openFdaStatus: 'Connected' | 'Degraded' | 'Offline';
  openFdaApiKeyConfigured: boolean;
  lastSuccessfulRefresh: string | null;
  crmProvider: 'none' | 'salesforce' | 'hubspot';
  crmConnectionStatus: 'Not Configured (Disabled)' | 'Sandbox Mode (Configured)' | 'Connected';
  crmInstanceUrl: string;
  crmSandboxMode: boolean;
  emailProvider: 'none' | 'sendgrid' | 'ses' | 'smtp';
  emailConnectionStatus: 'Not Configured (Draft & Copy Only)' | 'Configured';
  emailFromAddress: string;
  dataRetentionDays: number;
  persistAiHistory: boolean;
  scoringModelVersion: string;
  scoringWeights: {
    diseaseBurden: number;
    accessComplexity: number;
    treatmentComplexity: number;
    affordabilityComplexity: number;
    evidenceConfidence: number;
  };
  appVersion: string;
  autoRefreshIntervalHours: number;
  schedulerActive: boolean;
}

export interface EmailOutreachDraft {
  id: string;
  drugId: string;
  drugName: string;
  sponsorName: string;
  applicationNumber: string;
  approvalActionDate: string;
  recipientName: string;
  recipientEmail: string;
  recipientVerified: boolean;
  subject: string;
  body: string;
  evidenceCitations: string[];
  createdAt: string;
  sendStatus: 'Draft Only (Sending Disabled)' | 'Blocked — Unverified Recipient' | 'Sent';
}
