import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  DrugRecord,
  PharmaceuticalCompanySummary,
  RefreshHistoryEntry,
  ScoreTier,
} from '../types/pharma';
import { exportDrugRecordsToCsv } from '../utils/pharmaEngine';

interface ReportsViewProps {
  drugs: DrugRecord[];
  companies: PharmaceuticalCompanySummary[];
  refreshHistory: RefreshHistoryEntry[];
  onSelectDrug: (drug: DrugRecord) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  drugs,
  companies,
  refreshHistory,
  onSelectDrug,
}) => {
  const [tierFilter, setTierFilter] = useState<ScoreTier | 'ALL'>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('ALL');

  const filteredForExport = useMemo(() => {
    return drugs.filter((d) => {
      if (tierFilter !== 'ALL' && d.pspScore.tier !== tierFilter) return false;
      if (confidenceFilter !== 'ALL' && d.pspScore.confidenceLevel !== confidenceFilter)
        return false;
      return true;
    });
  }, [drugs, tierFilter, confidenceFilter]);

  const byTier = useMemo(() => {
    const tiers: ScoreTier[] = [
      'High priority',
      'Moderate priority',
      'Watchlist',
      'Low priority or insufficient evidence',
    ];
    return tiers.map((t) => ({
      tier: t,
      count: drugs.filter((d) => d.pspScore.tier === t).length,
      pct: drugs.length > 0 ? Math.round((drugs.filter((d) => d.pspScore.tier === t).length / drugs.length) * 100) : 0,
    }));
  }, [drugs]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; total: number; originalLaunches: number; supplements: number }>();
    for (const d of drugs) {
      const m = d.approvalActionDate.slice(0, 7);
      const cur = map.get(m) || { month: m, total: 0, originalLaunches: 0, supplements: 0 };
      cur.total += 1;
      if (d.isPotentialNewLaunch) cur.originalLaunches += 1;
      if (d.submissionType === 'SUPPL') cur.supplements += 1;
      map.set(m, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [drugs]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of drugs) {
      map.set(d.opportunity.status, (map.get(d.opportunity.status) || 0) + 1);
    }
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [drugs]);

  const byConfidence = useMemo(() => {
    const levels = ['High', 'Moderate', 'Low — Verification Needed'] as const;
    return levels.map((lvl) => ({
      level: lvl,
      count: drugs.filter((d) => d.pspScore.confidenceLevel === lvl).length,
    }));
  }, [drugs]);

  const missingDataRecords = useMemo(() => {
    return drugs.filter(
      (d) => !d.indicationVerified || d.pspScore.missingInformation.length > 0
    );
  }, [drugs]);

  const handleExportCsv = () => {
    const csv = exportDrugRecordsToCsv(filteredForExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaintel-intelligence-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filtered Export */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Regulatory & Opportunity Intelligence Reports
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Analytical breakdown of FDA approval activity, PSP score tiers, evidence confidence, missing data audits, and synchronization logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter export by score tier"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="ALL">Export All Tiers</option>
            <option value="High priority">High Priority (80–100)</option>
            <option value="Moderate priority">Moderate Priority (60–79)</option>
            <option value="Watchlist">Watchlist (40–59)</option>
            <option value="Low priority or insufficient evidence">Low Priority (0–39)</option>
          </select>

          <select
            aria-label="Filter export by evidence confidence"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
          >
            <option value="ALL">All Confidence Levels</option>
            <option value="High">High Confidence</option>
            <option value="Moderate">Moderate Confidence</option>
            <option value="Low — Verification Needed">Low — Verification Needed</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export Filtered Report CSV ({filteredForExport.length})
          </button>
        </div>
      </div>

      {/* Row 1: Score Tiers, Evidence Confidence & Internal Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Opportunities by Score Tier */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            1. Opportunities by PSP Score Tier
          </h2>
          <div className="divide-y divide-slate-200 text-xs">
            {byTier.map((item) => (
              <div key={item.tier} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-slate-800">{item.tier}</span>
                <span className="font-mono tabular-nums text-slate-900">
                  <strong>{item.count}</strong> records ({item.pct}%)
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Evidence Confidence Report */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            2. Evidence Confidence Distribution
          </h2>
          <div className="divide-y divide-slate-200 text-xs">
            {byConfidence.map((item) => (
              <div key={item.level} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-slate-800">{item.level}</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {item.count} records
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Opportunities by Internal Status */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            3. Opportunities by Internal Workflow Status
          </h2>
          <div className="divide-y divide-slate-200 text-xs">
            {byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-slate-800">{item.status}</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {item.count} records
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 2: Approval Activity by Date & Top Companies */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">
              4. FDA Approval Activity by Month
            </h2>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Approval Month</th>
                <th className="py-2.5 px-4 text-right">Total Actions</th>
                <th className="py-2.5 px-4 text-right">Original Launches (NDA/BLA)</th>
                <th className="py-2.5 px-4 text-right">Supplements (SUPPL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {byMonth.map((m) => (
                <tr key={m.month}>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{m.month}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{m.total}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-800 font-semibold">
                    {m.originalLaunches}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                    {m.supplements}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">
              5. Opportunities by Verified Therapeutic Category & Indication
            </h2>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Drug & Sponsor</th>
                  <th className="py-2.5 px-4">Therapeutic Category</th>
                  <th className="py-2.5 px-4">Verified Indication Status</th>
                  <th className="py-2.5 px-4 text-right">PSP Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {drugs.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => onSelectDrug(d)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="py-2.5 px-4 font-medium text-blue-800">{d.drugName}</td>
                    <td className="py-2.5 px-4 text-slate-700">{d.treatmentCategory}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {d.indicationVerified ? 'Verified via FDA Label' : 'See official label'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                      {d.pspScore.totalScore}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Row 3: Missing-Data Audit Report */}
      <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            6. Missing-Data & Verification Audit Report ({missingDataRecords.length} Records)
          </h2>
          <p className="text-xs text-slate-500">
            Records where clinical indication text, REMS status, or commercial reimbursement parameters require manual verification
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Drug & Application</th>
                <th className="py-2.5 px-4">Sponsor</th>
                <th className="py-2.5 px-4">Indication Verification</th>
                <th className="py-2.5 px-4">Documented Missing Information</th>
                <th className="py-2.5 px-4 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {missingDataRecords.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => onSelectDrug(d)}
                  className="cursor-pointer hover:bg-slate-50 align-top"
                >
                  <td className="py-3 px-4">
                    <span className="font-semibold text-blue-800">{d.drugName}</span>
                    <span className="block font-mono text-[11px] text-slate-500">
                      {d.applicationNumber}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-800">{d.sponsorName}</td>
                  <td className="py-3 px-4">
                    {d.indicationVerified ? (
                      <span className="text-emerald-700 font-medium">Verified</span>
                    ) : (
                      <span className="text-amber-800 font-medium">
                        Unverified ({d.indication})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {d.pspScore.missingInformation.join(' · ')}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800 whitespace-nowrap">
                    {d.pspScore.confidenceLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Row 4: FDA Data Refresh History */}
      <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            7. FDA Data Refresh & Synchronization History ({refreshHistory.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Started At (UTC)</th>
                <th className="py-2.5 px-4">Completed At (UTC)</th>
                <th className="py-2.5 px-4">Sync Status</th>
                <th className="py-2.5 px-4 text-right">Fetched</th>
                <th className="py-2.5 px-4 text-right">New</th>
                <th className="py-2.5 px-4 text-right">Updated</th>
                <th className="py-2.5 px-4">Endpoint & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {refreshHistory.map((rh) => (
                <tr key={rh.id}>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {rh.startedAt.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {rh.completedAt.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {rh.status}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {rh.recordsFetched}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                    {rh.newRecordsDiscovered}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-700">
                    {rh.updatedRecords}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    <div className="font-mono text-[11px]">{rh.sourceEndpoint}</div>
                    {rh.errorMessage && (
                      <div className="text-[11px] text-amber-800 mt-0.5">{rh.errorMessage}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
