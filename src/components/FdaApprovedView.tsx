import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  BookmarkPlus,
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  ApplicationType,
  DrugRecord,
  OpportunityStatus,
  ScoreTier,
} from '../types/pharma';
import {
  ALLOWED_OPPORTUNITY_STATUSES,
  exportDrugRecordsToCsv,
} from '../utils/pharmaEngine';

interface FdaApprovedViewProps {
  drugs: DrugRecord[];
  lastSuccessfulRefresh: string | null;
  refreshing: boolean;
  onRefreshFdaData: () => Promise<void>;
  onSelectDrug: (drug: DrugRecord) => void;
  onQuickApproveModal: (drug: DrugRecord) => void;
  onSaveToPipeline: (drugId: string) => Promise<void>;
}

export const FdaApprovedView: React.FC<FdaApprovedViewProps> = ({
  drugs,
  lastSuccessfulRefresh,
  refreshing,
  onRefreshFdaData,
  onSelectDrug,
  onQuickApproveModal,
  onSaveToPipeline,
}) => {
  const [drugSearch, setDrugSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [appTypeFilter, setAppTypeFilter] = useState<ApplicationType | 'ALL'>('ALL');
  const [actionDistinctionFilter, setActionDistinctionFilter] = useState<string>('ALL');
  const [scoreTierFilter, setScoreTierFilter] = useState<ScoreTier | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<
    'date_desc' | 'date_asc' | 'score_desc' | 'score_asc' | 'company_asc'
  >('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRecords = useMemo(() => {
    const dQuery = drugSearch.trim().toLowerCase();
    const cQuery = companySearch.trim().toLowerCase();

    const list = drugs.filter((r) => {
      if (
        dQuery &&
        !r.drugName.toLowerCase().includes(dQuery) &&
        !r.activeIngredient.toLowerCase().includes(dQuery) &&
        !r.applicationNumber.toLowerCase().includes(dQuery) &&
        !r.indication.toLowerCase().includes(dQuery)
      ) {
        return false;
      }
      if (cQuery && !r.sponsorName.toLowerCase().includes(cQuery)) {
        return false;
      }
      if (appTypeFilter !== 'ALL' && r.applicationType !== appTypeFilter) {
        return false;
      }
      if (actionDistinctionFilter === 'NEW_LAUNCH' && !r.isPotentialNewLaunch) {
        return false;
      }
      if (actionDistinctionFilter === 'SUPPLEMENTAL' && r.submissionType !== 'SUPPL') {
        return false;
      }
      if (actionDistinctionFilter === 'GENERIC' && r.applicationType !== 'ANDA') {
        return false;
      }
      if (scoreTierFilter !== 'ALL' && r.pspScore.tier !== scoreTierFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && r.opportunity.status !== statusFilter) {
        return false;
      }
      if (dateFrom && r.approvalActionDate < dateFrom) {
        return false;
      }
      if (dateTo && r.approvalActionDate > dateTo) {
        return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'score_desc') {
        return b.pspScore.totalScore - a.pspScore.totalScore;
      }
      if (sortBy === 'score_asc') {
        return a.pspScore.totalScore - b.pspScore.totalScore;
      }
      if (sortBy === 'date_asc') {
        return a.approvalActionDate.localeCompare(b.approvalActionDate);
      }
      if (sortBy === 'company_asc') {
        return a.sponsorName.localeCompare(b.sponsorName);
      }
      const cmp = b.approvalActionDate.localeCompare(a.approvalActionDate);
      return cmp !== 0 ? cmp : a.applicationNumber.localeCompare(b.applicationNumber);
    });
  }, [
    drugs,
    drugSearch,
    companySearch,
    appTypeFilter,
    actionDistinctionFilter,
    scoreTierFilter,
    statusFilter,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safePage]);

  const handleExportCsv = () => {
    const csv = exportDrugRecordsToCsv(filteredRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaintel-fda-approvals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setDrugSearch('');
    setCompanySearch('');
    setAppTypeFilter('ALL');
    setActionDistinctionFilter('ALL');
    setScoreTierFilter('ALL');
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            US FDA Approved Drug Applications Monitor
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Official openFDA Drugs@FDA application actions · Distinguishes Original New Launches (NDA/BLA) from Efficacy Supplements and Generic (ANDA) approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs text-slate-500 font-mono">
            Last Sync: {lastSuccessfulRefresh ? lastSuccessfulRefresh.slice(0, 16).replace('T', ' ') : 'N/A'} UTC
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export Filtered CSV ({filteredRecords.length})
          </button>
          <button
            type="button"
            onClick={onRefreshFdaData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh FDA Data'}
          </button>
        </div>
      </div>

      {/* Comprehensive Search & Filter Bar */}
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="search-drug-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
              Search Drug / Application #
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id="search-drug-input"
                type="text"
                value={drugSearch}
                onChange={(e) => {
                  setDrugSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="COBENFY, NIKTIMVO, BLA..."
                className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="search-company-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
              Search Pharma Company
            </label>
            <input
              id="search-company-input"
              type="text"
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Eli Lilly, Bristol Myers..."
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-app-type" className="block text-[11px] font-semibold text-slate-700 mb-1">
              Application Type
            </label>
            <select
              id="filter-app-type"
              value={appTypeFilter}
              onChange={(e) => {
                setAppTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Types (NDA / BLA / ANDA)</option>
              <option value="BLA">BLA (Biologic)</option>
              <option value="NDA">NDA (New Drug)</option>
              <option value="ANDA">ANDA (Generic)</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-launch-distinction" className="block text-[11px] font-semibold text-slate-700 mb-1">
              Launch vs. Action Type
            </label>
            <select
              id="filter-launch-distinction"
              value={actionDistinctionFilter}
              onChange={(e) => {
                setActionDistinctionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Approval Actions</option>
              <option value="NEW_LAUNCH">Original Approvals (New Launch)</option>
              <option value="SUPPLEMENTAL">Supplemental Approvals (SUPPL)</option>
              <option value="GENERIC">Generic Approvals (ANDA)</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-score-tier" className="block text-[11px] font-semibold text-slate-700 mb-1">
              PSP Opportunity Score Tier
            </label>
            <select
              id="filter-score-tier"
              value={scoreTierFilter}
              onChange={(e) => {
                setScoreTierFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Score Tiers (0–100)</option>
              <option value="High priority">80–100: High priority</option>
              <option value="Moderate priority">60–79: Moderate priority</option>
              <option value="Watchlist">40–59: Watchlist</option>
              <option value="Low priority or insufficient evidence">
                0–39: Low priority
              </option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-status" className="text-[11px] font-semibold text-slate-700">
                Internal Status:
              </label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
              >
                <option value="ALL">All Statuses</option>
                {ALLOWED_OPPORTUNITY_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="fda-date-from" className="text-[11px] font-semibold text-slate-700">
                Date From:
              </label>
              <input
                id="fda-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900"
              />
              <label htmlFor="fda-date-to" className="text-[11px] font-semibold text-slate-700">
                To:
              </label>
              <input
                id="fda-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <label htmlFor="fda-sort-select" className="text-[11px] font-semibold text-slate-700">
                Sort By:
              </label>
              <select
                id="fda-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
              >
                <option value="date_desc">Approval Action Date (Newest First)</option>
                <option value="date_asc">Approval Action Date (Oldest First)</option>
                <option value="score_desc">PSP Opportunity Score (High to Low)</option>
                <option value="score_asc">PSP Opportunity Score (Low to High)</option>
                <option value="company_asc">Pharmaceutical Company (A–Z)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main FDA Approved Data Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        {paginatedRecords.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="text-sm font-semibold text-slate-800">
              No FDA Approval Records Match Your Active Filters
            </div>
            <p className="text-xs text-slate-500">
              Adjust your search terms or reset filters to view all {drugs.length} monitored FDA application records.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Action Date</th>
                  <th className="py-2.5 px-2.5">Drug & Active Ingredient</th>
                  <th className="py-2.5 px-2.5">Pharma Company</th>
                  <th className="py-2.5 px-2.5">Indication / Disease</th>
                  <th className="py-2.5 px-2.5">Application & Type</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">PSP Score</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Confidence</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {paginatedRecords.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => onSelectDrug(record)}
                    className="cursor-pointer hover:bg-slate-50/90 transition-colors"
                  >
                    <td className="py-2.5 px-2.5 font-mono text-[11px] tabular-nums text-slate-800 whitespace-nowrap align-top">
                      {record.approvalActionDate}
                    </td>

                    <td className="py-2.5 px-2.5 align-top max-w-[165px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDrug(record);
                        }}
                        className="font-semibold text-blue-800 hover:underline text-left leading-tight"
                      >
                        {record.drugName}
                      </button>
                      <div className="text-[11px] text-slate-600 truncate mt-0.5" title={record.activeIngredient}>
                        {record.activeIngredient}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {record.dosageForm} · {record.routeOfAdministration}
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 font-medium text-slate-800 align-top max-w-[135px]">
                      <div className="line-clamp-2 leading-tight">{record.sponsorName}</div>
                    </td>

                    <td className="py-2.5 px-2.5 align-top max-w-[185px]">
                      {record.indicationVerified ? (
                        <div className="text-[11px] text-slate-800 line-clamp-2 leading-tight" title={record.indication}>
                          {record.indication}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-800 font-medium leading-tight">
                          {record.indication}
                          <span className="block text-[10px] font-normal text-slate-500">
                            Verify FDA label
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-2.5 align-top whitespace-nowrap">
                      <div className="font-mono text-[11px] font-semibold text-slate-900">
                        {record.applicationNumber} · {record.applicationType}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {record.isPotentialNewLaunch
                          ? 'Original Launch (ORIG)'
                          : `${record.submissionType}-${record.submissionNumber}`}
                      </div>
                      {record.sources[0] && (
                        <a
                          href={record.sources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-[10px] text-blue-700 hover:underline"
                        >
                          FDA Source
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </td>

                    <td className="py-2.5 px-2.5 text-right align-top whitespace-nowrap">
                      <div className="font-mono text-xs font-bold tabular-nums text-slate-900">
                        {record.pspScore.totalScore}/100
                      </div>
                      <div
                        className={`text-[10px] font-medium ${
                          record.pspScore.totalScore >= 80
                            ? 'text-emerald-700'
                            : record.pspScore.totalScore >= 60
                              ? 'text-blue-700'
                              : 'text-slate-500'
                        }`}
                      >
                        {record.pspScore.tier === 'Low priority or insufficient evidence'
                          ? 'Low priority'
                          : record.pspScore.tier}
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 align-top whitespace-nowrap text-[11px]">
                      {record.pspScore.confidenceLevel === 'High' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          High
                        </span>
                      ) : record.pspScore.confidenceLevel === 'Moderate' ? (
                        <span className="text-blue-700 font-medium">Moderate</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Verify
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-2.5 align-top whitespace-nowrap text-[11px]">
                      <span
                        className={`font-medium ${
                          record.opportunity.status === 'Approved Internally'
                            ? 'text-emerald-800'
                            : record.opportunity.status === 'Disqualified'
                              ? 'text-red-700'
                              : 'text-slate-800'
                        }`}
                      >
                        {record.opportunity.status}
                      </span>
                    </td>

                    <td
                      className="py-2.5 px-2.5 text-right align-top whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectDrug(record)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Inspect
                        </button>
                        {record.opportunity.status !== 'Approved Internally' && (
                          <button
                            type="button"
                            onClick={() => onQuickApproveModal(record)}
                            aria-label={`Approve opportunity for ${record.drugName}`}
                            className="rounded bg-blue-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-800"
                          >
                            Approve
                          </button>
                        )}
                        {!record.opportunity.savedInPipeline && (
                          <button
                            type="button"
                            onClick={() => onSaveToPipeline(record.id)}
                            aria-label={`Save ${record.drugName} to pipeline`}
                            title="Save to PSP Opportunity Pipeline"
                            className="rounded border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <BookmarkPlus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-mono font-semibold text-slate-900">
              {filteredRecords.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-mono font-semibold text-slate-900">
              {Math.min(safePage * pageSize, filteredRecords.length)}
            </span>{' '}
            of{' '}
            <span className="font-mono font-semibold text-slate-900">
              {filteredRecords.length}
            </span>{' '}
            official FDA records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-xs text-slate-700">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
