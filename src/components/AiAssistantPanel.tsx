import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { DrugRecord } from '../types/pharma';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Array<{ title: string; url: string }>;
  timestamp: string;
}

interface AiAssistantPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  focusedDrug: DrugRecord | null;
}

const EXAMPLE_PROMPTS = [
  'Show me high-priority PSP opportunities',
  'Compare the top five opportunities',
  'Which records have missing indication data?',
  'Summarize the latest FDA approval activity',
];

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  collapsed,
  onToggleCollapse,
  focusedDrug,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState<string>('Gemini AI + Verified FDA Grounding');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/assistant/history')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.history)) {
          setMessages(data.history);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: clean,
      sources: [],
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          focusedDrugId: focusedDrug?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to get assistant response.');
      }

      if (data.mode) {
        setModeLabel(data.mode);
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'No response returned.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach AI assistant service.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await fetch('/api/assistant/history', { method: 'DELETE' });
      setMessages([]);
      setError(null);
    } catch {
      setMessages([]);
    }
  };

  if (collapsed) {
    return (
      <aside
        aria-label="Collapsed AI Assistant Panel"
        className="flex h-full w-12 shrink-0 flex-col items-center border-l border-slate-200 bg-slate-50 py-4"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand AI Intelligence Assistant"
          title="Expand AI Intelligence Assistant"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-700 text-white hover:bg-blue-800"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <div className="mt-6 [writing-mode:vertical-rl] rotate-180 text-xs font-medium tracking-wide text-slate-600">
          AI Intelligence Assistant
        </div>
      </aside>
    );
  }

  const contextualPrompts = focusedDrug
    ? [
        `Explain why ${focusedDrug.drugName} has a score of ${focusedDrug.pspScore.totalScore}`,
        `What evidence is missing for ${focusedDrug.drugName}?`,
        `Draft a professional outreach email for ${focusedDrug.sponsorName}`,
        ...EXAMPLE_PROMPTS.slice(0, 2),
      ]
    : EXAMPLE_PROMPTS;

  return (
    <aside
      aria-label="Persistent AI Intelligence Assistant"
      className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 bg-slate-50">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-700 shrink-0" />
          <div>
            <h2 className="text-xs font-semibold text-slate-900">
              PharmaIntel AI Assistant
            </h2>
            <p className="text-[11px] text-slate-500 truncate max-w-[210px]">
              {modeLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear conversation history"
              title="Clear conversation history"
              className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse AI Assistant panel"
            title="Collapse AI Assistant panel"
            className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Record Context Bar */}
      {focusedDrug && (
        <div className="border-b border-slate-200 bg-blue-50/60 px-4 py-2 text-xs text-slate-800">
          <span className="font-medium text-blue-900">Active Context:</span>{' '}
          {focusedDrug.drugName} ({focusedDrug.applicationNumber}) · Score:{' '}
          <span className="font-mono font-semibold">{focusedDrug.pspScore.totalScore}/100</span>
        </div>
      )}

      {/* Conversation Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-700 shrink-0" />
            Source-Grounded Intelligence
          </div>
          <p className="leading-relaxed">
            Answers are grounded in verified US FDA Drugs@FDA application records and rule-based PSP scoring factors. The assistant cannot trigger external emails or CRM updates without your confirmation.
          </p>
        </div>

        {/* Quick Investigative Prompts */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500">
            Suggested Investigations:
          </div>
          <div className="flex flex-col gap-1.5">
            {contextualPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="text-left rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/40 transition-colors disabled:opacity-50"
              >
                “{prompt}”
              </button>
            ))}
          </div>
        </div>

        {/* Message List */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-md p-3 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-slate-900 text-white ml-4'
                : 'border border-slate-200 bg-slate-50/80 text-slate-800 mr-2'
            }`}
          >
            <div className="mb-1 flex items-center justify-between text-[10px] opacity-75">
              <span className="font-semibold">
                {msg.role === 'user' ? 'You' : 'PharmaIntel Assistant (Verified Context)'}
              </span>
              <span className="font-mono">
                {msg.timestamp ? msg.timestamp.slice(11, 16) : ''}
              </span>
            </div>
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>

            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2.5 border-t border-slate-200 pt-2 space-y-1">
                <div className="text-[10px] font-semibold text-slate-600">
                  Official FDA Sources Referenced:
                </div>
                {msg.sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-[11px] text-blue-700 hover:underline"
                  >
                    <span className="truncate pr-2">{s.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Analyzing verified FDA records and PSP score dimensions...
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-slate-200 p-3 bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="ai-assistant-prompt-input" className="sr-only">
            Ask PharmaIntel AI Assistant
          </label>
          <input
            id="ai-assistant-prompt-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about scores, FDA evidence, or drafts..."
            disabled={loading}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send question to AI Assistant"
            className="inline-flex items-center justify-center rounded-md bg-blue-700 px-3 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};
