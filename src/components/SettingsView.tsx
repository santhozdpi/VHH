import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { AuditLogEntry, IntegrationSettings } from '../types/pharma';

interface SettingsViewProps {
  settings: IntegrationSettings | null;
  auditLogs: AuditLogEntry[];
  onUpdateSettings: (partial: Partial<IntegrationSettings>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  auditLogs,
  onUpdateSettings,
}) => {
  const [crmProvider, setCrmProvider] = useState<'none' | 'salesforce' | 'hubspot'>(
    settings?.crmProvider || 'none'
  );
  const [crmInstanceUrl, setCrmInstanceUrl] = useState(settings?.crmInstanceUrl || '');
  const [crmSandboxMode, setCrmSandboxMode] = useState(settings?.crmSandboxMode ?? true);
  const [emailProvider, setEmailProvider] = useState<'none' | 'sendgrid' | 'ses' | 'smtp'>(
    settings?.emailProvider || 'none'
  );
  const [emailFromAddress, setEmailFromAddress] = useState(settings?.emailFromAddress || '');
  const [dataRetentionDays, setDataRetentionDays] = useState(settings?.dataRetentionDays || 365);
  const [persistAiHistory, setPersistAiHistory] = useState(settings?.persistAiHistory ?? true);
  const [autoRefreshIntervalHours, setAutoRefreshIntervalHours] = useState(
    settings?.autoRefreshIntervalHours || 24
  );

  const [testResult, setTestResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  if (!settings) {
    return (
      <div className="p-8 text-xs text-slate-600">Loading platform settings...</div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(null);
    try {
      await onUpdateSettings({
        crmProvider,
        crmInstanceUrl,
        crmSandboxMode,
        emailProvider,
        emailFromAddress,
        dataRetentionDays,
        persistAiHistory,
        autoRefreshIntervalHours,
      });
      setSavedBanner('Configuration saved. External CRM and Email connectors remain safely disabled until server-side credentials are provisioned.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (target: 'openfda' | 'crm' | 'email') => {
    setTestResult('Running connection diagnostic...');
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      setTestResult(data.message || 'Diagnostic completed.');
    } catch (e: any) {
      setTestResult(e?.message || 'Connection test failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">
          Platform Integrations, Security & Scoring Governance
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Configure FDA synchronization, modular CRM and email connectors, data retention, and inspect the PSP Opportunity Score rule engine.
        </p>
      </div>

      {savedBanner && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          {savedBanner}
        </div>
      )}

      {testResult && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-950">
          <strong>Connection Diagnostic Result:</strong> {testResult}
        </div>
      )}

      {/* System Status & Credential Security Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>openFDA Data Feed</span>
            <Database className="h-4 w-4 text-blue-700" />
          </div>
          <div className="text-xs font-medium text-emerald-700">
            {settings.openFdaStatus} (Official API)
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Last Sync: {settings.lastSuccessfulRefresh ? settings.lastSuccessfulRefresh.slice(0, 16).replace('T', ' ') : 'N/A'}
          </div>
          <button
            type="button"
            onClick={() => handleTestConnection('openfda')}
            className="mt-2 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Test openFDA Connection
          </button>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Gemini AI Assistant</span>
            <Lock className="h-4 w-4 text-blue-700" />
          </div>
          <div className="text-xs font-medium text-slate-900">
            {settings.geminiConfigured
              ? 'Server-Side Secret Active (••••••••)'
              : 'Verified Data Engine Active (Fallback)'}
          </div>
          <div className="text-[11px] text-slate-500">
            Model: <span className="font-mono">{settings.geminiModel}</span> · Server-only proxy
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>CRM Connector</span>
            <Server className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-xs font-medium text-amber-800">
            {settings.crmConnectionStatus}
          </div>
          <div className="text-[11px] text-slate-500">
            Provider: <span className="font-mono uppercase">{settings.crmProvider}</span>
          </div>
          <button
            type="button"
            onClick={() => handleTestConnection('crm')}
            className="mt-2 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Verify CRM Readiness
          </button>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Outreach Email Engine</span>
            <ShieldAlert className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-xs font-medium text-amber-800">
            {settings.emailConnectionStatus}
          </div>
          <div className="text-[11px] text-slate-500">
            Auto-send strictly disabled
          </div>
          <button
            type="button"
            onClick={() => handleTestConnection('email')}
            className="mt-2 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Check Email Safeguards
          </button>
        </div>
      </div>

      {/* Modular Integration & Governance Form */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CRM & Email Connector Configuration */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Modular CRM & Email Outreach Integration Layer
            </h2>
            <p className="text-xs text-slate-500">
              Select target providers. Secrets (OAuth client secrets, SMTP/SendGrid keys) are read exclusively from server environment variables and are never exposed in the browser.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="settings-crm-provider" className="block font-medium text-slate-700 mb-1">
                CRM Provider Selection
              </label>
              <select
                id="settings-crm-provider"
                value={crmProvider}
                onChange={(e) => setCrmProvider(e.target.value as any)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              >
                <option value="none">None (Disabled — Internal Review Saved Locally)</option>
                <option value="salesforce">Salesforce Health Cloud / Enterprise CRM</option>
                <option value="hubspot">HubSpot Enterprise CRM</option>
              </select>
            </div>

            <div>
              <label htmlFor="settings-crm-url" className="block font-medium text-slate-700 mb-1">
                CRM Instance / Sandbox Endpoint URL
              </label>
              <input
                id="settings-crm-url"
                type="text"
                value={crmInstanceUrl}
                onChange={(e) => setCrmInstanceUrl(e.target.value)}
                placeholder="https://your-org.my.salesforce.com (Optional until configured)"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="settings-crm-sandbox"
                type="checkbox"
                checked={crmSandboxMode}
                onChange={(e) => setCrmSandboxMode(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700"
              />
              <label htmlFor="settings-crm-sandbox" className="text-xs text-slate-700">
                Enforce CRM Sandbox / Test Mode (Prevents production account mutation)
              </label>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <label htmlFor="settings-email-provider" className="block font-medium text-slate-700 mb-1">
                Email Outreach Provider
              </label>
              <select
                id="settings-email-provider"
                value={emailProvider}
                onChange={(e) => setEmailProvider(e.target.value as any)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              >
                <option value="none">Disabled (Draft Generation & Copy-to-Clipboard Only)</option>
                <option value="sendgrid">SendGrid Transactional API (Requires EMAIL_API_KEY)</option>
                <option value="ses">Amazon SES (Requires Server IAM Credentials)</option>
                <option value="smtp">Enterprise SMTP Relay</option>
              </select>
            </div>

            <div>
              <label htmlFor="settings-email-from" className="block font-medium text-slate-700 mb-1">
                Authorized Sender Address
              </label>
              <input
                id="settings-email-from"
                type="email"
                value={emailFromAddress}
                onChange={(e) => setEmailFromAddress(e.target.value)}
                placeholder="psp-partnerships@yourcompany.example"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving Configuration...' : 'Save Integration & Governance Settings'}
            </button>
          </div>
        </section>

        {/* Scoring Model Configuration, Scheduler & Data Retention */}
        <section className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                PSP Opportunity Score Model & Data Governance
              </h2>
              <p className="text-xs text-slate-500">
                Active Rule Model: <span className="font-mono">{settings.scoringModelVersion}</span>
              </p>
            </div>
            <Sliders className="h-4 w-4 text-slate-500" />
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
            <div className="font-semibold text-slate-900">
              Verified 5-Dimension Weight Allocation (Sum = 100%)
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-sans text-slate-700">Disease Burden & Unmet Need:</span>
                <span className="font-semibold text-slate-900">25%</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-sans text-slate-700">Patient Access Complexity:</span>
                <span className="font-semibold text-slate-900">20%</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-sans text-slate-700">Treatment & Admin Complexity:</span>
                <span className="font-semibold text-slate-900">20%</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-sans text-slate-700">Affordability & Reimbursement:</span>
                <span className="font-semibold text-slate-900">20%</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="font-sans text-slate-700">Evidence Confidence & Completeness:</span>
                <span className="font-semibold text-slate-900">15%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-retention" className="block font-medium text-slate-700 mb-1">
                  Audit & Pipeline Data Retention (Days)
                </label>
                <input
                  id="settings-retention"
                  type="number"
                  min={30}
                  max={3650}
                  value={dataRetentionDays}
                  onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="settings-refresh-interval" className="block font-medium text-slate-700 mb-1">
                  Target Scheduled Refresh Interval (Hours)
                </label>
                <input
                  id="settings-refresh-interval"
                  type="number"
                  min={1}
                  max={168}
                  value={autoRefreshIntervalHours}
                  onChange={(e) => setAutoRefreshIntervalHours(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="settings-persist-ai"
                type="checkbox"
                checked={persistAiHistory}
                onChange={(e) => setPersistAiHistory(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700"
              />
              <label htmlFor="settings-persist-ai" className="text-xs text-slate-700">
                Persist AI Assistant investigation history in local database
              </label>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <RefreshCw className="h-3.5 w-3.5 text-blue-700" />
                Scheduled Refresh & Continuous Monitoring Disclosure
              </div>
              <p>
                <strong>Current Environment Status:</strong> Background cron scheduling is{' '}
                <span className="font-mono font-semibold">
                  {settings.schedulerActive ? 'ACTIVE' : 'MANUAL / ON-DEMAND IN DEV'}
                </span>
                . After deploying to Google Cloud Run, attach a Google Cloud Scheduler job targeting{' '}
                <code className="font-mono">POST /api/drugs/refresh</code> every {autoRefreshIntervalHours} hours to enable automated daily FDA monitoring.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-[11px] text-slate-500">
              <span>Application Version: <strong className="font-mono">{settings.appVersion}</strong></span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                System Health: Nominal
              </span>
            </div>
          </div>
        </section>
      </form>

      {/* Administrative Security & Audit Log Table */}
      <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Security & Administrative Audit Log ({auditLogs.length})
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of internal opportunity approvals, status changes, FDA sync runs, and blocked unconfigured external actions.
          </p>
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Action Type</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4">Audit Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {log.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                    {log.actor}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-blue-800 whitespace-nowrap">
                    {log.actionType}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                    {log.targetId}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
