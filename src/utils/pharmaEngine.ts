import {
  ActionCategory,
  ApplicationType,
  ConfidenceLevel,
  DimensionAssessment,
  DrugRecord,
  EmailOutreachDraft,
  EvidenceSource,
  OpportunityRecord,
  OpportunityStatus,
  PSPScoreBreakdown,
  ScoreTier,
} from '../types/pharma';

export const SCORING_MODEL_VERSION = 'v1.2.0-psp-rules';

export const ALLOWED_OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  'New',
  'Research Required',
  'Under Review',
  'Approved Internally',
  'CRM Pending',
  'Added to CRM',
  'Outreach Pending',
  'Contacted',
  'Qualified',
  'Disqualified',
];

/**
 * Parses openFDA YYYYMMDD date strings or ISO dates into YYYY-MM-DD.
 */
export function parseOpenFdaDate(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(0, 4);
    const month = trimmed.slice(4, 6);
    const day = trimmed.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return null;
}

/**
 * Extracts NDA, BLA, ANDA, or Other from an FDA application number.
 */
export function extractApplicationType(applicationNumber: string): ApplicationType {
  const upper = (applicationNumber || '').trim().toUpperCase();
  if (upper.startsWith('BLA')) return 'BLA';
  if (upper.startsWith('NDA')) return 'NDA';
  if (upper.startsWith('ANDA')) return 'ANDA';
  return 'Other';
}

/**
 * Extracts the numeric portion of an FDA application number for official Drugs@FDA links.
 */
export function extractNumericApplicationNo(applicationNumber: string): string {
  return (applicationNumber || '').replace(/\D+/g, '');
}

/**
 * Distinguishes between Original Approvals (potential new product launches),
 * Supplemental Approvals, Generic Drug Approvals (ANDA), Tentative Approvals, and Other actions.
 */
export function classifyActionCategory(params: {
  applicationType: ApplicationType;
  submissionType: string;
  submissionStatus: string;
  submissionClassCode?: string | null;
}): { category: ActionCategory; isPotentialNewLaunch: boolean } {
  const subType = (params.submissionType || '').toUpperCase();
  const subStatus = (params.submissionStatus || '').toUpperCase();

  if (subStatus === 'TA') {
    return {
      category: 'Tentative Approval (Awaiting Final Patent/Exclusivity Clearance)',
      isPotentialNewLaunch: false,
    };
  }

  if (params.applicationType === 'ANDA') {
    return {
      category: 'Generic Approval (ANDA)',
      isPotentialNewLaunch: false,
    };
  }

  if (
    subStatus === 'AP' &&
    subType === 'ORIG' &&
    (params.applicationType === 'NDA' || params.applicationType === 'BLA')
  ) {
    return {
      category: 'Original Approval (Potential New Launch)',
      isPotentialNewLaunch: true,
    };
  }

  if (subStatus === 'AP' && subType === 'SUPPL') {
    return {
      category: 'Supplemental Approval (Label/Indication Expansion)',
      isPotentialNewLaunch: false,
    };
  }

  return {
    category: 'Other Regulatory Action',
    isPotentialNewLaunch: false,
  };
}

/**
 * Maps a numerical 0-100 score to the required ScoreTier.
 */
export function getScoreTier(score: number): ScoreTier {
  if (score >= 80) return 'High priority';
  if (score >= 60) return 'Moderate priority';
  if (score >= 40) return 'Watchlist';
  return 'Low priority or insufficient evidence';
}

export interface ScoringInput {
  applicationNumber: string;
  applicationType: ApplicationType;
  submissionType: string;
  submissionStatus: string;
  drugName: string;
  activeIngredient: string;
  sponsorName: string;
  indication: string;
  indicationVerified: boolean;
  treatmentCategory: string;
  dosageForm: string;
  routeOfAdministration: string;
  reviewPriority: 'PRIORITY' | 'STANDARD' | 'ORPHAN' | 'UNKNOWN';
  submissionClassCode?: string | null;
  submissionClassDescription?: string | null;
  pharmacologicClass: string[];
  boxedWarningPresent: boolean | null;
  remsRequired: boolean | null;
  verifiedAccessBarriers?: string[];
  verifiedAffordabilityFactors?: string[];
  sourcesCount: number;
  hasOfficialLabelSource: boolean;
}

/**
 * Calculates the transparent, rule-based preliminary PSP Opportunity Score (0–100).
 * Formula:
 * (Disease Burden * 0.25) +
 * (Access Complexity * 0.20) +
 * (Treatment Complexity * 0.20) +
 * (Affordability Complexity * 0.20) +
 * (Evidence Confidence * 0.15)
 */
