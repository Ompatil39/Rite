'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trash2, Plus, Flame, CheckCircle2, ChevronDown, Edit2, GripVertical, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS = { NONE: 0, DONE: 1, PARTIAL: 2, MISSED: 3 };

const S = {
  [STATUS.NONE]:    { bg: "var(--pill-none)", border: "var(--pill-none-border)", glow: "none", label: "None" },
  [STATUS.DONE]:    { bg: "var(--status-done)", border: "var(--status-done)", glow: "0 0 10px var(--status-done-glow)", label: "Done" },
  [STATUS.PARTIAL]: { bg: "var(--status-partial)", border: "var(--status-partial)", glow: "0 0 10px var(--status-partial-glow)", label: "Partial" },
  [STATUS.MISSED]:  { bg: "var(--status-missed)", border: "var(--status-missed)", glow: "0 0 10px var(--status-missed-glow)", label: "Missed" },
};

// ── Hugeicons-style SVG components ──────────────────────────────────────────
const IconFire = ({ size = 14, color = "currentColor" }) => (
  <Flame size={size} color={color} strokeWidth={1.8} />
);

const IconClock = ({ size = 14, color = "currentColor" }) => (
  <CheckCircle2 size={size} color={color} strokeWidth={1.8} />
);
// ────────────────────────────────────────────────────────────────────────────

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

