"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ACCENT = "#d4f542";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    return <span style={{ background: ACCENT, color: "#09090b", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>Today</span>;
  if (isYesterday(iso))
    return <span style={{ background: "#27272a", color: "#a1a1aa", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99 }}>Yesterday</span>;
  return null;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function CalendarView({ dates, onOpen }: { dates: string[]; onOpen: (iso: string) => void }) {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const reportSet = new Set(dates);
  const todayIso = today.toISOString().slice(0, 10);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ day: number; iso: string; hasReport: boolean } | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { day: d, iso, hasReport: reportSet.has(iso) };
    }),
  ];

  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const navBtn = (dir: number) => () => setView(new Date(year, month + dir, 1));

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button onClick={navBtn(-1)} style={navStyle}>
          <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>{monthLabel}</span>
        <button onClick={navBtn(1)} style={navStyle}>
          <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />;
          const isT = cell.iso === todayIso;
          return (
            <button
              key={cell.iso}
              onClick={() => cell.hasReport && onOpen(cell.iso)}
              disabled={!cell.hasReport}
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                border: isT ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                background: cell.hasReport ? "#1c1c1f" : "transparent",
                color: cell.hasReport ? "#f4f4f5" : "#3f3f46",
                cursor: cell.hasReport ? "pointer" : "default",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                fontSize: 13, fontWeight: cell.hasReport ? 600 : 400,
                transition: "background 0.12s, transform 0.1s",
                position: "relative",
              }}
              onMouseEnter={(e) => { if (cell.hasReport) e.currentTarget.style.background = "#2a2a2e"; }}
              onMouseLeave={(e) => { if (cell.hasReport) e.currentTarget.style.background = "#1c1c1f"; }}
            >
              <span>{cell.day}</span>
              {cell.hasReport && (
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT, display: "block" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, justifyContent: "center" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, display: "inline-block" }} />
        <span style={{ fontSize: 12, color: "#52525b" }}>Report available — click to view</span>
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: "1px solid #27272a",
  background: "transparent", color: "#a1a1aa", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

// ── Task table ─────────────────────────────────────────────────────────────────

type Task = { task: string; status: string };

function parseContent(content: string): { tasks: Task[]; date: string } | null {
  try {
    const parsed = JSON.parse(content.trim());
    if (parsed.tasks && Array.isArray(parsed.tasks)) return parsed;
    if (Array.isArray(parsed)) return { tasks: parsed, date: "" };
  } catch {}
  return null;
}

const COPY_SIGNATURE = "Sourav's daily task automation";

function buildCopyText(weekday: string, date: string, tasks: Task[]): string {
  const lines = tasks.map((t) => `${t.status === "Done" ? "✅" : "🔄"} ${t.task} — ${t.status}`);
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

// ── Modal ─────────────────────────────────────────────────────────────────────

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
                <><svg width={13} height={13} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
              ) : (
                <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "transparent", color: "#71717a", cursor: "pointer" }}
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
          {parsed ? <TaskTable tasks={parsed.tasks} /> : (
            <div className="report-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

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
      <header style={{ borderBottom: "1px solid #27272a", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, background: "#111113" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width={14} height={14} fill="none" stroke="#09090b" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>Daily Reports</span>
        {!loading && (
          <span style={{ fontSize: 12, color: "#52525b", marginLeft: 2 }}>
            {dates.length} {dates.length === 1 ? "report" : "reports"}
          </span>
        )}
      </header>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <div className="spinner" />
        </div>
      ) : (
        <CalendarView dates={dates} onOpen={openReport} />
      )}

      {activeDate && !loadingReport && (
        <ReportModal iso={activeDate} content={activeContent} onClose={closeModal} />
      )}

      {loadingReport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
          <div className="spinner" />
        </div>
      )}
    </main>
  );
}