export function calculatePspOpportunityScore(
  input: ScoringInput,
  calculatedAt: string = new Date().toISOString()
): PSPScoreBreakdown {
  const supportingEvidence: string[] = [];
  const missingInformation: string[] = [];
  const suggestedNextSteps: string[] = [];

  // 1. Disease Burden and Unmet Need (25%)
  let diseaseScore = 25; // Baseline when only basic approval facts exist
  const diseaseRationale: string[] = [];
  const diseaseVerified: string[] = [];
  const diseaseUnknown: string[] = [];

  if (input.applicationType === 'ANDA') {
    diseaseScore = 20;
    diseaseRationale.push(
      'Generic ANDA approval for an established reference listed drug; lower commercial demand for a manufacturer-sponsored brand PSP.'
    );
    diseaseVerified.push('Application Type: ANDA (Abbreviated New Drug Application)');
  } else {
    if (input.indicationVerified && input.indication && input.indication !== 'Not verified' && input.indication !== 'See official label') {
      diseaseScore += 25;
      diseaseVerified.push(`Verified indication: ${input.indication}`);
      supportingEvidence.push(`Official FDA indication verified: ${input.indication}`);

      const indLower = input.indication.toLowerCase();
      const catLower = (input.treatmentCategory || '').toLowerCase();
      if (
        indLower.includes('metastatic') ||
        indLower.includes('carcinoma') ||
        indLower.includes('lymphoma') ||
        indLower.includes('leukemia') ||
        indLower.includes('myeloma') ||
        indLower.includes('sarcoma') ||
        indLower.includes('glioma') ||
        indLower.includes('tumor') ||
        catLower.includes('oncology')
      ) {
        diseaseScore += 22;
        diseaseVerified.push('Severe oncology / life-threatening condition requiring specialist oncology care');
        diseaseRationale.push('High clinical severity and complex multidisciplinary oncology care pathway.');
      } else if (
        indLower.includes('rare') ||
        indLower.includes('dystrophy') ||
        indLower.includes('hemophilia') ||
        indLower.includes('amyloidosis') ||
        indLower.includes('fibrosis') ||
        indLower.includes('atrophy') ||
        indLower.includes('hypertension, pulmonary') ||
        indLower.includes('pnh') ||
        catLower.includes('rare') ||
        catLower.includes('genetic')
      ) {
        diseaseScore += 24;
        diseaseVerified.push('Rare / orphan or severe progressive disorder with specialist center management');
        diseaseRationale.push('Rare or progressive condition with specialized diagnostic and longitudinal adherence needs.');
      } else if (
        indLower.includes('Crohn') ||
        indLower.includes('colitis') ||
        indLower.includes('psoriasis') ||
        indLower.includes('arthritis') ||
        indLower.includes('sclerosis') ||
        indLower.includes('lupus') ||
        indLower.includes('myasthenia') ||
        indLower.includes('alzheimer') ||
        catLower.includes('immunology') ||
        catLower.includes('neurology')
      ) {
        diseaseScore += 18;
        diseaseVerified.push('Chronic specialty immunology/neurology condition requiring specialist management');
        diseaseRationale.push('Chronic specialty condition requiring ongoing specialist supervision and persistence support.');
      } else {
        diseaseScore += 10;
        diseaseRationale.push('Verified clinical indication documented in FDA labeling.');
      }
    } else {
      diseaseUnknown.push('Specific clinical indication not present in openFDA Drugs@FDA summary record');
      missingInformation.push('Official labeled indication text requires verification from DailyMed / FDA prescribing information.');
      suggestedNextSteps.push('Review the FDA Prescribing Information (Section 1: Indications and Usage) to confirm patient population and severity.');
      diseaseRationale.push('Indication is not yet verified in the summary dataset; score capped until clinical indication is confirmed.');
    }

    if (input.reviewPriority === 'PRIORITY' || input.reviewPriority === 'ORPHAN') {
      diseaseScore += 18;
      diseaseVerified.push(`FDA Review Designation: ${input.reviewPriority}`);
      diseaseRationale.push(`FDA ${input.reviewPriority} review designation indicates documented unmet medical need.`);
      supportingEvidence.push(`FDA Review Priority recorded as ${input.reviewPriority}.`);
    } else {
      diseaseUnknown.push('Orphan / Breakthrough therapy designation status not confirmed in summary endpoint');
    }
  }
  diseaseScore = Math.min(100, Math.max(0, diseaseScore));

  // 2. Patient Access Complexity (20%)
  let accessScore = 20;
  const accessRationale: string[] = [];
  const accessVerified: string[] = [];
  const accessUnknown: string[] = [];

  if (input.applicationType === 'ANDA') {
    accessScore = 15;
    accessRationale.push('Generic retail/institutional distribution typically follows standard formulary tiering without bespoke hub onboarding.');
    accessVerified.push('Generic ANDA pathway');
  } else {
    if (input.applicationType === 'BLA') {
      accessScore += 25;
      accessVerified.push('Biologic License Application (BLA) specialty product');
      accessRationale.push('Biologic therapies frequently require specialty pharmacy fulfillment or medical benefit verification.');
      supportingEvidence.push('BLA regulatory pathway indicates biologic therapy distribution requirements.');
    } else if (input.applicationType === 'NDA' && input.submissionType === 'ORIG') {
      accessScore += 15;
      accessVerified.push('Original NDA approval');
      accessRationale.push('New brand NDA requires initial payer formulary review and benefits investigation.');
    }

    if (input.remsRequired === true) {
      accessScore += 25;
      accessVerified.push('Documented FDA REMS (Risk Evaluation and Mitigation Strategy) requirement');
      accessRationale.push('REMS program mandates certified prescriber/pharmacy enrollment and patient counseling prior to dispensing.');
      supportingEvidence.push('Verified REMS requirement increases patient onboarding and access coordination complexity.');
    } else if (input.remsRequired === null) {
      accessUnknown.push('REMS enrollment requirement status not verified');
      missingInformation.push('Verify whether FDA approval letter mandates a REMS program or specialty distribution restriction.');
    }

    if (input.verifiedAccessBarriers && input.verifiedAccessBarriers.length > 0) {
      accessScore += Math.min(30, input.verifiedAccessBarriers.length * 15);
      for (const barrier of input.verifiedAccessBarriers) {
        accessVerified.push(barrier);
        supportingEvidence.push(`Documented access requirement: ${barrier}`);
      }
      accessRationale.push('Documented prior authorization, biomarker testing, or specialist prescriber criteria verified.');
    } else {
      accessUnknown.push('Payer prior authorization (PA) and step-therapy criteria not yet verified');
      suggestedNextSteps.push('Check early commercial payer coverage policies and diagnostic/biomarker testing prerequisites.');
    }
  }
  accessScore = Math.min(100, Math.max(0, accessScore));

  // 3. Treatment and Administration Complexity (20%)
  let treatmentScore = 20;
  const treatmentRationale: string[] = [];
  const treatmentVerified: string[] = [];
  const treatmentUnknown: string[] = [];

  const routeUpper = (input.routeOfAdministration || '').toUpperCase();
  const dosageUpper = (input.dosageForm || '').toUpperCase();

  if (routeUpper && routeUpper !== 'NOT VERIFIED') {
    treatmentVerified.push(`Route: ${input.routeOfAdministration}`);
  } else {
    treatmentUnknown.push('Route of administration not verified');
  }

  if (dosageUpper && dosageUpper !== 'NOT VERIFIED') {
    treatmentVerified.push(`Dosage form: ${input.dosageForm}`);
  } else {
    treatmentUnknown.push('Dosage form not verified');
  }

  if (
    routeUpper.includes('INTRAVENOUS') ||
    routeUpper.includes('INTRATHECAL') ||
    routeUpper.includes('INTRAVITREAL') ||
    dosageUpper.includes('INFUSION')
  ) {
    treatmentScore += 45;
    treatmentRationale.push('Parenteral / infusion administration requires site-of-care coordination, infusion scheduling, and clinical monitoring.');
    supportingEvidence.push(`Verified administration route (${input.routeOfAdministration} / ${input.dosageForm}) requires clinical administration logistics.`);
  } else if (
    routeUpper.includes('SUBCUTANEOUS') ||
    routeUpper.includes('INTRAMUSCULAR') ||
    dosageUpper.includes('INJECTION') ||
    dosageUpper.includes('AUTOINJECTOR') ||
    dosageUpper.includes('SYRINGE')
  ) {
    treatmentScore += 35;
    treatmentRationale.push('Injectable administration benefits from nurse injection training, cold-chain logistics, and sharps/adherence support.');
    supportingEvidence.push(`Verified injectable dosage form (${input.dosageForm}, ${input.routeOfAdministration}).`);
  } else if (routeUpper.includes('ORAL') || dosageUpper.includes('TABLET') || dosageUpper.includes('CAPSULE')) {
    treatmentScore += 15;
    treatmentRationale.push('Oral dosage form; treatment complexity depends on titration schedule, lab monitoring, and adherence requirements.');
  } else {
    missingInformation.push('Dosage form and administration route require verification from FDA product listing.');
  }

  if (input.boxedWarningPresent === true) {
    treatmentScore += 20;
    treatmentVerified.push('FDA Boxed Warning / safety monitoring requirement present in label');
    treatmentRationale.push('Safety monitoring requirements increase need for patient education and baseline/ongoing lab coordination.');
    supportingEvidence.push('FDA labeling includes Boxed Warning or intensive safety monitoring protocol.');
  } else if (input.boxedWarningPresent === null) {
    treatmentUnknown.push('Boxed warning and baseline lab monitoring schedule not yet verified');
    suggestedNextSteps.push('Inspect FDA label Section 2 (Dosage and Administration) and Section 5 (Warnings and Precautions) for titration or lab monitoring.');
  }

  treatmentScore = Math.min(100, Math.max(0, treatmentScore));

  // 4. Affordability and Reimbursement Complexity (20%)
  // Safeguard: Do NOT assume an expensive medicine automatically needs a PSP or infer barriers from disease category alone.
  let affordabilityScore = 20;
  const affordabilityRationale: string[] = [];
  const affordabilityVerified: string[] = [];
  const affordabilityUnknown: string[] = [];

  if (input.applicationType === 'ANDA') {
    affordabilityScore = 15;
    affordabilityVerified.push('Generic multi-source or first-generic ANDA competition');
    affordabilityRationale.push('Generic products typically have lower copay friction and rarely sponsor dedicated brand co-pay/bridge hubs.');
  } else {
    if (input.applicationType === 'BLA' || (input.applicationType === 'NDA' && input.submissionType === 'ORIG')) {
      affordabilityScore += 20;
      affordabilityVerified.push(`Branded ${input.applicationType} (${input.submissionType}) commercial product`);
      affordabilityRationale.push('Branded specialty/novel approvals frequently involve medical vs. pharmacy benefit verification and co-pay assistance assessment.');
    }

    if (input.verifiedAffordabilityFactors && input.verifiedAffordabilityFactors.length > 0) {
      affordabilityScore += Math.min(45, input.verifiedAffordabilityFactors.length * 20);
      for (const factor of input.verifiedAffordabilityFactors) {
        affordabilityVerified.push(factor);
        supportingEvidence.push(`Documented reimbursement/affordability factor: ${factor}`);
      }
      affordabilityRationale.push('Verified benefit investigation, specialty tier co-insurance, or bridge supply factors identified.');
    } else {
      affordabilityUnknown.push('Wholesale Acquisition Cost (WAC), payer tier placement, and manufacturer co-pay program status are unknown');
      missingInformation.push('Commercial pricing (WAC), specialty tier co-insurance exposure, and existing patient financial assistance status are not included in FDA regulatory data.');
      suggestedNextSteps.push('Verify whether the sponsor has launched an existing patient support hub or co-pay assistance program for this brand.');
      affordabilityRationale.push('No verified commercial reimbursement barriers recorded yet; score avoids assuming high need from disease category alone.');
    }
  }
  affordabilityScore = Math.min(100, Math.max(0, affordabilityScore));

  // 5. Evidence Confidence and Completeness (15%)
  let confidenceScore = 0;
  const confidenceRationale: string[] = [];
  const confidenceVerified: string[] = [];
  const confidenceUnknown: string[] = [];

  if (input.applicationNumber && input.sponsorName && input.sponsorName !== 'Not verified') {
    confidenceScore += 25;
    confidenceVerified.push(`Official FDA Application Record (${input.applicationNumber}) & Applicant (${input.sponsorName})`);
  }
  if (input.activeIngredient && input.activeIngredient !== 'Not verified') {
    confidenceScore += 15;
    confidenceVerified.push(`Verified Active Ingredient (${input.activeIngredient})`);
  } else {
    confidenceUnknown.push('Active ingredient missing from summary record');
  }
  if (input.dosageForm && input.dosageForm !== 'Not verified' && input.routeOfAdministration && input.routeOfAdministration !== 'Not verified') {
    confidenceScore += 15;
    confidenceVerified.push('Verified dosage form and administration route');
  } else {
    confidenceUnknown.push('Dosage form or administration route incomplete');
  }
  if (input.indicationVerified && input.indication && input.indication !== 'Not verified' && input.indication !== 'See official label') {
    confidenceScore += 25;
    confidenceVerified.push('Verified clinical indication from FDA labeling');
  } else {
    confidenceUnknown.push('Clinical indication not verified in openFDA summary');
  }
  if (input.hasOfficialLabelSource && input.sourcesCount >= 2) {
    confidenceScore += 20;
    confidenceVerified.push(`${input.sourcesCount} official FDA/DailyMed source links verified`);
  } else if (input.sourcesCount >= 1) {
    confidenceScore += 10;
    confidenceVerified.push('Official Drugs@FDA application source link verified');
  }

  confidenceScore = Math.min(100, Math.max(0, confidenceScore));
  confidenceRationale.push(
    `Evidence completeness evaluated across official FDA application metadata, product formulation, clinical indication, and reimbursement factors (${confidenceScore}/100).`
  );

  const weightedDisease = Number((diseaseScore * 0.25).toFixed(2));
  const weightedAccess = Number((accessScore * 0.2).toFixed(2));
  const weightedTreatment = Number((treatmentScore * 0.2).toFixed(2));
  const weightedAffordability = Number((affordabilityScore * 0.2).toFixed(2));
  const weightedConfidence = Number((confidenceScore * 0.15).toFixed(2));

  const rawTotal =
    weightedDisease +
    weightedAccess +
    weightedTreatment +
    weightedAffordability +
    weightedConfidence;

  const totalScore = Math.round(rawTotal);
  const tier = getScoreTier(totalScore);

  let confidenceLevel: ConfidenceLevel = 'Low — Verification Needed';
  if (confidenceScore >= 80 && input.indicationVerified) {
    confidenceLevel = 'High';
  } else if (confidenceScore >= 60) {
    confidenceLevel = 'Moderate';
  }

  const preliminaryLabel =
    confidenceLevel === 'Low — Verification Needed' || !input.indicationVerified
      ? 'Preliminary — requires verification'
      : 'Preliminary prioritization heuristic — human review required';

  if (suggestedNextSteps.length === 0) {
    suggestedNextSteps.push(
      'Review official FDA approval letter and prescribing information before qualifying for BD outreach.'
    );
  }

  const dimensions: PSPScoreBreakdown['dimensions'] = {
    diseaseBurden: {
      name: 'Disease burden and unmet need',
      key: 'diseaseBurden',
      score: diseaseScore,
      weight: 0.25,
      weightedPoints: weightedDisease,
      rationale: diseaseRationale,
      verifiedFactors: diseaseVerified,
      unknownFactors: diseaseUnknown,
    },
    accessComplexity: {
      name: 'Patient access complexity',
      key: 'accessComplexity',
      score: accessScore,
      weight: 0.2,
      weightedPoints: weightedAccess,
      rationale: accessRationale,
      verifiedFactors: accessVerified,
      unknownFactors: accessUnknown,
    },
    treatmentComplexity: {
      name: 'Treatment and administration complexity',
      key: 'treatmentComplexity',
      score: treatmentScore,
      weight: 0.2,
      weightedPoints: weightedTreatment,
      rationale: treatmentRationale,
      verifiedFactors: treatmentVerified,
      unknownFactors: treatmentUnknown,
    },
    affordabilityComplexity: {
      name: 'Affordability and reimbursement complexity',
      key: 'affordabilityComplexity',
      score: affordabilityScore,
      weight: 0.2,
      weightedPoints: weightedAffordability,
      rationale: affordabilityRationale,
      verifiedFactors: affordabilityVerified,
      unknownFactors: affordabilityUnknown,
    },
    evidenceConfidence: {
      name: 'Evidence confidence and completeness',
      key: 'evidenceConfidence',
      score: confidenceScore,
      weight: 0.15,
      weightedPoints: weightedConfidence,
      rationale: confidenceRationale,
      verifiedFactors: confidenceVerified,
      unknownFactors: confidenceUnknown,
    },
  };

  return {
    totalScore,
    tier,
    preliminaryLabel,
    confidenceLevel,
    modelVersion: SCORING_MODEL_VERSION,
    calculatedAt,
    dimensions,
    supportingEvidence,
    missingInformation,
    suggestedNextSteps,
  };
}

