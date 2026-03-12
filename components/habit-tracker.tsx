'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trash2, Plus, Flame, CheckCircle2, ChevronDown, Edit2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS = { NONE: 0, DONE: 1, PARTIAL: 2, MISSED: 3 };

const S = {
  [STATUS.NONE]:    { bg: "var(--pill-none)", border: "var(--pill-none-border)", glow: "none", label: "None" },
  [STATUS.DONE]:    { bg: "var(--status-done)", border: "var(--status-done)", glow: "0 0 10px var(--status-done-glow)", label: "Done" },
  [STATUS.PARTIAL]: { bg: "var(--status-partial)", border: "var(--status-partial)", glow: "0 0 10px var(--status-partial-glow)", label: "Partial" },
  [STATUS.MISSED]:  { bg: "var(--status-missed)", border: "var(--status-missed)", glow: "0 0 10px var(--status-missed-glow)", label: "Missed" },
};

// Icon helpers
const IconFire = ({ size = 14, color = "currentColor" }) => (
  <Flame size={size} color={color} strokeWidth={1.8} />
);

const IconClock = ({ size = 14, color = "currentColor" }) => (
  <CheckCircle2 size={size} color={color} strokeWidth={1.8} />
);
function getDaysInMonth(m: number, y: number) { return new Date(y, m + 1, 0).getDate(); }

function getStreak(days: number[], dim: number) {
  let s = 0;
  for (let d = dim - 1; d >= 0; d--) { if (days[d] === STATUS.DONE) s++; else break; }
  return s;
}

