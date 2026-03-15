"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, ChevronDown, X, Flame, BarChart2, ArrowUpDown } from "lucide-react";
import type { DropResult } from "@hello-pangea/dnd";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

import { MONTHS, STATUS, S, MOBILE_PILL_W, MOBILE_PILL_H, MOBILE_PILL_H_SM } from "./constants";
import type { Habit } from "./types";
import {
  getDaysInMonth,
  getStreak,
  getPct,
  clampHabitName,
  hapticFeedback,
} from "./utils";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";
import HabitComposer from "./HabitComposer";
import OnboardingTour from "./OnboardingTour";

// Shared tooltip wrapper — same design as HabitGrid's Tip
function Tip({ label, children, down = false }: { label: string; children: React.ReactNode; down?: boolean }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }} className="tip-wrap">
      {children}
      <div className={`tip${down ? " tip-down" : ""}`}>{label}</div>
    </div>
  );
}

const HabitGrid = dynamic(() => import("./HabitGrid"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        padding: "24px 0",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: 12,
      }}
    >
      Loading habits...
    </div>
  ),
});

const DeleteCategoryModal = dynamic(() => import("./DeleteCategoryModal"), {
  ssr: false,
});

const DeleteHabitModal = dynamic(() => import("./DeleteHabitModal"), {
  ssr: false,
});

// ---------------------------------------------------------------------------
// MonthNavPortal — renders children into #month-nav-slot only after mount
// Avoids hydration mismatch: never touches the DOM during SSR
// ---------------------------------------------------------------------------
function MonthNavPortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("month-nav-slot"));
  }, []);
  if (!slot) return null;
  return createPortal(children, slot);
}

