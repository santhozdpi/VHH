/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Menu, MessageSquare, RefreshCw } from 'lucide-react';
import {
  AuditLogEntry,
  DrugRecord,
  IntegrationSettings,
  OpportunityStatus,
  PendingDrugRecord,
  PharmaceuticalCompanySummary,
  RefreshHistoryEntry,
} from './types/pharma';
import { NavPage, Sidebar } from './components/Sidebar';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { DashboardView } from './components/DashboardView';
import { FdaApprovedView } from './components/FdaApprovedView';
import { WaitingApprovalView } from './components/WaitingApprovalView';
import { DrugDetailView } from './components/DrugDetailView';
import { OpportunitiesPipelineView } from './components/OpportunitiesPipelineView';
import { CompaniesView } from './components/CompaniesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ApprovalModal } from './components/ApprovalModal';
import { OutreachDraftModal } from './components/OutreachDraftModal';

const PAGE_LABELS: Record<NavPage, string> = {
  dashboard: 'Dashboard',
  'fda-approved': 'Drug Approval Monitor / FDA Approved',
  'waiting-approval': 'Drug Approval Monitor / Waiting for FDA Approval',
  'psp-opportunities': 'PSP Opportunities Pipeline',
  companies: 'Pharmaceutical Companies',
  reports: 'Intelligence Reports',
  settings: 'Platform Settings',
  'drug-detail': 'Drug Approval Monitor / Detailed Record & PSP Analysis',
};

