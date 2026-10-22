import React, { useMemo, useState } from 'react';
import { ArrowRight, Building2, Search } from 'lucide-react';
import { DrugRecord, PharmaceuticalCompanySummary } from '../types/pharma';

interface CompaniesViewProps {
  companies: PharmaceuticalCompanySummary[];
  drugs: DrugRecord[];
  onSelectDrug: (drug: DrugRecord) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  drugs,
  onSelectDrug,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSponsor, setSelectedSponsor] = useState<string | null>(null);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.sponsorName.toLowerCase().includes(q) ||
        c.therapeuticAreas.some((t) => t.toLowerCase().includes(q))
    );
  }, [companies, search]);

  const sponsorDrugs = useMemo(() => {
    if (!selectedSponsor) return [];
    return drugs.filter(
      (d) => d.sponsorName.toUpperCase() === selectedSponsor.toUpperCase()
    );
  }, [drugs, selectedSponsor]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Pharmaceutical Companies & Sponsor Prioritization
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Aggregated FDA applicant intelligence ranked by preliminary PSP Opportunity Score and new product launch activity.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            aria-label="Search pharmaceutical companies"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sponsor or therapeutic area..."
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Selected Sponsor Drill-Down */}
      {selectedSponsor && (
        <section className="rounded-md border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Monitored FDA Approvals for {selectedSponsor} ({sponsorDrugs.length})
            </h2>
            <button
              type="button"
              onClick={() => setSelectedSponsor(null)}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Close Company Drill-Down
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sponsorDrugs.map((drug) => (
              <div
                key={drug.id}
                onClick={() => onSelectDrug(drug)}
                className="cursor-pointer rounded-md border border-slate-200 bg-white p-3.5 text-xs hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800">{drug.drugName}</span>
                  <span className="font-mono font-bold text-slate-900">
                    PSP Score: {drug.pspScore.totalScore}/100
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  {drug.applicationNumber} · Approved {drug.approvalActionDate} ·{' '}
                  {drug.actionCategory}
                </div>
                <p className="mt-1.5 text-slate-700 line-clamp-2">{drug.indication}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Companies Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Pharmaceutical Company / Applicant</th>
                <th className="py-3 px-4 text-right">Monitored Actions</th>
                <th className="py-3 px-4 text-right">Original Launches</th>
                <th className="py-3 px-4 text-right">Supplements</th>
                <th className="py-3 px-4 text-right">Highest PSP Score</th>
                <th className="py-3 px-4 text-right">Avg PSP Score</th>
                <th className="py-3 px-4">Therapeutic Focus</th>
                <th className="py-3 px-4 text-right">Internal Approved</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredCompanies.map((comp) => (
                <tr key={comp.companyId} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {comp.sponsorName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Latest FDA Action: {comp.latestApprovalDate}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                    {comp.totalApprovalActions}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-blue-800 font-medium">
                    {comp.originalLaunchCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                    {comp.supplementalCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                    {comp.highestPspScore}/100
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {comp.averagePspScore}/100
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-[240px]">
                    {comp.therapeuticAreas.join(' · ')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-emerald-700">
                    {comp.approvedInternallyCount}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedSponsor(comp.sponsorName)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Inspect Portfolio
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