// ---------------------------------------------------------------------------
// Static styles — defined at module level so they are never recreated and the
// <style> tag content is a stable string reference across all renders.
// ---------------------------------------------------------------------------
const HABIT_CSS = `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root.light .habit-card { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 0.25rem 1rem rgba(0,0,0,0.03) !important; }
        :root.light .habit-card:hover { border-color: var(--border-focus) !important; box-shadow: 0 0.5rem 1.875rem rgba(0,0,0,0.06) !important; }
        :root.light .habit-name { color: #1a1a18 !important; }
        :root.light .add-wrap { background: transparent !important; border-color: rgba(201,162,39,0.3) !important; box-shadow: none !important; }
        :root.light .add-wrap:hover { border-color: rgba(201,162,39,0.6) !important; }
        :root.light .add-input { color: #1a1a18 !important; }
        :root.light .add-input::placeholder { color: #888 !important; }
        :root.light .add-input-cat { border-left-color: var(--border-main) !important; }
        :root.light .nav-btn { border-color: var(--border-main) !important; color: #5c5c58 !important; }
        :root.light .nav-btn:hover { background: rgba(201, 162, 39, 0.08) !important; }
        :root.light .pill-container .pill { border-color: var(--border-main) !important; }
        :root.light .tooltip { background: #ffffff !important; border-color: var(--border-main) !important; color: #1a1a18 !important; box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.08) !important; }
        :root.light .tooltip::after { border-top-color: var(--border-main) !important; }
        :root.light .cat-header-group:hover { opacity: 0.8; }
        :root.light .cat-action-btn { color: #5c5c58 !important; }
        :root.light .del-btn { color: #a0a09c !important; }
        :root.light .del-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.1) !important; }
        :root.light .month-nav-container { background: #ffffff !important; border-color: var(--border-main) !important; }
        :root.light .month-nav-text { color: #5c5c58 !important; }
        :root.light .delete-modal { background: #ffffff !important; border-color: var(--border-main) !important; }
        :root.light .delete-modal h3, :root.light .delete-modal strong { color: #1a1a18 !important; }
        :root.light .delete-modal p { color: #5c5c58 !important; }
        :root.light .day-header { color: #8a8a86 !important; }
        :root.light .day-header.is-today { color: #c9a227 !important; }
        :root.light .stat-text { color: #5c5c58 !important; }
        :root.light .stat-text-active { color: #3a3a36 !important; }

        @media (max-width: 48rem) {
          .page-container { padding: 0 1rem 5.5rem !important; }
          .scroll-container { margin-left: -1rem !important; margin-right: -1rem !important; padding-left: 1rem !important; padding-right: 1rem !important; }
          .habit-name { font-size: 0.875rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          .habit-track-wrap { width: 100% !important; overflow-x: auto !important; }
          .habit-card { padding: 0.75rem !important; }
          .legend-container { justify-content: center !important; flex-wrap: wrap; }
          .add-wrap { width: 100%; padding-left: 0.875rem; position: relative; }
          .add-input-cat { width: 8.75rem; }
          .month-nav-container { padding: 0.5rem 0.75rem !important; }
          /* Hide the long "Cultivate a new habit" placeholder on mobile */
          .add-input:not(.add-input-cat)::placeholder { color: transparent !important; }
          /* Show short text via ::before on the wrapper when input is empty */
          .add-wrap::before {
            content: 'New habit…';
            position: absolute;
            left: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.875rem;
            color: var(--text-muted);
            opacity: 0.5;
            pointer-events: none;
            font-family: var(--font-body), sans-serif;
          }
          /* Hide the pseudo-element once the input has a value or is focused */
          .add-wrap.focused::before,
          .add-wrap:focus-within::before { display: none; }
        }

        @keyframes fadeUp  { from { opacity:0; transform:translateY(1rem) } to { opacity:1; transform:translateY(0) } }
        @keyframes pillPop { 0%{transform:scale(1)} 45%{transform:scale(1.38);filter:brightness(1.8)} 100%{transform:scale(1)} }

        .pill { cursor: pointer; flex-shrink: 0; border-radius: 0.375rem; }
        .pill:hover { filter: brightness(1.28) !important; }

        .habit-card {
          background: #121212;
          border: 1px solid #1c1c1c;
          border-radius: 0.875rem;
          transition: border-color 0.22s ease, box-shadow 0.22s ease;
          position: relative;
          overflow: visible;
        }
        .habit-card:hover { border-color: #282828; box-shadow: 0 0.375rem 2.5rem rgba(0,0,0,0.45); z-index: 50; }
        .habit-card:hover .del-btn    { opacity: 1 !important; }
        .habit-card:hover .habit-name { color: #ececec !important; }

        .del-btn {
          opacity: 0; background: none; border: none; cursor: pointer;
          color: #383838; line-height: 1;
          transition: opacity 0.15s, color 0.15s, background 0.15s;
          padding: 0.3125rem; border-radius: 0.375rem; display: flex; align-items: center;
        }
        .habit-card:hover .del-btn { opacity: 1; }
        .del-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.08) !important; }

        .cal-btn {
          opacity: 0; background: none; border: none; cursor: pointer;
          color: #383838; line-height: 1;
          transition: opacity 0.15s, color 0.15s, background 0.15s;
          padding: 0.3125rem; border-radius: 0.375rem; display: flex; align-items: center;
        }
        .habit-card:hover .cal-btn { opacity: 1; }
        .cal-btn:hover { color: var(--accent) !important; background: rgba(201,162,39,0.08) !important; }
        .cal-btn.active { opacity: 1; color: var(--accent) !important; }

        /* Habit name tooltip */
        .habit-name-wrap {
          position: relative;
          min-width: 0;
          display: block;
        }
        .habit-name-tip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          padding: 6px 10px;
          border-radius: 7px;
          background: #1e1e1e;
          border: 1px solid #333;
          color: #ececec;
          font-size: 12.5px;
          font-family: var(--font-body), sans-serif;
          font-weight: 450;
          white-space: normal;
          word-break: break-word;
          max-width: 220px;
          line-height: 1.45;
          box-shadow: 0 8px 24px rgba(0,0,0,0.45);
          pointer-events: none;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 200;
        }
        .habit-name-tip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 14px;
          border: 5px solid transparent;
          border-top-color: #333;
        }
        .habit-name-wrap:hover .habit-name-tip {
          opacity: 1;
          transform: translateY(0);
        }
        :root.light .habit-name-tip {
          background: #ffffff;
          border-color: var(--border-main);
          color: #1a1a18;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        :root.light .habit-name-tip::after {
          border-top-color: var(--border-main);
        }

        .nav-btn {
          background: none; border: 1px solid #252525;
          color: #666; cursor: pointer; width: 2rem; height: 2rem;
          border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .nav-btn:hover { border-color: #c9a227; color: #c9a227; background: rgba(201,162,39,0.06); }

        .add-wrap {
          display: flex; align-items: center;
          background: transparent; border: 1.5px dashed #3a3a2a;
          border-radius: 62.4375rem;
          padding: 0.375rem 0.375rem 0.375rem 1.25rem;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          max-width: 35rem;
        }
        .add-wrap:hover { border-color: rgba(201,162,39,0.45); }
        .add-wrap.focused { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(201,162,39,0.08); }
        .add-input {
          background: transparent; border: none;
          color: var(--text-main); font-size: 0.875rem;
          font-family: var(--font-body), sans-serif;
          outline: none; flex: 1; min-width: 0;
        }
        .add-input::placeholder { color: var(--text-muted); opacity: 0.5; }
        .add-input-cat {
          flex: none; width: 10.625rem;
          border-left: 1px solid var(--border-main);
          padding-left: 1rem; margin-left: 0.5rem;
        }
        .add-btn {
          width: 2.125rem; height: 2.125rem; border-radius: 50%;
          background: var(--accent); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: none;
          transition: background 0.15s, transform 0.12s, opacity 0.15s; flex-shrink: 0;
          opacity: 0.92;
        }
        .add-btn:hover { opacity: 1; transform: scale(1.06); }
        .add-btn:active { transform: scale(0.96); opacity: 0.85; }

        .tooltip {
          position: absolute; bottom: 100%; left: 50%;
          transform: translateX(-50%) translateY(-0.25rem);
          background: var(--bg-surface); border: 1px solid var(--border-main);
          color: var(--text-main); padding: 0.375rem 0.625rem;
          border-radius: 0.375rem; font-size: 0.75rem;
          font-family: var(--font-mono), monospace;
          white-space: nowrap; opacity: 0; pointer-events: none;
          transition: all 0.2s ease; z-index: 99999;
          box-shadow: 0 0.25rem 0.75rem var(--shadow-alpha);
        }
        .pill-container:hover { z-index: 9999; }
        .pill-container:hover .tooltip { opacity: 1; transform: translateX(-50%) translateY(-0.5rem); }
        .tooltip::after {
          content: ''; position: absolute; top: 100%; left: 50%;
          transform: translateX(-50%);
          border-width: 0.3125rem; border-style: solid;
          border-color: var(--border-main) transparent transparent transparent;
        }

        .cat-header-group:hover .cat-actions { opacity: 1 !important; }
        .cat-action-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.15s; padding: 0.25rem; border-radius: 0.25rem; }
        .cat-action-btn:hover { color: var(--accent); background: var(--status-done-glow); }
        .cat-action-btn.del:hover { color: var(--status-missed); background: var(--status-missed-glow); }

        ::-webkit-scrollbar { height: 0.25rem; width: 0.25rem; background: var(--bg-base); }
        ::-webkit-scrollbar-thumb { background: var(--border-focus); border-radius: 0.25rem; }

        .tip-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
        .tip-wrap .tip {
          position: absolute; bottom: calc(100% + 6px); left: 50%;
          transform: translateX(-50%) translateY(2px);
          background: var(--bg-surface); border: 1px solid var(--border-main);
          color: var(--text-main); padding: 4px 8px; border-radius: 6px;
          font-size: 11px; font-family: var(--font-mono), monospace;
          white-space: nowrap; opacity: 0; pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        }
        .tip-wrap .tip::after {
          content: ''; position: absolute; top: 100%; left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent; border-top-color: var(--border-main);
        }
        .tip-wrap:hover .tip { opacity: 1; transform: translateX(-50%) translateY(0); }
        .tip-wrap .tip.tip-down { bottom: auto; top: calc(100% + 6px); transform: translateX(-50%) translateY(-2px); }
        .tip-wrap .tip.tip-down::after { top: auto; bottom: 100%; border-top-color: transparent; border-bottom-color: var(--border-main); }
        .tip-wrap:hover .tip.tip-down { transform: translateX(-50%) translateY(0); }
`;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function HabitTracker() {
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [habits, setHabits] = useState<Habit[]>([]);

  const [pulsingCell, setPulsingCell] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedCalendar, setExpandedCalendar] = useState<string | null>(null);
  const [isMonthView, setIsMonthView] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [touchY, setTouchY] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const hoveredCellRef = useRef<{ hid: string; idx: number } | null>(null);
  const supabaseRef    = useRef(createClient());
  const habitsCacheRef = useRef<Map<string, Habit[]>>(new Map());
  const activeHabitsKeyRef = useRef<string | null>(null);
  const viewKeyRef = useRef<string | null>(null);
  const mutationDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Notes cache: key = "habitId:YYYY-MM-DD" → note text
  const notesCacheRef = useRef<Map<string, string>>(new Map());

  // Notes state — for desktop popover
  const [notePopover, setNotePopover] = useState<{ habitId: string; date: string; x: number; y: number } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Mobile-only state --------------------------------------------------------
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [sheetDeleteConfirm, setSheetDeleteConfirm] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sheetNoteText, setSheetNoteText] = useState("");

  // Desktop habit delete confirmation state ---------------------------------
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);

  // Sort mode: "manual" | "streak" | "pct"
  const [sortMode, setSortMode] = useState<"manual" | "streak" | "pct">("manual");

  // Color palette for habit color coding
  const HABIT_COLORS = [
    "#4ade80", "#60a5fa", "#f472b6", "#fb923c",
    "#a78bfa", "#34d399", "#fbbf24", "#f87171",
    "#38bdf8", "#e879f9", "#84cc16", "#fb7185",
  ];

  const dim = useMemo(() => getDaysInMonth(month, year), [month, year]);
  const dayNums = useMemo(() => Array.from({ length: dim }, (_, i) => i + 1), [dim]);
  const today = now.getDate();
  const isCurrent = month === now.getMonth() && year === now.getFullYear();
  const isFutureMonth =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth());

  const currentWeekStart = today - (now.getDay() === 0 ? 6 : now.getDay() - 1);
  const weekStart = isCurrent ? Math.max(1, currentWeekStart) : 1;
  const weekEnd = Math.min(dim, weekStart + 6);
  const visibleDays = useMemo(
    () => isMonthView ? dayNums : dayNums.filter((d) => d >= weekStart && d <= weekEnd),
    [isMonthView, dayNums, weekStart, weekEnd],
  );

  // -------------------------------------------------------------------------
  // Trigger pulse animation on a cell
  // -------------------------------------------------------------------------
  const triggerPulse = useCallback((hid: string, idx: number) => {
    const key = `${hid}-${idx}`;
    setPulsingCell(key);
    setTimeout(() => setPulsingCell((k) => (k === key ? null : k)), 220);
  }, []);

  // -------------------------------------------------------------------------
  // Mobile helpers: toast + sheet handlers
  // -------------------------------------------------------------------------
  const showToast = useCallback((msg: string, color: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, color });
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const onTap = useCallback((habit: Habit) => {
    setSheetDeleteConfirm(false);
    setSelectedHabit(habit);
    // Load today's note for this habit
    const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    setSheetNoteText(notesCacheRef.current.get(`${habit.id}:${todayStr}`) ?? "");
  }, [year, month]);

  const onQuickLog = useCallback((habit: Habit) => {
    // Cycle today's status for this habit
    const todayIdx = new Date().getDate() - 1;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const days = [...h.days];
        const cur = days[todayIdx];
        const next =
          cur === STATUS.NONE
            ? STATUS.DONE
            : cur === STATUS.DONE
              ? STATUS.PARTIAL
              : cur === STATUS.PARTIAL
                ? STATUS.MISSED
                : STATUS.NONE;
        days[todayIdx] = next;
        hapticFeedback(next);
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(todayIdx + 1).padStart(2, "0")}`;
        if (user) {
          if (next === STATUS.NONE) {
            supabaseRef.current.from("habit_logs").delete().eq("habit_id", h.id).eq("date", dateStr).then();
          } else {
            supabaseRef.current.from("habit_logs").upsert({ habit_id: h.id, date: dateStr, status: next }, { onConflict: "habit_id,date" }).then();
          }
        }
        showToast(`${habit.name}: ${S[next].label}`, S[next].bg);
        // Sync selectedHabit if sheet is open for this habit
        setSelectedHabit((sel) => (sel?.id === habit.id ? { ...h, days } : sel));
        return { ...h, days };
      }),
    );
  }, [month, year, user, showToast]);

  // ── Mobile: log a specific status from bottom sheet ──────────────────────
  const logStatusFromSheet = useCallback((habit: Habit, nextStatus: number) => {
    const todayIdx = new Date().getDate() - 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(todayIdx + 1).padStart(2, "0")}`;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const days = [...h.days];
        days[todayIdx] = nextStatus;
        hapticFeedback(nextStatus);
        if (user) {
          if (nextStatus === STATUS.NONE) {
            supabaseRef.current.from("habit_logs").delete().eq("habit_id", h.id).eq("date", dateStr).then();
          } else {
            supabaseRef.current.from("habit_logs").upsert({ habit_id: h.id, date: dateStr, status: nextStatus }, { onConflict: "habit_id,date" }).then();
          }
        }
        return { ...h, days };
      }),
    );
    setSelectedHabit((sel) => {
      if (!sel || sel.id !== habit.id) return sel;
      const days = [...sel.days];
      days[todayIdx] = nextStatus;
      return { ...sel, days };
    });
    showToast(`${habit.name}: ${S[nextStatus].label}`, S[nextStatus].bg);
    setTimeout(() => setSelectedHabit(null), 380);
  }, [month, year, user, showToast]);

  // -------------------------------------------------------------------------
  // Cycle cell status — useCallback so the reference is stable between renders
  // when month/year/user haven't changed (avoids re-creating row callbacks).
  // Supabase writes are debounced: rapid clicks update local state immediately
  // but only fire one network request after 600 ms of inactivity per cell.
  // -------------------------------------------------------------------------
  const cycleStatus = useCallback(function cycleStatus(
    hid: string,
    idx: number,
    reverse = false,
    pulse = false,
  ) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== hid) return h;
        const days = [...h.days];
        const cur = days[idx];
        const next = reverse
          ? cur === STATUS.NONE
            ? STATUS.MISSED
            : cur === STATUS.MISSED
              ? STATUS.PARTIAL
              : cur === STATUS.PARTIAL
                ? STATUS.DONE
                : STATUS.NONE
          : cur === STATUS.NONE
            ? STATUS.DONE
            : cur === STATUS.DONE
              ? STATUS.PARTIAL
              : cur === STATUS.PARTIAL
                ? STATUS.MISSED
                : STATUS.NONE;
        days[idx] = next;
        hapticFeedback(next);

        if (user) {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(idx + 1).padStart(2, "0")}`;
          const debounceKey = `${hid}-${idx}`;
          const existing = mutationDebounceRef.current.get(debounceKey);
          if (existing) clearTimeout(existing);
          mutationDebounceRef.current.set(
            debounceKey,
            setTimeout(() => {
              mutationDebounceRef.current.delete(debounceKey);
              if (next === STATUS.NONE) {
                supabaseRef.current
                  .from("habit_logs")
                  .delete()
                  .eq("habit_id", hid)
                  .eq("date", dateStr)
                  .then();
              } else {
                supabaseRef.current
                  .from("habit_logs")
                  .upsert(
                    { habit_id: hid, date: dateStr, status: next },
                    { onConflict: "habit_id,date" },
                  )
                  .then();
              }
            }, 600),
          );
        }

        return { ...h, days };
      }),
    );
    if (pulse) triggerPulse(hid, idx);
  }, [month, year, user]);

  // -------------------------------------------------------------------------
  // Load habits from Supabase
  // -------------------------------------------------------------------------
  const loadHabitsFromDB = useCallback(
    async (userId: string, m: number, y: number) => {
      const supabase = supabaseRef.current;
      const daysInMonth = getDaysInMonth(m, y);
      const cacheKey = `${userId}:${y}-${m}`;
      const cached = habitsCacheRef.current.get(cacheKey);
      if (cached) {
        if (viewKeyRef.current === cacheKey) {
          setHabits(cached);
          activeHabitsKeyRef.current = cacheKey;
        }
        return;
      }

      const { data: habitsData } = await supabase
        .from("habits")
        .select("id, name, category, sort_order, created_at, color")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      if (!habitsData || habitsData.length === 0) {
        const empty: Habit[] = [];
        habitsCacheRef.current.set(cacheKey, empty);
        if (viewKeyRef.current === cacheKey) {
          setHabits(empty);
          activeHabitsKeyRef.current = cacheKey;
        }
        return;
      }

      const startDate = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const endDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      const habitIds = habitsData.map((h: any) => h.id);

      const { data: logsData } = await supabase
        .from("habit_logs")
        .select("habit_id, date, status")
        .in("habit_id", habitIds)
        .gte("date", startDate)
        .lte("date", endDate);

      // Load notes for the month
      const { data: notesData } = await supabase
        .from("habit_notes")
        .select("habit_id, date, note")
        .in("habit_id", habitIds)
        .gte("date", startDate)
        .lte("date", endDate);

      // Populate notes cache
      (notesData || []).forEach((n: any) => {
        notesCacheRef.current.set(`${n.habit_id}:${n.date}`, n.note ?? "");
      });

      const logsMap: Record<string, Record<number, number>> = {};
      (logsData || []).forEach((log: any) => {
        if (!logsMap[log.habit_id]) logsMap[log.habit_id] = {};
        const day = new Date(log.date + "T00:00:00").getDate();
        logsMap[log.habit_id][day - 1] = log.status;
      });

      const assembled: Habit[] = habitsData.map((h: any) => {
        // Normalise created_at to a plain date string "YYYY-MM-DD"
        const createdAt: string = h.created_at
          ? h.created_at.slice(0, 10)
          : `${y}-${String(m + 1).padStart(2, "0")}-01`;

        const days = Array(31).fill(STATUS.NONE);
        Object.entries(logsMap[h.id] || {}).forEach(([idx, status]) => {
          days[Number(idx)] = status;
        });
        return {
          id: h.id,
          name: h.name,
          category: h.category || "Uncategorized",
          sort_order: h.sort_order,
          createdAt,
          color: h.color ?? undefined,
          days,
        };
      });

      habitsCacheRef.current.set(cacheKey, assembled);
      if (viewKeyRef.current === cacheKey) {
        setHabits(assembled);
        activeHabitsKeyRef.current = cacheKey;
      }
    },
    []
  );
  // Re-load on month/year change
  useEffect(() => {
    if (user) {
      const key = `${user.id}:${year}-${month}`;
      viewKeyRef.current = key;
      loadHabitsFromDB(user.id, month, year);
    }
  }, [month, year, user, loadHabitsFromDB]);

  // Keep cache in sync with the currently displayed month
  useEffect(() => {
    const key = activeHabitsKeyRef.current;
    if (!user || !key) return;
    habitsCacheRef.current.set(key, habits);
  }, [habits, user]);

  // -------------------------------------------------------------------------
  // Mount / auth
  // -------------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);

    // Refresh `now` when the calendar day rolls over (checked every minute)
    const dayRefresh = setInterval(() => {
      const fresh = new Date();
      setNow((prev) => (fresh.getDate() !== prev.getDate() ? fresh : prev));
    }, 60_000);

    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsMonthView(true);
    };
    checkMobile();
    if (window.innerWidth <= 768) setIsMonthView(false);
    window.addEventListener("resize", checkMobile);

    const supabase = supabaseRef.current;
    supabase.auth
      .getUser()
      .then(async ({ data: { user: u } }) => {
        if (u) {
          setUser(u);
          await loadHabitsFromDB(u.id, now.getMonth(), now.getFullYear());
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadHabitsFromDB(session.user.id, month, year);
        } else {
          setUser(null);
          setHabits([]);
          habitsCacheRef.current.clear();
          activeHabitsKeyRef.current = null;
          viewKeyRef.current = null;
        }
      },
    );

    return () => {
      clearInterval(dayRefresh);
      window.removeEventListener("resize", checkMobile);
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: The scroll-wheel cell cycling listener is registered inside HabitGrid
  // on the grid scroll container element, so it no longer needs passive:false
  // on the document (which was blocking main-thread scroll on the whole page).

  // -------------------------------------------------------------------------
  // Month navigation
  // -------------------------------------------------------------------------
  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  // -------------------------------------------------------------------------
  // Add / remove habits
  // -------------------------------------------------------------------------

  // Shared core: optimistically adds to state, then syncs to DB.
  // On DB error the temp row is rolled back.
  const insertHabit = useCallback(
    async (rawName: string, rawCategory: string) => {
      const name = clampHabitName(rawName.trim());
      if (!name) return;
      const category = rawCategory.trim() || "Uncategorized";

      const tempId: string =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `temp-${crypto.randomUUID()}`
          : `temp-${Math.random().toString(36).slice(2)}`;
      const sortOrder = habits.length;
      const todayStr = new Date().toISOString().slice(0, 10);
      const optimistic: Habit = {
        id: tempId,
        name,
        category,
        days: Array(31).fill(STATUS.NONE),
        sort_order: sortOrder,
        createdAt: todayStr,
        color: undefined,
      };

      // 1. Show immediately -- no waiting on network
      setHabits((prev) => [...prev, optimistic]);

      if (user) {
        const { data, error } = await supabaseRef.current
          .from("habits")
          .insert({ user_id: user.id, name, category, sort_order: sortOrder })
          .select()
          .single();

        if (error) {
          // Rollback the optimistic row
          setHabits((prev) => prev.filter((h) => h.id !== tempId));
        } else if (data) {
          // Swap temp id -> real DB id
          setHabits((prev) =>
            prev.map((h) =>
              h.id === tempId
                ? { ...h, id: data.id, sort_order: data.sort_order }
                : h,
            ),
          );
        }
      }
    },
    [habits.length, user],
  );
  const removeHabit = useCallback(async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setExpandedCalendar((cur) => (cur === id ? null : cur));
    if (user) await supabaseRef.current.from("habits").delete().eq("id", id);
  }, [user]);

  const updateHabitColor = useCallback(async (id: string, color: string | null) => {
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, color: color ?? undefined } : h));
    if (user) {
      await supabaseRef.current.from("habits").update({ color }).eq("id", id);
    }
  }, [user]);

  // -------------------------------------------------------------------------
  // Notes
  // -------------------------------------------------------------------------
  const openNotePopover = useCallback((habitId: string, date: string, x: number, y: number) => {
    const existing = notesCacheRef.current.get(`${habitId}:${date}`) ?? "";
    setNoteText(existing);
    setNotePopover({ habitId, date, x, y });
  }, []);

  const saveNote = useCallback(async (habitId: string, date: string, text: string) => {
    const key = `${habitId}:${date}`;
    const trimmed = text.trim();
    setNoteSaving(true);
    if (trimmed) {
      notesCacheRef.current.set(key, trimmed);
      if (user) {
        await supabaseRef.current.from("habit_notes").upsert(
          { habit_id: habitId, date, note: trimmed, user_id: user.id },
          { onConflict: "habit_id,date" }
        );
      }
    } else {
      notesCacheRef.current.delete(key);
      if (user) {
        await supabaseRef.current.from("habit_notes").delete()
          .eq("habit_id", habitId).eq("date", date);
      }
    }
    setNoteSaving(false);
    setNotePopover(null);
  }, [user]);

  const getNoteForCell = useCallback((habitId: string, date: string): string => {
    return notesCacheRef.current.get(`${habitId}:${date}`) ?? "";
  }, []);

  // Desktop-only: opens the confirmation modal instead of deleting directly.
  // Mobile already has its own 2-step confirm inside the bottom sheet.
  const requestDeleteHabit = useCallback((id: string) => {
    const habit = habits.find((h) => h.id === id);
    if (habit) setHabitToDelete({ id: habit.id, name: habit.name });
  }, [habits]);

  // -------------------------------------------------------------------------
  // Category management
  // -------------------------------------------------------------------------
  const toggleCategory = useCallback((cat: string) =>
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] })), []);

  const startEditCategory = useCallback((cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setEditCategoryName(cat);
  }, []);

  const saveCategoryEdit = useCallback(async (oldCat: string) => {
    const newCat = editCategoryName.trim();
    if (newCat && newCat !== oldCat) {
      setHabits((prev) =>
        prev.map((h) =>
          (h.category || "Uncategorized") === oldCat
            ? { ...h, category: newCat }
            : h,
        ),
      );
      if (user) {
        const ids = habits
          .filter((h) => (h.category || "Uncategorized") === oldCat)
          .map((h) => h.id);
        if (ids.length > 0) {
          await supabaseRef.current
            .from("habits")
            .update({ category: newCat })
            .in("id", ids);
        }
      }
    }
    setEditingCategory(null);
  }, [editCategoryName, habits, user]);

  const confirmDeleteCategory = useCallback((cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryToDelete(cat);
  }, []);

  const executeDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;
    const ids = habits
      .filter((h) => (h.category || "Uncategorized") === categoryToDelete)
      .map((h) => h.id);
    setHabits((prev) =>
      prev.map((h) =>
        (h.category || "Uncategorized") === categoryToDelete
          ? { ...h, category: "Uncategorized" }
          : h,
      ),
    );
    // Prune the deleted category from the order array so it never re-appears
    setCategoryOrder((prev) => prev.filter((c) => c !== categoryToDelete));
    if (user && ids.length > 0) {
      await supabaseRef.current
        .from("habits")
        .update({ category: "Uncategorized" })
        .in("id", ids);
    }
    setCategoryToDelete(null);
  }, [categoryToDelete, habits, user]);

  // -------------------------------------------------------------------------
  // Grouping + ordering
  // -------------------------------------------------------------------------
  const groupedHabits = useMemo(
    () =>
      habits.reduce(
        (acc, habit) => {
          const cat = habit.category || "Uncategorized";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(habit);
          return acc;
        },
        {} as Record<string, Habit[]>,
      ),
    [habits],
  );

  useEffect(() => {
    setCategoryOrder((prev) => {
      const current = Object.keys(groupedHabits);
      const newCats = current.filter((c) => !prev.includes(c));
      if (newCats.length > 0) {
        newCats.sort((a, b) => {
          if (a === "Uncategorized") return 1;
          if (b === "Uncategorized") return -1;
          return a.localeCompare(b);
        });
        return [...prev, ...newCats];
      }
      return prev;
    });
  }, [groupedHabits]);

  const sortedCategories = useMemo(() => {
    const sorted = categoryOrder.filter((c) => groupedHabits[c]);
    Object.keys(groupedHabits).forEach((c) => {
      if (!sorted.includes(c)) sorted.push(c);
    });
    return sorted;
  }, [categoryOrder, groupedHabits]);

  const habitStats = useMemo(() => {
    const stats: Record<string, { streak: number; pct: number }> = {};
    // For the current month pass today's 0-based index so streak starts from today.
    // For past months pass undefined so it falls back to the last day of that month.
    const todayIdx = isCurrent ? today - 1 : undefined;
    habits.forEach((habit) => {
      stats[habit.id] = {
        streak: getStreak(habit.days, dim, todayIdx),
        pct: getPct(habit.days, dim),
      };
    });
    return stats;
  }, [habits, dim, isCurrent, today]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { activeStreaks: number; avgPct: number }> = {};
    Object.entries(groupedHabits).forEach(([cat, catHabits]) => {
      let activeStreaks = 0;
      let pctSum = 0;
      catHabits.forEach((habit) => {
        const hStats = habitStats[habit.id];
        if (hStats?.streak > 0) activeStreaks++;
        pctSum += hStats?.pct ?? 0;
      });
      stats[cat] = {
        activeStreaks,
        avgPct: catHabits.length ? Math.round(pctSum / catHabits.length) : 0,
      };
    });
    return stats;
  }, [groupedHabits, habitStats]);

  // -------------------------------------------------------------------------
  // Sort groupedHabits by sortMode
  // -------------------------------------------------------------------------
  const sortedGroupedHabits = useMemo(() => {
    if (sortMode === "manual") return groupedHabits;
    const result: Record<string, typeof habits> = {};
    Object.entries(groupedHabits).forEach(([cat, catHabits]) => {
      result[cat] = [...catHabits].sort((a, b) => {
        const sa = habitStats[a.id];
        const sb = habitStats[b.id];
        if (sortMode === "streak") return (sb?.streak ?? 0) - (sa?.streak ?? 0);
        return (sb?.pct ?? 0) - (sa?.pct ?? 0);
      });
    });
    return result;
  }, [groupedHabits, habitStats, sortMode]);

  // -------------------------------------------------------------------------
  // Weekly summary banner
  // -------------------------------------------------------------------------
  const weeklySummary = useMemo(() => {
    if (!isCurrent) return null;
    const total = habits.length;
    if (total === 0) return null;
    // "on track" = at least one done/partial in the current week window
    const weekStart = today - (now.getDay() === 0 ? 6 : now.getDay() - 1);
    let onTrack = 0;
    habits.forEach((h) => {
      for (let d = Math.max(0, weekStart - 1); d < today; d++) {
        if (h.days[d] === STATUS.DONE || h.days[d] === STATUS.PARTIAL) {
          onTrack++;
          break;
        }
      }
    });
    const allGood = onTrack === total;
    const pct = Math.round((onTrack / total) * 100);
    return { onTrack, total, allGood, pct };
  }, [habits, isCurrent, today, now]);

  // -------------------------------------------------------------------------
  // Drag & drop
  // -------------------------------------------------------------------------
  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "category") {
      const newOrder = Array.from(sortedCategories);
      const [removed] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, removed);
      setCategoryOrder(newOrder);
      return;
    }

    if (type === "habit") {
      const srcCat = source.droppableId;
      const destCat = destination.droppableId;

      if (srcCat === destCat) {
        const arr = Array.from(groupedHabits[srcCat]);
        const [removed] = arr.splice(source.index, 1);
        arr.splice(destination.index, 0, removed);
        setHabits((prev) => [
          ...prev.filter((h) => (h.category || "Uncategorized") !== srcCat),
          ...arr,
        ]);
      } else {
        const srcArr = Array.from(groupedHabits[srcCat]);
        const destArr = Array.from(groupedHabits[destCat] || []);
        const [removed] = srcArr.splice(source.index, 1);
        removed.category = destCat === "Uncategorized" ? "" : destCat;
        destArr.splice(destination.index, 0, removed);
        setHabits((prev) => [
          ...prev.filter((h) => {
            const c = h.category || "Uncategorized";
            return c !== srcCat && c !== destCat;
          }),
          ...srcArr,
          ...destArr,
        ]);
      }
    }
  };

  // cssStyles moved to module-level constant HABIT_CSS above the component.

  // sheetWeek must be above early returns — useMemo is a hook and cannot
  // appear after a conditional return.
  const sheetWeek = useMemo(() => {
    const days: { d: number; letter: string; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(year, month, today - i);
      const inMonth = date.getMonth() === month;
      days.push({
        d: inMonth ? date.getDate() : -1,
        letter: ["S","M","T","W","T","F","S"][date.getDay()],
        isToday: i === 0,
        isFuture: false,
      });
    }
    return days;
  }, [today, month, year]);

  // -------------------------------------------------------------------------
  // Early returns (placed after all hooks to satisfy Rules of Hooks)
  // -------------------------------------------------------------------------
  if (!mounted) return null;
  if (loading) return <LoadingSkeleton />;

  if (habits.length === 0) {
    return (
      <>
        {!isMobile && <OnboardingTour isEmpty={true} />}
        <EmptyState
          isMobile={isMobile}
          onAdd={insertHabit}
          onAddSuggested={insertHabit}
        />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  // ── Month nav element (shared between portal and inline) ──────────────────
  const monthNavEl = (
    <div
      className="month-nav-pill-wrap"
      style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 9999, padding: "4px 10px" }}
    >
      {/* Sort buttons */}
      {(["manual", "streak", "pct"] as const).map((mode) => (
        <Tip key={mode} label={mode === "manual" ? "Manual order" : mode === "streak" ? "Sort by streak" : "Sort by rate"} down>
          <button
            className="nav-btn"
            onClick={() => setSortMode(mode)}
            style={{
              width: 24, height: 24, borderRadius: 9999,
              background: sortMode === mode ? "rgba(201,162,39,0.15)" : "transparent",
              border: sortMode === mode ? "1px solid rgba(201,162,39,0.4)" : "1px solid transparent",
              color: sortMode === mode ? "var(--accent)" : "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {mode === "manual" ? <ArrowUpDown size={11} /> : mode === "streak" ? <Flame size={11} /> : <BarChart2 size={11} />}
          </button>
        </Tip>
      ))}
      <div style={{ width: 1, height: 14, background: "var(--border-main)", margin: "0 2px" }} />
      <Tip label="Previous month" down>
        <button className="nav-btn" onClick={prevMonth} style={{ width: 24, height: 24, borderRadius: 9999 }}>
          <ChevronLeft size={12} />
        </button>
      </Tip>
      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", minWidth: 80, textAlign: "center", fontWeight: 600 }}>
        {MONTHS[month].toUpperCase()} {year}
      </span>
      <Tip label="Next month" down>
        <button className="nav-btn" onClick={nextMonth} style={{ width: 24, height: 24, borderRadius: 9999 }}>
          <ChevronRight size={12} />
        </button>
      </Tip>
    </div>
  );

  // ── Bottom sheet data for currently selected habit ────────────────────────
  const sheetHabit = selectedHabit
    ? habits.find((h) => h.id === selectedHabit.id) ?? selectedHabit
    : null;
  const sheetTodayIdx = today - 1;
  const sheetTodayStatus = sheetHabit ? sheetHabit.days[sheetTodayIdx] : STATUS.NONE;
  const sheetStreak = sheetHabit ? (habitStats[sheetHabit.id]?.streak ?? 0) : 0;
  const sheetPct = sheetHabit ? (habitStats[sheetHabit.id]?.pct ?? 0) : 0;
  const sheetDateLabel = `${["SUN","MON","TUE","WED","THU","FRI","SAT"][new Date(year, month, today).getDay()]} ${String(today).padStart(2,"0")} ${MONTHS[month].substring(0,3).toUpperCase()}`;

  // Build week for sheet — moved above early returns (see above).

  return (
    <div
      style={{
        background: "transparent",
        color: "inherit",
        fontFamily: "var(--font-body), sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{HABIT_CSS}</style>

      {/* Onboarding tour — first-time desktop users only */}
      {!isMobile && <OnboardingTour isEmpty={false} />}
      {/* -------------------------------------------------------------------- */}
      {/* Note popover — desktop right-click on cell                           */}
      {/* -------------------------------------------------------------------- */}
      {notePopover && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setNotePopover(null)}
            style={{ position: "fixed", inset: 0, zIndex: 399 }}
          />
          <div
            style={{
              position: "fixed",
              left: Math.min(notePopover.x, window.innerWidth - 280),
              top: Math.min(notePopover.y, window.innerHeight - 160),
              zIndex: 400,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-main)",
              borderRadius: 12,
              padding: 14,
              width: 260,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)", letterSpacing: "0.12em" }}>
              NOTE · {notePopover.date}
            </div>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              style={{
                background: "var(--bg-base, #0e0e0e)",
                border: "1px solid var(--border-main)",
                borderRadius: 8,
                color: "var(--text-main)",
                fontFamily: "var(--font-body), sans-serif",
                fontSize: 13,
                padding: "8px 10px",
                resize: "none",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                lineHeight: 1.5,
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setNotePopover(null);
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  saveNote(notePopover.habitId, notePopover.date, noteText);
                }
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setNotePopover(null)}
                style={{
                  flex: 1, padding: "6px", borderRadius: 7,
                  border: "1px solid var(--border-main)", background: "transparent",
                  color: "var(--text-muted)", cursor: "pointer", fontSize: 11,
                  fontFamily: "var(--font-body), sans-serif",
                }}
              >Cancel</button>
              <button
                onClick={() => saveNote(notePopover.habitId, notePopover.date, noteText)}
                disabled={noteSaving}
                style={{
                  flex: 2, padding: "6px", borderRadius: 7,
                  border: "none", background: "var(--accent)",
                  color: "var(--bg-base)", cursor: "pointer", fontSize: 11,
                  fontWeight: 600, fontFamily: "var(--font-body), sans-serif",
                  opacity: noteSaving ? 0.6 : 1,
                }}
              >{noteSaving ? "Saving..." : noteText.trim() ? "Save" : "Clear"}</button>
            </div>
          </div>
        </>
      )}

      <div
        className="page-container page-enter"
        style={{ maxWidth: 1340, margin: "0 auto", padding: "0px 36px 88px" }}
      >
        {/* ------------------------------------------------------------------ */}
        {/* Top bar: month navigator + mobile view toggle                       */}
        {/* ------------------------------------------------------------------ */}
        {/* On mobile, the month nav is portalled into the floating-nav header  */}
        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 32, gap: 10, flexWrap: "wrap" }}>
            {/* Sort toggle */}
            <div data-tour="sort-buttons" className="month-nav-container" style={{ display: "flex", alignItems: "center", background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 12, padding: "4px", gap: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              {(["manual", "streak", "pct"] as const).map((mode) => (
                <Tip key={mode} label={mode === "manual" ? "Manual order" : mode === "streak" ? "Sort by streak" : "Sort by rate"} down>
                  <button
                    className="nav-btn"
                    onClick={() => setSortMode(mode)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: sortMode === mode ? "rgba(201,162,39,0.15)" : "transparent",
                      border: sortMode === mode ? "1px solid rgba(201,162,39,0.4)" : "1px solid transparent",
                      color: sortMode === mode ? "var(--accent)" : "var(--text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {mode === "manual" ? <ArrowUpDown size={13} /> : mode === "streak" ? <Flame size={13} /> : <BarChart2 size={13} />}
                  </button>
                </Tip>
              ))}
            </div>
            {/* Month nav */}
            <div className="month-nav-container" style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 12, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <Tip label="Previous month" down>
                <button className="nav-btn" onClick={prevMonth} style={{ width: 28, height: 28 }}><ChevronLeft size={14} /></button>
              </Tip>
              <span className="month-nav-text" style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", minWidth: 100, textAlign: "center", fontWeight: 600 }}>
                {MONTHS[month].toUpperCase()} {year}
              </span>
              <Tip label="Next month" down>
                <button className="nav-btn" onClick={nextMonth} style={{ width: 28, height: 28 }}><ChevronRight size={14} /></button>
              </Tip>
            </div>
          </div>
        )}

        {/* Mobile: portal month nav only */}
        {isMobile && mounted && <MonthNavPortal>{monthNavEl}</MonthNavPortal>}

        {/* ------------------------------------------------------------------ */}
        {/* Legend (desktop only — mobile legend is in HabitGrid)               */}
        {/* ------------------------------------------------------------------ */}
        {!isMobile && (
          <div className="legend-container" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 24, marginBottom: 20 }}>
            {[STATUS.DONE, STATUS.PARTIAL, STATUS.MISSED].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: S[s].bg, boxShadow: S[s].glow }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.14em", fontFamily: "var(--font-mono), monospace" }}>
                  {S[s].label.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Scrollable grid                                                     */}
        {/* ------------------------------------------------------------------ */}
        <div data-tour="habit-grid">
        <HabitGrid
          isMobile={isMobile}
          touchY={touchY}
          setTouchY={setTouchY}
          setIsMonthView={setIsMonthView}
          visibleDays={visibleDays}
          isCurrent={isCurrent}
          today={today}
          month={month}
          year={year}
          isFutureMonth={isFutureMonth}
          onDragEnd={onDragEnd}
          sortedCategories={sortedCategories}
          groupedHabits={sortedGroupedHabits}
          collapsedCategories={collapsedCategories}
          editingCategory={editingCategory}
          editCategoryName={editCategoryName}
          setEditCategoryName={setEditCategoryName}
          setEditingCategory={setEditingCategory}
          toggleCategory={toggleCategory}
          startEditCategory={startEditCategory}
          saveCategoryEdit={saveCategoryEdit}
          confirmDeleteCategory={confirmDeleteCategory}
          categoryStats={categoryStats}
          habitStats={habitStats}
          expandedCalendar={expandedCalendar}
          setExpandedCalendar={setExpandedCalendar}
          removeHabit={requestDeleteHabit}
          cycleStatus={cycleStatus}
          pulsingCell={pulsingCell}
          user={user}
          supabase={supabaseRef.current}
          hoveredCellRef={hoveredCellRef}
          onTap={onTap}
          onQuickLog={onQuickLog}
          updateHabitColor={updateHabitColor}
          habitColors={HABIT_COLORS}
          openNotePopover={openNotePopover}
          getNoteForCell={getNoteForCell}
        />
        </div>

        {/* Add habit input */}
        <div data-tour="add-habit" style={{ position: "relative" }}>
          <HabitComposer isMobile={isMobile} onAdd={insertHabit} />
        </div>
      </div>

      {/* Delete category modal */}
      <DeleteCategoryModal
        categoryToDelete={categoryToDelete}
        habitCount={categoryToDelete ? (groupedHabits[categoryToDelete]?.length ?? 0) : 0}
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={executeDeleteCategory}
      />

      {/* Delete habit modal (desktop only — mobile uses bottom sheet confirm) */}
      <DeleteHabitModal
        habitToDelete={habitToDelete}
        onCancel={() => setHabitToDelete(null)}
        onConfirm={() => {
          if (habitToDelete) removeHabit(habitToDelete.id);
          setHabitToDelete(null);
        }}
      />

      {/* -------------------------------------------------------------------- */}
      {/* Mobile: Log Bottom Sheet — single instance at root                   */}
      {/* -------------------------------------------------------------------- */}
      {isMobile && (
        <>
          {/* Backdrop blur — separate div, not on sheet itself */}
          {sheetHabit && (
            <div
              onClick={() => setSelectedHabit(null)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                background: "rgba(0,0,0,0.45)",
              }}
            />
          )}

          {/* Sheet */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              background: "var(--bg-surface, #161616)",
              border: "1px solid var(--border-main)",
              borderRadius: "20px 20px 0 0",
              padding: "12px 20px 40px",
              transform: sheetHabit ? "translateY(0)" : "translateY(110%)",
              transition: sheetHabit
                ? "transform 0.42s cubic-bezier(0.34, 1.4, 0.64, 1)"
                : "transform 0.3s ease-in",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {sheetHabit && (
              <>
                {/* Handle bar */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ width: 32, height: 3, borderRadius: 9999, background: "var(--border-focus, #333)" }} />
                </div>

                {/* Habit info row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 4 }}>
                      HABIT
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sheetHabit.name}
                    </div>
                  </div>
                  {/* Streak + rate chips */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
                    {sheetStreak > 0 && (
                      <span style={{
                        fontSize: 10, fontFamily: "var(--font-mono), monospace",
                        color: "var(--accent)", background: "rgba(201,162,39,0.1)",
                        padding: "3px 8px", borderRadius: 9999,
                        border: "1px solid rgba(201,162,39,0.25)",
                      }}>
                      <Flame size={10} color="var(--accent)" /> {sheetStreak}d
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono), monospace",
                      color: "var(--text-muted)", background: "var(--bg-base, #0e0e0e)",
                      padding: "3px 8px", borderRadius: 9999,
                      border: "1px solid var(--border-main)",
                    }}>
                      {sheetPct}%
                    </span>
                  </div>
                </div>

                {/* Today anchor bar */}
                <div style={{
                  background: "var(--bg-base, #0e0e0e)",
                  border: "1px solid var(--border-main)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: "var(--font-mono), monospace", color: "var(--accent)", letterSpacing: "0.12em", marginBottom: 3 }}>
                      TODAY · {sheetDateLabel}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body), sans-serif" }}>
                      Select a status to log
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: MOBILE_PILL_W,
                        height: MOBILE_PILL_H_SM,
                        borderRadius: 9999,
                        background: sheetTodayStatus === STATUS.NONE ? "var(--pill-none, #1c1c1c)" : S[sheetTodayStatus].bg,
                        border: `1px solid ${S[sheetTodayStatus].border}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono), monospace", color: S[sheetTodayStatus].border, fontWeight: 600 }}>
                      {S[sheetTodayStatus].label.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Week mini-view */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20, justifyContent: "space-between" }}>
                  {sheetWeek.map((wd, i) => {
                    const cellStatus = wd.d > 0 ? sheetHabit.days[wd.d - 1] : STATUS.NONE;
                    const isNone = cellStatus === STATUS.NONE;
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, opacity: wd.d < 0 ? 0.2 : wd.isToday ? 1 : 0.55, flex: 1 }}>
                        <span style={{ fontSize: 9, fontFamily: "var(--font-mono), monospace", color: wd.isToday ? "var(--accent)" : "var(--text-muted)" }}>
                          {wd.letter}
                        </span>
                        <div style={{
                          width: MOBILE_PILL_W,
                          height: MOBILE_PILL_H_SM,
                          borderRadius: 9999,
                          background: isNone ? "var(--pill-none, #1c1c1c)" : S[cellStatus].bg,
                          border: `1px solid ${wd.isToday ? "var(--accent)" : (isNone ? "var(--pill-none-border, #2a2a2a)" : S[cellStatus].border)}`,
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 8, fontFamily: "var(--font-mono), monospace", color: wd.isToday ? "var(--accent)" : "var(--text-muted)", opacity: wd.isToday ? 1 : 0.5 }}>
                          {wd.d > 0 ? String(wd.d).padStart(2, "0") : "--"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Status buttons */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[STATUS.DONE, STATUS.PARTIAL, STATUS.MISSED].map((s) => {
                    const isActive = sheetTodayStatus === s;
                    return (
                      <button
                        key={s}
                        onClick={() => logStatusFromSheet(sheetHabit, s)}
                        style={{
                          flex: 1,
                          padding: "12px 8px",
                          borderRadius: 12,
                          border: `1.5px solid ${S[s].border}`,
                          background: isActive ? S[s].bg : `${S[s].bg}18`,
                          color: isActive ? "#000" : S[s].border,
                          cursor: "pointer",
                          fontFamily: "var(--font-body), sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          transform: isActive ? "scale(1.05)" : "scale(1)",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {S[s].label}
                        {isActive && (
                          <span style={{ fontSize: 8, fontFamily: "var(--font-mono), monospace", opacity: 0.7, letterSpacing: "0.1em" }}>
                            NOW
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border-main)", marginBottom: 16 }} />

                {/* Color picker */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: 8 }}>
                    HABIT COLOR
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {HABIT_COLORS.map((c) => (
                      <div
                        key={c}
                        onClick={() => updateHabitColor(sheetHabit.id, sheetHabit.color === c ? null : c)}
                        style={{
                          width: 24, height: 24, borderRadius: "50%", background: c,
                          cursor: "pointer", flexShrink: 0,
                          border: sheetHabit.color === c ? "2.5px solid #fff" : "2.5px solid transparent",
                          boxShadow: sheetHabit.color === c ? `0 0 8px ${c}88` : "none",
                          transition: "transform 0.12s, box-shadow 0.12s",
                        }}
                      />
                    ))}
                    {sheetHabit.color && (
                      <div
                        onClick={() => updateHabitColor(sheetHabit.id, null)}
                        style={{
                          width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                          border: "1px dashed var(--border-focus)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, color: "var(--text-muted)",
                        }}
                      >✕</div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border-main)", marginBottom: 16 }} />

                {/* Today's note */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: 8 }}>
                    NOTE · TODAY
                  </div>
                  <textarea
                    value={sheetNoteText}
                    onChange={(e) => setSheetNoteText(e.target.value)}
                    onBlur={async () => {
                      const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(today).padStart(2, "0")}`;
                      if (sheetHabit) {
                        const trimmed = sheetNoteText.trim();
                        const key = `${sheetHabit.id}:${todayStr}`;
                        if (trimmed) {
                          notesCacheRef.current.set(key, trimmed);
                          if (user) {
                            supabaseRef.current.from("habit_notes").upsert(
                              { habit_id: sheetHabit.id, date: todayStr, note: trimmed, user_id: user.id },
                              { onConflict: "habit_id,date" }
                            ).then();
                          }
                        } else {
                          notesCacheRef.current.delete(key);
                          if (user) {
                            supabaseRef.current.from("habit_notes").delete()
                              .eq("habit_id", sheetHabit.id).eq("date", todayStr).then();
                          }
                        }
                      }
                    }}
                    placeholder="Add a note for today..."
                    rows={2}
                    style={{
                      width: "100%", background: "var(--bg-base, #0e0e0e)",
                      border: "1px solid var(--border-main)", borderRadius: 10,
                      color: "var(--text-main)", fontFamily: "var(--font-body), sans-serif",
                      fontSize: 13, padding: "10px 12px", resize: "none",
                      outline: "none", boxSizing: "border-box", lineHeight: 1.5,
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setSelectedHabit(null)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 10,
                      border: "1px solid var(--border-main)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "var(--font-body), sans-serif",
                    }}
                  >
                    Close
                  </button>
                  {!sheetDeleteConfirm ? (
                    <button
                      onClick={() => setSheetDeleteConfirm(true)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: "1px solid var(--status-missed, #ef4444)",
                        background: "transparent",
                        color: "var(--status-missed, #ef4444)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontFamily: "var(--font-body), sans-serif",
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setSheetDeleteConfirm(false)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 10,
                          border: "1px solid var(--border-main)",
                          background: "transparent",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontFamily: "var(--font-body), sans-serif",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (sheetHabit) {
                            removeHabit(sheetHabit.id);
                            showToast(`Deleted: ${sheetHabit.name}`, "var(--status-missed)");
                          }
                          setSelectedHabit(null);
                          setSheetDeleteConfirm(false);
                        }}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: 10,
                          border: "2px solid var(--status-missed, #ef4444)",
                          background: "rgba(239,68,68,0.12)",
                          color: "var(--status-missed, #ef4444)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: "var(--font-body), sans-serif",
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Toast — single instance, above bottom nav                        */}
          {/* ---------------------------------------------------------------- */}
          <div
            style={{
              position: "fixed",
              bottom: toast ? 100 : 80,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 300,
              opacity: toast ? 1 : 0,
              pointerEvents: "none",
              transition: "opacity 0.25s, bottom 0.25s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {toast && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 9999,
                  background: "var(--bg-surface, #1c1c1c)",
                  border: "1px solid var(--border-main)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: toast.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-body), sans-serif",
                    color: "var(--text-main)",
                    fontWeight: 500,
                  }}
                >
                  {toast.msg}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}