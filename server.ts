import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/db/database';
import {
  isValidOpportunityStatus,
  validateOutreachSendSafeguards,
} from './src/utils/pharmaEngine';

const PORT = 3000;

// Rate limiter state for /api/assistant/chat (max 20 requests per minute per IP)
const aiRateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkAiRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxReqs = 20;
  const entry = aiRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > windowMs) {
    aiRateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxReqs) {
    return false;
  }
  entry.count += 1;
  return true;
}

/**
 * Generates a grounded, source-cited analytical response from actual stored FDA records
 * if Gemini API is unavailable or returns an error, ensuring transparent disclosure.
 */
function buildDeterministicDataResponse(
  prompt: string,
  focusedDrugId?: string
): {
  reply: string;
  sources: Array<{ title: string; url: string }>;
  verifiedMode: 'Gemini AI + Verified Database Grounding' | 'Verified Database Engine (Fallback Mode)';
} {
  const allDrugs = db.getAllDrugs();
  const lower = prompt.toLowerCase();
  const focusedDrug = focusedDrugId ? db.getDrugById(focusedDrugId) : undefined;

  // Check if user asks about a specific drug by name or application number
  const matchedDrug =
    focusedDrug ||
    allDrugs.find(
      (d) =>
        lower.includes(d.drugName.toLowerCase()) ||
        lower.includes(d.applicationNumber.toLowerCase())
    );

  if (matchedDrug && (lower.includes('score') || lower.includes('why') || lower.includes('explain') || lower.includes('evidence') || lower.includes('missing'))) {
    const s = matchedDrug.pspScore;
    const d = s.dimensions;
    const missingList =
      s.missingInformation.length > 0
        ? s.missingInformation.map((m) => `- ${m}`).join('\n')
        : '- Core FDA label and indication fields are verified; commercial WAC and payer PA criteria still require human BD verification.';

    return {
      reply: `### Preliminary PSP Opportunity Analysis: ${matchedDrug.drugName} (${matchedDrug.applicationNumber})

**Verified Official Facts:**
- **Sponsor:** ${matchedDrug.sponsorName}
- **Approval Action Date:** ${matchedDrug.approvalActionDate} (${matchedDrug.actionCategory})
- **Active Ingredient:** ${matchedDrug.activeIngredient}
- **Dosage Form & Route:** ${matchedDrug.dosageForm} · ${matchedDrug.routeOfAdministration}
- **Indication:** ${matchedDrug.indication} (${matchedDrug.indicationVerified ? 'Verified via FDA Label' : 'Unverified in summary endpoint'})

**PSP Opportunity Score Breakdown (${s.totalScore}/100 — ${s.tier}):**
- **Disease Burden & Unmet Need (25% weight):** ${d.diseaseBurden.score}/100 (${d.diseaseBurden.weightedPoints} pts) — ${d.diseaseBurden.rationale.join(' ')}
- **Patient Access Complexity (20% weight):** ${d.accessComplexity.score}/100 (${d.accessComplexity.weightedPoints} pts) — ${d.accessComplexity.rationale.join(' ')}
- **Treatment & Administration Complexity (20% weight):** ${d.treatmentComplexity.score}/100 (${d.treatmentComplexity.weightedPoints} pts) — ${d.treatmentComplexity.rationale.join(' ')}
- **Affordability & Reimbursement Complexity (20% weight):** ${d.affordabilityComplexity.score}/100 (${d.affordabilityComplexity.weightedPoints} pts) — ${d.affordabilityComplexity.rationale.join(' ')}
- **Evidence Confidence & Completeness (15% weight):** ${d.evidenceConfidence.score}/100 (${d.evidenceConfidence.weightedPoints} pts)

**Missing Information & Why Human Review Is Required:**
${missingList}

*Note: This score (${s.modelVersion}) is a rule-based prioritization heuristic, not a validated commercial demand prediction.*`,
      sources: matchedDrug.sources.map((src) => ({ title: src.title, url: src.url })),
      verifiedMode: 'Verified Database Engine (Fallback Mode)',
    };
  }

  if (lower.includes('missing') && lower.includes('indication')) {
    const missingInd = allDrugs.filter((d) => !d.indicationVerified);
    const listText =
      missingInd.length > 0
        ? missingInd
            .map(
              (d) =>
                `- **${d.drugName}** (${d.applicationNumber}, ${d.sponsorName}) — Approved ${d.approvalActionDate} · Current Indication field: *"${d.indication}"* · Score: ${d.pspScore.totalScore}/100 (${d.pspScore.preliminaryLabel})`
            )
            .join('\n')
        : 'All currently monitored records have verified clinical indications.';

    return {
      reply: `### Records Requiring Indication Verification (${missingInd.length} of ${allDrugs.length} records)

The openFDA Drugs@FDA endpoint provides regulatory submission metadata but often omits Section 1 clinical indication text unless cross-referenced with official FDA prescribing information labels:

${listText}

**Suggested Next Step:** Open each record's Official Sources section and inspect the linked DailyMed / Drugs@FDA label PDF to verify the exact clinical indication before qualifying for outreach.`,
      sources: missingInd.slice(0, 4).flatMap((d) => d.sources.slice(0, 1).map((s) => ({ title: s.title, url: s.url }))),
      verifiedMode: 'Verified Database Engine (Fallback Mode)',
    };
  }

  if (lower.includes('compare') || lower.includes('top') || lower.includes('high-priority') || lower.includes('high priority')) {
    const topFive = [...allDrugs]
      .sort((a, b) => b.pspScore.totalScore - a.pspScore.totalScore)
      .slice(0, 5);

    const rows = topFive
      .map(
        (d, idx) =>
          `${idx + 1}. **${d.drugName}** (${d.applicationNumber} · ${d.sponsorName}) — **Score: ${d.pspScore.totalScore}/100 (${d.pspScore.tier})** · Confidence: ${d.pspScore.confidenceLevel} · Route: ${d.routeOfAdministration} · Action Date: ${d.approvalActionDate} · Internal Status: ${d.opportunity.status}`
      )
      .join('\n');

    return {
      reply: `### Top 5 Monitored PSP Opportunities by Preliminary Score

${rows}

**Analytical Interpretation:**
- The highest-scoring records combine parenteral/injectable administration (${topFive[0]?.routeOfAdministration}) with documented specialist monitoring, biomarker/prior authorization barriers, and verified orphan or priority FDA designations.
- **Safeguard Reminder:** High preliminary scores do not automatically qualify an account. Human review must confirm whether the manufacturer already operates an internal hub for the brand.`,
      sources: topFive.map((d) => ({
        title: d.sources[0]?.title || d.applicationNumber,
        url: d.sources[0]?.url || 'https://www.accessdata.fda.gov/scripts/cder/daf/',
      })),
      verifiedMode: 'Verified Database Engine (Fallback Mode)',
    };
  }

  if (lower.includes('draft') || lower.includes('email') || lower.includes('outreach')) {
    const target = matchedDrug || allDrugs[0];
    const draft = db.createOutreachDraft(target.id);
    return {
      reply: `### Evidence-Based Outreach Draft Prepared (${target.drugName} — ${target.sponsorName})

**Subject:** ${draft?.subject}

\`\`\`text
${draft?.body}
\`\`\`

**Safeguard Notice:** No email has been sent and no external contact address was fabricated. To review, edit, or copy this draft, open **${target.drugName} (${target.applicationNumber})** and click **Prepare Outreach Draft**.`,
      sources: target.sources.map((s) => ({ title: s.title, url: s.url })),
      verifiedMode: 'Verified Database Engine (Fallback Mode)',
    };
  }

  // Default executive summary of current FDA approval activity
  const highPriority = allDrugs.filter((d) => d.pspScore.tier === 'High priority');
  const origLaunches = allDrugs.filter((d) => d.isPotentialNewLaunch);
  const unverified = allDrugs.filter((d) => !d.indicationVerified);

  return {
    reply: `### PharmaIntel Live Regulatory & PSP Opportunity Summary

**Verified Database Metrics:**
- **Total Monitored FDA Approval Records:** ${allDrugs.length}
- **Potential New Product Launches (Original NDA/BLA):** ${origLaunches.length}
- **High-Priority PSP Score Records (80–100):** ${highPriority.length}
- **Records Requiring Indication Verification:** ${unverified.length}

**Recent Notable Approvals:**
${allDrugs
  .slice(0, 4)
  .map(
    (d) =>
      `- **${d.drugName}** (${d.applicationNumber}, ${d.sponsorName}) — Approved ${d.approvalActionDate} · ${d.actionCategory} · **PSP Score: ${d.pspScore.totalScore}/100 (${d.pspScore.tier})**`
  )
  .join('\n')}

Ask me to explain a specific drug's 5-dimension score, compare top opportunities, list records with missing data, or draft an evidence-based outreach message.`,
    sources: allDrugs.slice(0, 4).map((d) => ({
      title: d.sources[0]?.title || d.applicationNumber,
      url: d.sources[0]?.url || 'https://www.accessdata.fda.gov/scripts/cder/daf/',
    })),
    verifiedMode: 'Verified Database Engine (Fallback Mode)',
  };
}

