"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ACCENT = "#d4f542";

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    date: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  };
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}
function isYesterday(iso: string) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return iso === y.toISOString().slice(0, 10);
}

function DateBadge({ iso }: { iso: string }) {
  if (isToday(iso))
    return (
      <span style={{ background: ACCENT, color: "#09090b", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
        Today
      </span>
    );
  if (isYesterday(iso))
    return (
      <span style={{ background: "#27272a", color: "#a1a1aa", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99 }}>
        Yesterday
      </span>
    );
  return null;
}

function ReportCard({ iso, onOpen }: { iso: string; onOpen: (iso: string) => void }) {
  const { weekday, date } = formatDate(iso);
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={() => onOpen(iso)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        textAlign: "left",
        background: hover ? "#1f1f22" : "#18181b",
        border: `1px solid ${hover ? "#3f3f46" : "#27272a"}`,
        borderRadius: 12,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>{weekday}</span>
          <DateBadge iso={iso} />
        </div>
        <span style={{ fontSize: 12, color: "#71717a" }}>{date}</span>
      </div>
      <svg width={16} height={16} fill="none" stroke={hover ? "#a1a1aa" : "#52525b"} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

type Task = { task: string; status: string };

function parseContent(content: string): { tasks: Task[]; date: string } | null {
  try {
    const raw = content.trim();
    const parsed = JSON.parse(raw);
    if (parsed.tasks && Array.isArray(parsed.tasks)) return parsed;
    if (Array.isArray(parsed)) return { tasks: parsed, date: "" };
  } catch {}
  return null;
}

const COPY_SIGNATURE = "Sourav's daily task automation";

function buildCopyText(weekday: string, date: string, tasks: Task[]): string {
  const lines = tasks.map((t) =>
    `${t.status === "Done" ? "✅" : "🔄"} ${t.task} — ${t.status}`
  );
  return `📅 Daily Update — ${weekday}, ${date}\n\n${lines.join("\n")}\n\n— ${COPY_SIGNATURE}`;
}

function StatusBadge({ status }: { status: string }) {
  const done = status === "Done";
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
      background: done ? "rgba(212,245,66,0.12)" : "rgba(251,191,36,0.12)",
      color: done ? ACCENT : "#fbbf24",
      border: `1px solid ${done ? "rgba(212,245,66,0.25)" : "rgba(251,191,36,0.25)"}`,
      whiteSpace: "nowrap" as const,
    }}>
      {status}
    </span>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #27272a" }}>
          <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontSize: 11, fontWeight: 600, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Task</th>
          <th style={{ textAlign: "right", padding: "8px 0", fontSize: 11, fontWeight: 600, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #1f1f22" }}>
            <td style={{ padding: "12px 16px 12px 0", fontSize: 13, color: "#e4e4e7" }}>{t.task}</td>
            <td style={{ padding: "12px 0", textAlign: "right" }}><StatusBadge status={t.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportModal({ iso, content, onClose }: { iso: string; content: string; onClose: () => void }) {
  const { weekday, date } = formatDate(iso);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parsed = parseContent(content);
  const body = content.replace(/^#[^\n]*\n+/, "").trim();

  const handleCopy = () => {
    const text = parsed ? buildCopyText(weekday, date, parsed.tasks) : body;
    const finish = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(finish).catch(() => fallbackCopy(text, finish));
    } else {
      fallbackCopy(text, finish);
    }
  };

  const fallbackCopy = (text: string, done: () => void) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand("copy"); done(); } catch {}
    document.body.removeChild(el);
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, background: "rgba(0,0,0,0.75)",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 640, maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        borderRadius: 18, border: "1px solid #3f3f46",
        background: "#18181b", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: "1px solid #27272a", flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#f4f4f5" }}>{weekday}</span>
              <DateBadge iso={iso} />
            </div>
            <span style={{ fontSize: 12, color: "#71717a" }}>{date}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleCopy}
              title="Copy to clipboard"
              style={{
                height: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: copied ? "0 12px" : "0 10px",
                borderRadius: 8, border: `1px solid ${copied ? ACCENT : "#3f3f46"}`,
                background: copied ? `${ACCENT}18` : "transparent",
                color: copied ? ACCENT : "#71717a",
                cursor: "pointer", transition: "all 0.15s", fontSize: 12, fontWeight: 500,
              }}
              onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = "#27272a"; e.currentTarget.style.color = "#f4f4f5"; e.currentTarget.style.borderColor = "#52525b"; } }}
              onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#71717a"; e.currentTarget.style.borderColor = "#3f3f46"; } }}
            >
              {copied ? (
                <>
                  <svg width={13} height={13} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, border: "none", background: "transparent", color: "#71717a",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#27272a"; e.currentTarget.style.color = "#f4f4f5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#71717a"; }}
            >
              <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "20px 24px" }}>
          {parsed ? (
            <TaskTable tasks={parsed.tasks} />
          ) : (
            <div className="report-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsApp() {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setDates(d.dates ?? []))
      .finally(() => setLoading(false));
  }, []);

  const openReport = useCallback(async (iso: string) => {
    setLoadingReport(true);
    setActiveDate(iso);
    try {
      const r = await fetch(`/api/reports?date=${iso}`);
      const d = await r.json();
      setActiveContent(d.report ?? "");
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setActiveDate(null);
    setActiveContent("");
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{
        borderBottom: "1px solid #27272a", padding: "0 24px",
        height: 56, display: "flex", alignItems: "center", gap: 12,
        background: "#111113",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width={14} height={14} fill="none" stroke="#09090b" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>Daily Reports</span>
        {!loading && (
          <span style={{ fontSize: 12, color: "#52525b", marginLeft: 2 }}>
            {dates.length} {dates.length === 1 ? "report" : "reports"}
          </span>
        )}
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <div className="spinner" />
          </div>
        ) : dates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: "#1c1c1f",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <svg width={22} height={22} fill="none" stroke="#52525b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p style={{ color: "#71717a", fontSize: 14 }}>No reports yet.</p>
            <p style={{ color: "#52525b", fontSize: 12, marginTop: 4 }}>
              Run <code style={{ fontFamily: "monospace", color: "#71717a" }}>python3 reporter.py</code> to generate your first one.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dates.map((iso) => (
              <ReportCard key={iso} iso={iso} onOpen={openReport} />
            ))}
          </div>
        )}
      </div>

      {activeDate && !loadingReport && (
        <ReportModal iso={activeDate} content={activeContent} onClose={closeModal} />
      )}

      {loadingReport && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)",
        }}>
          <div className="spinner" />
        </div>
      )}
    </main>
  );
}
