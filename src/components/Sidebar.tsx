import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'fda-approved'
  | 'waiting-approval'
  | 'psp-opportunities'
  | 'companies'
  | 'reports'
  | 'settings'
  | 'drug-detail';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  totalFdaCount: number;
  pendingCount: number;
  pipelineCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  totalFdaCount,
  pendingCount,
  pipelineCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const [monitorExpanded, setMonitorExpanded] = useState(true);

  const handleSelect = (page: NavPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const navContent = (
    <aside
      aria-label="Primary Sidebar Navigation"
      className="flex h-full w-60 flex-col border-r border-slate-200 bg-slate-950 text-slate-200 select-none"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display text-base font-bold tracking-tight text-white block leading-none">
              PharmaIntel
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              PSP Opportunity Monitor
            </span>
          </div>
        </button>

        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-colors ${
            activePage === 'dashboard'
              ? 'bg-blue-700 text-white'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Dashboard</span>
        </button>

        {/* Expandable Drug Approval Monitor Menu (supports click AND optional desktop hover) */}
        <div
          onMouseEnter={() => {
            if (window.innerWidth >= 1024) setMonitorExpanded(true);
          }}
        >
          <button
            type="button"
            aria-expanded={monitorExpanded}
            onClick={() => setMonitorExpanded((prev) => !prev)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-xs font-medium transition-colors ${
              activePage === 'fda-approved' ||
              activePage === 'waiting-approval' ||
              activePage === 'drug-detail'
                ? 'bg-slate-900 text-white'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <Activity className="h-4 w-4 shrink-0 text-blue-400" />
              <span className="whitespace-nowrap">Drug Approval Monitor</span>
            </span>
            {monitorExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {monitorExpanded && (
            <div className="mt-1 ml-4 border-l border-slate-800 pl-3 space-y-1">
              <button
                type="button"
                onClick={() => handleSelect('fda-approved')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  activePage === 'fda-approved' || activePage === 'drug-detail'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  FDA Approved
                </span>
                <span className="font-mono text-[11px] tabular-nums opacity-80">
                  {totalFdaCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('waiting-approval')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  activePage === 'waiting-approval'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  Waiting for FDA Approval
                </span>
                <span className="font-mono text-[11px] tabular-nums opacity-80">
                  {pendingCount}
                </span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleSelect('psp-opportunities')}
          className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-xs font-medium transition-colors ${
            activePage === 'psp-opportunities'
              ? 'bg-blue-700 text-white'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-3 whitespace-nowrap">
            <Briefcase className="h-4 w-4 shrink-0" />
            PSP Opportunities
          </span>
          <span className="font-mono text-[11px] tabular-nums opacity-80">
            {pipelineCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('companies')}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-colors ${
            activePage === 'companies'
              ? 'bg-blue-700 text-white'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Pharmaceutical Companies</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('reports')}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-colors ${
            activePage === 'reports'
              ? 'bg-blue-700 text-white'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Reports</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('settings')}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-colors ${
            activePage === 'settings'
              ? 'bg-blue-700 text-white'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Settings</span>
        </button>
      </nav>

      {/* Footer Governance Note */}
      <div className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400 space-y-1">
        <div className="font-medium text-slate-300">Data Source: US FDA openFDA</div>
        <div>Model: v1.2.0-psp-rules (Heuristic)</div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block h-full shrink-0">{navContent}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full">{navContent}</div>
        </div>
      )}
    </>
  );
};
