"use client";

import { useState, useEffect, useRef } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysDiff(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(0, Math.floor((end - start) / msPerDay));
}

function formatDate(date: Date): string {
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

function toInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayInputValue(): string {
  return toInputValue(new Date());
}

function daysToMonthsDays(days: number): { months: number; remaining: number } {
  return { months: Math.floor(days / 30), remaining: days % 30 };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface HabitState {
  startDate: Date;
  daysCount: number;   // days marked "done"
  skipCount: number;   // days marked "skip"
  lastActionDate: string | null; // "YYYY-MM-DD" — the last day an action was recorded
  lastAction: "done" | "skip" | null;
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color, border }: { value: number; max: number; color: string; border: string }) {
  return (
    <div style={{ marginTop: "16px", height: "4px", backgroundColor: border, borderRadius: "99px", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min((value / max) * 100, 100)}%`,
          backgroundColor: color,
          borderRadius: "99px",
          opacity: 0.7,
        }}
      />
    </div>
  );
}

// ─── Undo Toast ───────────────────────────────────────────────────────────────

function UndoToast({ message, onUndo, color }: { message: string; onUndo: () => void; color: string }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) { clearInterval(interval); return 0; }
        return p - 1; // 100 steps × 100ms = 10 seconds
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        marginTop: "12px",
        backgroundColor: "white",
        border: `1.5px solid ${color}33`,
        borderRadius: "12px",
        padding: "12px 14px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* shrinking progress bar at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          width: `${progress}%`,
          backgroundColor: color,
          opacity: 0.4,
          borderRadius: "0 0 0 12px",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#78716c", fontStyle: "italic" }}>
          {message}
        </p>
        <button
          onClick={onUndo}
          style={{
            backgroundColor: color,
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "'Georgia', serif",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Undo
        </button>
      </div>
    </div>
  );
}

// ─── Qt Fixed Card (ntcn & mv) ───────────────────────────────────────────────

function QtFixedCard({
  label, startDate, days, color, bg, border,
}: {
  label: string; startDate: Date; days: number;
  color: string; bg: string; border: string;
}) {
  const { months, remaining } = daysToMonthsDays(days);

  return (
    <div style={{ backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: "16px", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", color, margin: "0 0 6px 0", fontWeight: "bold" }}>
        {label}
      </p>
      <p style={{ fontSize: "13px", color: "#78716c", margin: "0 0 16px 0", fontStyle: "italic" }}>
        since {formatDate(startDate)}
      </p>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "clamp(52px, 16vw, 72px)", fontWeight: "bold", color, lineHeight: 1, letterSpacing: "-2px" }}>
            {days}
          </span>
          <span style={{ fontSize: "16px", color: "#a8a29e", paddingBottom: "10px", fontStyle: "italic" }}>days</span>
        </div>
        {months > 0 && (
          <div style={{ paddingBottom: "10px" }}>
            <span
              style={{
                backgroundColor: color + "18",
                border: `1px solid ${color}33`,
                borderRadius: "20px",
                padding: "3px 10px",
                fontSize: "12px",
                color: color,
                fontStyle: "italic",
                whiteSpace: "nowrap",
              }}
            >
              {months}mo {remaining}d
            </span>
          </div>
        )}
      </div>

      {/* Progress bar — open-ended, 365 days as soft target */}
      <ProgressBar value={days} max={365} color={color} border={border} />
    </div>
  );
}

// ─── Habit Card (exrcs & wlk) ────────────────────────────────────────────────

function HabitCard({
  label, color, bg, border,
  state, todayDone, showUndo, editMode, setEditMode,
  onDone, onSkip, onUndo, onDateChange, undoMessage,
}: {
  label: string; color: string; bg: string; border: string;
  state: HabitState; todayDone: boolean;
  showUndo: boolean; editMode: boolean;
  setEditMode: (v: boolean) => void;
  onDone: () => void; onSkip: () => void; onUndo: () => void;
  onDateChange: (val: string) => void;
  undoMessage: string;
}) {
  // Progress bar: done days out of (done + skip), i.e. consistency rate
  const total = state.daysCount + state.skipCount;
  const progressVal = total > 0 ? state.daysCount : 0;
  const progressMax = Math.max(total, 1);

  return (
    <div style={{ backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: "16px", padding: "24px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", color, margin: "0 0 6px 0", fontWeight: "bold" }}>
        {label}
      </p>

      {/* Editable since date */}
      {editMode ? (
        <div style={{ marginBottom: "16px" }}>
          <input
            type="date"
            defaultValue={toInputValue(state.startDate)}
            max={todayInputValue()}
            autoFocus
            onChange={(e) => { if (e.target.value) onDateChange(e.target.value); }}
            onBlur={() => setEditMode(false)}
            style={{
              fontSize: "13px",
              color,
              border: `1.5px solid ${border}`,
              borderRadius: "8px",
              padding: "6px 10px",
              fontFamily: "'Georgia', serif",
              backgroundColor: "white",
              outline: "none",
              width: "100%",
              boxSizing: "border-box" as const,
            }}
          />
        </div>
      ) : (
        <p
          onClick={() => setEditMode(true)}
          style={{
            fontSize: "13px",
            color: "#78716c",
            margin: "0 0 16px 0",
            fontStyle: "italic",
            cursor: "pointer",
            display: "inline-block",
            textDecoration: "underline dotted",
          }}
        >
          since {formatDate(state.startDate)} ✎
        </p>
      )}

      {/* Stats + overlay */}
      <div style={{ position: "relative" }}>
        {/* Numbers — blurred when today's action is still pending */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            filter: todayDone ? "none" : "blur(3px)",
            transition: "filter 0.3s",
            userSelect: "none" as const,
            pointerEvents: todayDone ? "auto" : "none" as const,
          }}
        >
          <div>
            <p style={{ fontSize: "11px", color: "#a8a29e", margin: "0 0 2px 0", letterSpacing: "1px", textTransform: "uppercase" as const }}>
              Done
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
              <span style={{ fontSize: "clamp(40px, 12vw, 56px)", fontWeight: "bold", color, lineHeight: 1, letterSpacing: "-1px" }}>
                {state.daysCount}
              </span>
              <span style={{ fontSize: "13px", color: "#a8a29e", paddingBottom: "7px", fontStyle: "italic" }}>days</span>
            </div>
          </div>

          <div style={{ width: "1px", backgroundColor: border, alignSelf: "stretch", margin: "4px 0" }} />

          <div>
            <p style={{ fontSize: "11px", color: "#a8a29e", margin: "0 0 2px 0", letterSpacing: "1px", textTransform: "uppercase" as const }}>
              Skipped
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
              <span style={{ fontSize: "clamp(40px, 12vw, 56px)", fontWeight: "bold", color: "#a8a29e", lineHeight: 1, letterSpacing: "-1px" }}>
                {state.skipCount}
              </span>
              <span style={{ fontSize: "13px", color: "#a8a29e", paddingBottom: "7px", fontStyle: "italic" }}>days</span>
            </div>
          </div>
        </div>

        {/* Done / Skip overlay — only when today not yet logged */}
        {!todayDone && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={onDone}
              style={{
                backgroundColor: color,
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "13px 24px",
                fontSize: "15px",
                cursor: "pointer",
                fontFamily: "'Georgia', serif",
                fontWeight: "bold",
                boxShadow: `0 4px 14px ${color}44`,
                letterSpacing: "0.3px",
              }}
            >
              ✓ Done
            </button>
            <button
              onClick={onSkip}
              style={{
                backgroundColor: "white",
                color: "#78716c",
                border: "1.5px solid #e7e5e4",
                borderRadius: "12px",
                padding: "13px 24px",
                fontSize: "15px",
                cursor: "pointer",
                fontFamily: "'Georgia', serif",
                letterSpacing: "0.3px",
              }}
            >
              Skip
            </button>
          </div>
        )}
      </div>

      {/* Consistency progress bar — no label text, just the bar */}
      <ProgressBar value={progressVal} max={progressMax} color={color} border={border} />

      {/* Undo toast */}
      {showUndo && <UndoToast message={undoMessage} onUndo={onUndo} color={color} />}

      {/* Today status badge */}
      {todayDone && (
        <div style={{ marginTop: "14px", textAlign: "center", fontSize: "12px", color, fontStyle: "italic", opacity: 0.8 }}>
          {state.lastAction === "done" ? "✓ Logged for today" : "— Skipped today"}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toInputValue(today); // "YYYY-MM-DD"

  const [mounted, setMounted] = useState(false);

  // Qt ntcn & Qt mv — fixed start dates, auto-calculated
  const NTCN_START = new Date(2026, 1, 1);  // 1-2-2026
  const MV_START = new Date(2026, 0, 5);  // 5-1-2026

  // Qt crn — editable start date + reset button
  const [crnStart, setCrnStart] = useState<Date>(new Date(2026, 4, 1)); // 1-5-2026
  const [crnEditMode, setCrnEditMode] = useState(false);

  // St exrcs — habit tracker
  // Default pre-loaded with your real data: 16 done, 3 skip, started 21-4-2026
  // lastActionDate = today means Done/Skip won't show (already logged today)
  const EXRCS_DEFAULT: HabitState = {
    startDate: new Date(2026, 3, 21), // 21-4-2026
    daysCount: 16,
    skipCount: 3,
    lastActionDate: todayKey, // exercise already done today — no prompt needed
    lastAction: "done",
  };

  // St wlk — habit tracker
  // 14 done, 3 skip, started 22-4-2026
  // lastActionDate = null means Done/Skip WILL show today (still pending)
  const WLK_DEFAULT: HabitState = {
    startDate: new Date(2026, 3, 22), // 22-4-2026
    daysCount: 14,
    skipCount: 3,
    lastActionDate: null, // walk still pending today — show Done/Skip
    lastAction: null,
  };

  const [exrcs, setExrcs] = useState<HabitState>(EXRCS_DEFAULT);
  const [exrcsUndo, setExrcsUndo] = useState(false);
  const [exrcsEdit, setExrcsEdit] = useState(false);
  const exrcsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [wlk, setWlk] = useState<HabitState>(WLK_DEFAULT);
  const [wlkUndo, setWlkUndo] = useState(false);
  const [wlkEdit, setWlkEdit] = useState(false);
  const wlkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from localStorage (overrides defaults once data exists) ──
  useEffect(() => {
    setMounted(true);

    const storedCrn = localStorage.getItem("crn_start_date");
    if (storedCrn) setCrnStart(new Date(storedCrn));

    const storedExrcs = localStorage.getItem("exrcs_state");
    if (storedExrcs) {
      const p = JSON.parse(storedExrcs);
      setExrcs({ ...p, startDate: new Date(p.startDate) });
    } else {
      // First launch — save defaults to localStorage
      localStorage.setItem("exrcs_state", JSON.stringify({
        ...EXRCS_DEFAULT,
        startDate: EXRCS_DEFAULT.startDate.toISOString(),
      }));
    }

    const storedWlk = localStorage.getItem("wlk_state");
    if (storedWlk) {
      const p = JSON.parse(storedWlk);
      setWlk({ ...p, startDate: new Date(p.startDate) });
    } else {
      // First launch — save defaults to localStorage
      localStorage.setItem("wlk_state", JSON.stringify({
        ...WLK_DEFAULT,
        startDate: WLK_DEFAULT.startDate.toISOString(),
      }));
    }
  }, []);

  if (!mounted) return null;

  // ── Derived values ──
  const crnDays = getDaysDiff(crnStart, today);
  const ntcnDays = getDaysDiff(NTCN_START, today);
  const mvDays = getDaysDiff(MV_START, today);

  // Today's action status — compare stored date to today's key
  const exrcsTodayDone = exrcs.lastActionDate === todayKey;
  const wlkTodayDone = wlk.lastActionDate === todayKey;

  // ── Qt crn handlers ──
  const handleCrnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(val + "T00:00:00");
    setCrnStart(d);
    localStorage.setItem("crn_start_date", d.toISOString());
    setCrnEditMode(false);
  };

  const handleCrnReset = () => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setCrnStart(tomorrow);
    localStorage.setItem("crn_start_date", tomorrow.toISOString());
  };

  // ── Habit helpers ──
  function save(key: string, state: HabitState) {
    localStorage.setItem(key, JSON.stringify({
      ...state,
      startDate: state.startDate.toISOString(),
    }));
  }

  function recordAction(
    key: string,
    state: HabitState,
    setState: React.Dispatch<React.SetStateAction<HabitState>>,
    setUndo: React.Dispatch<React.SetStateAction<boolean>>,
    timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    action: "done" | "skip"
  ) {
    const next: HabitState = {
      ...state,
      daysCount: action === "done" ? state.daysCount + 1 : state.daysCount,
      skipCount: action === "skip" ? state.skipCount + 1 : state.skipCount,
      lastActionDate: todayKey,
      lastAction: action,
    };
    setState(next);
    save(key, next);
    setUndo(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(false), 10000);
  }

  function undoAction(
    key: string,
    state: HabitState,
    setState: React.Dispatch<React.SetStateAction<HabitState>>,
    setUndo: React.Dispatch<React.SetStateAction<boolean>>,
    timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) {
    const next: HabitState = {
      ...state,
      daysCount: state.lastAction === "done" ? state.daysCount - 1 : state.daysCount,
      skipCount: state.lastAction === "skip" ? state.skipCount - 1 : state.skipCount,
      lastActionDate: null,
      lastAction: null,
    };
    setState(next);
    save(key, next);
    setUndo(false);
    if (timer.current) clearTimeout(timer.current);
  }

  function updateHabitStart(
    key: string,
    state: HabitState,
    setState: React.Dispatch<React.SetStateAction<HabitState>>,
    setEdit: React.Dispatch<React.SetStateAction<boolean>>,
    val: string
  ) {
    if (!val) return;
    const d = new Date(val + "T00:00:00");
    const next = { ...state, startDate: d };
    setState(next);
    save(key, next);
    setEdit(false);
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#fafaf9",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: "56px",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          backgroundColor: "#1c1917",
          padding: "28px 24px 24px",
          textAlign: "center",
          marginBottom: "28px",
        }}
      >
        <p style={{ color: "#a8a29e", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 8px 0" }}>
          your streak tracker
        </p>
        <h1 style={{ color: "#fafaf9", fontSize: "clamp(22px, 6vw, 30px)", fontWeight: "normal", letterSpacing: "0.5px", margin: 0 }}>
          Stay updated - Not outdated
        </h1>
        <p style={{ color: "#78716c", fontSize: "13px", marginTop: "10px", fontStyle: "italic" }}>
          {formatDate(today)}
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Qt ntcn */}
        <QtFixedCard
          label="Qt ntcn"
          startDate={NTCN_START}
          days={ntcnDays}
          color="#16a34a" bg="#f0fdf4" border="#bbf7d0"
        />

        {/* Qt mv */}
        <QtFixedCard
          label="Qt mv"
          startDate={MV_START}
          days={mvDays}
          color="#2563eb" bg="#eff6ff" border="#bfdbfe"
        />

        {/* Qt crn */}
        <div
          style={{
            backgroundColor: "#faf5ff",
            border: "1.5px solid #e9d5ff",
            borderRadius: "16px",
            padding: "24px 22px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <p style={{ fontSize: "11px", letterSpacing: "2.5px", textTransform: "uppercase", color: "#9333ea", margin: "0 0 6px 0", fontWeight: "bold" }}>
            Qt crn
          </p>

          {crnEditMode ? (
            <div style={{ marginBottom: "16px" }}>
              <input
                type="date"
                defaultValue={toInputValue(crnStart)}
                max={todayInputValue()}
                autoFocus
                onChange={handleCrnDateChange}
                onBlur={() => setCrnEditMode(false)}
                style={{
                  fontSize: "13px",
                  color: "#9333ea",
                  border: "1.5px solid #e9d5ff",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontFamily: "'Georgia', serif",
                  backgroundColor: "white",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box" as const,
                }}
              />
            </div>
          ) : (
            <p
              onClick={() => setCrnEditMode(true)}
              style={{
                fontSize: "13px",
                color: "#9333ea",
                margin: "0 0 16px 0",
                fontStyle: "italic",
                cursor: "pointer",
                textDecoration: "underline dotted",
                display: "inline-block",
              }}
            >
              since {formatDate(crnStart)} ✎
            </p>
          )}

          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <span style={{ fontSize: "clamp(52px, 16vw, 72px)", fontWeight: "bold", color: "#9333ea", lineHeight: 1, letterSpacing: "-2px" }}>
              {crnDays}
            </span>
            <span style={{ fontSize: "16px", color: "#a8a29e", paddingBottom: "10px", fontStyle: "italic" }}>days</span>
          </div>

          <ProgressBar value={crnDays} max={365} color="#9333ea" border="#e9d5ff" />

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={handleCrnReset}
              style={{
                backgroundColor: "white",
                border: "1.5px solid #e9d5ff",
                borderRadius: "10px",
                padding: "10px 20px",
                fontSize: "13px",
                color: "#9333ea",
                cursor: "pointer",
                fontFamily: "'Georgia', serif",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <span style={{ fontSize: "15px" }}>↺</span>
              Reset — start fresh tomorrow
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
          label="St exrcs"
          color="#ea580c" bg="#fff7ed" border="#fed7aa"
          state={exrcs}
          todayDone={exrcsTodayDone}
          showUndo={exrcsUndo}
          editMode={exrcsEdit}
          setEditMode={setExrcsEdit}
          onDone={() => recordAction("exrcs_state", exrcs, setExrcs, setExrcsUndo, exrcsTimer, "done")}
          onSkip={() => recordAction("exrcs_state", exrcs, setExrcs, setExrcsUndo, exrcsTimer, "skip")}
          onUndo={() => undoAction("exrcs_state", exrcs, setExrcs, setExrcsUndo, exrcsTimer)}
          onDateChange={(val) => updateHabitStart("exrcs_state", exrcs, setExrcs, setExrcsEdit, val)}
          undoMessage={exrcs.lastAction === "skip" ? "Marked as skipped — was it actually done?" : "Marked as done — change your mind?"}
        />

        {/* St wlk */}
        <HabitCard
          label="St wlk"
          color="#0891b2" bg="#ecfeff" border="#a5f3fc"
          state={wlk}
          todayDone={wlkTodayDone}
          showUndo={wlkUndo}
          editMode={wlkEdit}
          setEditMode={setWlkEdit}
          onDone={() => recordAction("wlk_state", wlk, setWlk, setWlkUndo, wlkTimer, "done")}
          onSkip={() => recordAction("wlk_state", wlk, setWlk, setWlkUndo, wlkTimer, "skip")}
          onUndo={() => undoAction("wlk_state", wlk, setWlk, setWlkUndo, wlkTimer)}
          onDateChange={(val) => updateHabitStart("wlk_state", wlk, setWlk, setWlkEdit, val)}
          undoMessage={wlk.lastAction === "skip" ? "Marked as skipped — was it actually done?" : "Marked as done — change your mind?"}
        />

        <p style={{ textAlign: "center", fontSize: "12px", color: "#c4b8b0", marginTop: "8px", fontStyle: "italic" }}>
          updates automatically every day ✦
        </p>
      </div>
    </div>
  );
}