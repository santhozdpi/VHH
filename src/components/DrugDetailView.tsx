import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  ExternalLink,
  FileText,
  Mail,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  DimensionAssessment,
  DrugRecord,
  OpportunityStatus,
} from '../types/pharma';
import { ALLOWED_OPPORTUNITY_STATUSES } from '../utils/pharmaEngine';

interface DrugDetailViewProps {
  drug: DrugRecord;
  crmConfigured: boolean;
  onBack: () => void;
  onOpenApproveModal: (drug: DrugRecord) => void;
  onOpenOutreachModal: (drug: DrugRecord) => void;
  onRejectOpportunity: (drugId: string, actor: string, notes: string) => Promise<void>;
  onUpdateOpportunity: (
    drugId: string,
    updates: {
      status?: OpportunityStatus;
      savedInPipeline?: boolean;
      owner?: string;
      followUpDate?: string | null;
      noteContent?: string;
      actor?: string;
    }
  ) => Promise<void>;
}

export const DrugDetailView: React.FC<DrugDetailViewProps> = ({
  drug,
  crmConfigured,
  onBack,
  onOpenApproveModal,
  onOpenOutreachModal,
  onRejectOpportunity,
  onUpdateOpportunity,
}) => {
  const [noteInput, setNoteInput] = useState('');
  const [noteAuthor, setNoteAuthor] = useState(
    drug.opportunity.owner !== 'Unassigned'
      ? drug.opportunity.owner
      : 'Marketing BD Analyst'
  );
  const [ownerInput, setOwnerInput] = useState(drug.opportunity.owner);
  const [followUpInput, setFollowUpInput] = useState(drug.opportunity.followUpDate || '');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [crmSyncFeedback, setCrmSyncFeedback] = useState<string | null>(null);

  const dimensionsList: DimensionAssessment[] = [
    drug.pspScore.dimensions.diseaseBurden,
    drug.pspScore.dimensions.accessComplexity,
    drug.pspScore.dimensions.treatmentComplexity,
    drug.pspScore.dimensions.affordabilityComplexity,
    drug.pspScore.dimensions.evidenceConfidence,
  ];

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      await onUpdateOpportunity(drug.id, {
        noteContent: noteInput.trim(),
        actor: noteAuthor.trim() || 'Marketing Analyst',
      });
      setNoteInput('');
    } finally {
      setSavingNote(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRejectOpportunity(
      drug.id,
      noteAuthor.trim() || 'Marketing Reviewer',
      rejectReason.trim() || 'Marked as disqualified after internal review.'
    );
    setShowRejectBox(false);
    setRejectReason('');
  };

  const handleTestCrmSync = async () => {
    setCrmSyncFeedback(null);
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(drug.id)}/crm-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: noteAuthor }),
      });
      const data = await res.json();
      setCrmSyncFeedback(data.error || data.message || 'CRM sync check completed.');
    } catch (err: any) {
      setCrmSyncFeedback(err?.message || 'CRM not connected.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Primary Workflow Actions */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to FDA Approval Monitor
          </button>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{drug.drugName}</h1>
            <span className="font-mono text-sm font-semibold text-slate-600">
              {drug.applicationNumber} ({drug.submissionType}-{drug.submissionNumber})
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-sm font-medium text-slate-700">{drug.sponsorName}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateOpportunity(drug.id, {
                savedInPipeline: !drug.opportunity.savedInPipeline,
                actor: noteAuthor,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            {drug.opportunity.savedInPipeline ? (
              <>
                <BookmarkCheck className="h-3.5 w-3.5 text-blue-700" />
                Saved in Pipeline
              </>
            ) : (
              <>
                <BookmarkPlus className="h-3.5 w-3.5" />
                Save Opportunity
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateOpportunity(drug.id, {
                status: 'Under Review',
                savedInPipeline: true,
                actor: noteAuthor,
              })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Mark for Review
          </button>

          <button
            type="button"
            onClick={() => onOpenOutreachModal(drug)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Mail className="h-3.5 w-3.5 text-blue-700" />
            Prepare Outreach Draft
          </button>

          <button
            type="button"
            onClick={() => setShowRejectBox((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap shrink-0"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject Opportunity
          </button>

          <button
            type="button"
            onClick={() => onOpenApproveModal(drug)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve Opportunity
          </button>
        </div>
      </div>

      {/* Reject Confirmation Inline Box */}
      {showRejectBox && (
        <form
          onSubmit={handleConfirmReject}
          className="rounded-md border border-red-200 bg-red-50/70 p-4 space-y-3"
        >
          <div className="text-xs font-semibold text-red-900">
            Disqualify / Reject Internal Opportunity for {drug.drugName}
          </div>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for disqualifying this opportunity (e.g., generic product, existing internal hub, low access complexity)..."
            className="w-full rounded border border-red-300 bg-white px-3 py-1.5 text-xs text-slate-900"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
            >
              Confirm Disqualification
            </button>
            <button
              type="button"
              onClick={() => setShowRejectBox(false)}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Internal Approval Status Banner if Approved */}
      {drug.opportunity.internalApproval && (
        <div className="rounded-md border border-blue-200 bg-blue-50/60 p-4 text-xs text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-semibold text-blue-950">
              Internal Marketing Decision: {drug.opportunity.internalApproval.decision}
            </div>
            <div>
              Reviewed by <strong>{drug.opportunity.internalApproval.approvedBy}</strong> on{' '}
              <span className="font-mono">
                {drug.opportunity.internalApproval.approvedAt.slice(0, 16).replace('T', ' ')} UTC
              </span>{' '}
              · <span>{drug.opportunity.internalApproval.crmSyncStatus}</span>
            </div>
            {drug.opportunity.internalApproval.notes && (
              <div className="text-slate-700 italic">
                “{drug.opportunity.internalApproval.notes}”
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleTestCrmSync}
            className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50 shrink-0"
          >
            {crmConfigured ? 'Sync to CRM Sandbox' : 'Check CRM Sync Status'}
          </button>
        </div>
      )}

      {crmSyncFeedback && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          {crmSyncFeedback}
        </div>
      )}

      {/* Section A & Section B: Drug Information and Approval Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section A: Drug Information */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">
              A. Official Drug & Formulation Information
            </h2>
            <p className="text-xs text-slate-500">
              Sourced from US FDA Drugs@FDA and official product labeling
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-slate-500">Drug / Product Name</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{drug.drugName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Brand Name</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {drug.brandName || 'Generic / No Brand Name Listed'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Active Ingredient(s)</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{drug.activeIngredient}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Pharmaceutical Company / Applicant</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{drug.sponsorName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Dosage Form</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{drug.dosageForm}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Route of Administration</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{drug.routeOfAdministration}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Treatment / Pharmacologic Category</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{drug.treatmentCategory}</dd>
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-2.5">
              <dt className="text-slate-500 flex items-center justify-between">
                <span>Labeled Clinical Indication</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {drug.indicationVerified ? 'Verified via FDA Label' : 'Unverified in Summary API'}
                </span>
              </dt>
              <dd className="mt-1 text-slate-900 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                {drug.indication}
                <div className="mt-1 text-[11px] text-slate-500">
                  Source: {drug.indicationSource}
                </div>
              </dd>
            </div>
          </dl>
        </section>

        {/* Section B: Approval Information */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">
              B. Regulatory Approval & Launch Distinction
            </h2>
            <p className="text-xs text-slate-500">
              Distinguishes new molecular/biologic launches from efficacy supplements and generic approvals
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-slate-500">FDA Application Number</dt>
              <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                {drug.applicationNumber}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Official Approval Action Date</dt>
              <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                {drug.approvalActionDate}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Application Type</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{drug.applicationType}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Submission Identifier & Status</dt>
              <dd className="font-mono font-medium text-slate-900 mt-0.5">
                {drug.submissionType}-{drug.submissionNumber} (Status: {drug.submissionStatus})
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">FDA Review Priority</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{drug.reviewPriority}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Submission Classification</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {drug.submissionClassDescription || drug.submissionClassCode || 'Standard Submission'}
              </dd>
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-2.5">
              <dt className="text-slate-500">Regulatory Action Classification</dt>
              <dd className="mt-1 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="font-semibold text-slate-900">{drug.actionCategory}</div>
                <p className="mt-1 text-slate-600 leading-relaxed">
                  {drug.isPotentialNewLaunch
                    ? 'This record represents an Original NDA/BLA approval (Submission ORIG-1) and is classified as a potential new branded product launch.'
                    : drug.submissionType === 'SUPPL'
                      ? 'This record is a Supplemental Approval (SUPPL) to an existing marketed application (such as an expanded clinical indication or labeling update), not a first-time brand launch.'
                      : 'This record is an Abbreviated New Drug Application (ANDA) generic approval and does not represent a novel branded launch.'}
                </p>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Section C: PSP Opportunity Analysis (5-Dimension Rule Engine) */}
      <section className="rounded-md border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              C. Preliminary PSP Opportunity Score & Multi-Dimension Breakdown
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Formula: (Disease Burden × 0.25) + (Access Complexity × 0.20) + (Treatment Complexity × 0.20) + (Affordability × 0.20) + (Evidence Confidence × 0.15)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5">
            <div>
              <span className="text-[11px] text-slate-500 block">Total Score</span>
              <span className="font-mono text-2xl font-bold tabular-nums text-blue-800">
                {drug.pspScore.totalScore}/100
              </span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[11px] text-slate-500 block">Priority Tier</span>
              <span className="text-xs font-semibold text-slate-900">
                {drug.pspScore.tier}
              </span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[11px] text-slate-500 block">Evidence Confidence</span>
              <span className="text-xs font-semibold text-slate-900">
                {drug.pspScore.confidenceLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Safeguard Notice */}
        <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <ShieldAlert className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">
              {drug.pspScore.preliminaryLabel}
            </span>{' '}
            · Model <span className="font-mono">{drug.pspScore.modelVersion}</span> · Calculated{' '}
            <span className="font-mono">{drug.pspScore.calculatedAt.slice(0, 10)}</span>. This score is an internal prioritization heuristic based on verified FDA factors and does not predict commercial demand or replace human BD qualification.
          </div>
        </div>

        {/* 5 Dimension Cards / Rows */}
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Scoring Dimension</th>
                <th className="py-2.5 px-4 text-right">Weight</th>
                <th className="py-2.5 px-4 text-right">Dimension Score</th>
                <th className="py-2.5 px-4 text-right">Weighted Contribution</th>
                <th className="py-2.5 px-4">Verified Supporting Factors & Unknowns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {dimensionsList.map((dim) => (
                <tr key={dim.key} className="align-top">
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {dim.name}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {Math.round(dim.weight * 100)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {dim.score}/100
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-blue-800">
                    +{dim.weightedPoints.toFixed(1)} pts
                  </td>
                  <td className="py-3 px-4 space-y-1.5">
                    <div className="text-slate-800">{dim.rationale.join(' ')}</div>
                    {dim.verifiedFactors.length > 0 && (
                      <div className="text-[11px] text-emerald-800">
                        <strong>Verified:</strong> {dim.verifiedFactors.join(' · ')}
                      </div>
                    )}
                    {dim.unknownFactors.length > 0 && (
                      <div className="text-[11px] text-amber-800">
                        <strong>Unknown / Unverified:</strong> {dim.unknownFactors.join(' · ')}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Supporting Evidence, Missing Info & Next Research Steps */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              Verified Supporting Evidence
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
              {drug.pspScore.supportingEvidence.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-slate-200 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
              Missing or Unverified Information
            </h3>
            {drug.pspScore.missingInformation.length === 0 ? (
              <p className="text-xs text-slate-600">
                Core regulatory fields verified. Commercial WAC pricing and payer-specific PA criteria require manual verification.
              </p>
            ) : (
              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                {drug.pspScore.missingInformation.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-slate-200 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-700" />
              Suggested Next Research Steps
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
              {drug.pspScore.suggestedNextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Section D & Section E: Official Sources and Internal Workflow */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section D: Official Sources */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">
              D. Official Regulatory Sources & Links
            </h2>
            <p className="text-xs text-slate-500">
              Direct links to verified US FDA Drugs@FDA, approval documents, and DailyMed repositories
            </p>
          </div>

          <div className="space-y-2.5">
            {drug.sources.map((src) => (
              <div
                key={src.id}
                className="rounded-md border border-slate-200 p-3 text-xs hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block">
                      {src.sourceType}
                    </span>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1.5 mt-0.5"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">
                    Verified
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{src.citationNote}</p>
                <div className="mt-1 font-mono text-[10px] text-slate-400 break-all">
                  {src.url}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section E: Internal Workflow, Notes & Status History */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">
              E. Internal Opportunity Workflow & Audit Trail
            </h2>
            <p className="text-xs text-slate-500">
              Manage internal status, owner assignment, follow-up schedule, and analyst notes
            </p>
          </div>

          {/* Status, Owner & Follow-up Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div>
              <label htmlFor="detail-status-select" className="block font-medium text-slate-700 mb-1">
                Internal Status
              </label>
              <select
                id="detail-status-select"
                value={drug.opportunity.status}
                onChange={(e) =>
                  onUpdateOpportunity(drug.id, {
                    status: e.target.value as OpportunityStatus,
                    actor: noteAuthor,
                  })
                }
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                {ALLOWED_OPPORTUNITY_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="detail-owner-input" className="block font-medium text-slate-700 mb-1">
                Assigned Owner
              </label>
              <div className="flex gap-1">
                <input
                  id="detail-owner-input"
                  type="text"
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
                  onBlur={() => {
                    if (ownerInput !== drug.opportunity.owner) {
                      onUpdateOpportunity(drug.id, { owner: ownerInput, actor: noteAuthor });
                    }
                  }}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="detail-followup-input" className="block font-medium text-slate-700 mb-1">
                Follow-Up Date
              </label>
              <input
                id="detail-followup-input"
                type="date"
                value={followUpInput}
                onChange={(e) => {
                  setFollowUpInput(e.target.value);
                  onUpdateOpportunity(drug.id, {
                    followUpDate: e.target.value || null,
                    actor: noteAuthor,
                  });
                }}
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Add Internal Note Form */}
          <form onSubmit={handleAddNote} className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="detail-note-textarea" className="text-xs font-medium text-slate-700">
                Add Internal Research Note
              </label>
              <input
                type="text"
                aria-label="Note author name"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
                className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700"
              />
            </div>
            <div className="flex gap-2">
              <textarea
                id="detail-note-textarea"
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Record payer policy findings, hub vendor intelligence, or commercial team notes..."
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingNote || !noteInput.trim()}
                className="self-end rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                Save Note
              </button>
            </div>
          </form>

          {/* Notes List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-800">
              Internal Notes ({drug.opportunity.notes.length})
            </h3>
            {drug.opportunity.notes.length === 0 ? (
              <p className="text-xs text-slate-500">No internal notes recorded yet.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {drug.opportunity.notes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded border border-slate-200 bg-slate-50/70 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800">{n.author}</span>
                      <span className="font-mono">{n.createdAt.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <p className="text-slate-800">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status History */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="text-xs font-semibold text-slate-800">
              Opportunity Status History ({drug.opportunity.statusHistory.length})
            </h3>
            <div className="max-h-44 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-md">
              {drug.opportunity.statusHistory.map((h) => (
                <div key={h.id} className="p-2.5 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">
                      {h.previousStatus ? `${h.previousStatus} → ${h.newStatus}` : h.newStatus}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {h.timestamp.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    By {h.changedBy}: {h.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
