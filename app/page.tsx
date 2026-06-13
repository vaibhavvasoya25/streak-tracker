"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysDiff(a: Date, b: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.floor((utc(b) - utc(a)) / 86400000));
}

function formatDate(d: Date): string {
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
}

function toInputVal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string { return toInputVal(new Date()); }

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthsDays(days: number) {
  return { months: Math.floor(days / 30), rem: days % 30 };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface HabitState {
  startDate: string;        // "YYYY-MM-DD"
  daysCount: number;
  skipCount: number;
  lastActionDate: string | null;
  lastAction: "done" | "skip" | null;
  loggedDates: string[];    // every "YYYY-MM-DD" that has been actioned
}

interface AppState {
  crn: { startDate: string };
  exrcs: HabitState;
  wlk: HabitState;
}

// ─── Default state (your real current numbers) ────────────────────────────────

const DEFAULT_STATE: AppState = {
  crn: { startDate: "2026-06-07" },
  exrcs: {
    startDate: "2026-04-21",
    daysCount: 48,
    skipCount: 6,
    lastActionDate: "2026-06-13",
    lastAction: "done" as const,
    loggedDates: ["2026-06-13"],
  },
  wlk: {
    startDate: "2026-04-22",
    daysCount: 44,
    skipCount: 8,
    lastActionDate: "2026-06-13",
    lastAction: "done" as const,
    loggedDates: ["2026-06-13"],
  },
};

// ─── Compute missing days between last logged date and yesterday ──────────────

function getMissingDays(state: HabitState, todayKey: string): string[] {
  if (!state.lastActionDate) return [];
  const last    = parseLocalDate(state.lastActionDate);
  const todayD  = parseLocalDate(todayKey);
  const missing: string[] = [];
  let cursor = addDays(last, 1);
  while (cursor < todayD) {
    const k = toInputVal(cursor);
    if (!state.loggedDates.includes(k)) missing.push(k);
    cursor = addDays(cursor, 1);
  }
  return missing;
}

// ─── Small components ─────────────────────────────────────────────────────────

function ProgressBar({ value, max, color, border }: { value: number; max: number; color: string; border: string }) {
  return (
    <div style={{ marginTop: "16px", height: "4px", backgroundColor: border, borderRadius: "99px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%`, backgroundColor: color, borderRadius: "99px", opacity: 0.7 }} />
    </div>
  );
}

function UndoToast({ message, onUndo, color }: { message: string; onUndo: () => void; color: string }) {
  const [pct, setPct] = useState(100);
  useEffect(() => {
    const t = setInterval(() => setPct(p => { if (p <= 0) { clearInterval(t); return 0; } return p - 1; }), 100);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ marginTop: "12px", backgroundColor: "white", border: `1.5px solid ${color}33`, borderRadius: "12px", padding: "12px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: "3px", width: `${pct}%`, backgroundColor: color, opacity: 0.4, borderRadius: "0 0 0 12px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#78716c", fontStyle: "italic" }}>{message}</p>
        <button onClick={onUndo} style={{ backgroundColor: color, color: "white", border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "'Georgia', serif", whiteSpace: "nowrap", flexShrink: 0 }}>Undo</button>
      </div>
    </div>
  );
}

// Inline editable number — tap to edit, blur/enter to save
function EditableCount({
  value, color, border, bg, onSave,
}: { value: number; color: string; border: string; bg: string; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw]         = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  const commit = () => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0) onSave(n);
    setEditing(false);
  };

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setRaw(String(value)); }, [value, editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{
          width: "80px", fontSize: "clamp(40px, 12vw, 56px)", fontWeight: "bold", color,
          lineHeight: 1, letterSpacing: "-1px", border: `2px solid ${border}`,
          borderRadius: "8px", backgroundColor: bg, outline: "none", padding: "0 4px",
          fontFamily: "'Georgia', serif", textAlign: "center",
        }}
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      title="Tap to edit"
      style={{
        fontSize: "clamp(40px, 12vw, 56px)", fontWeight: "bold", color, lineHeight: 1,
        letterSpacing: "-1px", cursor: "pointer", borderBottom: `2px dotted ${color}55`,
      }}
    >
      {value}
    </span>
  );
}

// ─── Qt Fixed Card (ntcn & mv) ───────────────────────────────────────────────

