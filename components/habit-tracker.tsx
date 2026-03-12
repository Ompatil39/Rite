"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import type { DropResult } from "@hello-pangea/dnd";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

import { MONTHS, STATUS, S } from "./constants";
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
  const cycleRef = useRef<any>(null);
  const supabaseRef    = useRef(createClient());
  const habitsCacheRef = useRef<Map<string, Habit[]>>(new Map());
  const activeHabitsKeyRef = useRef<string | null>(null);
  const viewKeyRef = useRef<string | null>(null);

  const dim = getDaysInMonth(month, year);
  const dayNums = Array.from({ length: dim }, (_, i) => i + 1);
  const today = now.getDate();
  const isCurrent = month === now.getMonth() && year === now.getFullYear();
  const isFutureMonth =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth());

  const currentWeekStart = today - (now.getDay() === 0 ? 6 : now.getDay() - 1);
  const weekStart = isCurrent ? Math.max(1, currentWeekStart) : 1;
  const weekEnd = Math.min(dim, weekStart + 6);
  const visibleDays = isMonthView
    ? dayNums
    : dayNums.filter((d) => d >= weekStart && d <= weekEnd);

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
  function cycleStatus(
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
        }

        return { ...h, days };
      }),
    );
    if (pulse) triggerPulse(hid, idx);
  }

  useEffect(() => {
    cycleRef.current = cycleStatus;
  });

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
        .select("id, name, category, sort_order")
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

  // Scroll-wheel cycling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (hoveredCellRef.current) {
        e.preventDefault();
        e.stopPropagation();
        cycleRef.current(
          hoveredCellRef.current.hid,
          hoveredCellRef.current.idx,
          e.deltaY < 0,
          true,
        );
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

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

      const tempId: string = `temp-${crypto.randomUUID()}`;
      const sortOrder = habits.length;
      const optimistic: Habit = {
        id: tempId,
        name,
        category,
        days: Array(31).fill(STATUS.NONE),
        sort_order: sortOrder,
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
  async function removeHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setExpandedCalendar((cur) => (cur === id ? null : cur));
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
  };

  const confirmDeleteCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryToDelete(cat);
  };

  const executeDeleteCategory = async () => {
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
  };

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
    habits.forEach((habit) => {
      stats[habit.id] = {
        streak: getStreak(habit.days, dim),
        pct: getPct(habit.days, dim),
      };
    });
    return stats;
  }, [habits, dim]);

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

  // -------------------------------------------------------------------------
  // Memoize static styles so the string isn't recreated on every render
  // NOTE: must be above all early returns to satisfy Rules of Hooks
  // -------------------------------------------------------------------------
  const cssStyles = useMemo(
    () => `
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
  `,
    [],
  );

  // -------------------------------------------------------------------------
  // Early returns (placed after all hooks to satisfy Rules of Hooks)
  // -------------------------------------------------------------------------
  if (!mounted) return null;
  if (loading) return <LoadingSkeleton />;

  if (habits.length === 0) {
    return (
      <EmptyState
        isMobile={isMobile}
        onAdd={insertHabit}
        onAddSuggested={insertHabit}
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
            <button
              className="nav-btn"
              onClick={prevMonth}
              style={{ width: 28, height: 28 }}
            >
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
            <button
              className="nav-btn"
              onClick={nextMonth}
              style={{ width: 28, height: 28 }}
            >
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
                <>
                  <ChevronRight size={14} /> Weekly
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Monthly
                </>
              )}
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Legend                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="legend-container"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 24,
            marginBottom: 20,
          }}
        >
          {[STATUS.DONE, STATUS.PARTIAL, STATUS.MISSED].map((s) => (
            <div
              key={s}
              style={{ display: "flex", alignItems: "center", gap: 7 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: S[s].bg,
                  boxShadow: S[s].glow,
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
          groupedHabits={groupedHabits}
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
          removeHabit={removeHabit}
          cycleStatus={cycleStatus}
          pulsingCell={pulsingCell}
          user={user}
          supabase={supabaseRef.current}
          hoveredCellRef={hoveredCellRef}
        />
        {/* ------------------------------------------------------------------ */}

        {/* Add habit input                                                     */}
        {/* ------------------------------------------------------------------ */}
        <HabitComposer isMobile={isMobile} onAdd={insertHabit} />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Delete category confirmation modal                                   */}
      {/* -------------------------------------------------------------------- */}
      <DeleteCategoryModal
        categoryToDelete={categoryToDelete}
        habitCount={
          categoryToDelete ? (groupedHabits[categoryToDelete]?.length ?? 0) : 0
        }
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={executeDeleteCategory}
      />
    </div>
  );
}















