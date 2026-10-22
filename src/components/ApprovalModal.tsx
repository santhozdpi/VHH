import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { DrugRecord } from '../types/pharma';

interface ApprovalModalProps {
  drug: DrugRecord;
  crmConfigured: boolean;
  onClose: () => void;
  onConfirmApprove: (drugId: string, actor: string, notes: string) => Promise<void>;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  drug,
  crmConfigured,
  onClose,
  onConfirmApprove,
}) => {
  const [actor, setActor] = useState(
    drug.opportunity.owner !== 'Unassigned'
      ? drug.opportunity.owner
      : 'Elena Rostova (VP Specialty BD)'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor.trim()) {
      setError('Reviewer name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirmApprove(drug.id, actor.trim(), notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save internal approval.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-modal-title"
    >
      <div className="w-full max-w-xl rounded-md border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-blue-700" />
            <h2 id="approve-modal-title" className="text-base font-semibold text-slate-900">
              Confirm Internal PSP Opportunity Approval
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close approval confirmation dialog"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-slate-900">
              Important Governance Distinction
            </div>
            <p>
              Approving an opportunity internally indicates that the marketing and business development team has validated this record for PSP outreach investigation. It does <strong>not</strong> alter FDA regulatory status or imply validated commercial demand.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3.5 text-xs">
            <div>
              <span className="text-slate-500 block">Selected Drug / Product</span>
              <span className="font-semibold text-slate-900">{drug.drugName}</span>
              <span className="text-slate-500 block mt-0.5">{drug.activeIngredient}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Pharmaceutical Company</span>
              <span className="font-semibold text-slate-900">{drug.sponsorName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">FDA Application & Action Date</span>
              <span className="font-mono font-medium text-slate-900">
                {drug.applicationNumber} · {drug.approvalActionDate}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Preliminary PSP Score</span>
              <span className="font-mono font-semibold text-blue-800">
                {drug.pspScore.totalScore}/100
              </span>{' '}
              <span className="text-slate-600">
                · {drug.pspScore.tier} ({drug.pspScore.confidenceLevel} confidence)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-700 block">
              Verified Official FDA Sources Reviewed
            </span>
            <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
              {drug.sources.map((src) => (
                <a
                  key={src.id}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs text-blue-700 hover:underline py-0.5"
                >
                  <span className="truncate pr-2">{src.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="approval-reviewer-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Approving Reviewer / Owner
            </label>
            <input
              id="approval-reviewer-input"
              type="text"
              required
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="approval-notes-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Internal Qualification Notes & Evidence Summary
            </label>
            <textarea
              id="approval-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document why this approval warrants PSP outreach (e.g., specialty administration, REMS/biomarker barrier, or benefits investigation need)..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <span className="font-semibold">CRM Synchronization Status: </span>
              {crmConfigured
                ? 'CRM Sandbox is configured. After saving internal approval, you can trigger a separate explicit CRM sync.'
                : 'CRM not connected — internal review will be saved to the PharmaIntel database without sending any external network request.'}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Saving Internal Approval...' : 'Confirm Internal Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