function QtFixedCard({ label, startDate, days, color, bg, border }: {
  label: string; startDate: Date; days: number; color: string; bg: string; border: string;
}) {
  const { months, rem } = monthsDays(days);
  return (
    <div style={{ backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: "16px", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", color, margin: "0 0 6px 0", fontWeight: "bold" }}>{label}</p>
      <p style={{ fontSize: "13px", color: "#78716c", margin: "0 0 16px 0", fontStyle: "italic" }}>since {formatDate(startDate)}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "clamp(52px, 16vw, 72px)", fontWeight: "bold", color, lineHeight: 1, letterSpacing: "-2px" }}>{days}</span>
          <span style={{ fontSize: "16px", color: "#a8a29e", paddingBottom: "10px", fontStyle: "italic" }}>days</span>
        </div>
        {months > 0 && (
          <div style={{ paddingBottom: "10px" }}>
            <span style={{ backgroundColor: color + "18", border: `1px solid ${color}33`, borderRadius: "20px", padding: "3px 10px", fontSize: "12px", color, fontStyle: "italic", whiteSpace: "nowrap" }}>
              {months}mo {rem}d
            </span>
          </div>
        )}
      </div>
      <ProgressBar value={days} max={365} color={color} border={border} />
    </div>
  );
}

// ─── Missed Day Prompt ────────────────────────────────────────────────────────