async function startServer() {
  const app = express();

  // Security headers & JSON body parser
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  // Trigger a non-blocking initial live openFDA sync in the background on startup
  setTimeout(() => {
    db.refreshFromOpenFda('System Startup Sync').catch((err) => {
      console.warn('Initial background openFDA sync notice:', err?.message);
    });
  }, 1500);

  // 1. GET /api/health
  app.get('/api/health', (_req: Request, res: Response) => {
    const settings = db.getIntegrationSettings();
    res.json({
      status: 'ok',
      service: 'PharmaIntel — PSP Opportunity Monitor API',
      version: settings.appVersion,
      timestamp: new Date().toISOString(),
      databaseRecords: db.getAllDrugs().length,
      lastSuccessfulRefresh: settings.lastSuccessfulRefresh,
      integrations: {
        openFda: settings.openFdaStatus,
        geminiConfigured: settings.geminiConfigured,
        crmConnectionStatus: settings.crmConnectionStatus,
        emailConnectionStatus: settings.emailConnectionStatus,
      },
    });
  });

  // 2. GET /api/drugs
  app.get('/api/drugs', (req: Request, res: Response) => {
    let records = db.getAllDrugs();

    const search = String(req.query.search || '').trim().toLowerCase();
    const company = String(req.query.company || '').trim().toLowerCase();
    const applicationType = String(req.query.applicationType || '').trim();
    const actionCategory = String(req.query.actionCategory || '').trim();
    const scoreTier = String(req.query.scoreTier || '').trim();
    const minScore = req.query.minScore ? Number(req.query.minScore) : null;
    const status = String(req.query.status || '').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const sortBy = String(req.query.sortBy || 'date_desc').trim();

    if (search) {
      records = records.filter(
        (r) =>
          r.drugName.toLowerCase().includes(search) ||
          r.activeIngredient.toLowerCase().includes(search) ||
          r.applicationNumber.toLowerCase().includes(search) ||
          r.indication.toLowerCase().includes(search) ||
          r.sponsorName.toLowerCase().includes(search)
      );
    }

    if (company) {
      records = records.filter((r) => r.sponsorName.toLowerCase().includes(company));
    }

    if (applicationType && applicationType !== 'ALL') {
      records = records.filter((r) => r.applicationType === applicationType);
    }

    if (actionCategory && actionCategory !== 'ALL') {
      records = records.filter((r) => r.actionCategory === actionCategory);
    }

    if (scoreTier && scoreTier !== 'ALL') {
      records = records.filter((r) => r.pspScore.tier === scoreTier);
    }

    if (minScore !== null && !Number.isNaN(minScore)) {
      records = records.filter((r) => r.pspScore.totalScore >= minScore);
    }

    if (status && status !== 'ALL') {
      records = records.filter((r) => r.opportunity.status === status);
    }

    if (dateFrom) {
      records = records.filter((r) => r.approvalActionDate >= dateFrom);
    }

    if (dateTo) {
      records = records.filter((r) => r.approvalActionDate <= dateTo);
    }

    if (sortBy === 'score_desc') {
      records.sort((a, b) => b.pspScore.totalScore - a.pspScore.totalScore);
    } else if (sortBy === 'score_asc') {
      records.sort((a, b) => a.pspScore.totalScore - b.pspScore.totalScore);
    } else if (sortBy === 'date_asc') {
      records.sort((a, b) => a.approvalActionDate.localeCompare(b.approvalActionDate));
    } else if (sortBy === 'company_asc') {
      records.sort((a, b) => a.sponsorName.localeCompare(b.sponsorName));
    } else {
      records.sort((a, b) => b.approvalActionDate.localeCompare(a.approvalActionDate));
    }

    res.json({
      total: records.length,
      lastSuccessfulRefresh: db.getIntegrationSettings().lastSuccessfulRefresh,
      records,
    });
  });

  // 3. GET /api/drugs/pending
  app.get('/api/drugs/pending', (_req: Request, res: Response) => {
    res.json({
      sourceDisclosure:
        'Official US FDA Policy Disclosure: The US FDA does not publicly disclose confidential pending NDA or BLA applications prior to regulatory action. The records below represent verified FDA Tentative Approvals (submission_status = "TA" in openFDA Drugs@FDA) awaiting patent/exclusivity clearance.',
      records: db.getPendingDrugs(),
    });
  });

  // 4. GET /api/drugs/:id
  app.get('/api/drugs/:id', (req: Request, res: Response) => {
    const drug = db.getDrugById(String(req.params.id || ''));
    if (!drug) {
      res.status(404).json({ error: 'FDA drug record not found.' });
      return;
    }
    res.json({ record: drug });
  });

  // 5. POST /api/drugs/refresh
  app.post('/api/drugs/refresh', async (req: Request, res: Response) => {
    const actor = String(req.body?.actor || 'Marketing User (Manual Refresh)');
    const refreshResult = await db.refreshFromOpenFda(actor);
    res.json({
      refreshResult,
      totalRecords: db.getAllDrugs().length,
      records: db.getAllDrugs(),
    });
  });

  // 6. GET /api/opportunities
  app.get('/api/opportunities', (_req: Request, res: Response) => {
    const allDrugs = db.getAllDrugs();
    res.json({
      total: allDrugs.length,
      savedCount: allDrugs.filter((d) => d.opportunity.savedInPipeline).length,
      records: allDrugs,
    });
  });

  // 7. POST /api/opportunities (Save drug record to active PSP Pipeline)
  app.post('/api/opportunities', (req: Request, res: Response) => {
    const drugId = String(req.body?.drugId || '').trim();
    const owner = String(req.body?.owner || 'Marketing Lead').trim();
    const status = req.body?.status;

    if (!drugId) {
      res.status(400).json({ error: 'drugId is required.' });
      return;
    }

    const updated = db.updateOpportunity(drugId, {
      savedInPipeline: true,
      owner,
      status: isValidOpportunityStatus(status) ? status : undefined,
      actor: owner,
    });

    if (!updated) {
      res.status(404).json({ error: 'Drug record not found.' });
      return;
    }

    res.json({ record: updated });
  });

  // 8. PATCH /api/opportunities/:id
  app.patch('/api/opportunities/:id', (req: Request, res: Response) => {
    const drugId = String(req.params.id || '');
    const { status, savedInPipeline, owner, followUpDate, noteContent, actor } = req.body || {};

    if (status !== undefined && !isValidOpportunityStatus(status)) {
      res.status(400).json({ error: `Invalid opportunity status: ${status}` });
      return;
    }

    const updated = db.updateOpportunity(drugId, {
      status,
      savedInPipeline,
      owner,
      followUpDate,
      noteContent,
      actor: actor || 'Marketing Team Reviewer',
    });

    if (!updated) {
      res.status(404).json({ error: 'Opportunity record not found.' });
      return;
    }

    res.json({ record: updated });
  });

  // 9. POST /api/opportunities/:id/approve
  app.post('/api/opportunities/:id/approve', (req: Request, res: Response) => {
    const drugId = String(req.params.id || '');
    const actor = String(req.body?.actor || 'Marketing BD Reviewer').trim();
    const notes = String(req.body?.notes || '').trim();

    const result = db.approveOrRejectOpportunity({
      drugId,
      decision: 'Approved Internally',
      actor,
      notes,
    });

    if (!result) {
      res.status(404).json({ error: 'Drug record not found.' });
      return;
    }

    res.json({
      record: result.drug,
      crmNotice: result.crmNotice,
      message: `Internal opportunity approval saved for ${result.drug.drugName} (${result.drug.applicationNumber}). ${result.crmNotice}`,
    });
  });

  // 10. POST /api/opportunities/:id/reject
  app.post('/api/opportunities/:id/reject', (req: Request, res: Response) => {
    const drugId = String(req.params.id || '');
    const actor = String(req.body?.actor || 'Marketing BD Reviewer').trim();
    const notes = String(req.body?.notes || '').trim();

    const result = db.approveOrRejectOpportunity({
      drugId,
      decision: 'Disqualified',
      actor,
      notes,
    });

    if (!result) {
      res.status(404).json({ error: 'Drug record not found.' });
      return;
    }

    res.json({
      record: result.drug,
      crmNotice: result.crmNotice,
      message: `Opportunity marked as Disqualified for ${result.drug.drugName}.`,
    });
  });

  // 11. POST /api/opportunities/:id/crm-sync
  app.post('/api/opportunities/:id/crm-sync', (req: Request, res: Response) => {
    const drugId = String(req.params.id || '');
    const drug = db.getDrugById(drugId);
    if (!drug) {
      res.status(404).json({ error: 'Drug record not found.' });
      return;
    }

    const settings = db.getIntegrationSettings();
    if (settings.crmConnectionStatus === 'Not Configured (Disabled)') {
      db.recordAudit({
        actor: String(req.body?.actor || 'Marketing User'),
        actionType: 'CRM_SYNC_ATTEMPT',
        targetId: drug.applicationNumber,
        summary: `Blocked CRM sync for ${drug.drugName}: CRM integration is disabled until provider credentials are configured.`,
        metadata: { crmProvider: settings.crmProvider },
      });
      res.status(400).json({
        synced: false,
        crmRecordId: null,
        error: 'CRM not connected — internal review saved. Configure Salesforce or HubSpot credentials in Settings before syncing.',
      });
      return;
    }

    res.status(400).json({
      synced: false,
      crmRecordId: null,
      error: 'CRM live credential verification required before creating external records.',
    });
  });

  // 12. POST /api/opportunities/:id/outreach-draft
  app.post('/api/opportunities/:id/outreach-draft', (req: Request, res: Response) => {
    const drugId = String(req.params.id || '');
    const { recipientName, recipientEmail, actor } = req.body || {};

    const draft = db.createOutreachDraft(
      drugId,
      String(recipientName || ''),
      String(recipientEmail || ''),
      String(actor || 'Marketing Lead')
    );

    if (!draft) {
      res.status(404).json({ error: 'Drug record not found.' });
      return;
    }

    res.json({ draft });
  });

  // 13. POST /api/opportunities/:id/outreach-send
  app.post('/api/opportunities/:id/outreach-send', (req: Request, res: Response) => {
    const settings = db.getIntegrationSettings();
    const emailConfigured = settings.emailConnectionStatus === 'Configured';
    const {
      recipientEmail = '',
      recipientVerified = false,
      subject = '',
      body = '',
      userExplicitlyConfirmed = false,
    } = req.body || {};

    const check = validateOutreachSendSafeguards({
      emailProviderConfigured: emailConfigured,
      recipientEmail: String(recipientEmail),
      recipientVerified: Boolean(recipientVerified),
      subject: String(subject),
      body: String(body),
      userExplicitlyConfirmed: Boolean(userExplicitlyConfirmed),
    });

    if (!check.allowed) {
      res.status(400).json({
        sent: false,
        error: check.reason,
      });
      return;
    }

    res.status(400).json({
      sent: false,
      error: 'External email provider is disabled in this environment. Use Copy to Clipboard.',
    });
  });

  // 14. GET /api/companies
  app.get('/api/companies', (_req: Request, res: Response) => {
    res.json({
      companies: db.getCompanySummaries(),
    });
  });

  // 15. GET /api/reports/summary
  app.get('/api/reports/summary', (req: Request, res: Response) => {
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();

    const allDrugs = db.getAllDrugs();
    let periodDrugs = [...allDrugs];
    if (dateFrom) {
      periodDrugs = periodDrugs.filter((d) => d.approvalActionDate >= dateFrom);
    }
    if (dateTo) {
      periodDrugs = periodDrugs.filter((d) => d.approvalActionDate <= dateTo);
    }

    const companies = db.getCompanySummaries();
    const settings = db.getIntegrationSettings();

    const byTier = {
      'High priority': allDrugs.filter((d) => d.pspScore.tier === 'High priority').length,
      'Moderate priority': allDrugs.filter((d) => d.pspScore.tier === 'Moderate priority').length,
      Watchlist: allDrugs.filter((d) => d.pspScore.tier === 'Watchlist').length,
      'Low priority or insufficient evidence': allDrugs.filter(
        (d) => d.pspScore.tier === 'Low priority or insufficient evidence'
      ).length,
    };

    const byStatus: Record<string, number> = {};
    for (const d of allDrugs) {
      byStatus[d.opportunity.status] = (byStatus[d.opportunity.status] || 0) + 1;
    }

    const byConfidence = {
      High: allDrugs.filter((d) => d.pspScore.confidenceLevel === 'High').length,
      Moderate: allDrugs.filter((d) => d.pspScore.confidenceLevel === 'Moderate').length,
      'Low — Verification Needed': allDrugs.filter(
        (d) => d.pspScore.confidenceLevel === 'Low — Verification Needed'
      ).length,
    };

    res.json({
      metrics: {
        totalMonitoredRecords: allDrugs.length,
        newApprovalActionsInPeriod: periodDrugs.length,
        potentialNewLaunchesCount: allDrugs.filter((d) => d.isPotentialNewLaunch).length,
        highPspScoreRecords: byTier['High priority'],
        companiesIdentified: companies.length,
        awaitingReviewCount: allDrugs.filter(
          (d) =>
            d.opportunity.status === 'New' ||
            d.opportunity.status === 'Research Required' ||
            d.opportunity.status === 'Under Review'
        ).length,
        approvedInternallyCount: allDrugs.filter(
          (d) => d.opportunity.status === 'Approved Internally'
        ).length,
        recordsRequiringVerification: allDrugs.filter(
          (d) => !d.indicationVerified || d.pspScore.confidenceLevel === 'Low — Verification Needed'
        ).length,
      },
      byTier,
      byStatus,
      byConfidence,
      companies,
      missingDataRecords: allDrugs.filter(
        (d) => !d.indicationVerified || d.pspScore.missingInformation.length > 0
      ),
      refreshHistory: db.getRefreshHistory(),
      auditLogs: db.getAuditLogs().slice(0, 30),
      lastSuccessfulRefresh: settings.lastSuccessfulRefresh,
    });
  });

  // 16. GET & PATCH /api/settings/integrations
  app.get('/api/settings/integrations', (_req: Request, res: Response) => {
    res.json({
      settings: db.getIntegrationSettings(),
      auditLogs: db.getAuditLogs().slice(0, 20),
    });
  });

  app.patch('/api/settings/integrations', (req: Request, res: Response) => {
    const {
      crmProvider,
      crmInstanceUrl,
      crmSandboxMode,
      emailProvider,
      emailFromAddress,
      dataRetentionDays,
      persistAiHistory,
      autoRefreshIntervalHours,
    } = req.body || {};

    const updated = db.updateSettings({
      ...(crmProvider ? { crmProvider } : {}),
      ...(crmInstanceUrl !== undefined ? { crmInstanceUrl: String(crmInstanceUrl).trim() } : {}),
      ...(typeof crmSandboxMode === 'boolean' ? { crmSandboxMode } : {}),
      ...(emailProvider ? { emailProvider } : {}),
      ...(emailFromAddress !== undefined ? { emailFromAddress: String(emailFromAddress).trim() } : {}),
      ...(typeof dataRetentionDays === 'number' ? { dataRetentionDays } : {}),
      ...(typeof persistAiHistory === 'boolean' ? { persistAiHistory } : {}),
      ...(typeof autoRefreshIntervalHours === 'number' ? { autoRefreshIntervalHours } : {}),
    });

    res.json({ settings: updated });
  });

  app.post('/api/settings/test-connection', async (req: Request, res: Response) => {
    const target = String(req.body?.target || '');
    if (target === 'openfda') {
      try {
        const r = await fetch('https://api.fda.gov/drug/drugsfda.json?limit=1');
        if (r.ok) {
          res.json({
            ok: true,
            message: 'Successfully verified connection to official US FDA openFDA Drugs@FDA endpoint (HTTP 200).',
          });
          return;
        }
        res.json({
          ok: false,
          message: `openFDA returned HTTP ${r.status}. Baseline verified cache remains active.`,
        });
        return;
      } catch (e: any) {
        res.json({
          ok: false,
          message: `Could not reach openFDA live endpoint (${e?.message || 'network error'}). Using verified local FDA dataset.`,
        });
        return;
      }
    }

    if (target === 'crm') {
      const s = db.getIntegrationSettings();
      if (s.crmProvider === 'none' || !s.crmInstanceUrl) {
        res.json({
          ok: false,
          message: 'CRM integration is not configured. Select a CRM provider and configure server-side OAuth credentials before enabling.',
        });
        return;
      }
      res.json({
        ok: false,
        message: `CRM provider (${s.crmProvider}) requires server-side client secret (CRM_CLIENT_SECRET) in environment variables. Keeping CRM in safe disabled state.`,
      });
      return;
    }

    if (target === 'email') {
      res.json({
        ok: false,
        message: 'Email provider credentials (EMAIL_API_KEY) are not configured in server environment variables. Real email sending remains safely disabled.',
      });
      return;
    }

    res.status(400).json({ ok: false, message: 'Unknown connection test target.' });
  });

  // 17. AI Assistant Endpoints (/api/assistant/history & /api/assistant/chat)
  app.get('/api/assistant/history', (_req: Request, res: Response) => {
    res.json({ history: db.getAiHistory() });
  });

  app.delete('/api/assistant/history', (_req: Request, res: Response) => {
    db.clearAiHistory();
    res.json({ history: [] });
  });

  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'local';
    if (!checkAiRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Rate limit exceeded for AI Assistant (max 20 requests/minute). Please wait a moment.',
      });
      return;
    }

    const message = String(req.body?.message || '').trim();
    const focusedDrugId = req.body?.focusedDrugId ? String(req.body.focusedDrugId) : undefined;

    if (!message) {
      res.status(400).json({ error: 'Prompt message is required.' });
      return;
    }

    db.addAiMessage('user', message, []);

    const allDrugs = db.getAllDrugs();
    const focusedDrug = focusedDrugId ? db.getDrugById(focusedDrugId) : undefined;

    // Build compact, verified context of application data for Gemini
    const dataContext = allDrugs.map((d) => ({
      id: d.id,
      drugName: d.drugName,
      brandName: d.brandName,
      activeIngredient: d.activeIngredient,
      sponsorName: d.sponsorName,
      applicationNumber: d.applicationNumber,
      applicationType: d.applicationType,
      approvalActionDate: d.approvalActionDate,
      actionCategory: d.actionCategory,
      isPotentialNewLaunch: d.isPotentialNewLaunch,
      indication: d.indication,
      indicationVerified: d.indicationVerified,
      dosageForm: d.dosageForm,
      route: d.routeOfAdministration,
      pspScore: d.pspScore.totalScore,
      tier: d.pspScore.tier,
      confidenceLevel: d.pspScore.confidenceLevel,
      preliminaryLabel: d.pspScore.preliminaryLabel,
      dimensions: {
        diseaseBurden: d.pspScore.dimensions.diseaseBurden.score,
        accessComplexity: d.pspScore.dimensions.accessComplexity.score,
        treatmentComplexity: d.pspScore.dimensions.treatmentComplexity.score,
        affordabilityComplexity: d.pspScore.dimensions.affordabilityComplexity.score,
        evidenceConfidence: d.pspScore.dimensions.evidenceConfidence.score,
      },
      missingInformation: d.pspScore.missingInformation,
      internalStatus: d.opportunity.status,
      officialSourceUrl: d.sources[0]?.url || '',
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallback = buildDeterministicDataResponse(message, focusedDrugId);
      db.addAiMessage('assistant', fallback.reply, fallback.sources);
      res.json({
        reply: fallback.reply,
        sources: fallback.sources,
        mode: fallback.verifiedMode,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are the PharmaIntel PSP Opportunity Intelligence Assistant for a pharmaceutical healthcare technology marketing and business development team.
CRITICAL RULES:
1. Base every factual claim strictly on the provided VERIFIED APPLICATION DATA JSON below.
2. NEVER fabricate drug indications, approval dates, application numbers, company contacts, email addresses, or URLs.
3. Explicitly distinguish between:
   - Verified Official FDA Data (Application number, approval date, dosage/route, verified label indication)
   - Rule-Based Preliminary PSP Score Interpretation (Model ${db.getIntegrationSettings().scoringModelVersion}, weights: Disease Burden 25%, Access Complexity 20%, Treatment Complexity 20%, Affordability 20%, Evidence Confidence 15%).
4. If indication or commercial pricing/reimbursement data is missing or marked "See official label", explicitly state that it is unverified.
5. Never claim to have sent an email or created a CRM record. Remind the user that external actions require separate human confirmation.
6. Cite the official FDA Application Number (e.g., BLA761390, NDA218730) for every drug you mention.

Currently focused drug record: ${focusedDrug ? `${focusedDrug.drugName} (${focusedDrug.applicationNumber})` : 'None'}

VERIFIED APPLICATION DATA JSON:
${JSON.stringify(dataContext, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      if (!text.trim()) {
        throw new Error('Empty response from Gemini model');
      }

      // Extract relevant official sources for any drug mentioned in the prompt or response
      const citedSources: Array<{ title: string; url: string }> = [];
      for (const d of allDrugs) {
        if (
          text.toUpperCase().includes(d.applicationNumber.toUpperCase()) ||
          text.toLowerCase().includes(d.drugName.toLowerCase()) ||
          (focusedDrug && focusedDrug.id === d.id)
        ) {
          if (d.sources[0]) {
            citedSources.push({ title: d.sources[0].title, url: d.sources[0].url });
          }
        }
      }

      db.addAiMessage('assistant', text, citedSources.slice(0, 5));
      res.json({
        reply: text,
        sources: citedSources.slice(0, 5),
        mode: 'Gemini AI + Verified Database Grounding',
      });
    } catch (err: any) {
      console.warn('Gemini API fallback triggered:', err?.message);
      const fallback = buildDeterministicDataResponse(message, focusedDrugId);
      db.addAiMessage('assistant', fallback.reply, fallback.sources);
      res.json({
        reply: fallback.reply,
        sources: fallback.sources,
        mode: fallback.verifiedMode,
        notice: 'Answered using PharmaIntel Verified Data Engine (Gemini API unreachable or key not configured).',
      });
    }
  });

  // Mount Vite dev server in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PharmaIntel — PSP Opportunity Monitor running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