export interface VerifiedLabelSupplementalData {
  indication: string;
  indicationSource: string;
  treatmentCategory: string;
  boxedWarningPresent: boolean | null;
  remsRequired: boolean | null;
  verifiedAccessBarriers?: string[];
  verifiedAffordabilityFactors?: string[];
}

/**
 * Normalizes a raw openFDA Drugs@FDA result object into one or more verified DrugRecord entries.
 * Never fabricates missing indications or dates.
 */
export function normalizeOpenFdaRecord(
  raw: any,
  verifiedLabelMap: Record<string, VerifiedLabelSupplementalData> = {},
  retrievedAt: string = new Date().toISOString()
): DrugRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const applicationNumber = String(raw.application_number || '').trim().toUpperCase();
  if (!applicationNumber) return null;

  const sponsorName = String(raw.sponsor_name || '').trim() || 'Not verified';
  const products: any[] = Array.isArray(raw.products) ? raw.products : [];
  const submissions: any[] = Array.isArray(raw.submissions) ? raw.submissions : [];

  // Choose primary product (prefer Prescription marketing status)
  const primaryProduct =
    products.find((p) =>
      String(p?.marketing_status || '')
        .toLowerCase()
        .includes('prescription')
    ) ||
    products[0] ||
    {};

  const brandNameRaw = primaryProduct?.brand_name
    ? String(primaryProduct.brand_name).trim()
    : raw.openfda?.brand_name?.[0]
      ? String(raw.openfda.brand_name[0]).trim()
      : null;

  const activeIngredientsArr: string[] = Array.isArray(primaryProduct?.active_ingredients)
    ? primaryProduct.active_ingredients
        .map((ai: any) => (ai?.name ? String(ai.name).trim() : ''))
        .filter(Boolean)
    : Array.isArray(raw.openfda?.substance_name)
      ? raw.openfda.substance_name.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

  const activeIngredient =
    activeIngredientsArr.length > 0 ? activeIngredientsArr.join('; ') : 'Not verified';

  const drugName =
    brandNameRaw ||
    (activeIngredient !== 'Not verified' ? activeIngredient : `Application ${applicationNumber}`);

  const dosageForm = primaryProduct?.dosage_form
    ? String(primaryProduct.dosage_form).trim()
    : 'Not verified';
  const routeOfAdministration = primaryProduct?.route
    ? String(primaryProduct.route).trim()
    : Array.isArray(raw.openfda?.route) && raw.openfda.route[0]
      ? String(raw.openfda.route[0]).trim()
      : 'Not verified';
  const marketingStatus = primaryProduct?.marketing_status
    ? String(primaryProduct.marketing_status).trim()
    : 'Not verified';

  // Find the latest approved or tentatively approved submission with a valid date
  const validSubmissions = submissions
    .filter((s) => s && parseOpenFdaDate(s.submission_status_date))
    .sort((a, b) => {
      const da = parseOpenFdaDate(a.submission_status_date) || '';
      const db = parseOpenFdaDate(b.submission_status_date) || '';
      return db.localeCompare(da);
    });

  const latestSubmission =
    validSubmissions.find((s) => s.submission_status === 'AP') ||
    validSubmissions[0];

  if (!latestSubmission) return null;

  const approvalActionDate = parseOpenFdaDate(latestSubmission.submission_status_date);
  if (!approvalActionDate) return null;

  const submissionType = String(latestSubmission.submission_type || 'UNK').trim().toUpperCase();
  const submissionNumber = String(latestSubmission.submission_number || '1').trim();
  const submissionStatus = String(latestSubmission.submission_status || 'AP').trim().toUpperCase();
  const submissionClassCode = latestSubmission.submission_class_code
    ? String(latestSubmission.submission_class_code).trim()
    : null;
  const submissionClassDescription = latestSubmission.submission_class_code_description
    ? String(latestSubmission.submission_class_code_description).trim()
    : null;

  const rawPriority = String(latestSubmission.review_priority || '').trim().toUpperCase();
  const reviewPriority: DrugRecord['reviewPriority'] =
    rawPriority === 'PRIORITY'
      ? 'PRIORITY'
      : rawPriority === 'STANDARD'
        ? 'STANDARD'
        : rawPriority === 'ORPHAN'
          ? 'ORPHAN'
          : 'UNKNOWN';

  const applicationType = extractApplicationType(applicationNumber);
  const { category: actionCategory, isPotentialNewLaunch } = classifyActionCategory({
    applicationType,
    submissionType,
    submissionStatus,
    submissionClassCode,
  });

  const pharmClasses: string[] = Array.isArray(raw.openfda?.pharm_class_epc)
    ? raw.openfda.pharm_class_epc.map((c: any) => String(c))
    : [];

  // Check verified label supplemental map or openFDA pharm_class_epc
  const labelInfo = verifiedLabelMap[applicationNumber];
  const indication = labelInfo?.indication || 'See official label';
  const indicationVerified = Boolean(labelInfo?.indication);
  const indicationSource =
    labelInfo?.indicationSource ||
    (indicationVerified ? 'Official FDA Prescribing Information' : 'Not included in openFDA Drugs@FDA endpoint — see official FDA label');

  const treatmentCategory =
    labelInfo?.treatmentCategory ||
    (pharmClasses.length > 0 ? pharmClasses[0] : 'See official label');

  // Build real official FDA source links
  const numericApplNo = extractNumericApplicationNo(applicationNumber);
  const sources: EvidenceSource[] = [];

  if (numericApplNo) {
    sources.push({
      id: `${applicationNumber}-daf`,
      title: `Drugs@FDA Official Application Record (${applicationNumber})`,
      sourceType: 'FDA Drugs@FDA Application Record',
      url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${numericApplNo}`,
      retrievedAt,
      verified: true,
      citationNote: `Official US FDA CDER Drugs@FDA overview for ${applicationNumber}.`,
    });
  }

  sources.push({
    id: `${applicationNumber}-openfda`,
    title: `openFDA Drugs@FDA API Record (${applicationNumber})`,
    sourceType: 'openFDA API Endpoint',
    url: `https://api.fda.gov/drug/drugsfda.json?search=application_number:"${encodeURIComponent(applicationNumber)}"`,
    retrievedAt,
    verified: true,
    citationNote: `Direct openFDA JSON record for application ${applicationNumber}.`,
  });

  // Check if official FDA documents (approval letters / labels) are attached to the submission
  const appDocs: any[] = Array.isArray(latestSubmission.application_docs)
    ? latestSubmission.application_docs
    : [];
  for (const doc of appDocs) {
    if (doc?.url && typeof doc.url === 'string' && doc.url.startsWith('http')) {
      const docType = String(doc.type || 'FDA Document').trim();
      sources.push({
        id: `${applicationNumber}-doc-${doc.id || sources.length}`,
        title: `FDA Official ${docType} (${approvalActionDate})`,
        sourceType:
          docType.toLowerCase().includes('label')
            ? 'Official Prescribing Information (DailyMed / FDA Label)'
            : 'FDA Approval Letter / Review',
        url: doc.url,
        retrievedAt,
        verified: true,
        citationNote: `Official FDA regulatory document (${docType}) linked in submission ${submissionType}-${submissionNumber}.`,
      });
    }
  }

  if (brandNameRaw) {
    sources.push({
      id: `${applicationNumber}-dailymed`,
      title: `DailyMed Official Prescribing Information Search (${brandNameRaw})`,
      sourceType: 'Official Prescribing Information (DailyMed / FDA Label)',
      url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(brandNameRaw)}`,
      retrievedAt,
      verified: true,
      citationNote: `National Library of Medicine DailyMed SPL repository for ${brandNameRaw}.`,
    });
  }

  const hasOfficialLabelSource = sources.some(
    (s) => s.sourceType === 'Official Prescribing Information (DailyMed / FDA Label)'
  );

  const pspScore = calculatePspOpportunityScore(
    {
      applicationNumber,
      applicationType,
      submissionType,
      submissionStatus,
      drugName,
      activeIngredient,
      sponsorName,
      indication,
      indicationVerified,
      treatmentCategory,
      dosageForm,
      routeOfAdministration,
      reviewPriority,
      submissionClassCode,
      submissionClassDescription,
      pharmacologicClass: pharmClasses,
      boxedWarningPresent: labelInfo?.boxedWarningPresent ?? null,
      remsRequired: labelInfo?.remsRequired ?? null,
      verifiedAccessBarriers: labelInfo?.verifiedAccessBarriers,
      verifiedAffordabilityFactors: labelInfo?.verifiedAffordabilityFactors,
      sourcesCount: sources.length,
      hasOfficialLabelSource,
    },
    retrievedAt
  );

  const compactDate = approvalActionDate.replace(/-/g, '');
  const stableId = `${applicationNumber}-${submissionType}-${submissionNumber}-${compactDate}`;

  const defaultStatus: OpportunityStatus =
    !indicationVerified ? 'Research Required' : 'New';

  const opportunity: OpportunityRecord = {
    drugId: stableId,
    status: defaultStatus,
    savedInPipeline: false,
    owner: 'Unassigned',
    followUpDate: null,
    lastAction: 'Ingested from official FDA record',
    lastUpdatedAt: retrievedAt,
    internalApproval: null,
    crmRecordId: null,
    crmSyncStatus: 'Not Connected',
    notes: [],
    statusHistory: [
      {
        id: `hist-init-${stableId}`,
        drugId: stableId,
        previousStatus: null,
        newStatus: defaultStatus,
        changedBy: 'System (FDA Monitor)',
        reason: 'Initial record normalization and preliminary PSP scoring',
        timestamp: retrievedAt,
      },
    ],
  };

  return {
    id: stableId,
    applicationNumber,
    applicationType,
    submissionType,
    submissionNumber,
    submissionStatus,
    approvalActionDate,
    actionCategory,
    isPotentialNewLaunch,
    drugName,
    brandName: brandNameRaw,
    activeIngredient,
    sponsorName,
    indication,
    indicationVerified,
    indicationSource,
    treatmentCategory,
    dosageForm,
    routeOfAdministration,
    marketingStatus,
    submissionClassCode,
    submissionClassDescription,
    reviewPriority,
    pharmacologicClass: pharmClasses,
    boxedWarningPresent: labelInfo?.boxedWarningPresent ?? null,
    remsRequired: labelInfo?.remsRequired ?? null,
    pspScore,
    sources,
    opportunity,
    lastSyncedAt: retrievedAt,
  };
}

/**
 * Sorts drug records by approvalActionDate descending (newest first), with deterministic tie-breaker.
 */
export function sortDrugsByApprovalDateDesc(records: DrugRecord[]): DrugRecord[] {
  return [...records].sort((a, b) => {
    const dateCompare = b.approvalActionDate.localeCompare(a.approvalActionDate);
    if (dateCompare !== 0) return dateCompare;
    return a.applicationNumber.localeCompare(b.applicationNumber);
  });
}

/**
 * Deduplicates drug records using their stable ID (applicationNumber + submissionType + submissionNumber + approvalActionDate).
 * Preserves existing user workflow state (notes, internal approval, savedInPipeline, status) when merging refreshed FDA data.
 */
export function deduplicateDrugRecords(
  existingRecords: DrugRecord[],
  incomingRecords: DrugRecord[]
): { merged: DrugRecord[]; newCount: number; updatedCount: number } {
  const map = new Map<string, DrugRecord>();
  for (const rec of existingRecords) {
    map.set(rec.id, rec);
  }

  let newCount = 0;
  let updatedCount = 0;

  for (const incoming of incomingRecords) {
    const existing = map.get(incoming.id);
    if (!existing) {
      map.set(incoming.id, incoming);
      newCount += 1;
    } else {
      // Preserve user opportunity state while refreshing official FDA fields & recalculated score
      map.set(incoming.id, {
        ...incoming,
        opportunity: existing.opportunity,
      });
      updatedCount += 1;
    }
  }

  return {
    merged: sortDrugsByApprovalDateDesc(Array.from(map.values())),
    newCount,
    updatedCount,
  };
}

/**
 * Validates whether a requested OpportunityStatus is valid.
 */
export function isValidOpportunityStatus(status: string): status is OpportunityStatus {
  return ALLOWED_OPPORTUNITY_STATUSES.includes(status as OpportunityStatus);
}

/**
 * Applies an internal marketing team approval or rejection decision to a DrugRecord's opportunity.
 * Clearly separates internal review approval from FDA regulatory approval and handles CRM-disabled behavior safely.
 */
export function applyInternalApprovalDecision(params: {
  opportunity: OpportunityRecord;
  decision: 'Approved Internally' | 'Disqualified';
  actor: string;
  notes: string;
  crmConfigured: boolean;
  timestamp?: string;
}): {
  updatedOpportunity: OpportunityRecord;
  crmNotice: string;
} {
  const ts = params.timestamp || new Date().toISOString();
  const prevStatus = params.opportunity.status;
  const newStatus: OpportunityStatus = params.decision;

  const crmNotice = params.crmConfigured
    ? 'Internal review saved. Ready for explicit CRM record creation.'
    : 'CRM not connected — internal review saved.';

  const updatedOpportunity: OpportunityRecord = {
    ...params.opportunity,
    status: newStatus,
    savedInPipeline: true,
    lastAction:
      params.decision === 'Approved Internally'
        ? `Approved internally by ${params.actor}`
        : `Disqualified by ${params.actor}`,
    lastUpdatedAt: ts,
    crmSyncStatus: params.crmConfigured ? 'Pending' : 'Not Connected',
    internalApproval: {
      approvedBy: params.actor,
      approvedAt: ts,
      decision: params.decision,
      notes: params.notes.trim(),
      crmSyncStatus: crmNotice,
      crmRecordId: params.opportunity.crmRecordId,
    },
    notes: params.notes.trim()
      ? [
          {
            id: `note-${Date.now()}`,
            drugId: params.opportunity.drugId,
            author: params.actor,
            content: `[${params.decision}] ${params.notes.trim()}`,
            createdAt: ts,
          },
          ...params.opportunity.notes,
        ]
      : params.opportunity.notes,
    statusHistory: [
      {
        id: `hist-${Date.now()}`,
        drugId: params.opportunity.drugId,
        previousStatus: prevStatus,
        newStatus,
        changedBy: params.actor,
        reason: params.notes.trim() || `Internal ${params.decision.toLowerCase()} decision`,
        timestamp: ts,
      },
      ...params.opportunity.statusHistory,
    ],
  };

  return { updatedOpportunity, crmNotice };
}

/**
 * Builds an evidence-grounded B2B email outreach draft without inventing contacts or making unsupported claims.
 */
export function buildEvidenceBasedOutreachDraft(
  drug: DrugRecord,
  recipientName: string = '',
  recipientEmail: string = '',
  createdAt: string = new Date().toISOString()
): EmailOutreachDraft {
  const cleanRecipientName = recipientName.trim();
  const cleanRecipientEmail = recipientEmail.trim();
  const recipientVerified = Boolean(
    cleanRecipientName &&
      cleanRecipientEmail &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipientEmail)
  );

  const greeting = cleanRecipientName
    ? `Dear ${cleanRecipientName},`
    : `Dear ${drug.sponsorName} Commercial & Patient Services Team,`;

  const indicationText =
    drug.indicationVerified && drug.indication !== 'See official label'
      ? `for ${drug.indication}`
      : `(Application ${drug.applicationNumber})`;

  const verifiedObservations =
    drug.pspScore.supportingEvidence.length > 0
      ? drug.pspScore.supportingEvidence.slice(0, 3).map((ev) => `• ${ev}`).join('\n')
      : `• Official FDA ${drug.actionCategory} recorded on ${drug.approvalActionDate} under ${drug.applicationNumber} (${drug.dosageForm}, ${drug.routeOfAdministration}).`;

  const subject = `FDA Approval of ${drug.drugName} (${drug.applicationNumber}) — Patient Support & Access Infrastructure`;

  const body = `${greeting}

Congratulations to the ${drug.sponsorName} team on the recent US FDA regulatory action for ${drug.drugName} (${drug.activeIngredient}) ${indicationText}, recorded on ${drug.approvalActionDate} under application ${drug.applicationNumber}.

Our healthcare technology team reviewed the official FDA profile for ${drug.drugName} and noted several verified characteristics relevant to patient onboarding and therapy coordination:
${verifiedObservations}

While an FDA approval action does not automatically imply that a new or expanded Patient Support Program (PSP) is required, therapies with ${drug.routeOfAdministration.toLowerCase()} administration and specialty access workflows often benefit from streamlined digital benefits verification, prior authorization tracking, and adherence coordination.

If your commercial or patient services team is evaluating digital PSP workflow infrastructure for ${drug.drugName}, would you be open to a brief 15-minute introductory conversation next week?

Best regards,
Commercial Partnerships & PSP Strategy Team
Sources referenced: US FDA Drugs@FDA (${drug.applicationNumber}, ${drug.approvalActionDate})`;

  return {
    id: `draft-${drug.id}-${Date.now()}`,
    drugId: drug.id,
    drugName: drug.drugName,
    sponsorName: drug.sponsorName,
    applicationNumber: drug.applicationNumber,
    approvalActionDate: drug.approvalActionDate,
    recipientName: cleanRecipientName,
    recipientEmail: cleanRecipientEmail,
    recipientVerified,
    subject,
    body,
    evidenceCitations: drug.sources.map((s) => `${s.title}: ${s.url}`),
    createdAt,
    sendStatus: 'Draft Only (Sending Disabled)',
  };
}

/**
 * Evaluates whether an outreach email is permitted to be sent.
 * Enforces strict sending safeguards: provider must be configured, recipient verified, and user explicitly confirmed.
 */
export function validateOutreachSendSafeguards(params: {
  emailProviderConfigured: boolean;
  recipientEmail: string;
  recipientVerified: boolean;
  subject: string;
  body: string;
  userExplicitlyConfirmed: boolean;
}): { allowed: boolean; reason: string } {
  if (!params.userExplicitlyConfirmed) {
    return {
      allowed: false,
      reason: 'Explicit user confirmation is required before sending any outreach email.',
    };
  }
  if (!params.emailProviderConfigured) {
    return {
      allowed: false,
      reason: 'Email provider is not configured. Real email sending is disabled; use Copy to Clipboard instead.',
    };
  }
  if (!params.recipientVerified || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.recipientEmail.trim())) {
    return {
      allowed: false,
      reason: 'A verified recipient email address is required before sending.',
    };
  }
  if (!params.subject.trim() || !params.body.trim()) {
    return {
      allowed: false,
      reason: 'Email subject and body must be non-empty.',
    };
  }
  return { allowed: true, reason: 'Authorized for sending.' };
}

/**
 * Escapes a single CSV cell safely.
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports filtered DrugRecord entries to CSV without any credentials or secret settings.
 */
export function exportDrugRecordsToCsv(records: DrugRecord[]): string {
  const headers = [
    'Approval Action Date',
    'Drug Name',
    'Brand Name',
    'Active Ingredient',
    'Pharmaceutical Company',
    'Application Number',
    'Application Type',
    'Submission Type',
    'Action Category',
    'Potential New Launch',
    'Indication',
    'Indication Verified',
    'Dosage Form',
    'Route of Administration',
    'PSP Opportunity Score',
    'PSP Score Tier',
    'Evidence Confidence',
    'Internal Status',
    'Assigned Owner',
    'Official FDA Source URL',
  ];

  const rows = records.map((r) => [
    r.approvalActionDate,
    r.drugName,
    r.brandName || '',
    r.activeIngredient,
    r.sponsorName,
    r.applicationNumber,
    r.applicationType,
    `${r.submissionType}-${r.submissionNumber}`,
    r.actionCategory,
    r.isPotentialNewLaunch ? 'Yes' : 'No',
    r.indication,
    r.indicationVerified ? 'Verified' : 'Not Verified',
    r.dosageForm,
    r.routeOfAdministration,
    r.pspScore.totalScore,
    r.pspScore.tier,
    r.pspScore.confidenceLevel,
    r.opportunity.status,
    r.opportunity.owner,
    r.sources[0]?.url || '',
  ]);

  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');
}