function getPct(days: number[], dim: number) {
  let done = 0, total = 0;
  for (let d = 0; d < dim; d++) { if (days[d] !== STATUS.NONE) { total++; if (days[d] === STATUS.DONE) done++; } }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// Habit type used throughout the component
type Habit = {
  name: string;
  category: string;
  days: number[];
  id: string; // UUID from Supabase
  sort_order: number;
};

// Heatmap calendar
function HeatmapCalendar({
  habitId,
  user,
  supabase,
  heatmapLogs,
  setHeatmapLogs,
}: {
  habitId: string;
  user: User | null;
  supabase: ReturnType<typeof createClient>;
  heatmapLogs: Record<string, Record<string, number>>;
  setHeatmapLogs: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || heatmapLogs[habitId]) {
      setLoading(false);
      return;
    }

    const fetchYearData = async () => {
      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const startDate = `${yearAgo.getFullYear()}-${String(yearAgo.getMonth() + 1).padStart(2, '0')}-${String(yearAgo.getDate()).padStart(2, '0')}`;
      const endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data } = await supabase
        .from('habit_logs')
        .select('date, status')
        .eq('habit_id', habitId)
        .gte('date', startDate)
        .lte('date', endDate);

      const dateMap: Record<string, number> = {};
      (data || []).forEach((log: any) => {
        dateMap[log.date] = log.status;
      });

      setHeatmapLogs(prev => ({ ...prev, [habitId]: dateMap }));
      setLoading(false);
    };

    fetchYearData();
  }, [habitId, user, supabase, heatmapLogs, setHeatmapLogs]);

  const logs = heatmapLogs[habitId] || {};

  // Build 52 weeks of data
  const weeks: { date: Date; status: number }[][] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364); // go back ~52 weeks
  // Align to Sunday
  start.setDate(start.getDate() - start.getDay());

  let current = new Date(start);
  let week: { date: Date; status: number }[] = [];

  while (current <= today) {
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    week.push({ date: new Date(current), status: logs[dateStr] || 0 });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  const statusColors: Record<number, string> = {
    0: 'var(--pill-none)',
    1: 'var(--status-done)',
    2: 'var(--status-partial)',
    3: 'var(--status-missed)',
  };

  const monthLabels: string[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = w[0]?.date.getMonth();
    if (m !== undefined && m !== lastMonth) {
      monthLabels.push(MONTHS[m].slice(0, 3));
      lastMonth = m;
    } else {
      monthLabels.push('');
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden', marginTop: 8 }}
    >
      <div style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border-main)',
        borderRadius: 10,
        padding: '12px 16px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
        ) : (
          <>
            {/* Month labels */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 4, paddingLeft: 0 }}>
              {monthLabels.map((label, i) => (
                <div key={i} style={{ width: 10, fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  {label}
                </div>
              ))}
            </div>
            {/* Grid: 7 rows (days) x N columns (weeks) */}
            <div style={{ display: 'flex', gap: 2 }}>
              {weeks.map((w, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {w.map((d, di) => (
                    <div
                      key={di}
                      title={`${d.date.toLocaleDateString()}: ${S[d.status]?.label || 'None'}`}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: statusColors[d.status] || statusColors[0],
                        opacity: d.date > today ? 0.2 : 1,
                        transition: 'background 0.15s',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Less</span>
              {[0, 2, 1].map(s => (
                <div key={s} style={{ width: 10, height: 10, borderRadius: 2, background: statusColors[s] }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>More</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function App() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [pulsingCell, setPulsingCell] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedCalendar, setExpandedCalendar] = useState<string | null>(null);
  const [openHabitMenu, setOpenHabitMenu] = useState<string | null>(null);
  const [isMonthView, setIsMonthView] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [touchY, setTouchY] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [heatmapLogs, setHeatmapLogs] = useState<Record<string, Record<string, number>>>({});
  const hoveredCellRef = useRef<{hid: string, idx: number} | null>(null);
  const cycleRef = useRef<any>(null);
  const supabaseRef = useRef(createClient());

  const habitNameCount = newHabit.length;
  const showHabitNameCounter = inputFocused || habitNameCount > 0;
  const setHabitNameWithLimit = (value: string) => setNewHabit(clampHabitName(value));

  const dim = getDaysInMonth(month, year);
  const dayNums = Array.from({ length: dim }, (_, i) => i + 1);
  const today = now.getDate();
  const isCurrent = month === now.getMonth() && year === now.getFullYear();
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const currentWeekStart = today - (now.getDay() === 0 ? 6 : now.getDay() - 1);
  const weekStart = isCurrent ? Math.max(1, currentWeekStart) : 1;
  const weekEnd = Math.min(dim, weekStart + 6);
  const visibleDays = isMonthView ? dayNums : dayNums.filter(d => d >= weekStart && d <= weekEnd);

  // pill width auto-fits 31 days into the available track
  const PILL_W = 26;
  const PILL_H = 26;
  const PILL_GAP = 4;
  const MAX_HABIT_NAME_LENGTH = 50;

  const clampHabitName = (value: string) => value.slice(0, MAX_HABIT_NAME_LENGTH);

  const triggerPulse = (hid: string, idx: number) => {
    const key = `${hid}-${idx}`;
    setPulsingCell(key);
    setTimeout(() => setPulsingCell(k => k === key ? null : k), 220);
  };

  // Haptic feedback with status-aware vibration patterns
  function hapticFeedback(nextStatus: number) {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    switch (nextStatus) {
      case STATUS.DONE:    navigator.vibrate(40); break;           // short crisp tap = Done
      case STATUS.PARTIAL: navigator.vibrate([25, 30, 25]); break; // double tap = Partial
      case STATUS.MISSED:  navigator.vibrate(80); break;           // longer pulse = Missed
      case STATUS.NONE:    navigator.vibrate(10); break;           // barely-there = reset
    }
  }

  function cycleStatus(hid: string, idx: number, reverse = false, pulse = false) {
    setHabits(prev => prev.map(h => {
      if (h.id !== hid) return h;
      const days = [...h.days];
      const cur = days[idx];
      const next = reverse
        ? (cur === STATUS.NONE ? STATUS.MISSED : cur === STATUS.MISSED ? STATUS.PARTIAL : cur === STATUS.PARTIAL ? STATUS.DONE : STATUS.NONE)
        : (cur === STATUS.NONE ? STATUS.DONE   : cur === STATUS.DONE   ? STATUS.PARTIAL : cur === STATUS.PARTIAL ? STATUS.MISSED : STATUS.NONE);
      days[idx] = next;
      hapticFeedback(next);

      // Persist to Supabase
      if (user) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`;
        if (next === STATUS.NONE) {
          supabaseRef.current.from('habit_logs').delete().eq('habit_id', hid).eq('date', dateStr).then();
        } else {
          supabaseRef.current.from('habit_logs').upsert(
            { habit_id: hid, date: dateStr, status: next },
            { onConflict: 'habit_id,date' }
          ).then();
        }
      }

      return { ...h, days };
    }));
    if (pulse) triggerPulse(hid, idx);
  }

  useEffect(() => { cycleRef.current = cycleStatus; });


  const loadHabitsFromDB = useCallback(async (userId: string, m: number, y: number) => {
    const supabase = supabaseRef.current;
    const daysInMonth = getDaysInMonth(m, y);

    // Fetch habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (!habitsData || habitsData.length === 0) {
      setHabits([]);
      return;
    }

    // Fetch logs for this month
    const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const habitIds = habitsData.map((h: any) => h.id);

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .in('habit_id', habitIds)
      .gte('date', startDate)
      .lte('date', endDate);

    // Build logs lookup: { habitId: { dayIndex: status } }
    const logsMap: Record<string, Record<number, number>> = {};
    (logsData || []).forEach((log: any) => {
      if (!logsMap[log.habit_id]) logsMap[log.habit_id] = {};
      const day = new Date(log.date + 'T00:00:00').getDate(); // parse date portion
      logsMap[log.habit_id][day - 1] = log.status;
    });

    // Assemble habits with days array
    const assembled: Habit[] = habitsData.map((h: any) => {
      const days = Array(31).fill(STATUS.NONE);
      const habitLogs = logsMap[h.id] || {};
      Object.entries(habitLogs).forEach(([idx, status]) => {
        days[Number(idx)] = status;
      });
      return {
        id: h.id,
        name: h.name,
        category: h.category || 'Uncategorized',
        sort_order: h.sort_order,
        days,
      };
    });

    setHabits(assembled);
  }, []);

  // Re-load when month/year changes (for logged-in users)
  useEffect(() => {
    if (user) {
      loadHabitsFromDB(user.id, month, year);
    }
  }, [month, year, user, loadHabitsFromDB]);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsMonthView(true);
    };
    checkMobile();
    if (window.innerWidth <= 768) setIsMonthView(false);
    window.addEventListener("resize", checkMobile);

    // Auth session check
    const supabase = supabaseRef.current;
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) {
        setUser(u);
        await loadHabitsFromDB(u.id, now.getMonth(), now.getFullYear());
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadHabitsFromDB(session.user.id, month, year);
      } else {
        setUser(null);
        setHabits([]);
      }
    });

    return () => {
      window.removeEventListener("resize", checkMobile);
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (!openHabitMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-habit-menu-root="true"]')) {
        setOpenHabitMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenHabitMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openHabitMenu]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  async function addHabit() {
    const name = clampHabitName(newHabit.trim());
    if (!name) return;
    const category = newCategory.trim() || "Uncategorized";

    if (user) {
      const { data, error } = await supabaseRef.current.from('habits').insert({
        user_id: user.id,
        name,
        category,
        sort_order: habits.length,
      }).select().single();

      if (!error && data) {
        setHabits(prev => [...prev, { id: data.id, name: data.name, category: data.category, sort_order: data.sort_order, days: Array(31).fill(STATUS.NONE) }]);
      }
    } else {
      // Anonymous fallback (local only)
      setHabits(prev => [...prev, { name, category, days: Array(31).fill(STATUS.NONE), id: crypto.randomUUID(), sort_order: prev.length }]);
    }
    setNewHabit("");
    setNewCategory("");
    setOpenHabitMenu(null);
  }

  async function removeHabit(id: string) {
    setHabits(prev => prev.filter(h => h.id !== id));
    setExpandedCalendar(current => current === id ? null : current);
    setOpenHabitMenu(current => current === id ? null : current);
    if (user) {
      await supabaseRef.current.from('habits').delete().eq('id', id);
    }
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const startEditCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setEditCategoryName(cat);
  };

  const saveCategoryEdit = async (oldCat: string) => {
    const newCat = editCategoryName.trim();
    if (newCat && newCat !== oldCat) {
      setHabits(prev => prev.map(h => 
        (h.category || "Uncategorized") === oldCat 
          ? { ...h, category: newCat } 
          : h
      ));
      // Persist category rename
      if (user) {
        const affectedIds = habits.filter(h => (h.category || "Uncategorized") === oldCat).map(h => h.id);
        if (affectedIds.length > 0) {
          await supabaseRef.current.from('habits').update({ category: newCat }).in('id', affectedIds);
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
    const affectedIds = habits.filter(h => (h.category || "Uncategorized") === categoryToDelete).map(h => h.id);
    setHabits(prev => prev.map(h => 
      (h.category || "Uncategorized") === categoryToDelete 
        ? { ...h, category: "Uncategorized" } 
        : h
    ));
    if (user && affectedIds.length > 0) {
      await supabaseRef.current.from('habits').update({ category: 'Uncategorized' }).in('id', affectedIds);
    }
    setCategoryToDelete(null);
  };

  const groupedHabits = useMemo(() => {
    return habits.reduce((acc, habit) => {
      const cat = habit.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(habit);
      return acc;
    }, {} as Record<string, typeof habits>);
  }, [habits]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategoryOrder(prev => {
      const currentCats = Object.keys(groupedHabits);
      const newCats = currentCats.filter(c => !prev.includes(c));
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
    const sorted = categoryOrder.filter(c => groupedHabits[c]);
    Object.keys(groupedHabits).forEach(c => {
      if (!sorted.includes(c)) sorted.push(c);
    });
    return sorted;
  }, [categoryOrder, groupedHabits]);

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
      const sourceCat = source.droppableId;
      const destCat = destination.droppableId;

      if (sourceCat === destCat) {
        const catHabits = groupedHabits[sourceCat];
        const newHabits = Array.from(catHabits);
        const [removed] = newHabits.splice(source.index, 1);
        newHabits.splice(destination.index, 0, removed);

        setHabits(prev => {
          const otherHabits = prev.filter(h => (h.category || "Uncategorized") !== sourceCat);
          return [...otherHabits, ...newHabits];
        });
      } else {
        const sourceHabits = Array.from(groupedHabits[sourceCat]);
        const destHabits = Array.from(groupedHabits[destCat] || []);
        const [removed] = sourceHabits.splice(source.index, 1);
        removed.category = destCat === "Uncategorized" ? "" : destCat;
        destHabits.splice(destination.index, 0, removed);

        setHabits(prev => {
          const otherHabits = prev.filter(h => {
            const c = h.category || "Uncategorized";
            return c !== sourceCat && c !== destCat;
          });
          return [...otherHabits, ...sourceHabits, ...destHabits];
        });
      }
    }
  };

  const suggestedHabits = [
    { name: "Drink 8 glasses of water", category: "Health" },
    { name: "Read for 20 minutes", category: "Growth" },
    { name: "Exercise for 30 minutes", category: "Health" },
    { name: "Meditate for 10 minutes", category: "Mindfulness" },
    { name: "Journal before bed", category: "Mindfulness" },
    { name: "No social media before noon", category: "Focus" },
  ];

  const addSuggestedHabit = async (name: string, category: string) => {
    const clampedName = clampHabitName(name.trim());
    if (!clampedName) return;

    if (user) {
      const { data, error } = await supabaseRef.current.from('habits').insert({
        user_id: user.id,
        name: clampedName,
        category,
        sort_order: habits.length,
      }).select().single();
      if (!error && data) {
        setHabits(prev => [...prev, { id: data.id, name: data.name, category: data.category, sort_order: data.sort_order, days: Array(31).fill(STATUS.NONE) }]);
      }
    } else {
      setHabits(prev => [...prev, { name: clampedName, category, days: Array(31).fill(STATUS.NONE), id: crypto.randomUUID(), sort_order: prev.length }]);
    }
  };

  if (!mounted) return null;


  if (loading) {
    return (
      <div style={{ background: "transparent", color: "inherit", fontFamily: "var(--font-body), sans-serif", overflowX: "hidden" }}>
        <style>{`
          @keyframes shimmer {
            0% { background-position: -400px 0; }
            100% { background-position: 400px 0; }
          }
          .skeleton-line {
            background: linear-gradient(90deg, var(--bg-surface) 25%, var(--border-main) 50%, var(--bg-surface) 75%);
            background-size: 800px 100%;
            animation: shimmer 1.6s ease-in-out infinite;
            border-radius: 8px;
          }
        `}</style>
        <div className="page-container" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 88px" }}>
          {/* Month nav skeleton */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
            <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            <div className="skeleton-line" style={{ width: 160, height: 20 }} />
            <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%" }} />
          </div>
          {/* Habit card skeletons */}
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-main)",
                borderRadius: 14,
                padding: "16px 18px",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="skeleton-line" style={{ width: 120 + i * 20, height: 16 }} />
                <div className="skeleton-line" style={{ width: 60, height: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: 7 }, (_, j) => (
                  <div key={j} className="skeleton-line" style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }


  if (habits.length === 0) {
    return (
      <div style={{ background: "transparent", color: "inherit", fontFamily: "var(--font-body), sans-serif", overflowX: "hidden" }}>
        <style>{`
          @keyframes emptyFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          .empty-suggest {
            background: none;
            border: 1px solid var(--border-main);
            border-radius: 10px;
            padding: 12px 18px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 14px;
            font-family: var(--font-body), sans-serif;
            color: var(--text-main);
            width: 100%;
          }
          .empty-suggest:hover {
            border-color: var(--accent);
            background: var(--bg-surface);
          }
          .empty-suggest:active { transform: scale(0.98); }
          .empty-suggest .cat-label {
            font-size: 11px;
            font-family: var(--font-mono), monospace;
            color: var(--text-muted);
            letter-spacing: 0.06em;
          }
          :root.light .empty-suggest:hover { background: #ffffff; }

          /* Add-habit pill (empty state) */
          .add-wrap {
            display: flex;
            align-items: center;
            background: #121212;
            border: 1px solid #222;
            border-radius: 999px;
            padding: 6px 6px 6px 20px;
            transition: border-color 0.2s, box-shadow 0.2s;
            width: 100%;
          }
          .add-wrap.focused { border-color: var(--accent); }

          .add-input {
            background: transparent;
            border: none;
            color: var(--text-main);
            font-size: 14px;
            font-family: var(--font-body), sans-serif;
            outline: none;
            flex: 1;
            min-width: 0;
          }
          .add-input::placeholder { color: var(--text-muted); opacity: 0.5; }

          .add-input-cat {
            flex: none;
            width: 170px;
            border-left: 1px solid var(--border-main);
            padding-left: 16px;
            margin-left: 8px;
          }

          .add-btn {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--accent);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow:
              0 10px 22px rgba(0,0,0,0.35),
              inset 0 1px 0 rgba(255,255,255,0.28);
            transition: box-shadow 0.15s, transform 0.12s;
            flex-shrink: 0;
          }
          .add-btn:hover { box-shadow:
              0 10px 22px rgba(0,0,0,0.35),
              inset 0 1px 0 rgba(255,255,255,0.28); }
          .add-btn:active {
            transform: scale(0.98);
            box-shadow:
              0 6px 14px rgba(0,0,0,0.32),
              inset 0 1px 0 rgba(255,255,255,0.18);
          }

          :root.light .add-wrap { background: #ffffff; border-color: var(--border-main); box-shadow: 0 4px 16px rgba(0,0,0,0.03); }
          :root.light .add-input { color: #1a1a18; }
          :root.light .add-input::placeholder { color: #888; }
          :root.light .add-input-cat { border-left-color: var(--border-main); }

          @media (max-width: 768px) {
            /* Keep it as a single pill with circular + (spec) */
            .add-wrap { padding-left: 14px; }
            .add-input-cat { width: 140px; }
          }
        `}</style>

        <div className="page-container" style={{ maxWidth: 480, margin: "0 auto", padding: "0 24px 88px" }}>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ textAlign: "center", marginBottom: 40 }}
          >
            <p style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}>
              No habits yet. Add one below or pick a suggestion.
            </p>
          </motion.div>

          {/* Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}
          >
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}>
              Suggestions
            </span>
            {suggestedHabits.map((h) => (
              <button
                key={h.name}
                className="empty-suggest"
                onClick={() => addSuggestedHabit(h.name, h.category)}
              >
                <span>{h.name}</span>
                <span className="cat-label">{h.category}</span>
              </button>
            ))}
          </motion.div>

          {/* Add your own */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div>
              <div className={`add-wrap${inputFocused ? " focused" : ""}`}>
                <input
                  className="add-input"
                  placeholder="Cultivate a new habit..."
                  value={newHabit}
                  maxLength={MAX_HABIT_NAME_LENGTH}
                  onChange={e => setHabitNameWithLimit(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
                />
                <input
                  className="add-input add-input-cat"
                  placeholder="Category"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
                />
                <button className="add-btn" onClick={addHabit} title="Add habit" style={{ marginLeft: 8 }}>
                  <Plus size={18} color="#0a0a0a" />
                </button>
              </div>
              {showHabitNameCounter && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8, paddingLeft: 20 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, letterSpacing: "0.08em", color: habitNameCount === MAX_HABIT_NAME_LENGTH ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                      {habitNameCount}/{MAX_HABIT_NAME_LENGTH}
                    </span>
                  </div>
                  <div style={{ width: isMobile ? 140 : 170, flexShrink: 0 }} aria-hidden="true" />
                  <div style={{ width: 46, flexShrink: 0 }} aria-hidden="true" />
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "transparent", color: "inherit", fontFamily: "var(--font-body), sans-serif", overflowX: "hidden" }}>
      <style>{`
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
        :root.light .cat-header-group { color: #c9a227 !important; font-weight: 600 !important; }
        :root.light .cat-header-group:hover { color: #b48b15 !important; }
        :root.light .cat-action-btn { color: #5c5c58 !important; }
        :root.light .del-btn { color: #a0a09c !important; }
        :root.light .del-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.1) !important; }
        :root.light .calendar-heatmap { border-top-color: var(--border-main) !important; }
        :root.light .calendar-heatmap-cell-none { background: var(--heatmap-none) !important; }
        :root.light .month-nav-container { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 0.25rem 1rem rgba(0,0,0,0.03) !important; }
        :root.light .month-nav-text { color: #5c5c58 !important; }
        :root.light .delete-modal { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 1.25rem 2.5rem rgba(0,0,0,0.08) !important; }
        :root.light .delete-modal h3, :root.light .delete-modal strong { color: #1a1a18 !important; }
        :root.light .delete-modal p { color: #5c5c58 !important; }
        :root.light .day-header { color: #8a8a86 !important; }
        :root.light .day-header.is-today { color: #c9a227 !important; }
        :root.light .stat-text { color: #5c5c58 !important; }
        :root.light .stat-text-active { color: #3a3a36 !important; }

        @media (max-width: 48rem) {
          .page-container { padding: 0 1rem 5.5rem !important; }
          .scroll-container { margin-left: -1rem !important; margin-right: -1rem !important; padding-left: 1rem !important; padding-right: 1rem !important; }
          .habit-left-panel { width: 100% !important; min-width: 0 !important; max-width: none !important; flex: 1 1 auto !important; padding-right: 0 !important; }
          .habit-name { font-size: 0.875rem !important; display: block !important; max-width: 100% !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; line-height: 1.2 !important; }
          .habit-card-main { gap: 0.625rem !important; }
          .habit-title-row { flex-wrap: wrap !important; gap: 0.5rem !important; }
          .habit-track-wrap { width: 100% !important; overflow-x: auto !important; }
          .habit-card { padding: 0.75rem !important; }
          .legend-container { justify-content: center !important; gap: 0.75rem !important; flex-wrap: wrap; }
          .add-wrap { width: 100%; max-width: none; padding-left: 0.875rem; }
          .add-input-cat { width: 8.75rem; }
          .month-nav-container { padding: 0.5rem 0.75rem !important; }
          .habit-stats { gap: 0.5rem !important; }
        }

        @keyframes fadeUp  { from { opacity:0; transform:translateY(1rem) } to { opacity:1; transform:translateY(0) } }
        @keyframes pillPop { 0%{transform:scale(1)} 45%{transform:scale(1.38);filter:brightness(1.8)} 100%{transform:scale(1)} }

        .card       { animation: fadeUp 0.45s ease both; }

        .pill {
          cursor: pointer;
          flex-shrink: 0;
          border-radius: 0.375rem;
        }
        .pill:hover  { filter: brightness(1.28) !important; }

        .habit-card {
          background: #121212;
          border: 1px solid #1c1c1c;
          border-radius: 0.875rem;
          transition: border-color 0.22s ease, box-shadow 0.22s ease;
          position: relative;
        }
        .habit-card:hover              { border-color: #282828; box-shadow: 0 0.375rem 2.5rem rgba(0,0,0,0.45); z-index: 50; }
        .habit-card:hover .del-btn     { opacity: 1 !important; }
        .habit-card:hover .habit-name  { color: #ececec !important; }
        .habit-card-main {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }
        .habit-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          width: 100%;
        }
        .habit-left-panel {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .habit-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
          flex: 1 1 auto;
        }
        .habit-name-wrap {
          position: relative;
          display: block;
          min-width: 0;
          cursor: default;
        }
        .habit-name-wrap:focus-visible {
          outline: none;
        }
        .habit-name-popover {
          position: absolute;
          left: 0;
          bottom: calc(100% + 0.625rem);
          max-width: min(26.25rem, 72vw);
          padding: 0.625rem 0.75rem;
          border-radius: 0.625rem;
          background: #161616;
          border: 1px solid #2a2a2a;
          box-shadow: 0 0.75rem 2rem rgba(0,0,0,0.42);
          color: var(--text-main);
          font-size: 0.8125rem;
          line-height: 1.4;
          white-space: normal;
          overflow-wrap: anywhere;
          opacity: 0;
          pointer-events: none;
          transform: translateY(0.25rem);
          transition: opacity 0.16s ease, transform 0.16s ease;
          z-index: 120;
        }
        .habit-name-wrap:hover .habit-name-popover,
        .habit-name-wrap:focus-within .habit-name-popover {
          opacity: 1;
          transform: translateY(0);
        }
        :root.light .habit-name-popover {
          background: #ffffff;
          border-color: var(--border-main);
          box-shadow: 0 0.75rem 1.875rem rgba(0,0,0,0.12);
          color: #1a1a18;
        }

        .habit-actions {
          position: relative;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .habit-track-wrap {
          width: 100%;
          min-width: 0;
          overflow-x: hidden;
          overflow-y: visible;
          padding-bottom: 0.125rem;
        }
        .habit-menu-btn {
          width: 1.875rem;
          height: 1.875rem;
          border-radius: 0.5rem;
          border: none;
          background: none;
          color: #565656;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          line-height: 1;
          transition: color 0.15s, background 0.15s;
        }
        .habit-card:hover .habit-menu-btn {
          color: #8a8a8a;
        }
        .habit-menu-btn:hover,
        .habit-menu-btn[aria-expanded="true"] {
          color: #ececec;
          background: rgba(255,255,255,0.06);
        }
        .habit-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 8.25rem;
          padding: 0.375rem;
          border-radius: 0.625rem;
          background: #161616;
          border: 1px solid #2a2a2a;
          box-shadow: 0 0.875rem 2rem rgba(0,0,0,0.42);
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          z-index: 140;
        }
        .habit-menu-item {
          width: 100%;
          background: none;
          border: none;
          color: var(--text-main);
          cursor: pointer;
          text-align: left;
          padding: 0.5rem 0.625rem;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          line-height: 1.35;
          transition: background 0.15s, color 0.15s;
        }
        .habit-menu-item:hover {
          background: rgba(255,255,255,0.06);
        }
        .habit-menu-item-danger {
          color: #f87171;
        }
        .habit-menu-item-danger:hover {
          background: rgba(239,68,68,0.12);
          color: #fca5a5;
        }
        :root.light .habit-menu {
          background: #ffffff;
          border-color: var(--border-main);
          box-shadow: 0 0.875rem 1.75rem rgba(0,0,0,0.12);
        }
        :root.light .habit-menu-btn {
          color: #74746e;
        }
        :root.light .habit-menu-btn:hover,
        :root.light .habit-menu-btn[aria-expanded="true"] {
          color: #1a1a18;
          background: rgba(201,162,39,0.08);
        }
        :root.light .habit-menu-item {
          color: #3a3a36;
        }
        :root.light .habit-menu-item:hover {
          background: rgba(201,162,39,0.08);
        }

        .del-btn {
          opacity: 0;
          background: none; border: none; cursor: pointer;
          color: #383838; line-height: 1;
          transition: opacity 0.15s, color 0.15s, background 0.15s;
          padding: 0.3125rem; border-radius: 0.375rem; display: flex; align-items: center;
          flex-shrink: 0;
        }
        .habit-card:hover .del-btn { opacity: 1; }
        .del-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.08) !important; }

        .nav-btn {
          background: none; border: 1px solid #252525;
          color: #666; cursor: pointer; width: 2rem; height: 2rem;
          border-radius: 0.5rem;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .nav-btn:hover { border-color: #c9a227; color: #c9a227; background: rgba(201,162,39,0.06); }

        .add-wrap {
          display: flex; align-items: center;
          background: #121212;
          border: 1px solid #222;
          border-radius: 62.4375rem;
          padding: 0.375rem 0.375rem 0.375rem 1.25rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          max-width: 35rem;
        }
        .add-wrap.focused { border-color: var(--accent); }

        .add-input {
          background: transparent; border: none;
          color: var(--text-main); font-size: 0.875rem; font-family: var(--font-body), sans-serif;
          outline: none; flex: 1; min-width: 0;
        }
        .add-input::placeholder { color: var(--text-muted); opacity: 0.5; }

        .add-input-cat {
          flex: none;
          width: 10.625rem;
          border-left: 1px solid var(--border-main);
          padding-left: 1rem;
          margin-left: 0.5rem;
        }

        .add-btn {
          width: 2.375rem; height: 2.375rem; border-radius: 50%;
          background: var(--accent); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow:
            0 0.625rem 1.375rem rgba(0,0,0,0.35),
            inset 0 0.0625rem 0 rgba(255,255,255,0.28);
          transition: box-shadow 0.15s, transform 0.12s;
          flex-shrink: 0;
        }
        .add-btn:hover  { box-shadow:
            0 0.625rem 1.375rem rgba(0,0,0,0.35),
            inset 0 0.0625rem 0 rgba(255,255,255,0.28); }
        .add-btn:active {
          transform: scale(0.98);
          box-shadow:
            0 0.375rem 0.875rem rgba(0,0,0,0.32),
            inset 0 0.0625rem 0 rgba(255,255,255,0.18);
        }

        .tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-0.25rem);
          background: var(--bg-surface);
          border: 1px solid var(--border-main);
          color: var(--text-main);
          padding: 0.375rem 0.625rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-family: var(--font-mono), monospace;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          z-index: 9999999;
          box-shadow: 0 0.25rem 0.75rem var(--shadow-alpha);
        }
        .pill-container:hover {
          z-index: 100;
        }
        .pill-container:hover .tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-0.5rem);
        }
        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 0.3125rem;
          border-style: solid;
          border-color: var(--border-main) transparent transparent transparent;
        }

        .cat-header-group:hover .cat-actions { opacity: 1 !important; }
        .cat-action-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.15s; padding: 0.25rem; border-radius: 0.25rem; }
        .cat-action-btn:hover { color: var(--accent); background: var(--status-done-glow); }
        .cat-action-btn.del:hover { color: var(--status-missed); background: var(--status-missed-glow); }

        .pct-ring {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        ::-webkit-scrollbar { height: 0.25rem; width: 0.25rem; background: var(--bg-base); }
        ::-webkit-scrollbar-thumb { background: var(--border-focus); border-radius: 0.25rem; }
      `}</style>

      <div className="page-container page-enter" style={{ maxWidth: 1340, margin: "0 auto", padding: "0px 36px 88px" }}>


        <div style={{ 
          display: "flex", 
          justifyContent: isMobile ? "center" : "flex-end", 
          alignItems: "center", 
          marginBottom: 32, 
          gap: 12,
          flexWrap: "wrap" 
        }}>
          {/* Month Navigator */}
          <div className="month-nav-container" style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10, 
            background: "var(--bg-surface)", 
            border: "1px solid var(--border-main)", 
            borderRadius: 12, 
            padding: "8px 12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <button className="nav-btn" onClick={prevMonth} style={{ width: 28, height: 28 }}><ChevronLeft size={14} /></button>
            <span className="month-nav-text" style={{ 
              fontFamily: "var(--font-mono), monospace", 
              fontSize: 11, 
              color: "var(--text-muted)", 
              letterSpacing: "0.1em", 
              minWidth: 100, 
              textAlign: "center",
              fontWeight: 600
            }}>
              {MONTHS[month].toUpperCase()} {year}
            </span>
            <button className="nav-btn" onClick={nextMonth} style={{ width: 28, height: 28 }}><ChevronRight size={14} /></button>
          </div>

          {/* Toggle Button - Only for Mobile */}
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              {isMonthView ? <><ChevronRight size={14} /> Weekly</> : <><ChevronDown size={14} /> Monthly</>}
            </button>
          )}
        </div>


        <div className="legend-container" style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 20 }}>
          {[STATUS.DONE, STATUS.PARTIAL, STATUS.MISSED].map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: S[s as keyof typeof S].bg, boxShadow: S[s as keyof typeof S].glow }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.14em", fontFamily: "var(--font-mono), monospace" }}>
                {S[s as keyof typeof S].label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>


        <div 
          className="scroll-container" 
          style={{ overflowX: "auto", paddingBottom: 24, paddingTop: 60, marginTop: -60, marginLeft: -36, marginRight: -36, paddingLeft: 36, paddingRight: 36 }}
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

            <div className="day-header-container" style={{ paddingLeft: 261, marginBottom: 12, display: "flex", gap: PILL_GAP, alignItems: "center" }}>
              <AnimatePresence initial={false}>
                {visibleDays.map(d => {
                  const isT = isCurrent && d === today;
                  return (
                    <motion.div key={d} className={`day-header ${isT ? 'is-today' : ''}`} 
                      initial={{ width: 0, opacity: 0, scale: 0.8 }}
                      animate={{ width: PILL_W, opacity: 1, scale: 1 }}
                      exit={{ width: 0, opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        textAlign: "center", flexShrink: 0,
                        fontSize: 13, fontFamily: "var(--font-mono), monospace",
                        color: isT ? "var(--accent)" : "var(--text-muted)",
                        fontWeight: isT ? "700" : "500",
                        position: "relative", paddingBottom: 6,
                      }}>
                      {String(d).padStart(2, "0")}
                      {isT && (
                        <div style={{
                          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                          width: 4, height: 4, borderRadius: "50%", background: "var(--accent)",
                        }} />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>


            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories" type="category">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex", flexDirection: "column", gap: 24, width: "max-content" }}>
                    {sortedCategories.map((cat, catIndex) => {
                      const isCollapsed = collapsedCategories[cat];
                      const catHabits = groupedHabits[cat];
                      
                      return (
                        <Draggable draggableId={`cat-${cat}`} index={catIndex} key={cat}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              style={{ ...provided.draggableProps.style, display: "flex", flexDirection: "column", gap: 12 }}
                            >
                              <div 
                                className="cat-header-group"
                                onClick={() => !editingCategory && toggleCategory(cat)}
                                style={{ 
                                  display: "flex", alignItems: "center", gap: 12, cursor: editingCategory === cat ? "default" : "pointer", 
                                  padding: "4px 0", color: "var(--text-muted)", transition: "color 0.2s",
                                  width: "max-content"
                                }}
                                onMouseEnter={e => { if(editingCategory !== cat) e.currentTarget.style.color = "var(--accent)"; }}
                                onMouseLeave={e => { if(editingCategory !== cat) e.currentTarget.style.color = "var(--text-muted)"; }}
                              >
                                <div {...provided.dragHandleProps} onClick={e => e.stopPropagation()} style={{ cursor: "grab", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: "4px" }}>
                                  <GripVertical size={16} />
                                </div>
                                <ChevronDown size={16} style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s", opacity: editingCategory === cat ? 0.3 : 1 }} />
                      
                      {editingCategory === cat ? (
                        <input
                          value={editCategoryName}
                          onChange={e => setEditCategoryName(e.target.value)}
                          onBlur={() => saveCategoryEdit(cat)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveCategoryEdit(cat);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                          autoFocus
                          style={{
                            background: "var(--bg-surface)", border: "1px solid var(--border-main)", color: "var(--text-main)",
                            padding: "4px 8px", borderRadius: 4, fontSize: 13, fontFamily: "var(--font-body), sans-serif",
                            outline: "none", width: 200
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", fontFamily: "var(--font-display), serif", lineHeight: 1 }}>
                            {cat} <span style={{ opacity: 0.35, fontSize: 16 }}>({catHabits.length})</span>
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, fontFamily: "var(--font-mono), monospace", opacity: 0.7 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Active Streaks"><IconFire size={12} color="var(--accent)" /> {catHabits.filter(h => getStreak(h.days, dim) > 0).length}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Average Completion"><IconClock size={12} color="var(--status-done)" /> {Math.round(catHabits.reduce((sum, h) => sum + getPct(h.days, dim), 0) / catHabits.length) || 0}%</span>
                          </div>

                          {cat !== "Uncategorized" && (
                            <div className="cat-actions" style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0, transition: "opacity 0.2s" }}>
                              <button className="cat-action-btn" onClick={(e) => startEditCategory(cat, e)} title="Edit Category"><Edit2 size={14} /></button>
                              <button className="cat-action-btn del" onClick={(e) => confirmDeleteCategory(cat, e)} title="Delete Category (moves habits to Uncategorized)"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

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
                              <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 4 }}>
                                {catHabits.map((habit, hi) => {
                                  const streak = getStreak(habit.days, dim);
                                  const pct = getPct(habit.days, dim);
                                  const pctColor = pct >= 80 ? "var(--status-done)" : pct >= 50 ? "var(--status-partial)" : pct > 0 ? "var(--status-missed)" : "var(--text-muted)";

                                  return (
                                    <Draggable draggableId={`habit-${habit.id}`} index={hi} key={habit.id}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className="habit-card group"
                                          style={{ ...provided.draggableProps.style, padding: "0.875rem 1rem", display: "flex", flexDirection: "column", alignItems: "stretch", background: snapshot.isDragging ? "#1a1a1a" : "#121212", zIndex: snapshot.isDragging ? 999 : "auto" }}
                                        >
                                          <div className="habit-card-main">
                                            {/* Header row: drag + name + stats + menu */}
                                            <div className="habit-title-row">
                                              <div className="habit-left-panel">
                                                <div className="habit-title-group">
                                                  <div {...provided.dragHandleProps} style={{ cursor: "grab", color: "var(--text-muted)", display: "flex", alignItems: "center", flexShrink: 0 }}>
                                                    <GripVertical size={14} />
                                                  </div>
                                                  <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div className="habit-name-wrap" tabIndex={0} title={habit.name} aria-label={habit.name}>
                                                      <span className="habit-name" style={{
                                                        fontSize: "0.9375rem", color: "var(--text-main)", fontWeight: 500,
                                                        letterSpacing: "0.01em", display: "block", maxWidth: "100%", minWidth: 0,
                                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                                        transition: "color 0.18s",
                                                      }}>
                                                        {habit.name}
                                                      </span>
                                                      <div className="habit-name-popover" aria-hidden="true">
                                                        {habit.name}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Inline stats */}
                                              <div className="habit-stats" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
                                                <span className={streak > 0 ? "stat-text-active" : "stat-text"} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: streak > 0 ? "#999" : "#555", fontFamily: "var(--font-mono), monospace" }}>
                                                  <IconFire size={12} color={streak > 0 ? "var(--accent)" : "currentColor"} />
                                                  <span style={{ opacity: streak > 0 ? 1 : 0.7 }}>{streak}</span>
                                                </span>
                                                <span className="stat-text" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", fontFamily: "var(--font-mono), monospace", color: pctColor }}>
                                                  {/* Mini percentage ring */}
                                                  <svg className="pct-ring" width="16" height="16" viewBox="0 0 16 16">
                                                    <circle cx="8" cy="8" r="6" fill="none" stroke="var(--border-main)" strokeWidth="2" />
                                                    <circle cx="8" cy="8" r="6" fill="none" stroke={pctColor} strokeWidth="2"
                                                      strokeDasharray={`${(pct / 100) * 37.7} 37.7`}
                                                      strokeLinecap="round"
                                                      transform="rotate(-90 8 8)"
                                                      style={{ transition: "stroke-dasharray 0.3s ease" }}
                                                    />
                                                  </svg>
                                                  {pct}%
                                                </span>
                                              </div>

                                              <div className="habit-actions" data-habit-menu-root="true">
                                                <button
                                                  type="button"
                                                  className="habit-menu-btn"
                                                  aria-haspopup="menu"
                                                  aria-expanded={openHabitMenu === habit.id}
                                                  title="More actions"
                                                  onClick={() => setOpenHabitMenu(current => current === habit.id ? null : habit.id)}
                                                >
                                                  &#8943;
                                                </button>
                                                {openHabitMenu === habit.id && (
                                                  <div className="habit-menu" role="menu" aria-label={`${habit.name} actions`}>
                                                    <button
                                                      type="button"
                                                      className="habit-menu-item"
                                                      role="menuitem"
                                                      onClick={() => {
                                                        setExpandedCalendar(current => current === habit.id ? null : habit.id);
                                                        setOpenHabitMenu(null);
                                                      }}
                                                    >
                                                      Schedule
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="habit-menu-item habit-menu-item-danger"
                                                      role="menuitem"
                                                      onClick={() => {
                                                        setOpenHabitMenu(null);
                                                        removeHabit(habit.id);
                                                      }}
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Pill track row - square cells */}
                                            <div className="habit-track-wrap">
                                              <div
                                                style={{ display: "flex", gap: PILL_GAP, alignItems: "center", minWidth: "max-content" }}
                                              >
                                                <AnimatePresence initial={false}>
                                                  {visibleDays.map(d => {
                                                    const idx = d - 1;
                                                    const status = habit.days[idx];
                                                    const isToday = isCurrent && d === today;
                                                    const isFuture = isFutureMonth || (isCurrent && d > today);
                                                    const meta = S[status as keyof typeof S];
                                                    const isPulsing = pulsingCell === `${habit.id}-${idx}`;
                                                    const dateObj = new Date(year, month, d);
                                                    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                                                    return (
                                                      <motion.div 
                                                        key={d} 
                                                        className="pill-container" 
                                                        style={{ position: 'relative', flexShrink: 0, height: PILL_H, display: 'flex', alignItems: 'center', transformOrigin: 'center' }}
                                                        initial={{ width: 0, opacity: 0, scale: 0.8 }}
                                                        animate={{ width: PILL_W, opacity: 1, scale: 1 }}
                                                        exit={{ width: 0, opacity: 0, scale: 0.8 }}
                                                        transition={{ duration: 0.2 }}
                                                      >
                                                        {!isFuture && (
                                                          <div className="tooltip">
                                                            {dayOfWeek}, {MONTHS[month].substring(0, 3)} {d} | <span style={{ color: status === STATUS.NONE ? "#888" : meta.bg, fontWeight: 600 }}>{meta.label === "None" ? "Not logged" : meta.label}</span>
                                                          </div>
                                                        )}
                                                        <motion.div
                                                          className={[!isFuture ? "pill" : ""].filter(Boolean).join(" ")}
                                                          onClick={() => !isFuture && cycleStatus(habit.id, idx, false, true)}
                                                          onTouchEnd={(e) => {
                                                            if (isFuture) return;
                                                            e.preventDefault();
                                                            cycleStatus(habit.id, idx, false, true);
                                                          }}
                                                          onMouseEnter={() => { if (!isFuture) hoveredCellRef.current = { hid: habit.id, idx }; }}
                                                          onMouseLeave={() => { hoveredCellRef.current = null; }}
                                                          initial={false}
                                                          animate={{
                                                            backgroundColor: isFuture ? "transparent" : status === STATUS.NONE ? "var(--pill-none)" : meta.bg,
                                                            borderColor: isFuture ? "var(--border-main)" : status === STATUS.NONE ? "var(--pill-none-border)" : meta.border,
                                                            scale: isPulsing ? 1.25 : 1,
                                                            filter: isPulsing ? "brightness(1.5)" : "brightness(1)",
                                                            boxShadow: (isToday && !isFuture)
                                                              ? `0 0 0 2px #c9a227${(!isFuture && status !== STATUS.NONE) ? `, ${meta.glow}` : ""}`
                                                              : (!isFuture && status !== STATUS.NONE) ? meta.glow : "none",
                                                          }}
                                                          transition={{
                                                            backgroundColor: { duration: 0.2 },
                                                            borderColor: { duration: 0.2 },
                                                            scale: { type: "spring", stiffness: 400, damping: 15 },
                                                            filter: { duration: 0.2 },
                                                            boxShadow: { duration: 0.2 }
                                                          }}
                                                          style={{
                                                            width: PILL_W,
                                                            height: PILL_H,
                                                            borderRadius: "0.375rem",
                                                            borderWidth: 1,
                                                            borderStyle: "solid",
                                                            opacity: isFuture ? 0.28 : 1,
                                                            cursor: isFuture ? "default" : "pointer",
                                                            outline: "none",
                                                            flexShrink: 0,
                                                          }}
                                                        />
                                                      </motion.div>
                                                    );
                                                  })}
                                                </AnimatePresence>
                                              </div>
                                            </div>
                                          </div>

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


        <div style={{ marginTop: 28, animation: "fadeUp 0.45s 0.36s ease both", opacity: 0, animationFillMode: "forwards" }}>
          <div>
            <div className={`add-wrap${inputFocused ? " focused" : ""}`}>
              <input
                className="add-input"
                placeholder="Cultivate a new habit..."
                value={newHabit}
                maxLength={MAX_HABIT_NAME_LENGTH}
                onChange={e => setHabitNameWithLimit(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
              />
              <input
                className="add-input add-input-cat"
                placeholder="Category (optional)"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
              />
              <button className="add-btn" onClick={addHabit} title="Add habit" style={{ marginLeft: 8 }}>
                <Plus size={18} color="#0a0a0a" />
              </button>
            </div>
            {showHabitNameCounter && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8, paddingLeft: 20 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.08em", color: habitNameCount === MAX_HABIT_NAME_LENGTH ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
                    {habitNameCount}/{MAX_HABIT_NAME_LENGTH}
                  </span>
                </div>
                <div style={{ width: isMobile ? 140 : 170, flexShrink: 0 }} aria-hidden="true" />
                <div style={{ width: 46, flexShrink: 0 }} aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

      </div>


      <AnimatePresence>
        {categoryToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999
            }}
            onClick={() => setCategoryToDelete(null)}
          >
            <motion.div
              className="delete-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border-main)", borderRadius: 16,
                padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 24px 48px rgba(0,0,0,0.5)"
              }}
            >
              <h3 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", marginBottom: 12, fontFamily: "var(--font-display), serif" }}>Delete Category</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 24, fontFamily: "var(--font-body), sans-serif" }}>
                Are you sure you want to delete the category <strong style={{ color: "var(--text-main)" }}>&quot;{categoryToDelete}&quot;</strong>? 
                Any habits in this category will be safely moved to &quot;Uncategorized&quot;.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button 
                  onClick={() => setCategoryToDelete(null)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-main)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDeleteCategory}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#dc2626"}
                  onMouseLeave={e => e.currentTarget.style.background = "#ef4444"}
                >
                  Delete Category
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