export default function App() {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [previousPage, setPreviousPage] = useState<NavPage>('fda-approved');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);

  const [drugs, setDrugs] = useState<DrugRecord[]>([]);
  const [pendingDrugs, setPendingDrugs] = useState<PendingDrugRecord[]>([]);
  const [companies, setCompanies] = useState<PharmaceuticalCompanySummary[]>([]);
  const [refreshHistory, setRefreshHistory] = useState<RefreshHistoryEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);

  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null);
  const [approveModalDrug, setApproveModalDrug] = useState<DrugRecord | null>(null);
  const [outreachModalDrug, setOutreachModalDrug] = useState<DrugRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const loadAllPlatformData = useCallback(async () => {
    try {
      setError(null);
      const [drugsRes, pendingRes, reportsRes, settingsRes] = await Promise.all([
        fetch('/api/drugs'),
        fetch('/api/drugs/pending'),
        fetch('/api/reports/summary'),
        fetch('/api/settings/integrations'),
      ]);

      if (!drugsRes.ok) {
        throw new Error(`Failed to fetch FDA drug records (HTTP ${drugsRes.status})`);
      }

      const drugsData = await drugsRes.json();
      const pendingData = pendingRes.ok ? await pendingRes.json() : { records: [] };
      const reportsData = reportsRes.ok ? await reportsRes.json() : {};
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};

      setDrugs(Array.isArray(drugsData.records) ? drugsData.records : []);
      setPendingDrugs(Array.isArray(pendingData.records) ? pendingData.records : []);
      setCompanies(Array.isArray(reportsData.companies) ? reportsData.companies : []);
      setRefreshHistory(
        Array.isArray(reportsData.refreshHistory) ? reportsData.refreshHistory : []
      );
      setAuditLogs(Array.isArray(reportsData.auditLogs) ? reportsData.auditLogs : []);
      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load PharmaIntel regulatory data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllPlatformData();
  }, [loadAllPlatformData]);

  const showNotice = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((cur) => (cur === msg ? null : cur));
    }, 5000);
  };

  const handleRefreshFdaData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/drugs/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'Marketing User (Manual Refresh)' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Refresh request failed.');
      }
      await loadAllPlatformData();
      const r = data.refreshResult;
      if (r?.status === 'Success') {
        showNotice(
          `Synchronized with official openFDA Drugs@FDA API: ${r.recordsFetched} records checked (${r.newRecordsDiscovered} new, ${r.updatedRecords} updated).`
        );
      } else {
        showNotice(
          r?.errorMessage ||
            'Synchronized with verified FDA dataset.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Could not complete FDA data refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectDrug = (drug: DrugRecord) => {
    if (activePage !== 'drug-detail') {
      setPreviousPage(activePage);
    }
    setSelectedDrugId(drug.id);
    setActivePage('drug-detail');
  };

  const handleNavigate = (page: NavPage) => {
    setActivePage(page);
  };

  const handleConfirmApprove = async (
    drugId: string,
    actor: string,
    notes: string
  ) => {
    const res = await fetch(`/api/opportunities/${encodeURIComponent(drugId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to save internal approval.');
    }
    await loadAllPlatformData();
    showNotice(data.message || 'CRM not connected — internal review saved.');
  };

  const handleRejectOpportunity = async (
    drugId: string,
    actor: string,
    notes: string
  ) => {
    const res = await fetch(`/api/opportunities/${encodeURIComponent(drugId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor, notes }),
    });
    const data = await res.json();
    if (res.ok) {
      await loadAllPlatformData();
      showNotice(data.message || 'Opportunity marked as Disqualified.');
    }
  };

  const handleUpdateOpportunity = async (
    drugId: string,
    updates: {
      status?: OpportunityStatus;
      savedInPipeline?: boolean;
      owner?: string;
      followUpDate?: string | null;
      noteContent?: string;
      actor?: string;
    }
  ) => {
    const res = await fetch(`/api/opportunities/${encodeURIComponent(drugId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await loadAllPlatformData();
      showNotice('Opportunity record updated and saved to database.');
    }
  };

  const handleSaveToPipeline = async (drugId: string) => {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugId, owner: 'Marketing BD Team' }),
    });
    if (res.ok) {
      await loadAllPlatformData();
      showNotice('Drug saved to PSP Opportunity Pipeline.');
    }
  };

  const handleUpdateSettings = async (partial: Partial<IntegrationSettings>) => {
    const res = await fetch('/api/settings/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (res.ok) {
      await loadAllPlatformData();
    }
  };

  const selectedDrug = selectedDrugId
    ? drugs.find((d) => d.id === selectedDrugId) || null
    : null;

  const crmConfigured =
    settings?.crmConnectionStatus !== undefined &&
    settings.crmConnectionStatus !== 'Not Configured (Disabled)';

  const emailConfigured = settings?.emailConnectionStatus === 'Configured';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        totalFdaCount={drugs.length}
        pendingCount={pendingDrugs.length}
        pipelineCount={drugs.filter((d) => d.opportunity.savedInPipeline).length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* 2. Central Workspace Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Bar Contract: 3 Zones separated by gap-8 */}
        <header className="flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-3.5 shrink-0">
          {/* Zone 1: Contextual Breadcrumb / Mobile Trigger */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-sm font-semibold text-slate-900 truncate whitespace-nowrap">
              PharmaIntel / {PAGE_LABELS[activePage]}
            </span>
          </div>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Top Workspace Shortcut Links"
            className="hidden xl:flex items-center gap-6 text-xs font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className={`hover:text-slate-900 hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'dashboard' ? 'text-blue-700 font-semibold' : ''
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('fda-approved')}
              className={`hover:text-slate-900 hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'fda-approved' ? 'text-blue-700 font-semibold' : ''
              }`}
            >
              FDA Approvals
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('psp-opportunities')}
              className={`hover:text-slate-900 hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'psp-opportunities' ? 'text-blue-700 font-semibold' : ''
              }`}
            >
              PSP Pipeline
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('reports')}
              className={`hover:text-slate-900 hover:underline transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'reports' ? 'text-blue-700 font-semibold' : ''
              }`}
            >
              Reports
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAiCollapsed((c) => !c)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-700" />
              {aiCollapsed ? 'Open AI Assistant' : 'Hide AI Assistant'}
            </button>
          </div>
        </header>

        {/* Notification & Error Banners */}
        {statusBanner && (
          <div
            role="status"
            className="border-b border-blue-200 bg-blue-50 px-6 py-2.5 text-xs font-medium text-blue-950 flex items-center justify-between"
          >
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-blue-700 hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-xs font-medium text-red-800 flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={loadAllPlatformData}
              className="underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-xs text-slate-600 space-y-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-700" />
              <div>Loading verified US FDA approval records and PSP Opportunity Scores...</div>
            </div>
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardView
                  drugs={drugs}
                  auditLogs={auditLogs}
                  lastSuccessfulRefresh={settings?.lastSuccessfulRefresh || null}
                  refreshing={refreshing}
                  onRefreshFdaData={handleRefreshFdaData}
                  onSelectDrug={handleSelectDrug}
                  onNavigate={handleNavigate}
                />
              )}

              {activePage === 'fda-approved' && (
                <FdaApprovedView
                  drugs={drugs}
                  lastSuccessfulRefresh={settings?.lastSuccessfulRefresh || null}
                  refreshing={refreshing}
                  onRefreshFdaData={handleRefreshFdaData}
                  onSelectDrug={handleSelectDrug}
                  onQuickApproveModal={(drug) => setApproveModalDrug(drug)}
                  onSaveToPipeline={handleSaveToPipeline}
                />
              )}

              {activePage === 'waiting-approval' && (
                <WaitingApprovalView pendingRecords={pendingDrugs} />
              )}

              {activePage === 'drug-detail' && selectedDrug && (
                <DrugDetailView
                  drug={selectedDrug}
                  crmConfigured={crmConfigured}
                  onBack={() => setActivePage(previousPage)}
                  onOpenApproveModal={(drug) => setApproveModalDrug(drug)}
                  onOpenOutreachModal={(drug) => setOutreachModalDrug(drug)}
                  onRejectOpportunity={handleRejectOpportunity}
                  onUpdateOpportunity={handleUpdateOpportunity}
                />
              )}

              {activePage === 'psp-opportunities' && (
                <OpportunitiesPipelineView
                  drugs={drugs}
                  onSelectDrug={handleSelectDrug}
                  onOpenApproveModal={(drug) => setApproveModalDrug(drug)}
                  onOpenOutreachModal={(drug) => setOutreachModalDrug(drug)}
                  onUpdateOpportunity={handleUpdateOpportunity}
                />
              )}

              {activePage === 'companies' && (
                <CompaniesView
                  companies={companies}
                  drugs={drugs}
                  onSelectDrug={handleSelectDrug}
                />
              )}

              {activePage === 'reports' && (
                <ReportsView
                  drugs={drugs}
                  companies={companies}
                  refreshHistory={refreshHistory}
                  onSelectDrug={handleSelectDrug}
                />
              )}

              {activePage === 'settings' && (
                <SettingsView
                  settings={settings}
                  auditLogs={auditLogs}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Persistent Right-Side AI Assistant Panel */}
      <AiAssistantPanel
        collapsed={aiCollapsed}
        onToggleCollapse={() => setAiCollapsed((c) => !c)}
        focusedDrug={activePage === 'drug-detail' ? selectedDrug : null}
      />

      {/* Shared Modals */}
      {approveModalDrug && (
        <ApprovalModal
          drug={approveModalDrug}
          crmConfigured={crmConfigured}
          onClose={() => setApproveModalDrug(null)}
          onConfirmApprove={handleConfirmApprove}
        />
      )}

      {outreachModalDrug && (
        <OutreachDraftModal
          drug={outreachModalDrug}
          emailConfigured={emailConfigured}
          onClose={() => setOutreachModalDrug(null)}
        />
      )}
    </div>
  );
}
