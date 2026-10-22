import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { AuditLogEntry, DrugRecord } from '../types/pharma';
import { NavPage } from './Sidebar';

interface DashboardViewProps {
  drugs: DrugRecord[];
  auditLogs: AuditLogEntry[];
  lastSuccessfulRefresh: string | null;
  refreshing: boolean;
  onRefreshFdaData: () => Promise<void>;
  onSelectDrug: (drug: DrugRecord) => void;
  onNavigate: (page: NavPage) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  drugs,
  auditLogs,
  lastSuccessfulRefresh,
  refreshing,
  onRefreshFdaData,
  onSelectDrug,
  onNavigate,
}) => {
  const [dateRangePreset, setDateRangePreset] = useState<'ALL' | '90D' | '180D' | '2024_PLUS'>('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const filteredByPeriod = useMemo(() => {
    return drugs.filter((d) => {
      if (customFrom && d.approvalActionDate < customFrom) return false;
      if (customTo && d.approvalActionDate > customTo) return false;
      if (dateRangePreset === '90D') {
        return d.approvalActionDate >= '2024-08-01';
      }
      if (dateRangePreset === '180D') {
        return d.approvalActionDate >= '2024-06-01';
      }
      if (dateRangePreset === '2024_PLUS') {
        return d.approvalActionDate >= '2024-01-01';
      }
      return true;
    });
  }, [drugs, dateRangePreset, customFrom, customTo]);

  // All 7 required metrics calculated directly from actual application data
  const metrics = useMemo(() => {
    const uniqueCompanies = new Set(drugs.map((d) => d.sponsorName.toUpperCase()));
    const highScoreRecords = drugs.filter((d) => d.pspScore.totalScore >= 80);
    const awaitingReview = drugs.filter(
      (d) =>
        d.opportunity.status === 'New' ||
        d.opportunity.status === 'Research Required' ||
        d.opportunity.status === 'Under Review'
    );
    const approvedInternally = drugs.filter(
      (d) => d.opportunity.status === 'Approved Internally'
    );
    const requiringVerification = drugs.filter(
      (d) => !d.indicationVerified || d.pspScore.confidenceLevel === 'Low — Verification Needed'
    );

    return {
      totalMonitored: drugs.length,
      newActionsInPeriod: filteredByPeriod.length,
      highScoreCount: highScoreRecords.length,
      companiesCount: uniqueCompanies.size,
      awaitingReviewCount: awaitingReview.length,
      approvedInternallyCount: approvedInternally.length,
      requiringVerificationCount: requiringVerification.length,
    };
  }, [drugs, filteredByPeriod]);

  const recentApprovals = useMemo(() => {
    return [...filteredByPeriod]
      .sort((a, b) => b.approvalActionDate.localeCompare(a.approvalActionDate))
      .slice(0, 6);
  }, [filteredByPeriod]);

  const highestScoring = useMemo(() => {
    return [...drugs]
      .sort((a, b) => b.pspScore.totalScore - a.pspScore.totalScore)
      .slice(0, 6);
  }, [drugs]);

  return (
    <div className="space-y-6">
      {/* Header & Refresh Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Executive Regulatory & PSP Opportunity Overview
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Evidence-based US FDA drug approval monitoring and Patient Support Program prioritization pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-medium text-slate-800">Last FDA Sync:</span>{' '}
            <span className="font-mono">
              {lastSuccessfulRefresh
                ? `${lastSuccessfulRefresh.slice(0, 10)} ${lastSuccessfulRefresh.slice(11, 16)} UTC`
                : 'Not yet synced'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefreshFdaData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Synchronizing openFDA...' : 'Refresh FDA Data'}
          </button>
        </div>
      </div>

      {/* Date Range Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-700">Approval Period Filter:</span>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
            {(
              [
                { id: 'ALL', label: 'All Monitored Dates' },
                { id: '90D', label: 'Recent Actions (Aug–Oct)' },
                { id: '180D', label: 'Last 6 Months' },
                { id: '2024_PLUS', label: '2024–Present' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDateRangePreset(preset.id);
                  setCustomFrom('');
                  setCustomTo('');
                }}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  dateRangePreset === preset.id && !customFrom && !customTo
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label htmlFor="dash-date-from" className="text-slate-600">
            From:
          </label>
          <input
            id="dash-date-from"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-800"
          />
          <label htmlFor="dash-date-to" className="text-slate-600">
            To:
          </label>
          <input
            id="dash-date-to"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-800"
          />
          {(customFrom || customTo) && (
            <button
              type="button"
              onClick={() => {
                setCustomFrom('');
                setCustomTo('');
              }}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Clear Dates
            </button>
          )}
        </div>
      </div>

      {/* 7 Real Calculated Metric Panels */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">
            Total FDA Records Monitored
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {metrics.totalMonitored}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Official Drugs@FDA records
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">
            Approval Actions in Period
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-blue-800">
            {metrics.newActionsInPeriod}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Matching active date filter
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">
            High PSP Score Records
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {metrics.highScoreCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Score 80–100 (High priority)
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">
            Pharma Companies Identified
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {metrics.companiesCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Distinct FDA applicants
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">
            Opportunities Awaiting Review
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {metrics.awaitingReviewCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            New / Research / Under Review
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">
            Opportunities Approved Internally
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-blue-700">
            {metrics.approvedInternallyCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Validated for BD outreach
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 sm:col-span-2">
          <div className="text-xs font-medium text-slate-500">
            Records Requiring Data Verification
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-800">
            {metrics.requiringVerificationCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Records where official FDA label indication or commercial payer criteria require analyst verification
          </div>
        </div>
      </div>

      {/* Main Intelligence Tables Stacked for Full-Width Readability */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent FDA Approval Activity */}
        <section className="rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent FDA Approval Activity
              </h2>
              <p className="text-xs text-slate-500">
                Sorted newest first · Distinguishes original launches from supplements & generics
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('fda-approved')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              View All Approvals
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentApprovals.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No FDA approval records match the selected date range filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Action Date</th>
                    <th className="py-2.5 px-4">Drug & Application</th>
                    <th className="py-2.5 px-4">Sponsor</th>
                    <th className="py-2.5 px-4">Action Distinction</th>
                    <th className="py-2.5 px-4 text-right">PSP Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {recentApprovals.map((drug) => (
                    <tr
                      key={drug.id}
                      onClick={() => onSelectDrug(drug)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {drug.approvalActionDate}
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDrug(drug);
                          }}
                          className="font-semibold text-blue-800 hover:underline text-left"
                        >
                          {drug.drugName}
                        </button>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {drug.applicationNumber} · {drug.submissionType}-{drug.submissionNumber}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{drug.sponsorName}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {drug.isPotentialNewLaunch ? (
                          <span className="font-medium text-blue-800">
                            Original Approval (New Launch)
                          </span>
                        ) : (
                          <span>{drug.actionCategory}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                        {drug.pspScore.totalScore}/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Highest-Scoring PSP Opportunities */}
        <section className="rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Highest-Scoring Preliminary PSP Opportunities
              </h2>
              <p className="text-xs text-slate-500">
                Prioritized by 5-dimension rule-based heuristic (v1.2.0-psp-rules)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('psp-opportunities')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Open Opportunity Pipeline
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Drug & Sponsor</th>
                  <th className="py-2.5 px-4">Route & Category</th>
                  <th className="py-2.5 px-4 text-right">Score & Tier</th>
                  <th className="py-2.5 px-4">Confidence</th>
                  <th className="py-2.5 px-4">Internal Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {highestScoring.map((drug) => (
                  <tr
                    key={drug.id}
                    onClick={() => onSelectDrug(drug)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDrug(drug);
                        }}
                        className="font-semibold text-blue-800 hover:underline text-left"
                      >
                        {drug.drugName}
                      </button>
                      <div className="text-[11px] text-slate-500">
                        {drug.sponsorName} · <span className="font-mono">{drug.applicationNumber}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <div>{drug.routeOfAdministration}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
                        {drug.treatmentCategory}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono font-bold tabular-nums text-slate-900">
                        {drug.pspScore.totalScore}/100
                      </span>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        {drug.pspScore.tier}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                      {drug.pspScore.confidenceLevel === 'High' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          High
                        </span>
                      ) : drug.pspScore.confidenceLevel === 'Moderate' ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          Moderate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Verify
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {drug.opportunity.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Recent Changes & Audit Trail */}
      <section className="rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Pipeline Changes & System Audit Log
            </h2>
            <p className="text-xs text-slate-500">
              Verifiable history of FDA data synchronizations, internal opportunity approvals, and status updates
            </p>
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {auditLogs.slice(0, 6).map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="text-slate-900 font-medium">{log.summary}</div>
                <div className="text-[11px] text-slate-500">
                  <span>Actor: {log.actor}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="font-mono">Event: {log.actionType}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="font-mono">Target: {log.targetId}</span>
                </div>
              </div>
              <div className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                {log.timestamp.slice(0, 10)} {log.timestamp.slice(11, 19)} UTC
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