export default function App() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [habits, setHabits] = useState<Array<{name: string, category: string, days: number[], id: number}>>([]);
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
  const [expandedCalendar, setExpandedCalendar] = useState<number | null>(null);
  const [isMonthView, setIsMonthView] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [touchY, setTouchY] = useState<number | null>(null);
  const hoveredCellRef = useRef<{hid: number, idx: number} | null>(null);
  const cycleRef = useRef<any>(null);

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
  const PILL_H = 42;
  const PILL_GAP = 6;

  const triggerPulse = (hid: number, idx: number) => {
    const key = `${hid}-${idx}`;
    setPulsingCell(key);
    setTimeout(() => setPulsingCell(k => k === key ? null : k), 220);
  };

  function cycleStatus(hid: number, idx: number, reverse = false, pulse = false) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    setHabits(prev => prev.map(h => {
      if (h.id !== hid) return h;
      const days = [...h.days];
      const cur = days[idx];
      days[idx] = reverse
        ? (cur === STATUS.NONE ? STATUS.MISSED : cur === STATUS.MISSED ? STATUS.PARTIAL : cur === STATUS.PARTIAL ? STATUS.DONE : STATUS.NONE)
        : (cur === STATUS.NONE ? STATUS.DONE   : cur === STATUS.DONE   ? STATUS.PARTIAL : cur === STATUS.PARTIAL ? STATUS.MISSED : STATUS.NONE);
      return { ...h, days };
    }));
    if (pulse) triggerPulse(hid, idx);
  }

  useEffect(() => { cycleRef.current = cycleStatus; });

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMonthView(true);
    };
    checkMobile();
    if (window.innerWidth < 768) setIsMonthView(false);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  function addHabit() {
    if (!newHabit.trim()) return;
    setHabits(prev => [...prev, { name: newHabit.trim(), category: newCategory.trim() || "Uncategorized", days: Array(31).fill(STATUS.NONE), id: Math.random() }]);
    setNewHabit("");
    setNewCategory("");
  }

  function removeHabit(id: number) { setHabits(prev => prev.filter(h => h.id !== id)); }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const startEditCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setEditCategoryName(cat);
  };

  const saveCategoryEdit = (oldCat: string) => {
    if (editCategoryName.trim() && editCategoryName.trim() !== oldCat) {
      setHabits(prev => prev.map(h => 
        (h.category || "Uncategorized") === oldCat 
          ? { ...h, category: editCategoryName.trim() } 
          : h
      ));
    }
    setEditingCategory(null);
  };

  const confirmDeleteCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryToDelete(cat);
  };

  const executeDeleteCategory = () => {
    if (!categoryToDelete) return;
    setHabits(prev => prev.map(h => 
      (h.category || "Uncategorized") === categoryToDelete 
        ? { ...h, category: "Uncategorized" } 
        : h
    ));
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

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: "transparent", color: "inherit", fontFamily: "var(--font-body), sans-serif", overflowX: "hidden" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root.light .habit-card { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.03) !important; }
        :root.light .habit-card:hover { border-color: var(--border-focus) !important; box-shadow: 0 8px 30px rgba(0,0,0,0.06) !important; }
        :root.light .habit-name { color: #1a1a18 !important; }
        :root.light .add-wrap { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.03) !important; }
        :root.light .add-input { color: #1a1a18 !important; }
        :root.light .add-input::placeholder { color: #888 !important; }
        :root.light .add-input-cat { border-left-color: var(--border-main) !important; }
        :root.light .nav-btn { border-color: var(--border-main) !important; color: #5c5c58 !important; }
        :root.light .nav-btn:hover { background: rgba(201, 162, 39, 0.08) !important; }
        :root.light .pill-container .pill { border-color: var(--border-main) !important; }
        :root.light .tooltip { background: #ffffff !important; border-color: var(--border-main) !important; color: #1a1a18 !important; box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        :root.light .tooltip::after { border-top-color: var(--border-main) !important; }
        :root.light .cat-header-group { color: #c9a227 !important; font-weight: 600 !important; }
        :root.light .cat-header-group:hover { color: #b48b15 !important; }
        :root.light .cat-action-btn { color: #5c5c58 !important; }
        :root.light .del-btn { color: #a0a09c !important; }
        :root.light .del-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.1) !important; }
        :root.light .calendar-heatmap { border-top-color: var(--border-main) !important; }
        :root.light .calendar-heatmap-cell-none { background: var(--heatmap-none) !important; }
        :root.light .month-nav-container { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.03) !important; }
        :root.light .month-nav-text { color: #5c5c58 !important; }
        :root.light .delete-modal { background: #ffffff !important; border-color: var(--border-main) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
        :root.light .delete-modal h3, :root.light .delete-modal strong { color: #1a1a18 !important; }
        :root.light .delete-modal p { color: #5c5c58 !important; }
        :root.light .day-header { color: #8a8a86 !important; }
        :root.light .day-header.is-today { color: #c9a227 !important; }
        :root.light .stat-text { color: #5c5c58 !important; }
        :root.light .stat-text-active { color: #3a3a36 !important; }

        @media (max-width: 768px) {
          .page-container { padding: 0px 16px 88px !important; }
          .scroll-container { margin-left: -16px !important; margin-right: -16px !important; padding-left: 16px !important; padding-right: 16px !important; }
          .habit-left-panel { width: 130px !important; padding-right: 8px !important; }
          .day-header-container { padding-left: 142px !important; }
          .habit-stats { flex-direction: column !important; gap: 4px !important; align-items: flex-start !important; }
          .habit-name { font-size: 14px !important; white-space: normal !important; line-height: 1.2 !important; }
          .habit-actions { flex-direction: column !important; gap: 8px !important; }
          .habit-card { padding: 12px 12px !important; }
          .legend-container { justify-content: center !important; gap: 12px !important; flex-wrap: wrap; }
          .add-wrap { flex-direction: column; border-radius: 16px !important; padding: 12px !important; }
          .add-input { width: 100% !important; margin: 0 !important; padding: 12px 0 !important; }
          .add-input-cat { border-left: none !important; border-top: 1px solid #333 !important; }
          :root.light .add-input-cat { border-top-color: #e6e6e2 !important; }
          .add-btn { width: 100% !important; border-radius: 8px !important; margin-top: 8px !important; margin-left: 0 !important; }
          .month-nav-container { padding: 8px 12px !important; }
        }

        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pillPop { 0%{transform:scale(1)} 45%{transform:scale(1.38);filter:brightness(1.8)} 100%{transform:scale(1)} }

        .page-enter { animation: fadeIn 0.45s ease forwards; }
        .card       { animation: fadeUp 0.45s ease both; }

        .pill {
          cursor: pointer;
          flex-shrink: 0;
        }
        .pill:hover  { filter: brightness(1.28) !important; }

        .habit-card {
          background: #121212;
          border: 1px solid #1c1c1c;
          border-radius: 14px;
          transition: border-color 0.22s ease, box-shadow 0.22s ease;
          position: relative;
        }
        .habit-card:hover              { border-color: #282828; box-shadow: 0 6px 40px rgba(0,0,0,0.45); z-index: 50; }
        .habit-card:hover .del-btn     { opacity: 1 !important; }
        .habit-card:hover .habit-name  { color: #ececec !important; }

        .del-btn {
          opacity: 0;
          background: none; border: none; cursor: pointer;
          color: #383838; line-height: 1;
          transition: opacity 0.15s, color 0.15s, background 0.15s;
          padding: 5px; border-radius: 6px; display: flex; align-items: center;
          flex-shrink: 0;
        }
        .habit-card:hover .del-btn { opacity: 1; }
        .del-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.08) !important; }

        .nav-btn {
          background: none; border: 1px solid #252525;
          color: #666; cursor: pointer; width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .nav-btn:hover { border-color: #c9a227; color: #c9a227; background: rgba(201,162,39,0.06); }

        .add-wrap {
          display: flex; align-items: center;
          background: #121212;
          border: 1px solid #222;
          border-radius: 999px;
          padding: 6px 6px 6px 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
          max-width: 560px;
        }
        .add-wrap.focused { border-color: var(--accent); box-shadow: 0 0 0 3px var(--status-done-glow); }

        .add-input {
          background: transparent; border: none;
          color: var(--text-main); font-size: 14px; font-family: var(--font-body), sans-serif;
          outline: none; flex: 1; min-width: 0;
        }
        .add-input::placeholder { color: var(--text-muted); opacity: 0.5; }

        .add-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--accent); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .add-btn:hover  { filter: brightness(1.1); transform: scale(1.07); }
        .add-btn:active { transform: scale(0.95); }

        .tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: var(--bg-surface);
          border: 1px solid var(--border-main);
          color: var(--text-main);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-family: var(--font-mono), monospace;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          z-index: 9999999;
          box-shadow: 0 4px 12px var(--shadow-alpha);
        }
        .pill-container:hover {
          z-index: 100;
        }
        .pill-container:hover .tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-8px);
        }
        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: var(--border-main) transparent transparent transparent;
        }

        .cat-header-group:hover .cat-actions { opacity: 1 !important; }
        .cat-action-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.15s; padding: 4px; border-radius: 4px; }
        .cat-action-btn:hover { color: var(--accent); background: var(--status-done-glow); }
        .cat-action-btn.del:hover { color: var(--status-missed); background: var(--status-missed-glow); }

        ::-webkit-scrollbar { height: 4px; width: 4px; background: var(--bg-base); }
        ::-webkit-scrollbar-thumb { background: var(--border-focus); border-radius: 4px; }
      `}</style>

      <div className="page-container page-enter" style={{ maxWidth: 1340, margin: "0 auto", padding: "0px 36px 88px" }}>

        {/* ── HEADER (Month Navigator) ── */}
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

        {/* ── LEGEND ── */}
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

        {/* ── SCROLLABLE GRID AREA ── */}
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
            {/* ── DAY HEADER ── */}
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

            {/* ── HABIT CARDS ── */}
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
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-display), serif", color: "inherit" }}>
                            {cat} <span style={{ opacity: 0.5, marginLeft: 4 }}>({catHabits.length})</span>
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
                        </div>
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
                                          style={{ ...provided.draggableProps.style, padding: "20px 20px", display: "flex", flexDirection: "column", alignItems: "stretch", background: snapshot.isDragging ? "#1a1a1a" : "#121212", zIndex: snapshot.isDragging ? 999 : "auto" }}
                                        >
                                        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                                        {/* Left label */}
                                        <div className="habit-left-panel" style={{ width: 240, flexShrink: 0, paddingRight: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div {...provided.dragHandleProps} style={{ cursor: "grab", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                                              <GripVertical size={16} />
                                            </div>
                                            <div>
                                              <div style={{ marginBottom: 10 }}>
                                                <span className="habit-name" style={{
                                                  fontSize: 16, color: "var(--text-main)", fontWeight: 500,
                                                  letterSpacing: "0.01em", display: "block",
                                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                                  transition: "color 0.18s",
                                                }}>
                                                  {habit.name}
                                                </span>
                                              </div>

                                              <div className="habit-stats" style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                                <span className={streak > 0 ? "stat-text-active" : "stat-text"} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: streak > 0 ? "#999" : "#555", fontFamily: "var(--font-mono), monospace" }}>
                                                  <IconFire size={14} color={streak > 0 ? "var(--accent)" : "currentColor"} />
                                                  <span style={{ opacity: streak > 0 ? 1 : 0.7 }}>{streak} days</span>
                                                </span>
                                                <span className="stat-text" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "var(--font-mono), monospace", color: pctColor }}>
                                                  <IconClock size={14} color={pctColor} />
                                                  {pct}%
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="habit-actions" style={{ display: "flex", gap: 4 }}>
                                            <button className="del-btn" onClick={() => setExpandedCalendar(expandedCalendar === habit.id ? null : habit.id)} title="View Calendar">
                                              <Calendar size={14} color="currentColor" />
                                            </button>
                                            <button className="del-btn" onClick={() => removeHabit(habit.id)} title="Delete habit">
                                              <Trash2 size={14} color="currentColor" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Pill track */}
                                        <div
                                          style={{ display: "flex", gap: PILL_GAP, alignItems: "flex-end", height: PILL_H }}
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
                                              const h = isFuture ? PILL_H * 0.7
                                                : status === STATUS.DONE    ? PILL_H
                                                : status === STATUS.PARTIAL ? PILL_H * 0.72
                                                : status === STATUS.MISSED  ? PILL_H * 0.5
                                                : PILL_H * 0.7;

                                              return (
                                                <motion.div 
                                                  key={d} 
                                                  className="pill-container" 
                                                  style={{ position: 'relative', flexShrink: 0, height: PILL_H, display: 'flex', alignItems: 'flex-end', transformOrigin: 'bottom' }}
                                                  initial={{ width: 0, opacity: 0, y: 15, scaleY: 0.5 }}
                                                  animate={{ width: PILL_W, opacity: 1, y: 0, scaleY: 1 }}
                                                  exit={{ width: 0, opacity: 0, y: 15, scaleY: 0.5 }}
                                                  transition={{ duration: 0.2 }}
                                                >
                                                  {!isFuture && (
                                                    <div className="tooltip">
                                                      {dayOfWeek}, {MONTHS[month].substring(0, 3)} {d} • <span style={{ color: status === STATUS.NONE ? "#888" : meta.bg, fontWeight: 600 }}>{meta.label === "None" ? "Not logged" : meta.label}</span>
                                                    </div>
                                                  )}
                                                  <motion.div
                                                    className={[!isFuture ? "pill" : ""].filter(Boolean).join(" ")}
                                                    onClick={() => !isFuture && cycleStatus(habit.id, idx, false, true)}
                                                    onMouseEnter={() => { if (!isFuture) hoveredCellRef.current = { hid: habit.id, idx }; }}
                                                    onMouseLeave={() => { hoveredCellRef.current = null; }}
                                                    initial={false}
                                                    animate={{
                                                      height: h,
                                                      backgroundColor: isFuture ? "transparent" : status === STATUS.NONE ? "var(--pill-none)" : meta.bg,
                                                      borderColor: isFuture ? "var(--border-main)" : status === STATUS.NONE ? "var(--pill-none-border)" : meta.border,
                                                      scale: isPulsing ? 1.25 : 1,
                                                      filter: isPulsing ? "brightness(1.5)" : "brightness(1)",
                                                      boxShadow: (isToday && !isFuture)
                                                        ? `0 0 0 2px #c9a227${(!isFuture && status !== STATUS.NONE) ? `, ${meta.glow}` : ""}`
                                                        : (!isFuture && status !== STATUS.NONE) ? meta.glow : "none",
                                                    }}
                                                    transition={{
                                                      height: { duration: 0.2, ease: "easeOut" },
                                                      backgroundColor: { duration: 0.2 },
                                                      borderColor: { duration: 0.2 },
                                                      scale: { type: "spring", stiffness: 400, damping: 15 },
                                                      filter: { duration: 0.2 },
                                                      boxShadow: { duration: 0.2 }
                                                    }}
                                                    style={{
                                                      width: PILL_W,
                                                      borderRadius: 8,
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

                                        {/* Heatmap Calendar View */}
                                        <AnimatePresence>
                                          {expandedCalendar === habit.id && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="calendar-heatmap"
                                              style={{ overflow: "hidden", marginTop: 24, paddingTop: 20, borderTop: "1px solid #1c1c1c", width: "100%" }}
                                            >
                                              {(() => {
                                                const heatmapMonths: {weekIdx: number, name: string}[] = [];
                                                let lastMonth = -1;
                                                for (let w = 0; w < 26; w++) {
                                                  const d = new Date(now.getTime() - (25 - w) * 7 * 24 * 60 * 60 * 1000);
                                                  if (d.getMonth() !== lastMonth) {
                                                    if (w > 0 || d.getDate() <= 14) {
                                                      heatmapMonths.push({ weekIdx: w, name: MONTHS[d.getMonth()].substring(0, 3) });
                                                    }
                                                    lastMonth = d.getMonth();
                                                  }
                                                }
                                                return (
                                                  <div style={{ overflowX: "auto", paddingBottom: 8 }}>
                                                    <div style={{ position: "relative", height: 16, marginBottom: 4, minWidth: 26 * 16 }}>
                                                      {heatmapMonths.map((m, i) => (
                                                        <span key={i} style={{
                                                          position: "absolute",
                                                          left: m.weekIdx * 16,
                                                          fontSize: 10,
                                                          color: "var(--text-muted)",
                                                          fontFamily: "var(--font-mono), monospace",
                                                          textTransform: "uppercase",
                                                          letterSpacing: "0.05em"
                                                        }}>
                                                          {m.name}
                                                        </span>
                                                      ))}
                                                    </div>
                                                    <div style={{ display: "flex", gap: 4, minWidth: 26 * 16 }}>
                                                      {Array.from({ length: 26 }).map((_, w) => (
                                                        <div key={w} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                          {Array.from({ length: 7 }).map((_, d) => {
                                                            const hash = Math.sin(habit.id * 100 + w * 10 + d);
                                                            const status = hash > 0.3 ? STATUS.DONE : hash > 0 ? STATUS.PARTIAL : hash > -0.2 ? STATUS.MISSED : STATUS.NONE;
                                                            const meta = S[status as keyof typeof S];
                                                            return (
                                                              <div
                                                                key={d}
                                                                className={status === STATUS.NONE ? "calendar-heatmap-cell-none" : ""}
                                                                style={{
                                                                  width: 12, height: 12, borderRadius: 3,
                                                                  background: status === STATUS.NONE ? "var(--heatmap-none)" : meta.bg,
                                                                  opacity: w === 25 && d > new Date().getDay() ? 0.2 : 1
                                                                }}
                                                                title={`${status === STATUS.NONE ? "No data" : meta.label}`}
                                                              />
                                                            );
                                                          })}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-mono), monospace", textAlign: "right" }}>
                                                Last 6 Months Activity
                                              </div>
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

        {/* ── ADD HABIT ── */}
        <div style={{ marginTop: 28, animation: "fadeUp 0.45s 0.36s ease both", opacity: 0, animationFillMode: "forwards" }}>
          <div className={`add-wrap${inputFocused ? " focused" : ""}`}>
            <input
              className="add-input"
              placeholder="Cultivate a new habit…"
              value={newHabit}
              onChange={e => setNewHabit(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={e => { if (e.key === "Enter") addHabit(); }}
            />
            <input
              className="add-input add-input-cat"
              style={{ width: 170, flex: 'none', borderLeft: '1px solid var(--border-main)', paddingLeft: 16, marginLeft: 8 }}
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
        </div>

      </div>

      {/* ── DELETE CATEGORY MODAL ── */}
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
