"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Trash2, Plus,
  ChevronDown, Edit2, GripVertical, Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

import { MONTHS, STATUS, S, PILL_W, PILL_H, PILL_GAP, MAX_HABIT_NAME_LENGTH, SUGGESTED_HABITS } from "./constants";
import type { Habit } from "./types";
import { getDaysInMonth, getStreak, getPct, clampHabitName, hapticFeedback } from "./utils";
import { IconFire, IconClock } from "./icons";
import HeatmapCalendar from "./HeatmapCalendar";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";
import DeleteCategoryModal from "./DeleteCategoryModal";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function HabitTracker() {
  const [now, setNow]                               = useState(() => new Date());
  const [month, setMonth]                           = useState(() => new Date().getMonth());
  const [year, setYear]                             = useState(() => new Date().getFullYear());
  const [habits, setHabits]                         = useState<Habit[]>([]);
  const [newHabit, setNewHabit]                     = useState("");
  const [newCategory, setNewCategory]               = useState("");
  const [inputFocused, setInputFocused]             = useState(false);
  const [pulsingCell, setPulsingCell]               = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory]       = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName]     = useState("");
  const [categoryToDelete, setCategoryToDelete]     = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder]           = useState<string[]>([]);
  const [mounted, setMounted]                       = useState(false);
  const [loading, setLoading]                       = useState(true);
  const [expandedCalendar, setExpandedCalendar]     = useState<string | null>(null);
  const [isMonthView, setIsMonthView]               = useState(true);
  const [isMobile, setIsMobile]                     = useState(false);
  const [touchY, setTouchY]                         = useState<number | null>(null);
  const [user, setUser]                             = useState<User | null>(null);
  const [heatmapLogs, setHeatmapLogs]               = useState<Record<string, Record<string, number>>>({});

  const hoveredCellRef = useRef<{ hid: string; idx: number } | null>(null);
  const cycleRef       = useRef<any>(null);
  const supabaseRef    = useRef(createClient());

  const habitNameCount        = newHabit.length;
  const showHabitNameCounter  = inputFocused || habitNameCount > 0;
  const setHabitNameWithLimit = (value: string) => setNewHabit(clampHabitName(value));

  const dim            = getDaysInMonth(month, year);
  const dayNums        = Array.from({ length: dim }, (_, i) => i + 1);
  const today          = now.getDate();
  const isCurrent      = month === now.getMonth() && year === now.getFullYear();
  const isFutureMonth  = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const currentWeekStart = today - (now.getDay() === 0 ? 6 : now.getDay() - 1);
  const weekStart        = isCurrent ? Math.max(1, currentWeekStart) : 1;
  const weekEnd          = Math.min(dim, weekStart + 6);
  const visibleDays      = isMonthView ? dayNums : dayNums.filter((d) => d >= weekStart && d <= weekEnd);

  // -------------------------------------------------------------------------
  // Trigger pulse animation on a cell
  // -------------------------------------------------------------------------
  const triggerPulse = (hid: string, idx: number) => {
    const key = `${hid}-${idx}`;
    setPulsingCell(key);
    setTimeout(() => setPulsingCell((k) => (k === key ? null : k)), 220);
  };

  // -------------------------------------------------------------------------
  // Cycle cell status
  // -------------------------------------------------------------------------
  function cycleStatus(hid: string, idx: number, reverse = false, pulse = false) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== hid) return h;
        const days = [...h.days];
        const cur  = days[idx];
        const next = reverse
          ? (cur === STATUS.NONE ? STATUS.MISSED : cur === STATUS.MISSED ? STATUS.PARTIAL : cur === STATUS.PARTIAL ? STATUS.DONE : STATUS.NONE)
          : (cur === STATUS.NONE ? STATUS.DONE   : cur === STATUS.DONE   ? STATUS.PARTIAL : cur === STATUS.PARTIAL ? STATUS.MISSED : STATUS.NONE);
        days[idx] = next;
        hapticFeedback(next);

        if (user) {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(idx + 1).padStart(2, "0")}`;
          if (next === STATUS.NONE) {
            supabaseRef.current.from("habit_logs").delete().eq("habit_id", hid).eq("date", dateStr).then();
          } else {
            supabaseRef.current
              .from("habit_logs")
              .upsert({ habit_id: hid, date: dateStr, status: next }, { onConflict: "habit_id,date" })
              .then();
          }
        }

        return { ...h, days };
      })
    );
    if (pulse) triggerPulse(hid, idx);
  }

  useEffect(() => { cycleRef.current = cycleStatus; });

  // -------------------------------------------------------------------------
  // Load habits from Supabase
  // -------------------------------------------------------------------------
  const loadHabitsFromDB = useCallback(async (userId: string, m: number, y: number) => {
    const supabase     = supabaseRef.current;
    const daysInMonth  = getDaysInMonth(m, y);

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (!habitsData || habitsData.length === 0) {
      setHabits([]);
      return;
    }

    const startDate = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const endDate   = `${y}-${String(m + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const habitIds  = habitsData.map((h: any) => h.id);

    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("*")
      .in("habit_id", habitIds)
      .gte("date", startDate)
      .lte("date", endDate);

    const logsMap: Record<string, Record<number, number>> = {};
    (logsData || []).forEach((log: any) => {
      if (!logsMap[log.habit_id]) logsMap[log.habit_id] = {};
      const day = new Date(log.date + "T00:00:00").getDate();
      logsMap[log.habit_id][day - 1] = log.status;
    });

    const assembled: Habit[] = habitsData.map((h: any) => {
      const days = Array(31).fill(STATUS.NONE);
      Object.entries(logsMap[h.id] || {}).forEach(([idx, status]) => {
        days[Number(idx)] = status;
      });
      return {
        id: h.id,
        name: h.name,
        category: h.category || "Uncategorized",
        sort_order: h.sort_order,
        days,
      };
    });

    setHabits(assembled);
  }, []);

  // Re-load on month/year change
  useEffect(() => {
    if (user) loadHabitsFromDB(user.id, month, year);
  }, [month, year, user, loadHabitsFromDB]);

  // -------------------------------------------------------------------------
  // Mount / auth
  // -------------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);

    // Refresh `now` when the calendar day rolls over (checked every minute)
    const dayRefresh = setInterval(() => {
      const fresh = new Date();
      setNow(prev => (fresh.getDate() !== prev.getDate() ? fresh : prev));
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
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) {
        setUser(u);
        await loadHabitsFromDB(u.id, now.getMonth(), now.getFullYear());
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadHabitsFromDB(session.user.id, month, year);
      } else {
        setUser(null);
        setHabits([]);
      }
    });

    return () => {
      clearInterval(dayRefresh);
      window.removeEventListener("resize", checkMobile);
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll-wheel cycling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (hoveredCellRef.current) {
        e.preventDefault();
        e.stopPropagation();
        cycleRef.current(hoveredCellRef.current.hid, hoveredCellRef.current.idx, e.deltaY < 0, true);
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // -------------------------------------------------------------------------
  // Month navigation
  // -------------------------------------------------------------------------
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }

  // -------------------------------------------------------------------------
  // Add / remove habits
  // -------------------------------------------------------------------------

  // Shared core: optimistically adds to state, then syncs to DB.
  // On DB error the temp row is rolled back.
  async function insertHabit(name: string, category: string) {
    const tempId: string  = `temp-${crypto.randomUUID()}`;
    const sortOrder       = habits.length;
    const optimistic: Habit = {
      id: tempId, name, category,
      days: Array(31).fill(STATUS.NONE),
      sort_order: sortOrder,
    };

    // 1. Show immediately — no waiting on network
    setHabits(prev => [...prev, optimistic]);

    if (user) {
      const { data, error } = await supabaseRef.current
        .from("habits")
        .insert({ user_id: user.id, name, category, sort_order: sortOrder })
        .select()
        .single();

      if (error) {
        // Rollback the optimistic row
        setHabits(prev => prev.filter(h => h.id !== tempId));
      } else if (data) {
        // Swap temp id → real DB id
        setHabits(prev =>
          prev.map(h => h.id === tempId
            ? { ...h, id: data.id, sort_order: data.sort_order }
            : h
          )
        );
      }
    }
  }

  async function addHabit() {
    const name = clampHabitName(newHabit.trim());
    if (!name) return;
    await insertHabit(name, newCategory.trim() || "Uncategorized");
    setNewHabit("");
    setNewCategory("");
  }

  async function addSuggestedHabit(name: string, category: string) {
    const clamped = clampHabitName(name.trim());
    if (!clamped) return;
    await insertHabit(clamped, category);
  }

  async function removeHabit(id: string) {
    setHabits(prev => prev.filter(h => h.id !== id));
    setExpandedCalendar(cur => (cur === id ? null : cur));
    if (user) await supabaseRef.current.from("habits").delete().eq("id", id);
  }

  // -------------------------------------------------------------------------
  // Category management
  // -------------------------------------------------------------------------
  const toggleCategory = (cat: string) =>
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const startEditCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setEditCategoryName(cat);
  };

  const saveCategoryEdit = async (oldCat: string) => {
    const newCat = editCategoryName.trim();
    if (newCat && newCat !== oldCat) {
      setHabits((prev) => prev.map((h) => ((h.category || "Uncategorized") === oldCat ? { ...h, category: newCat } : h)));
      if (user) {
        const ids = habits.filter((h) => (h.category || "Uncategorized") === oldCat).map((h) => h.id);
        if (ids.length > 0) {
          await supabaseRef.current.from("habits").update({ category: newCat }).in("id", ids);
        }
      }
    }
    setEditingCategory(null);
  };

  const confirmDeleteCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryToDelete(cat);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const ids = habits.filter((h) => (h.category || "Uncategorized") === categoryToDelete).map((h) => h.id);
    setHabits((prev) =>
      prev.map((h) => ((h.category || "Uncategorized") === categoryToDelete ? { ...h, category: "Uncategorized" } : h))
    );
    // Prune the deleted category from the order array so it never re-appears
    setCategoryOrder(prev => prev.filter(c => c !== categoryToDelete));
    if (user && ids.length > 0) {
      await supabaseRef.current.from("habits").update({ category: "Uncategorized" }).in("id", ids);
    }
    setCategoryToDelete(null);
  };

  // -------------------------------------------------------------------------
  // Grouping + ordering
  // -------------------------------------------------------------------------
  const groupedHabits = useMemo(
    () =>
      habits.reduce((acc, habit) => {
        const cat = habit.category || "Uncategorized";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(habit);
        return acc;
      }, {} as Record<string, Habit[]>),
    [habits]
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
    Object.keys(groupedHabits).forEach((c) => { if (!sorted.includes(c)) sorted.push(c); });
    return sorted;
  }, [categoryOrder, groupedHabits]);

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
      const srcCat  = source.droppableId;
      const destCat = destination.droppableId;

      if (srcCat === destCat) {
        const arr = Array.from(groupedHabits[srcCat]);
        const [removed] = arr.splice(source.index, 1);
        arr.splice(destination.index, 0, removed);
        setHabits((prev) => [...prev.filter((h) => (h.category || "Uncategorized") !== srcCat), ...arr]);
      } else {
        const srcArr  = Array.from(groupedHabits[srcCat]);
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

  // -------------------------------------------------------------------------
  // Memoize static styles so the string isn't recreated on every render
  // NOTE: must be above all early returns to satisfy Rules of Hooks
  // -------------------------------------------------------------------------
  const cssStyles = useMemo(() => `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root.light .habit-card { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 0.25rem 1rem rgba(0,0,0,0.03) !important; }
        :root.light .habit-card:hover { border-color: var(--border-focus) !important; box-shadow: 0 0.5rem 1.875rem rgba(0,0,0,0.06) !important; }
        :root.light .habit-name { color: #1a1a18 !important; }
        :root.light .add-wrap { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 0.25rem 1rem rgba(0,0,0,0.03) !important; }
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
          .add-wrap { width: 100%; padding-left: 0.875rem; }
          .add-input-cat { width: 8.75rem; }
          .month-nav-container { padding: 0.5rem 0.75rem !important; }
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
          background: #121212; border: 1px solid #222;
          border-radius: 62.4375rem;
          padding: 0.375rem 0.375rem 0.375rem 1.25rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          max-width: 35rem;
        }
        .add-wrap.focused { border-color: var(--accent); }
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
          width: 2.375rem; height: 2.375rem; border-radius: 50%;
          background: var(--accent); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0.625rem 1.375rem rgba(0,0,0,0.35), inset 0 0.0625rem 0 rgba(255,255,255,0.28);
          transition: box-shadow 0.15s, transform 0.12s; flex-shrink: 0;
        }
        .add-btn:active { transform: scale(0.98); box-shadow: 0 0.375rem 0.875rem rgba(0,0,0,0.32), inset 0 0.0625rem 0 rgba(255,255,255,0.18); }

        .tooltip {
          position: absolute; bottom: 100%; left: 50%;
          transform: translateX(-50%) translateY(-0.25rem);
          background: var(--bg-surface); border: 1px solid var(--border-main);
          color: var(--text-main); padding: 0.375rem 0.625rem;
          border-radius: 0.375rem; font-size: 0.75rem;
          font-family: var(--font-mono), monospace;
          white-space: nowrap; opacity: 0; pointer-events: none;
          transition: all 0.2s ease; z-index: 9999999;
          box-shadow: 0 0.25rem 0.75rem var(--shadow-alpha);
        }
        .pill-container:hover { z-index: 100; }
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
  `, []);

  // -------------------------------------------------------------------------
  // Early returns (placed after all hooks to satisfy Rules of Hooks)
  // -------------------------------------------------------------------------
  if (!mounted) return null;
  if (loading)  return <LoadingSkeleton />;

  if (habits.length === 0) {
    return (
      <EmptyState
        newHabit={newHabit}
        setNewHabit={setHabitNameWithLimit}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        inputFocused={inputFocused}
        setInputFocused={setInputFocused}
        isMobile={isMobile}
        onAdd={addHabit}
        onAddSuggested={addSuggestedHabit}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        background: "transparent",
        color: "inherit",
        fontFamily: "var(--font-body), sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{cssStyles}</style>

      <div
        className="page-container page-enter"
        style={{ maxWidth: 1340, margin: "0 auto", padding: "0px 36px 88px" }}
      >
        {/* ------------------------------------------------------------------ */}
        {/* Top bar: month navigator + mobile view toggle                       */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            display: "flex",
            justifyContent: isMobile ? "center" : "flex-end",
            alignItems: "center",
            marginBottom: 32,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            className="month-nav-container"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-main)",
              borderRadius: 12,
              padding: "8px 12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <button className="nav-btn" onClick={prevMonth} style={{ width: 28, height: 28 }}>
              <ChevronLeft size={14} />
            </button>
            <span
              className="month-nav-text"
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 11,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                minWidth: 100,
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              {MONTHS[month].toUpperCase()} {year}
            </span>
            <button className="nav-btn" onClick={nextMonth} style={{ width: 28, height: 28 }}>
              <ChevronRight size={14} />
            </button>
          </div>

          {isMobile && (
            <button
              onClick={() => setIsMonthView(!isMonthView)}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-main)",
                color: "var(--accent)",
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-mono), monospace",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {isMonthView ? (
                <><ChevronRight size={14} /> Weekly</>
              ) : (
                <><ChevronDown size={14} /> Monthly</>
              )}
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Legend                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="legend-container"
          style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 20 }}
        >
          {[STATUS.DONE, STATUS.PARTIAL, STATUS.MISSED].map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: S[s].bg, boxShadow: S[s].glow,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  letterSpacing: "0.14em",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {S[s].label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Scrollable grid                                                     */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="scroll-container"
          style={{
            overflowX: "auto",
            paddingBottom: 24,
            paddingTop: 60,
            marginTop: -60,
            marginLeft: -36,
            marginRight: -36,
            paddingLeft: 36,
            paddingRight: 36,
          }}
          onTouchStart={(e) => isMobile && setTouchY(e.touches[0].clientY)}
          onTouchEnd={(e) => {
            if (!isMobile || touchY === null) return;
            const diff = e.changedTouches[0].clientY - touchY;
            if (diff > 60) setIsMonthView(true);
            else if (diff < -60) setIsMonthView(false);
            setTouchY(null);
          }}
        >
          <div style={{ minWidth: "max-content" }}>

            {/* Day header row */}
            <div
              className="day-header-container"
              style={{
                paddingLeft: 260,
                marginBottom: 12,
                display: "flex",
                gap: PILL_GAP,
                alignItems: "center",
              }}
            >
              <AnimatePresence>
                {visibleDays.map((d, di) => {
                  const isT = isCurrent && d === today;
                  const dominoDelay = di * 0.022;
                  return (
                    <motion.div
                      key={d}
                      className={`day-header ${isT ? "is-today" : ""}`}
                      initial={{ width: 0, opacity: 0, y: -6 }}
                      animate={{ width: PILL_W, opacity: 1, y: 0 }}
                      exit={{
                        width: 0, opacity: 0, y: -6,
                        transition: { duration: 0.14, delay: (visibleDays.length - 1 - di) * 0.012 },
                      }}
                      transition={{
                        width:   { duration: 0.18, delay: dominoDelay, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: 0.16, delay: dominoDelay },
                        y:       { type: "spring", stiffness: 520, damping: 30, delay: dominoDelay },
                      }}
                      style={{
                        textAlign: "center",
                        flexShrink: 0,
                        fontSize: 13,
                        fontFamily: "var(--font-mono), monospace",
                        color: isT ? "var(--accent)" : "var(--text-muted)",
                        fontWeight: isT ? "700" : "500",
                        position: "relative",
                        paddingBottom: 6,
                      }}
                    >
                      {String(d).padStart(2, "0")}
                      {isT && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: "var(--accent)",
                          }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Drag & drop categories + habits                                  */}
            {/* ---------------------------------------------------------------- */}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories" type="category">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ display: "flex", flexDirection: "column", gap: 24, width: "max-content" }}
                  >
                    {sortedCategories.map((cat, catIndex) => {
                      const isCollapsed = collapsedCategories[cat];
                      const catHabits   = groupedHabits[cat];

                      return (
                        <Draggable draggableId={`cat-${cat}`} index={catIndex} key={cat}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{ ...provided.draggableProps.style, display: "flex", flexDirection: "column", gap: 12 }}
                            >
                              {/* Category header */}
                              <div
                                className="cat-header-group"
                                onClick={() => !editingCategory && toggleCategory(cat)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  cursor: editingCategory === cat ? "default" : "pointer",
                                  padding: "4px 0",
                                  color: "var(--text-muted)",
                                  transition: "color 0.2s",
                                  width: "max-content",
                                }}
                                onMouseEnter={(e) => { if (editingCategory !== cat) e.currentTarget.style.color = "var(--accent)"; }}
                                onMouseLeave={(e) => { if (editingCategory !== cat) e.currentTarget.style.color = "var(--text-muted)"; }}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ cursor: "grab", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 4 }}
                                >
                                  <GripVertical size={16} />
                                </div>
                                <ChevronDown
                                  size={16}
                                  style={{
                                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s",
                                    opacity: editingCategory === cat ? 0.3 : 1,
                                  }}
                                />

                                {editingCategory === cat ? (
                                  <input
                                    value={editCategoryName}
                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                    onBlur={() => saveCategoryEdit(cat)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveCategoryEdit(cat);
                                      if (e.key === "Escape") setEditingCategory(null);
                                    }}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      background: "var(--bg-surface)",
                                      border: "1px solid var(--border-main)",
                                      color: "var(--text-main)",
                                      padding: "4px 8px",
                                      borderRadius: 4,
                                      fontSize: 13,
                                      fontFamily: "var(--font-body), sans-serif",
                                      outline: "none",
                                      width: 200,
                                    }}
                                  />
                                ) : (
                                  <>
                                    <span
                                      style={{
                                        fontSize: 22,
                                        fontWeight: 600,
                                        color: "var(--accent)",
                                        fontFamily: "var(--font-body), sans-serif",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {cat}{" "}
                                      <span style={{ opacity: 0.4, fontSize: 14, fontWeight: 500 }}>
                                        ({catHabits.length})
                                      </span>
                                    </span>

                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        fontSize: 11,
                                        fontFamily: "var(--font-body), sans-serif",
                                      }}
                                    >
                                      <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Active Streaks">
                                        <IconFire size={12} color="var(--accent)" />
                                        {catHabits.filter((h) => getStreak(h.days, dim) > 0).length}
                                      </span>
                                      <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Average Completion">
                                        <IconClock size={12} color="var(--status-done)" />
                                        {Math.round(catHabits.reduce((sum, h) => sum + getPct(h.days, dim), 0) / catHabits.length) || 0}%
                                      </span>
                                    </div>

                                    {cat !== "Uncategorized" && (
                                      <div
                                        className="cat-actions"
                                        style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0, transition: "opacity 0.2s" }}
                                      >
                                        <button className="cat-action-btn" onClick={(e) => startEditCategory(cat, e)} title="Edit Category">
                                          <Edit2 size={14} />
                                        </button>
                                        <button className="cat-action-btn del" onClick={(e) => confirmDeleteCategory(cat, e)} title="Delete Category">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Habits list */}
                              <AnimatePresence initial={false}>
                                {!isCollapsed && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                                    animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                                    exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                  >
                                    <Droppable droppableId={cat} type="habit">
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 4 }}
                                        >
                                          {catHabits.map((habit, hi) => {
                                            const streak   = getStreak(habit.days, dim);
                                            const pct      = getPct(habit.days, dim);
                                            const pctColor = pct >= 80 ? "var(--status-done)" : pct >= 50 ? "var(--status-partial)" : pct > 0 ? "var(--status-missed)" : "var(--text-muted)";

                                            return (
                                              <Draggable draggableId={`habit-${habit.id}`} index={hi} key={habit.id}>
                                                {(provided, snapshot) => (
                                                  <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="habit-card"
                                                    style={{
                                                      ...provided.draggableProps.style,
                                                      padding: "20px 20px",
                                                      display: "flex",
                                                      flexDirection: "column",
                                                      alignItems: "stretch",
                                                      background: snapshot.isDragging ? "#1a1a1a" : "#121212",
                                                      zIndex: snapshot.isDragging ? 999 : "auto",
                                                    }}
                                                  >
                                                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>

                                                      {/* Left panel */}
                                                      <div
                                                        className="habit-left-panel"
                                                        style={{
                                                          width: 240,
                                                          flex: "0 0 240px",
                                                          flexShrink: 0,
                                                          paddingRight: 20,
                                                          display: "flex",
                                                          flexDirection: "column",
                                                          justifyContent: "center",
                                                          gap: 6,
                                                        }}
                                                      >
                                                        {/* Row 1: drag handle + name */}
                                                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                                          <div
                                                            {...provided.dragHandleProps}
                                                            style={{ cursor: "grab", color: "var(--text-muted)", display: "flex", alignItems: "center", flexShrink: 0 }}
                                                          >
                                                            <GripVertical size={16} />
                                                          </div>
                                                          <div className="habit-name-wrap">
                                                            <span
                                                              className="habit-name"
                                                              style={{
                                                                fontSize: 15,
                                                                color: "var(--text-main)",
                                                                fontWeight: 500,
                                                                letterSpacing: "0.01em",
                                                                display: "block",
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                transition: "color 0.18s",
                                                                minWidth: 0,
                                                              }}
                                                            >
                                                              {habit.name}
                                                            </span>
                                                            <div className="habit-name-tip">{habit.name}</div>
                                                          </div>
                                                        </div>

                                                        {/* Row 2: stats + action buttons inline */}
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 28 }}>
                                                          {/* Stats */}
                                                          <div className="habit-stats" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                            <span
                                                              className={streak > 0 ? "stat-text-active" : "stat-text"}
                                                              style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 5,
                                                                fontSize: 11,
                                                                color: streak > 0 ? "#999" : "#555",
                                                                fontFamily: "var(--font-mono), monospace",
                                                              }}
                                                            >
                                                              <IconFire size={12} color={streak > 0 ? "var(--accent)" : "currentColor"} />
                                                              <span style={{ opacity: streak > 0 ? 1 : 0.7 }}>{streak}d</span>
                                                            </span>
                                                            <span
                                                              className="stat-text"
                                                              style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 5,
                                                                fontSize: 11,
                                                                fontFamily: "var(--font-mono), monospace",
                                                                color: pctColor,
                                                              }}
                                                            >
                                                              <IconClock size={12} color={pctColor} />
                                                              {pct}%
                                                            </span>
                                                          </div>

                                                          {/* Action buttons — immediately right of stats */}
                                                          <div style={{ display: "flex", gap: 1 }}>
                                                            <button
                                                              className={`cal-btn${expandedCalendar === habit.id ? " active" : ""}`}
                                                              onClick={() => setExpandedCalendar(expandedCalendar === habit.id ? null : habit.id)}
                                                              title="View Calendar"
                                                            >
                                                              <Calendar size={13} color="currentColor" />
                                                            </button>
                                                            <button
                                                              className="del-btn"
                                                              onClick={() => removeHabit(habit.id)}
                                                              title="Delete habit"
                                                            >
                                                              <Trash2 size={13} color="currentColor" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </div>

                                                      {/* Pill track */}
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          gap: PILL_GAP,
                                                          alignItems: "flex-end",
                                                          height: PILL_H,
                                                          flex: 1,
                                                          minWidth: 0,
                                                        }}
                                                      >
                                                        <AnimatePresence>
                                                          {visibleDays.map((d, di) => {
                                                            const idx        = d - 1;
                                                            const status     = habit.days[idx];
                                                            const isToday    = isCurrent && d === today;
                                                            const isFuture   = isFutureMonth || (isCurrent && d > today);
                                                            const isPulsing  = pulsingCell === `${habit.id}-${idx}`;
                                                            const dateObj    = new Date(year, month, d);
                                                            const dayName    = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                                                            const isMissed   = status === STATUS.MISSED;
                                                            const dominoDelay = di * 0.022;

                                                            return (
                                                              <motion.div
                                                                key={d}
                                                                className="pill-container"
                                                                style={{
                                                                  position: "relative",
                                                                  flexShrink: 0,
                                                                  height: PILL_H,
                                                                  display: "flex",
                                                                  alignItems: "flex-end",
                                                                  transformOrigin: "bottom",
                                                                }}
                                                                initial={{ width: 0, opacity: 0, y: 10, scaleY: 0.4 }}
                                                                animate={{ width: PILL_W, opacity: 1, y: 0, scaleY: 1 }}
                                                                exit={{
                                                                  width: 0, opacity: 0, y: 10, scaleY: 0.4,
                                                                  transition: { duration: 0.14, delay: (visibleDays.length - 1 - di) * 0.012 },
                                                                }}
                                                                transition={{
                                                                  width:   { duration: 0.18, delay: dominoDelay, ease: [0.22, 1, 0.36, 1] },
                                                                  opacity: { duration: 0.18, delay: dominoDelay },
                                                                  y:       { type: "spring", stiffness: 520, damping: 30, delay: dominoDelay },
                                                                  scaleY:  { type: "spring", stiffness: 520, damping: 30, delay: dominoDelay },
                                                                }}
                                                              >
                                                                {!isFuture && (
                                                                  <div className="tooltip">
                                                                    {dayName}, {MONTHS[month].substring(0, 3)} {d} •{" "}
                                                                    <span
                                                                      style={{
                                                                        color: S[status].border,
                                                                        fontWeight: 600,
                                                                      }}
                                                                    >
                                                                      {S[status].label}
                                                                    </span>
                                                                  </div>
                                                                )}

                                                                <motion.div
                                                                  className={!isFuture ? "pill" : ""}
                                                                  onClick={() => !isFuture && cycleStatus(habit.id, idx, false, true)}
                                                                  onTouchEnd={(e) => {
                                                                    if (isFuture) return;
                                                                    e.preventDefault();
                                                                    cycleStatus(habit.id, idx, false, true);
                                                                  }}
                                                                  onContextMenu={(e) => { e.preventDefault(); !isFuture && cycleStatus(habit.id, idx, true, true); }}
                                                                  onMouseEnter={() => { if (!isFuture) hoveredCellRef.current = { hid: habit.id, idx }; }}
                                                                  onMouseLeave={() => { hoveredCellRef.current = null; }}
                                                                  initial={false}
                                                                  animate={{
                                                                    height: PILL_H,
                                                                    backgroundColor: isFuture ? "transparent" : isMissed ? "var(--status-missed)" : "var(--pill-none)",
                                                                    borderColor: isFuture ? "var(--border-main)" : isMissed ? "var(--status-missed)" : "var(--pill-none-border)",
                                                                    scale: isPulsing ? 1.15 : 1,
                                                                    filter: isPulsing ? "brightness(1.5)" : "brightness(1)",
                                                                    boxShadow: isToday && !isFuture ? "0 0 0 2px #c9a227" : "none",
                                                                    opacity: isFuture ? 0.5 : 1,
                                                                  }}
                                                                  transition={{
                                                                    height:          { duration: 0.2, ease: "easeOut" },
                                                                    backgroundColor: { duration: 0.2 },
                                                                    borderColor:     { duration: 0.2 },
                                                                    scale:           { type: "spring", stiffness: 400, damping: 15 },
                                                                    filter:          { duration: 0.2 },
                                                                    boxShadow:       { duration: 0.2 },
                                                                  }}
                                                                  style={{
                                                                    width: PILL_W,
                                                                    borderRadius: 8,
                                                                    borderWidth: 1,
                                                                    borderStyle: "solid",
                                                                    cursor: isFuture ? "default" : "pointer",
                                                                    outline: "none",
                                                                    flexShrink: 0,
                                                                    overflow: "hidden",
                                                                    position: "relative",
                                                                  }}
                                                                >
                                                                  {status !== STATUS.NONE && status !== STATUS.MISSED && !isFuture && (
                                                                    <motion.div
                                                                      initial={false}
                                                                      animate={{ height: status === STATUS.DONE ? "100%" : "50%" }}
                                                                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                      style={{
                                                                        position: "absolute",
                                                                        bottom: 0, left: 0, right: 0,
                                                                        background: status === STATUS.DONE ? "var(--status-done)" : "var(--status-partial)",
                                                                        boxShadow: status === STATUS.DONE ? "0 0 10px var(--status-done-glow)" : "0 0 10px var(--status-partial-glow)",
                                                                      }}
                                                                    />
                                                                  )}
                                                                </motion.div>
                                                              </motion.div>
                                                            );
                                                          })}
                                                        </AnimatePresence>
                                                      </div>
                                                    </div>

                                                    {/* Heatmap calendar */}
                                                    <AnimatePresence>
                                                      {expandedCalendar === habit.id && (
                                                        <HeatmapCalendar
                                                          habitId={habit.id}
                                                          user={user}
                                                          supabase={supabaseRef.current}
                                                          heatmapLogs={heatmapLogs}
                                                          setHeatmapLogs={setHeatmapLogs}
                                                        />
                                                      )}
                                                    </AnimatePresence>
                                                  </div>
                                                )}
                                              </Draggable>
                                            );
                                          })}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Add habit input                                                     */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            marginTop: 28,
            animation: "fadeUp 0.45s 0.36s ease both",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div className={`add-wrap${inputFocused ? " focused" : ""}`}>
            <input
              className="add-input"
              placeholder="Cultivate a new habit..."
              value={newHabit}
              maxLength={MAX_HABIT_NAME_LENGTH}
              onChange={(e) => setHabitNameWithLimit(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter") addHabit(); }}
            />
            <input
              className="add-input add-input-cat"
              placeholder="Category (optional)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter") addHabit(); }}
            />
            <button className="add-btn" onClick={addHabit} title="Add habit" style={{ marginLeft: 8 }}>
              <Plus size={18} color="#0a0a0a" />
            </button>
          </div>

          {showHabitNameCounter && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8, paddingLeft: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: habitNameCount === MAX_HABIT_NAME_LENGTH ? "var(--accent)" : "var(--text-muted)",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  {habitNameCount}/{MAX_HABIT_NAME_LENGTH}
                </span>
              </div>
              <div style={{ width: isMobile ? 140 : 170, flexShrink: 0 }} aria-hidden="true" />
              <div style={{ width: 46, flexShrink: 0 }} aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Delete category confirmation modal                                   */}
      {/* -------------------------------------------------------------------- */}
      <DeleteCategoryModal
        categoryToDelete={categoryToDelete}
        habitCount={categoryToDelete ? (groupedHabits[categoryToDelete]?.length ?? 0) : 0}
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={executeDeleteCategory}
      />
    </div>
  );
}