function MissedDayPrompt({ dateKey, color, bg, border, onAction }: {
  dateKey: string; color: string; bg: string; border: string;
  onAction: (action: "done" | "skip") => void;
}) {
  const d = parseLocalDate(dateKey);
  return (
    <div style={{ backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: "12px", padding: "14px 16px", marginTop: "12px" }}>
      <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#78716c", fontStyle: "italic" }}>
        What happened on <strong style={{ color }}>{formatDate(d)}</strong>?
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => onAction("done")} style={{ flex: 1, backgroundColor: color, color: "white", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", cursor: "pointer", fontFamily: "'Georgia', serif", fontWeight: "bold" }}>✓ Done</button>
        <button onClick={() => onAction("skip")} style={{ flex: 1, backgroundColor: "white", color: "#78716c", border: "1.5px solid #e7e5e4", borderRadius: "10px", padding: "10px", fontSize: "13px", cursor: "pointer", fontFamily: "'Georgia', serif" }}>Skip</button>
      </div>
    </div>
  );
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

function HabitCard({
  label, color, bg, border, state, todayKey,
  showUndo, undoMessage, missedDays,
  onTodayDone, onTodaySkip, onUndo,
  onMissedAction, onDateChange, onCountChange,
}: {
  label: string; color: string; bg: string; border: string;
  state: HabitState; todayKey: string;
  showUndo: boolean; undoMessage: string;
  missedDays: string[];
  onTodayDone: () => void; onTodaySkip: () => void; onUndo: () => void;
  onMissedAction: (dateKey: string, action: "done" | "skip") => void;
  onDateChange: (val: string) => void;
  onCountChange: (field: "daysCount" | "skipCount", val: number) => void;
}) {
  const [dateEdit, setDateEdit] = useState(false);
  const todayDone = state.lastActionDate === todayKey;

  // Show missed day prompts one at a time (oldest first)
  const nextMissed = missedDays.length > 0 ? missedDays[0] : null;

  return (
    <div style={{ backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: "16px", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", color, margin: "0 0 6px 0", fontWeight: "bold" }}>{label}</p>

      {/* Editable start date */}
      {dateEdit ? (
        <div style={{ marginBottom: "16px" }}>
          <input
            type="date" defaultValue={state.startDate} max={todayStr()} autoFocus
            onChange={e => { if (e.target.value) onDateChange(e.target.value); }}
            onBlur={() => setDateEdit(false)}
            style={{ fontSize: "13px", color, border: `1.5px solid ${border}`, borderRadius: "8px", padding: "6px 10px", fontFamily: "'Georgia', serif", backgroundColor: "white", outline: "none", width: "100%", boxSizing: "border-box" as const }}
          />
        </div>
      ) : (
        <p onClick={() => setDateEdit(true)} style={{ fontSize: "13px", color: "#78716c", margin: "0 0 16px 0", fontStyle: "italic", cursor: "pointer", display: "inline-block", textDecoration: "underline dotted" }}>
          since {formatDate(parseLocalDate(state.startDate))} ✎
        </p>
      )}

      {/* Stats row — editable done/skip counts */}
      <div style={{ position: "relative" }}>
        <div style={{
          display: "flex", gap: "24px",
          filter: (todayDone || nextMissed) ? "none" : "blur(3px)",
          transition: "filter 0.3s",
          userSelect: "none" as const,
          pointerEvents: (todayDone || nextMissed) ? "auto" : "none" as const,
        }}>
          <div>
            <p style={{ fontSize: "11px", color: "#a8a29e", margin: "0 0 2px 0", letterSpacing: "1px", textTransform: "uppercase" as const }}>Done</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
              <EditableCount value={state.daysCount} color={color} border={border} bg={bg} onSave={v => onCountChange("daysCount", v)} />
              <span style={{ fontSize: "13px", color: "#a8a29e", paddingBottom: "7px", fontStyle: "italic" }}>days</span>
            </div>
          </div>
          <div style={{ width: "1px", backgroundColor: border, alignSelf: "stretch", margin: "4px 0" }} />
          <div>
            <p style={{ fontSize: "11px", color: "#a8a29e", margin: "0 0 2px 0", letterSpacing: "1px", textTransform: "uppercase" as const }}>Skipped</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
              <EditableCount value={state.skipCount} color="#a8a29e" border={border} bg={bg} onSave={v => onCountChange("skipCount", v)} />
              <span style={{ fontSize: "13px", color: "#a8a29e", paddingBottom: "7px", fontStyle: "italic" }}>days</span>
            </div>
          </div>
        </div>

        {/* Today's prompt — only when no missed days pending and today not logged */}
        {!todayDone && !nextMissed && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <button onClick={onTodayDone} style={{ backgroundColor: color, color: "white", border: "none", borderRadius: "12px", padding: "13px 24px", fontSize: "15px", cursor: "pointer", fontFamily: "'Georgia', serif", fontWeight: "bold", boxShadow: `0 4px 14px ${color}44`, letterSpacing: "0.3px" }}>✓ Done</button>
            <button onClick={onTodaySkip} style={{ backgroundColor: "white", color: "#78716c", border: "1.5px solid #e7e5e4", borderRadius: "12px", padding: "13px 24px", fontSize: "15px", cursor: "pointer", fontFamily: "'Georgia', serif", letterSpacing: "0.3px" }}>Skip</button>
          </div>
        )}
      </div>

      {/* Missed day prompt — one at a time, oldest first */}
      {nextMissed && (
        <MissedDayPrompt
          dateKey={nextMissed} color={color} bg="white" border={border}
          onAction={(action) => onMissedAction(nextMissed, action)}
        />
      )}

      {/* Progress bar */}
      <ProgressBar value={state.daysCount} max={Math.max(state.daysCount + state.skipCount, 1)} color={color} border={border} />

      {/* Undo toast */}
      {showUndo && <UndoToast message={undoMessage} onUndo={onUndo} color={color} />}

      {/* Today badge */}
      {todayDone && !showUndo && (
        <div style={{ marginTop: "14px", textAlign: "center", fontSize: "12px", color, fontStyle: "italic", opacity: 0.8 }}>
          {state.lastAction === "done" ? "✓ Logged for today" : "— Skipped today"}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const todayD   = new Date(); todayD.setHours(0, 0, 0, 0);
  const todayKey = toInputVal(todayD);

  const NTCN_START = new Date(2026, 1, 1);
  const MV_START   = new Date(2026, 0, 5);

  const [appState,  setAppState]  = useState<AppState>(DEFAULT_STATE);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Undo state
  const [exrcsUndo, setExrcsUndo] = useState(false);
  const [wlkUndo,   setWlkUndo]   = useState(false);
  const exrcsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wlkTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Crn edit mode
  const [crnEdit, setCrnEdit] = useState(false);

  // ── Load from API (JSONBin) on mount ──
  useEffect(() => {
    fetch("/api/state")
      .then(r => r.json())
      .then((data: AppState) => {
        // Merge with defaults in case fields are missing (first-ever load)
        setAppState({
          crn:   { ...DEFAULT_STATE.crn,   ...data.crn },
          exrcs: { ...DEFAULT_STATE.exrcs, ...data.exrcs },
          wlk:   { ...DEFAULT_STATE.wlk,   ...data.wlk },
        });
      })
      .catch(() => {
        // API not configured yet — fall back to localStorage
        const stored = localStorage.getItem("app_state");
        setAppState(stored ? JSON.parse(stored) : DEFAULT_STATE);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Save helper — writes to API and localStorage as backup ──
  const save = useCallback(async (next: AppState) => {
    setAppState(next);
    localStorage.setItem("app_state", JSON.stringify(next));
    setSaving(true); setSaveError(false);
    try {
      const r = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (!r.ok) setSaveError(true);
    } catch { setSaveError(true); }
    finally { setSaving(false); }
  }, []);

  if (loading || !appState) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fafaf9", fontFamily: "'Georgia', serif" }}>
        <p style={{ color: "#a8a29e", fontStyle: "italic" }}>Loading…</p>
      </div>
    );
  }

  // ── Derived ──
  const crnStartD  = parseLocalDate(appState.crn.startDate);
  const crnDays    = getDaysDiff(crnStartD, todayD);
  const ntcnDays   = getDaysDiff(NTCN_START, todayD);
  const mvDays     = getDaysDiff(MV_START, todayD);

  const exrcsMissed = getMissingDays(appState.exrcs, todayKey);
  const wlkMissed   = getMissingDays(appState.wlk,   todayKey);

  const tomorrow = addDays(todayD, 1);

  // ── Habit action ──
  function recordAction(
    key: "exrcs" | "wlk",
    dateKey: string,
    action: "done" | "skip",
    setUndo: React.Dispatch<React.SetStateAction<boolean>>,
    timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    isToday: boolean
  ) {
    const habit = appState[key];
    const next: HabitState = {
      ...habit,
      daysCount:      action === "done" ? habit.daysCount + 1 : habit.daysCount,
      skipCount:      action === "skip" ? habit.skipCount + 1 : habit.skipCount,
      lastActionDate: isToday ? dateKey : habit.lastActionDate,
      lastAction:     isToday ? action  : habit.lastAction,
      loggedDates:    [...habit.loggedDates.filter(d => d !== dateKey), dateKey],
    };
    const nextApp = { ...appState, [key]: next };
    save(nextApp);
    if (isToday) {
      setUndo(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setUndo(false), 10000);
    }
  }

  function undoTodayAction(
    key: "exrcs" | "wlk",
    setUndo: React.Dispatch<React.SetStateAction<boolean>>,
    timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) {
    const habit = appState[key];
    const next: HabitState = {
      ...habit,
      daysCount:      habit.lastAction === "done" ? habit.daysCount - 1 : habit.daysCount,
      skipCount:      habit.lastAction === "skip" ? habit.skipCount - 1 : habit.skipCount,
      lastActionDate: null,
      lastAction:     null,
      loggedDates:    habit.loggedDates.filter(d => d !== todayKey),
    };
    save({ ...appState, [key]: next });
    setUndo(false);
    if (timer.current) clearTimeout(timer.current);
  }

  function updateHabitCount(key: "exrcs" | "wlk", field: "daysCount" | "skipCount", val: number) {
    save({ ...appState, [key]: { ...appState[key], [field]: val } });
  }

  function updateHabitStart(key: "exrcs" | "wlk", val: string) {
    save({ ...appState, [key]: { ...appState[key], startDate: val } });
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fafaf9", fontFamily: "'Georgia', 'Times New Roman', serif", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "56px" }}>

      {/* Header */}
      <div style={{ width: "100%", backgroundColor: "#1c1917", padding: "28px 24px 24px", textAlign: "center", marginBottom: "28px" }}>
        <p style={{ color: "#a8a29e", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 8px 0" }}>your streak tracker</p>
        <h1 style={{ color: "#fafaf9", fontSize: "clamp(22px, 6vw, 30px)", fontWeight: "normal", letterSpacing: "0.5px", margin: 0 }}>Stay the Course</h1>
        <p style={{ color: "#78716c", fontSize: "13px", marginTop: "10px", fontStyle: "italic" }}>{formatDate(todayD)}</p>
        {/* Save status indicator */}
        <p style={{ color: saving ? "#a8a29e" : saveError ? "#ef4444" : "transparent", fontSize: "10px", marginTop: "6px", letterSpacing: "1px" }}>
          {saving ? "saving…" : saveError ? "⚠ save failed — check connection" : "·"}
        </p>
      </div>

      {/* Cards */}
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 16px", display: "flex", flexDirection: "column", gap: "16px" }}>

        <QtFixedCard label="Qt ntcn" startDate={NTCN_START} days={ntcnDays} color="#16a34a" bg="#f0fdf4" border="#bbf7d0" />
        <QtFixedCard label="Qt mv"   startDate={MV_START}   days={mvDays}   color="#2563eb" bg="#eff6ff" border="#bfdbfe" />

        {/* Qt crn */}
        <div style={{ backgroundColor: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: "16px", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", color: "#9333ea", margin: "0 0 6px 0", fontWeight: "bold" }}>Qt crn</p>

          {crnEdit ? (
            <div style={{ marginBottom: "16px" }}>
              <input
                type="date" defaultValue={appState.crn.startDate} max={todayStr()} autoFocus
                onChange={e => { if (e.target.value) { save({ ...appState, crn: { startDate: e.target.value } }); setCrnEdit(false); } }}
                onBlur={() => setCrnEdit(false)}
                style={{ fontSize: "13px", color: "#9333ea", border: "1.5px solid #e9d5ff", borderRadius: "8px", padding: "6px 10px", fontFamily: "'Georgia', serif", backgroundColor: "white", outline: "none", width: "100%", boxSizing: "border-box" as const }}
              />
            </div>
          ) : (
            <p onClick={() => setCrnEdit(true)} style={{ fontSize: "13px", color: "#9333ea", margin: "0 0 16px 0", fontStyle: "italic", cursor: "pointer", textDecoration: "underline dotted", display: "inline-block" }}>
              since {formatDate(crnStartD)} ✎
            </p>
          )}

          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <span style={{ fontSize: "clamp(52px, 16vw, 72px)", fontWeight: "bold", color: "#9333ea", lineHeight: 1, letterSpacing: "-2px" }}>{crnDays}</span>
            <span style={{ fontSize: "16px", color: "#a8a29e", paddingBottom: "10px", fontStyle: "italic" }}>days</span>
          </div>

          <ProgressBar value={crnDays} max={365} color="#9333ea" border="#e9d5ff" />

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={() => { const t = addDays(todayD, 1); save({ ...appState, crn: { startDate: toInputVal(t) } }); }}
              style={{ backgroundColor: "white", border: "1.5px solid #e9d5ff", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", color: "#9333ea", cursor: "pointer", fontFamily: "'Georgia', serif", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <span style={{ fontSize: "15px" }}>↺</span> Reset — start fresh tomorrow
            </button>
            <p style={{ textAlign: "center", fontSize: "11px", color: "#a8a29e", marginTop: "8px", fontStyle: "italic" }}>
              resets to 0 · new start date: {formatDate(tomorrow)}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e7e5e4" }} />
          <p style={{ margin: 0, fontSize: "10px", letterSpacing: "2px", color: "#a8a29e", textTransform: "uppercase" }}>habits</p>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e7e5e4" }} />
        </div>

        {/* St exrcs */}
        <HabitCard
          label="St exrcs" color="#ea580c" bg="#fff7ed" border="#fed7aa"
          state={appState.exrcs} todayKey={todayKey}
          showUndo={exrcsUndo} undoMessage={appState.exrcs.lastAction === "skip" ? "Marked as skipped — was it done?" : "Marked as done — change your mind?"}
          missedDays={exrcsMissed}
          onTodayDone={() => recordAction("exrcs", todayKey, "done", setExrcsUndo, exrcsTimer, true)}
          onTodaySkip={() => recordAction("exrcs", todayKey, "skip", setExrcsUndo, exrcsTimer, true)}
          onUndo={() => undoTodayAction("exrcs", setExrcsUndo, exrcsTimer)}
          onMissedAction={(dateKey, action) => recordAction("exrcs", dateKey, action, setExrcsUndo, exrcsTimer, false)}
          onDateChange={val => updateHabitStart("exrcs", val)}
          onCountChange={(field, val) => updateHabitCount("exrcs", field, val)}
        />

        {/* St wlk */}
        <HabitCard
          label="St wlk" color="#0891b2" bg="#ecfeff" border="#a5f3fc"
          state={appState.wlk} todayKey={todayKey}
          showUndo={wlkUndo} undoMessage={appState.wlk.lastAction === "skip" ? "Marked as skipped — was it done?" : "Marked as done — change your mind?"}
          missedDays={wlkMissed}
          onTodayDone={() => recordAction("wlk", todayKey, "done", setWlkUndo, wlkTimer, true)}
          onTodaySkip={() => recordAction("wlk", todayKey, "skip", setWlkUndo, wlkTimer, true)}
          onUndo={() => undoTodayAction("wlk", setWlkUndo, wlkTimer)}
          onMissedAction={(dateKey, action) => recordAction("wlk", dateKey, action, setWlkUndo, wlkTimer, false)}
          onDateChange={val => updateHabitStart("wlk", val)}
          onCountChange={(field, val) => updateHabitCount("wlk", field, val)}
        />

        <p style={{ textAlign: "center", fontSize: "12px", color: "#c4b8b0", marginTop: "8px", fontStyle: "italic" }}>
          updates automatically every day ✦
        </p>
      </div>
    </div>
  );
}