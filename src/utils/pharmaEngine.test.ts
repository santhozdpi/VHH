import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyInternalApprovalDecision,
  buildEvidenceBasedOutreachDraft,
  calculatePspOpportunityScore,
  classifyActionCategory,
  deduplicateDrugRecords,
  exportDrugRecordsToCsv,
  isValidOpportunityStatus,
  normalizeOpenFdaRecord,
  parseOpenFdaDate,
  sortDrugsByApprovalDateDesc,
  validateOutreachSendSafeguards,
} from './pharmaEngine';

test('parseOpenFdaDate normalizes YYYYMMDD and ISO strings accurately', () => {
  assert.equal(parseOpenFdaDate('20250919'), '2025-09-19');
  assert.equal(parseOpenFdaDate('2025-10-04T12:00:00Z'), '2025-10-04');
  assert.equal(parseOpenFdaDate('invalid'), null);
  assert.equal(parseOpenFdaDate(null), null);
});

test('classifyActionCategory distinguishes Original, Supplemental, Generic ANDA, and Tentative approvals', () => {
  const origNda = classifyActionCategory({
    applicationType: 'NDA',
    submissionType: 'ORIG',
    submissionStatus: 'AP',
  });
  assert.equal(origNda.category, 'Original Approval (Potential New Launch)');
  assert.equal(origNda.isPotentialNewLaunch, true);

  const supplBla = classifyActionCategory({
    applicationType: 'BLA',
    submissionType: 'SUPPL',
    submissionStatus: 'AP',
  });
  assert.equal(supplBla.category, 'Supplemental Approval (Label/Indication Expansion)');
  assert.equal(supplBla.isPotentialNewLaunch, false);

  const genericAnda = classifyActionCategory({
    applicationType: 'ANDA',
    submissionType: 'ORIG',
    submissionStatus: 'AP',
  });
  assert.equal(genericAnda.category, 'Generic Approval (ANDA)');
  assert.equal(genericAnda.isPotentialNewLaunch, false);

  const tentative = classifyActionCategory({
    applicationType: 'NDA',
    submissionType: 'ORIG',
    submissionStatus: 'TA',
  });
  assert.equal(
    tentative.category,
    'Tentative Approval (Awaiting Final Patent/Exclusivity Clearance)'
  );
  assert.equal(tentative.isPotentialNewLaunch, false);
});

test('normalizeOpenFdaRecord normalizes official openFDA payload and handles missing data safely', () => {
  const rawSample = {
    application_number: 'BLA761390',
    sponsor_name: 'VERIDIAN BIOPHARMA INC',
    products: [
      {
        brand_name: 'NIKTIMVO',
        active_ingredients: [{ name: 'AXATILIMAB-CSFR' }],
        dosage_form: 'INJECTION',
        route: 'INTRAVENOUS',
        marketing_status: 'Prescription',
      },
    ],
    submissions: [
      {
        submission_type: 'ORIG',
        submission_number: '1',
        submission_status: 'AP',
        submission_status_date: '20250814',
        review_priority: 'PRIORITY',
      },
    ],
  };

  // Without supplemental label verification, indication must default to "See official label" (never fabricated)
  const recordUnverified = normalizeOpenFdaRecord(rawSample, {}, '2025-10-01T00:00:00.000Z');
  assert.ok(recordUnverified);
  assert.equal(recordUnverified.id, 'BLA761390-ORIG-1-20250814');
  assert.equal(recordUnverified.indication, 'See official label');
  assert.equal(recordUnverified.indicationVerified, false);
  assert.equal(recordUnverified.pspScore.preliminaryLabel, 'Preliminary — requires verification');
  assert.equal(recordUnverified.opportunity.status, 'Research Required');
  assert.ok(
    recordUnverified.sources.some((s) => s.url.includes('ApplNo=761390')),
    'Should include official Drugs@FDA link'
  );
});

