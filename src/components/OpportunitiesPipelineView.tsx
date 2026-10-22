import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  History,
  Mail,
  MessageSquarePlus,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { DrugRecord, OpportunityStatus } from '../types/pharma';
import {
  ALLOWED_OPPORTUNITY_STATUSES,
  exportDrugRecordsToCsv,
} from '../utils/pharmaEngine';

interface OpportunitiesPipelineViewProps {
  drugs: DrugRecord[];
  onSelectDrug: (drug: DrugRecord) => void;
  onOpenApproveModal: (drug: DrugRecord) => void;
  onOpenOutreachModal: (drug: DrugRecord) => void;
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

export const OpportunitiesPipelineView: React.FC<OpportunitiesPipelineViewProps> = ({
  drugs,
  onSelectDrug,
  onOpenApproveModal,
  onOpenOutreachModal,
  onUpdateOpportunity,
}) => {
  const [viewScope, setViewScope] = useState<'SAVED_ONLY' | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'updated_desc'>('score_desc');
  const [expandedHistoryDrugId, setExpandedHistoryDrugId] = useState<string | null>(null);
  const [inlineNoteDrugId, setInlineNoteDrugId] = useState<string | null>(null);
  const [inlineNoteText, setInlineNoteText] = useState('');

  const filteredOpportunities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drugs
      .filter((d) => {
        if (viewScope === 'SAVED_ONLY' && !d.opportunity.savedInPipeline) return false;
        if (statusFilter !== 'ALL' && d.opportunity.status !== statusFilter) return false;
        if (
          q &&
          !d.drugName.toLowerCase().includes(q) &&
          !d.sponsorName.toLowerCase().includes(q) &&
          !d.applicationNumber.toLowerCase().includes(q) &&
          !d.opportunity.owner.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score_asc') return a.pspScore.totalScore - b.pspScore.totalScore;
        if (sortBy === 'updated_desc') {
          return b.opportunity.lastUpdatedAt.localeCompare(a.opportunity.lastUpdatedAt);
        }
        return b.pspScore.totalScore - a.pspScore.totalScore;
      });
  }, [drugs, viewScope, statusFilter, searchQuery, sortBy]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: drugs.length };
    for (const st of ALLOWED_OPPORTUNITY_STATUSES) {
      counts[st] = drugs.filter((d) => d.opportunity.status === st).length;
    }
    return counts;
  }, [drugs]);

  const handleSaveInlineNote = async (drugId: string) => {
    if (!inlineNoteText.trim()) return;
    await onUpdateOpportunity(drugId, {
      noteContent: inlineNoteText.trim(),
      savedInPipeline: true,
      actor: 'Marketing Pipeline Reviewer',
    });
    setInlineNoteText('');
    setInlineNoteDrugId(null);
  };

  const handleExportCsv = () => {
    const csv = exportDrugRecordsToCsv(filteredOpportunities);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaintel-psp-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            PSP Opportunity Pipeline & Qualification Workflow
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Manage internal review statuses, assign BD owners, schedule follow-ups, and track qualification history across FDA records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-md border border-slate-300 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewScope('ALL')}
              className={`rounded px-3 py-1 font-medium transition-colors whitespace-nowrap ${
                viewScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Monitored Records ({drugs.length})
            </button>
            <button
              type="button"
              onClick={() => setViewScope('SAVED_ONLY')}
              className={`rounded px-3 py-1 font-medium transition-colors whitespace-nowrap ${
                viewScope === 'SAVED_ONLY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved in Active Pipeline ({drugs.filter((d) => d.opportunity.savedInPipeline).length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export Pipeline CSV
          </button>
        </div>
      </div>

      {/* Safeguard Reminder */}
      <div className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
        <ShieldAlert className="h-4 w-4 text-blue-700 shrink-0" />
        <span>
          <strong>Human Review Safeguard:</strong> A high preliminary PSP Opportunity Score prioritizes research but does not automatically qualify an opportunity. A human reviewer must validate clinical and reimbursement evidence before internal approval.
        </span>
      </div>

      {/* Interactive Status Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Statuses ({statusCounts.ALL})
        </button>
        {ALLOWED_OPPORTUNITY_STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-blue-700 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {st} ({statusCounts[st] || 0})
          </button>
        ))}
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            aria-label="Search pipeline by drug, company, application number, or owner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pipeline by drug, company, application #, or owner..."
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="pipeline-sort" className="font-medium text-slate-700">
            Sort Pipeline:
          </label>
          <select
            id="pipeline-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="score_desc">PSP Opportunity Score (High to Low)</option>
            <option value="score_asc">PSP Opportunity Score (Low to High)</option>
            <option value="updated_desc">Last Updated Activity (Newest First)</option>
          </select>
        </div>
      </div>

      {/* Pipeline Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        {filteredOpportunities.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No opportunities match your current filter selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Drug & FDA Application</th>
                  <th className="py-3 px-4">Pharmaceutical Company</th>
                  <th className="py-3 px-4 text-right">PSP Score & Tier</th>
                  <th className="py-3 px-4">Pipeline Status</th>
                  <th className="py-3 px-4">Assigned Owner</th>
                  <th className="py-3 px-4">Follow-Up Date</th>
                  <th className="py-3 px-4">Last Action & CRM State</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredOpportunities.map((drug) => (
                  <React.Fragment key={drug.id}>
                    <tr className="hover:bg-slate-50/80 align-top">
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectDrug(drug)}
                          className="font-semibold text-blue-800 hover:underline text-left"
                        >
                          {drug.drugName}
                        </button>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {drug.applicationNumber} · Approved {drug.approvalActionDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {drug.sponsorName}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                          {drug.pspScore.totalScore}/100
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {drug.pspScore.tier} · {drug.pspScore.confidenceLevel}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Change status for ${drug.drugName}`}
                          value={drug.opportunity.status}
                          onChange={(e) =>
                            onUpdateOpportunity(drug.id, {
                              status: e.target.value as OpportunityStatus,
                              savedInPipeline: true,
                              actor: 'Marketing Pipeline Reviewer',
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-900"
                        >
                          {ALLOWED_OPPORTUNITY_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          aria-label={`Assigned owner for ${drug.drugName}`}
                          defaultValue={drug.opportunity.owner}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== drug.opportunity.owner) {
                              onUpdateOpportunity(drug.id, {
                                owner: e.target.value.trim() || 'Unassigned',
                                savedInPipeline: true,
                              });
                            }
                          }}
                          className="w-40 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <input
                          type="date"
                          aria-label={`Follow-up date for ${drug.drugName}`}
                          value={drug.opportunity.followUpDate || ''}
                          onChange={(e) =>
                            onUpdateOpportunity(drug.id, {
                              followUpDate: e.target.value || null,
                              savedInPipeline: true,
                            })
                          }
                          className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-900"
                        />
                      </td>

                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="text-slate-800">{drug.opportunity.lastAction}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          CRM: {drug.opportunity.crmSyncStatus} · Notes: {drug.opportunity.notes.length}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {drug.opportunity.status !== 'Approved Internally' && (
                            <button
                              type="button"
                              onClick={() => onOpenApproveModal(drug)}
                              className="inline-flex items-center gap-1 rounded bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenOutreachModal(drug)}
                            title="Prepare Evidence-Based Outreach Draft"
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Mail className="h-3 w-3 text-blue-700" />
                            Draft
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setInlineNoteDrugId((cur) => (cur === drug.id ? null : drug.id))
                            }
                            aria-label={`Add note for ${drug.drugName}`}
                            title="Add Internal Note"
                            className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedHistoryDrugId((cur) => (cur === drug.id ? null : drug.id))
                            }
                            aria-label={`View history for ${drug.drugName}`}
                            title="View Status & Note History"
                            className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Note Editor Row */}
                    {inlineNoteDrugId === drug.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={inlineNoteText}
                              onChange={(e) => setInlineNoteText(e.target.value)}
                              placeholder={`Add internal research note for ${drug.drugName} (${drug.applicationNumber})...`}
                              className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineNote(drug.id)}
                              className="rounded bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                            >
                              Save Note
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineNoteDrugId(null)}
                              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Expanded History & Notes Drawer Row */}
                    {expandedHistoryDrugId === drug.id && (
                      <tr className="bg-slate-50/90">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <h4 className="text-xs font-semibold text-slate-900 mb-2">
                                Status Change History ({drug.opportunity.statusHistory.length})
                              </h4>
                              <div className="space-y-1.5">
                                {drug.opportunity.statusHistory.map((h) => (
                                  <div
                                    key={h.id}
                                    className="rounded border border-slate-200 bg-white p-2 text-xs"
                                  >
                                    <div className="flex justify-between font-medium text-slate-900">
                                      <span>
                                        {h.previousStatus
                                          ? `${h.previousStatus} → ${h.newStatus}`
                                          : h.newStatus}
                                      </span>
                                      <span className="font-mono text-[11px] text-slate-500">
                                        {h.timestamp.slice(0, 16).replace('T', ' ')}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                      {h.changedBy}: {h.reason}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-slate-900 mb-2">
                                Internal Analyst Notes ({drug.opportunity.notes.length})
                              </h4>
                              {drug.opportunity.notes.length === 0 ? (
                                <p className="text-xs text-slate-500">No notes added yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {drug.opportunity.notes.map((n) => (
                                    <div
                                      key={n.id}
                                      className="rounded border border-slate-200 bg-white p-2 text-xs"
                                    >
                                      <div className="flex justify-between text-[11px] text-slate-500">
                                        <span className="font-semibold text-slate-800">
                                          {n.author}
                                        </span>
                                        <span className="font-mono">
                                          {n.createdAt.slice(0, 16).replace('T', ' ')}
                                        </span>
                                      </div>
                                      <div className="text-slate-800 mt-0.5">{n.content}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
