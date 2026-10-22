import React from 'react';
import { AlertCircle, ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { PendingDrugRecord } from '../types/pharma';

interface WaitingApprovalViewProps {
  pendingRecords: PendingDrugRecord[];
}

export const WaitingApprovalView: React.FC<WaitingApprovalViewProps> = ({
  pendingRecords,
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">
          Waiting for Final FDA Approval & Tentative Actions
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Verified FDA Tentative Approval (TA) records and authorized regulatory review disclosures.
        </p>
      </div>

      {/* Mandatory Official Data Source Verification Notice */}
      <div className="rounded-md border border-blue-200 bg-blue-50/60 p-4 space-y-2 text-xs text-slate-800">
        <div className="flex items-center gap-2 font-semibold text-blue-950 text-sm">
          <Info className="h-4 w-4 text-blue-700 shrink-0" />
          Official FDA Pending-Application Data Availability & Governance Notice
        </div>
        <p className="leading-relaxed">
          Under US FDA regulations (21 CFR 314.430 / 601.51), the FDA treats unapproved, pending NDA and BLA submissions as confidential commercial information and <strong>does not provide a public openFDA API feed of pending PDUFA applications prior to regulatory action</strong>.
        </p>
        <p className="leading-relaxed">
          To prevent fabricated or speculative pipeline entries, PharmaIntel <strong>never guesses pending applications</strong> and never infers that an application is awaiting approval merely because it is absent from approved records. This page displays only:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          <li>
            <strong>Official FDA Tentative Approvals (<code className="font-mono">submission_status: "TA"</code>):</strong> Applications that have completed FDA clinical/scientific review and met approval standards, but await patent or exclusivity expiration before final approval (<code className="font-mono">AP</code>) can take effect.
          </li>
          <li>
            <strong>Authorized Commercial Regulatory Feeds (Not Yet Connected):</strong> Licensed PDUFA calendar providers (e.g., Citeline Pink Sheet / BioMedTracker) can be connected in Settings when commercial API credentials are provisioned.
          </li>
        </ul>
      </div>

      {/* Verified Tentative / Awaiting Final Clearance Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Verified FDA Tentative Approvals Awaiting Final Action ({pendingRecords.length})
            </h2>
            <p className="text-xs text-slate-500">
              Official facts clearly separated from analyst interpretation and estimated timelines
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            Verified via openFDA Drugs@FDA
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Product / Drug Name</th>
                <th className="py-3 px-4">Applicant / Pharmaceutical Company</th>
                <th className="py-3 px-4">Indication</th>
                <th className="py-3 px-4">Submission Type</th>
                <th className="py-3 px-4">Expected Decision / Action Date</th>
                <th className="py-3 px-4">Current Official Status</th>
                <th className="py-3 px-4 text-right">Preliminary PSP Score</th>
                <th className="py-3 px-4">Official Source & Verification Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {pendingRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 align-top">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{rec.productName}</div>
                    {rec.applicationNumber && (
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                        Application: {rec.applicationNumber}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {rec.sponsorName}
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 max-w-[240px]">
                    {rec.indication}
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {rec.submissionType}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {rec.expectedDecisionDate ? (
                      <div>
                        <span className="font-mono font-medium text-slate-900">
                          {rec.expectedDecisionDate}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {rec.decisionDateType}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">
                        Not publicly disclosed by FDA
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 max-w-[230px]">
                    <div className="font-medium text-amber-800">{rec.currentStatus}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      <strong>Analyst Note:</strong> {rec.analystNotes}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {rec.pspScore !== null ? (
                      <div>
                        <span className="font-mono text-sm font-bold tabular-nums text-slate-900">
                          {rec.pspScore}/100
                        </span>
                        <span className="block text-[11px] text-blue-700 font-medium">
                          {rec.pspTier}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-slate-500">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Insufficient Evidence</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <a
                      href={rec.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
                    >
                      <span>{rec.sourceTitle}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                    <div className="mt-1 font-mono text-[11px] text-slate-500">
                      Last verified: {rec.lastVerifiedAt}
                    </div>
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