test('PSP Opportunity Score formula applies exact 25/20/20/20/15 weights and rounds to whole number', () => {
  const highPriorityScore = calculatePspOpportunityScore(
    {
      applicationNumber: 'BLA761390',
      applicationType: 'BLA',
      submissionType: 'ORIG',
      submissionStatus: 'AP',
      drugName: 'NIKTIMVO',
      activeIngredient: 'AXATILIMAB-CSFR',
      sponsorName: 'INCYTE CORP',
      indication: 'Chronic graft-versus-host disease (cGVHD) after failure of at least two prior lines of systemic therapy',
      indicationVerified: true,
      treatmentCategory: 'Rare & Genetic Disease / Immunology',
      dosageForm: 'INJECTION, SOLUTION',
      routeOfAdministration: 'INTRAVENOUS',
      reviewPriority: 'ORPHAN',
      pharmacologicClass: ['CSF-1R Blocking Antibody'],
      boxedWarningPresent: true,
      remsRequired: true,
      verifiedAccessBarriers: [
        'Prior authorization requiring documented failure of 2+ systemic therapy lines',
        'Specialty infusion center site-of-care coordination',
      ],
      verifiedAffordabilityFactors: [
        'Specialty biologic medical benefit verification and co-pay assistance assessment',
        'Bridge supply coordination during payer appeals',
      ],
      sourcesCount: 3,
      hasOfficialLabelSource: true,
    },
    '2025-10-01T00:00:00.000Z'
  );

  const d = highPriorityScore.dimensions;
  const expectedRaw =
    d.diseaseBurden.score * 0.25 +
    d.accessComplexity.score * 0.2 +
    d.treatmentComplexity.score * 0.2 +
    d.affordabilityComplexity.score * 0.2 +
    d.evidenceConfidence.score * 0.15;

  assert.equal(highPriorityScore.totalScore, Math.round(expectedRaw));
  assert.ok(highPriorityScore.totalScore >= 80);
  assert.equal(highPriorityScore.tier, 'High priority');
  assert.equal(highPriorityScore.confidenceLevel, 'High');
});

test('sortDrugsByApprovalDateDesc sorts newest first and deduplicateDrugRecords preserves user workflow state', () => {
  const recOlder = normalizeOpenFdaRecord(
    {
      application_number: 'NDA210001',
      sponsor_name: 'ALPHA PHARMA',
      products: [{ brand_name: 'ALPHADRUG', active_ingredients: [{ name: 'ALPHAMAB' }], dosage_form: 'TABLET', route: 'ORAL' }],
      submissions: [{ submission_type: 'ORIG', submission_number: '1', submission_status: 'AP', submission_status_date: '20250501' }],
    },
    {},
    '2025-10-01T00:00:00.000Z'
  )!;

  const recNewer = normalizeOpenFdaRecord(
    {
      application_number: 'NDA210002',
      sponsor_name: 'BETA PHARMA',
      products: [{ brand_name: 'BETADRUG', active_ingredients: [{ name: 'BETAMAB' }], dosage_form: 'INJECTION', route: 'SUBCUTANEOUS' }],
      submissions: [{ submission_type: 'ORIG', submission_number: '1', submission_status: 'AP', submission_status_date: '20250915' }],
    },
    {},
    '2025-10-01T00:00:00.000Z'
  )!;

  const sorted = sortDrugsByApprovalDateDesc([recOlder, recNewer]);
  assert.equal(sorted[0].id, recNewer.id);
  assert.equal(sorted[1].id, recOlder.id);

  // Modify recNewer's opportunity state (e.g., approved internally)
  const approvedRes = applyInternalApprovalDecision({
    opportunity: recNewer.opportunity,
    decision: 'Approved Internally',
    actor: 'Director of BD',
    notes: 'Verified specialty hub fit',
    crmConfigured: false,
    timestamp: '2025-10-02T00:00:00.000Z',
  });
  recNewer.opportunity = approvedRes.updatedOpportunity;

  // Incoming refresh has same ID
  const refreshedIncoming = normalizeOpenFdaRecord(
    {
      application_number: 'NDA210002',
      sponsor_name: 'BETA PHARMA',
      products: [{ brand_name: 'BETADRUG', active_ingredients: [{ name: 'BETAMAB' }], dosage_form: 'INJECTION', route: 'SUBCUTANEOUS' }],
      submissions: [{ submission_type: 'ORIG', submission_number: '1', submission_status: 'AP', submission_status_date: '20250915' }],
    },
    {},
    '2025-10-03T00:00:00.000Z'
  )!;

  const deduped = deduplicateDrugRecords([recNewer, recOlder], [refreshedIncoming]);
  assert.equal(deduped.merged.length, 2);
  assert.equal(deduped.newCount, 0);
  assert.equal(deduped.updatedCount, 1);
  assert.equal(deduped.merged[0].opportunity.status, 'Approved Internally');
  assert.equal(
    deduped.merged[0].opportunity.internalApproval?.crmSyncStatus,
    'CRM not connected — internal review saved.'
  );
});

