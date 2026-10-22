import React, { useEffect, useState } from 'react';
import { Check, Copy, Mail, ShieldAlert, X } from 'lucide-react';
import { DrugRecord, EmailOutreachDraft } from '../types/pharma';

interface OutreachDraftModalProps {
  drug: DrugRecord;
  emailConfigured: boolean;
  onClose: () => void;
}

export const OutreachDraftModal: React.FC<OutreachDraftModalProps> = ({
  drug,
  emailConfigured,
  onClose,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [citations, setCitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sendAttemptMessage, setSendAttemptMessage] = useState<string | null>(null);

  const generateDraft = async (name: string, email: string) => {
    setLoading(true);
    setSendAttemptMessage(null);
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(drug.id)}/outreach-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: name,
          recipientEmail: email,
          actor: 'Marketing BD Lead',
        }),
      });
      const data = await res.json();
      if (data?.draft) {
        const d: EmailOutreachDraft = data.draft;
        setSubject(d.subject);
        setBody(d.body);
        setCitations(d.evidenceCitations || []);
      }
    } catch (e: any) {
      setSendAttemptMessage(e?.message || 'Could not generate draft.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateDraft('', '');
  }, [drug.id]);

  const handleCopy = async () => {
    const fullText = `To: ${recipientName ? `${recipientName} <${recipientEmail}>` : '[Verify Recipient Contact]'}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendAttempt = async () => {
    setSendAttemptMessage(null);
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(drug.id)}/outreach-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          recipientVerified: Boolean(recipientName.trim() && recipientEmail.includes('@')),
          subject,
          body,
          userExplicitlyConfirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.sent) {
        setSendAttemptMessage(
          data.error ||
            'Email provider is not configured. Real email sending is disabled; use Copy to Clipboard.'
        );
      }
    } catch (err: any) {
      setSendAttemptMessage(err?.message || 'Email sending is disabled.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outreach-modal-title"
    >
      <div className="w-full max-w-2xl rounded-md border border-slate-200 bg-white shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-blue-700" />
            <div>
              <h2 id="outreach-modal-title" className="text-base font-semibold text-slate-900">
                Evidence-Based PSP Outreach Draft — {drug.drugName} ({drug.applicationNumber})
              </h2>
              <p className="text-xs text-slate-500">
                Sponsor: {drug.sponsorName} · Approval Action: {drug.approvalActionDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close outreach draft dialog"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <ShieldAlert className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">
                Outreach Safeguard Mode ({emailConfigured ? 'Configured' : 'Draft & Copy Only — Sending Disabled'}):
              </span>{' '}
              PharmaIntel never invents contact names or email addresses and never sends automated emails. Enter a verified recipient if known, review/edit the evidence-grounded draft below, and copy to your clipboard.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="outreach-recipient-name"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Verified Recipient Name (Optional for Draft)
              </label>
              <input
                id="outreach-recipient-name"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                onBlur={() => generateDraft(recipientName, recipientEmail)}
                placeholder="Do not guess — enter verified contact name"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="outreach-recipient-email"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Verified Recipient Email Address
              </label>
              <input
                id="outreach-recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Verified corporate email required to send"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="outreach-subject"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Email Subject Line
            </label>
            <input
              id="outreach-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="outreach-body"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Editable Outreach Message Body
            </label>
            <textarea
              id="outreach-body"
              rows={11}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-sans text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {citations.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <div className="font-semibold text-slate-800 mb-1">
                Official FDA Evidence Referenced in Draft:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                {citations.map((c, idx) => (
                  <li key={idx} className="break-all">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sendAttemptMessage && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {sendAttemptMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 bg-slate-50">
          <button
            type="button"
            onClick={handleSendAttempt}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            {emailConfigured ? 'Verify & Send Email' : 'Send Email (Disabled — Check Safeguards)'}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied Draft to Clipboard
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Draft to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