test('Internal approval workflow works without CRM and Email safeguards block unconfigured sending', () => {
  const sample = normalizeOpenFdaRecord(
    {
      application_number: 'NDA218000',
      sponsor_name: 'OMEGA THERAPEUTICS',
      products: [{ brand_name: 'OMEGAVAX', active_ingredients: [{ name: 'OMEGASTAT' }], dosage_form: 'INJECTION', route: 'SUBCUTANEOUS' }],
      submissions: [{ submission_type: 'ORIG', submission_number: '1', submission_status: 'AP', submission_status_date: '20250920' }],
    },
    {},
    '2025-10-01T00:00:00.000Z'
  )!;

  assert.equal(isValidOpportunityStatus('Approved Internally'), true);
  assert.equal(isValidOpportunityStatus('InvalidStatus'), false);

  const { updatedOpportunity, crmNotice } = applyInternalApprovalDecision({
    opportunity: sample.opportunity,
    decision: 'Approved Internally',
    actor: 'Marketing Lead',
    notes: 'High complexity injectable; priority for Q4 outreach.',
    crmConfigured: false,
  });

  assert.equal(updatedOpportunity.status, 'Approved Internally');
  assert.equal(updatedOpportunity.savedInPipeline, true);
  assert.equal(updatedOpportunity.crmSyncStatus, 'Not Connected');
  assert.equal(crmNotice, 'CRM not connected — internal review saved.');

  const draft = buildEvidenceBasedOutreachDraft(sample);
  assert.equal(draft.sendStatus, 'Draft Only (Sending Disabled)');
  assert.equal(draft.recipientVerified, false);

  const sendCheckDisabled = validateOutreachSendSafeguards({
    emailProviderConfigured: false,
    recipientEmail: 'bd@omegatherapeutics.example',
    recipientVerified: true,
    subject: draft.subject,
    body: draft.body,
    userExplicitlyConfirmed: true,
  });
  assert.equal(sendCheckDisabled.allowed, false);
  assert.ok(sendCheckDisabled.reason.includes('Email provider is not configured'));

  const csvOutput = exportDrugRecordsToCsv([sample]);
  assert.ok(csvOutput.includes('Approval Action Date,Drug Name'));
  assert.ok(csvOutput.includes('NDA218000'));
  assert.ok(!csvOutput.includes('GEMINI_API_KEY'));
});

test('PharmaIntelDatabase persists internal approvals, status changes, and notes across restarts', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { PharmaIntelDatabase } = await import('../db/database');

  const tmpDbPath = path.join(process.cwd(), 'data', `test-db-${Date.now()}.json`);
  try {
    const dbInstance1 = new PharmaIntelDatabase(tmpDbPath);
    const drugs1 = dbInstance1.getAllDrugs();
    assert.ok(drugs1.length >= 10, 'Should seed verified FDA baseline records');

    const targetDrug = drugs1.find((d) => d.applicationNumber === 'BLA761363') || drugs1[0];
    const approvalResult = dbInstance1.approveOrRejectOpportunity({
      drugId: targetDrug.id,
      decision: 'Approved Internally',
      actor: 'Unit Test Reviewer',
      notes: 'Confirmed PAH subcutaneous reconstitution support opportunity.',
    });

    assert.ok(approvalResult);
    assert.equal(approvalResult.drug.opportunity.status, 'Approved Internally');
    assert.equal(approvalResult.crmNotice, 'CRM not connected — internal review saved.');

    // Simulate application restart by creating a fresh instance reading from disk
    const dbInstance2 = new PharmaIntelDatabase(tmpDbPath);
    const reloadedDrug = dbInstance2.getDrugById(targetDrug.id);
    assert.ok(reloadedDrug);
    assert.equal(reloadedDrug.opportunity.status, 'Approved Internally');
    assert.equal(reloadedDrug.opportunity.savedInPipeline, true);
    assert.equal(reloadedDrug.opportunity.internalApproval?.approvedBy, 'Unit Test Reviewer');
  } finally {
    if (fs.existsSync(tmpDbPath)) {
      fs.unlinkSync(tmpDbPath);
    }
  }
});

