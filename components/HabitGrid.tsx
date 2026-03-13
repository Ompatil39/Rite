"use client";

import { useState, memo, useCallback, type MutableRefObject, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ChevronDown,
  Edit2,
  GripVertical,
  Calendar,
  Trash2,
} from "lucide-react";
import { MONTHS, STATUS, S, PILL_W, PILL_H, PILL_GAP, MOBILE_PILL_W, MOBILE_PILL_H, MOBILE_PILL_H_SM } from "./constants";
import type { Habit } from "./types";
import type { User } from "@supabase/supabase-js";
import type { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { IconFire, IconClock } from "./icons";

const HeatmapCalendar = dynamic(() => import("./HeatmapCalendar"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        textAlign: "center",
        padding: 16,
        color: "var(--text-muted)",
        fontSize: 12,
      }}
    >
      Loading calendar...
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Module-level week constant (not computed in render — performance requirement)
// ---------------------------------------------------------------------------
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// ---------------------------------------------------------------------------
// Mobile-only: MobileHabitRow (React.memo per spec)
// ---------------------------------------------------------------------------
type MobileHabitRowProps = {
  habit: Habit;
  isCurrent: boolean;
  today: number;
  month: number;
  year: number;
  isFutureMonth: boolean;
  habitStats: HabitStats;
  onTap: (habit: Habit) => void;
  onQuickLog: (habit: Habit) => void;
};

const MobileHabitRow = memo(function MobileHabitRow({
  habit,
  isCurrent,
  today,
  month,
  year,
  isFutureMonth,
  habitStats,
  onTap,
  onQuickLog,
}: MobileHabitRowProps) {
  const { streak = 0, pct = 0 } = habitStats[habit.id] || {};
  const todayIdx = today - 1;
  const todayStatus = isCurrent ? habit.days[todayIdx] : STATUS.NONE;
  const todayStatusInfo = S[todayStatus];

  // Build 7-day window ending today (or last 7 days of visible range)
  const now = new Date(year, month, isCurrent ? today : new Date(year, month + 1, 0).getDate());
  const weekDays: { d: number; dayLetter: string; isToday: boolean; isFuture: boolean; status: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      // Day outside current month — skip by using placeholder
      weekDays.push({ d: -1, dayLetter: DAY_LETTERS[date.getDay()], isToday: false, isFuture: false, status: STATUS.NONE });
    } else {
      const d = date.getDate();
      const idx = d - 1;
      const isToday = isCurrent && d === today;
      const isFuture = isFutureMonth || (isCurrent && d > today);
      weekDays.push({ d, dayLetter: DAY_LETTERS[date.getDay()], isToday, isFuture, status: habit.days[idx] });
    }
  }

  const pctColor =
    pct >= 80
      ? "var(--status-done)"
      : pct >= 50
        ? "var(--status-partial)"
        : pct > 0
          ? "var(--status-missed)"
          : "var(--text-muted)";

  return (
    <div
      className="mobile-habit-card"
      onClick={() => onTap(habit)}
      onMouseDown={(e) => {
        e.currentTarget.style.background = "#1a1a1a";
        e.currentTarget.style.transform = "scale(0.985)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.background = "var(--bg-surface, #121212)";
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-surface, #121212)";
        e.currentTarget.style.transform = "scale(1)";
      }}
      style={{
        background: "var(--bg-surface, #121212)",
        border: "1px solid var(--border-main, #1c1c1c)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        transition: "background 0.15s, transform 0.12s",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Top row: name + Today pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-main)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
          }}
        >
          {habit.name}
        </span>
        {/* Today pill */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onQuickLog(habit);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 9999,
            border: `1px solid ${todayStatusInfo.border}`,
            background: todayStatus === STATUS.NONE ? "transparent" : `${todayStatusInfo.bg}22`,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: todayStatusInfo.bg === "var(--pill-none)" ? "var(--text-muted)" : todayStatusInfo.bg,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono), monospace",
              color: todayStatus === STATUS.NONE ? "var(--text-muted)" : todayStatusInfo.border,
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            TODAY
          </span>
        </div>
      </div>

      {/* Bottom row: stats + 7-pill week view */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        {/* Left: streak + pct */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {streak > 0 && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontFamily: "var(--font-mono), monospace",
                color: "var(--text-muted)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", flexShrink: 0 }} />
              {streak}d
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono), monospace",
              color: pctColor,
            }}
          >
            {pct}%
          </span>
        </div>

        {/* Right: 7 pill cells */}
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
          {weekDays.map((wd, i) => {
            if (wd.d === -1) {
              // Out-of-month placeholder
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div
                    style={{
                      width: MOBILE_PILL_W,
                      height: MOBILE_PILL_H,
                      borderRadius: 9999,
                      background: "transparent",
                      border: "1px solid var(--border-main)",
                      opacity: 0.2,
                    }}
                  />
                  <span style={{ fontSize: 8, fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)", opacity: 0.3 }}>
                    {wd.dayLetter}
                  </span>
                </div>
              );
            }
            const cellStatus = wd.status;
            const statusInfo = S[cellStatus];
            const isMissed = cellStatus === STATUS.MISSED;
            const isNone = cellStatus === STATUS.NONE;

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div
                  style={{
                    width: MOBILE_PILL_W,
                    height: MOBILE_PILL_H,
                    borderRadius: 9999,
                    background: isNone ? "var(--pill-none, #1c1c1c)" : isMissed ? "var(--status-missed)" : statusInfo.bg,
                    border: `1px solid ${wd.isToday ? statusInfo.border : (isNone ? "var(--pill-none-border, #2a2a2a)" : statusInfo.border)}`,
                    boxShadow: wd.isToday
                      ? `0 0 8px ${statusInfo.bg === "var(--pill-none)" ? "transparent" : statusInfo.bg}55, 0 0 0 1.5px ${statusInfo.border}`
                      : "none",
                    opacity: !wd.isToday && !wd.isFuture ? 0.6 : 1,
                    flexShrink: 0,
                    overflow: "hidden",
                    position: "relative",
                  }}
                />
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono), monospace",
                    color: wd.isToday ? "var(--accent)" : "var(--text-muted)",
                    opacity: wd.isToday ? 1 : 0.4,
                    fontWeight: wd.isToday ? 700 : 400,
                  }}
                >
                  {String(wd.d).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

type HabitStats = Record<string, { streak: number; pct: number }>;
type CategoryStats = Record<string, { activeStreaks: number; avgPct: number }>;

type HabitGridProps = {
  isMobile: boolean;
  touchY: number | null;
  setTouchY: (value: number | null) => void;
  setIsMonthView: (value: boolean) => void;
  visibleDays: number[];
  isCurrent: boolean;
  today: number;
  month: number;
  year: number;
  isFutureMonth: boolean;
  onDragEnd: (result: DropResult) => void;
  sortedCategories: string[];
  groupedHabits: Record<string, Habit[]>;
  collapsedCategories: Record<string, boolean>;
  editingCategory: string | null;
  editCategoryName: string;
  setEditCategoryName: (value: string) => void;
  setEditingCategory: (value: string | null) => void;
  toggleCategory: (cat: string) => void;
  startEditCategory: (cat: string, e: MouseEvent) => void;
  saveCategoryEdit: (cat: string) => void;
  confirmDeleteCategory: (cat: string, e: MouseEvent) => void;
  categoryStats: CategoryStats;
  habitStats: HabitStats;
  expandedCalendar: string | null;
  setExpandedCalendar: (value: string | null) => void;
  removeHabit: (id: string) => void;
  cycleStatus: (
    hid: string,
    idx: number,
    reverse?: boolean,
    pulse?: boolean,
  ) => void;
  pulsingCell: string | null;
  user: User | null;
  supabase: ReturnType<typeof createSupabaseClient>;
  hoveredCellRef: MutableRefObject<{ hid: string; idx: number } | null>;
  // Mobile-only props
  onTap?: (habit: Habit) => void;
  onQuickLog?: (habit: Habit) => void;
};

export default function HabitGrid({
  isMobile,
  touchY,
  setTouchY,
  setIsMonthView,
  visibleDays,
  isCurrent,
  today,
  month,
  year,
  isFutureMonth,
  onDragEnd,
  sortedCategories,
  groupedHabits,
  collapsedCategories,
  editingCategory,
  editCategoryName,
  setEditCategoryName,
  setEditingCategory,
  toggleCategory,
  startEditCategory,
  saveCategoryEdit,
  confirmDeleteCategory,
  categoryStats,
  habitStats,
  expandedCalendar,
  setExpandedCalendar,
  removeHabit,
  cycleStatus,
  pulsingCell,
  user,
  supabase,
  hoveredCellRef,
  onTap,
  onQuickLog,
}: HabitGridProps) {
  const [heatmapLogs, setHeatmapLogs] = useState<
    Record<string, Record<string, number>>
  >({});

  // ── Mobile render path ────────────────────────────────────────────────────
  if (isMobile) {
    const safeOnTap = onTap ?? (() => {});
    const safeOnQuickLog = onQuickLog ?? (() => {});

    // Day-letter header (7 days aligned to week ending today)
    const now = new Date(year, month, isCurrent ? today : new Date(year, month + 1, 0).getDate());
    const weekDayHeaders: { letter: string; isToday: boolean; d: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const isToday = isCurrent && date.getMonth() === month && date.getDate() === today;
      weekDayHeaders.push({
        letter: DAY_LETTERS[date.getDay()],
        isToday,
        d: date.getDate(),
      });
    }

    return (
      <>
        <style>{`
          .mobile-cat-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 4px 0 8px;
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
          }
          .mobile-habit-card { transition: background 0.15s, transform 0.12s; }
        `}</style>

        {/* Legend row — status color pills only, no TODAY duplicate */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {[STATUS.DONE, STATUS.PARTIAL, STATUS.MISSED].map((s) => (
            <div
              key={s}
              style={{
                width: MOBILE_PILL_W,
                height: MOBILE_PILL_H / 2,
                borderRadius: 9999,
                background: S[s].bg,
                flexShrink: 0,
              }}
            />
          ))}
          <span style={{ fontSize: 9, fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)", letterSpacing: "0.1em", marginLeft: 4 }}>
            DONE · PARTIAL · MISSED
          </span>
        </div>

        {/* Day column headers — right-aligned, 7 letters over pill columns */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 3, marginBottom: 8 }}>
          {weekDayHeaders.map((wh, i) => (
            <div
              key={i}
              style={{
                width: MOBILE_PILL_W,
                textAlign: "center",
                fontSize: 10,
                fontFamily: "var(--font-mono), monospace",
                color: wh.isToday ? "var(--accent)" : "var(--text-muted)",
                fontWeight: wh.isToday ? 700 : 400,
                opacity: wh.isToday ? 1 : 0.4,
                flexShrink: 0,
              }}
            >
              {wh.letter}
            </div>
          ))}
        </div>

        {/* Categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {sortedCategories.map((cat) => {
            const isCollapsed = collapsedCategories[cat];
            const catHabits = groupedHabits[cat];
            const avgPct = categoryStats[cat]?.avgPct ?? 0;

            return (
              <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Mobile category header */}
                <div
                  className="mobile-cat-header"
                  onClick={() => toggleCategory(cat)}
                >
                  {/* Chevron */}
                  <ChevronDown
                    size={15}
                    style={{
                      flexShrink: 0,
                      color: "var(--text-muted)",
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    }}
                  />
                  {/* Category name + count */}
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--accent)",
                      fontFamily: "var(--font-body), sans-serif",
                      lineHeight: 1,
                      flex: 1,
                    }}
                  >
                    {cat}{" "}
                    <span style={{ opacity: 0.4, fontSize: 14, fontWeight: 500 }}>
                      ({catHabits.length})
                    </span>
                  </span>
                  {/* Progress bar + pct */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 4,
                        borderRadius: 99,
                        background: "var(--bg-surface, #1c1c1c)",
                        overflow: "hidden",
                        border: "1px solid var(--border-main)",
                      }}
                    >
                      <div
                        style={{
                          width: `${avgPct}%`,
                          height: "100%",
                          background: "var(--accent)",
                          borderRadius: 99,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono), monospace",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        minWidth: 28,
                        textAlign: "right",
                      }}
                    >
                      {avgPct}%
                    </span>
                  </div>
                </div>

                {/* Habit rows */}
                {!isCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {catHabits.map((habit) => (
                      <MobileHabitRow
                        key={habit.id}
                        habit={habit}
                        isCurrent={isCurrent}
                        today={today}
                        month={month}
                        year={year}
                        isFutureMonth={isFutureMonth}
                        habitStats={habitStats}
                        onTap={safeOnTap}
                        onQuickLog={safeOnQuickLog}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // ── Desktop render path (unchanged) ───────────────────────────────────────
  return (
    <>
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
                      width: 0,
                      opacity: 0,
                      y: -6,
                      transition: {
                        duration: 0.14,
                        delay: (visibleDays.length - 1 - di) * 0.012,
                      },
                    }}
                    transition={{
                      width: {
                        duration: 0.18,
                        delay: dominoDelay,
                        ease: [0.22, 1, 0.36, 1],
                      },
                      opacity: { duration: 0.16, delay: dominoDelay },
                      y: {
                        type: "spring",
                        stiffness: 520,
                        damping: 30,
                        delay: dominoDelay,
                      },
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
          {/* Drag and drop categories and habits                                */}
          {/* ---------------------------------------------------------------- */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="categories" type="category">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                    width: "max-content",
                  }}
                >
                  {sortedCategories.map((cat, catIndex) => {
                    const isCollapsed = collapsedCategories[cat];
                    const catHabits = groupedHabits[cat];

                    return (
                      <Draggable
                        draggableId={`cat-${cat}`}
                        index={catIndex}
                        key={cat}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                            }}
                          >
                            {/* Category header */}
                            <div
                              className="cat-header-group"
                              onClick={() =>
                                !editingCategory && toggleCategory(cat)
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                cursor:
                                  editingCategory === cat
                                    ? "default"
                                    : "pointer",
                                padding: "4px 0",
                                color: "var(--text-muted)",
                                transition: "color 0.2s",
                                width: "max-content",
                              }}
                              onMouseEnter={(e) => {
                                if (editingCategory !== cat)
                                  e.currentTarget.style.color = "var(--accent)";
                              }}
                              onMouseLeave={(e) => {
                                if (editingCategory !== cat)
                                  e.currentTarget.style.color =
                                    "var(--text-muted)";
                              }}
                            >
                              <div
                                {...provided.dragHandleProps}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  cursor: "grab",
                                  color: "var(--text-muted)",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: 4,
                                }}
                              >
                                <GripVertical size={16} />
                              </div>
                              <ChevronDown
                                size={16}
                                style={{
                                  transform: isCollapsed
                                    ? "rotate(-90deg)"
                                    : "rotate(0deg)",
                                  transition: "transform 0.2s",
                                  opacity: editingCategory === cat ? 0.3 : 1,
                                }}
                              />

                              {editingCategory === cat ? (
                                <input
                                  value={editCategoryName}
                                  onChange={(e) =>
                                    setEditCategoryName(e.target.value)
                                  }
                                  onBlur={() => saveCategoryEdit(cat)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      saveCategoryEdit(cat);
                                    if (e.key === "Escape")
                                      setEditingCategory(null);
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
                                      fontFamily:
                                        "var(--font-body), sans-serif",
                                      lineHeight: 1,
                                    }}
                                  >
                                    {cat}{" "}
                                    <span
                                      style={{
                                        opacity: 0.4,
                                        fontSize: 14,
                                        fontWeight: 500,
                                      }}
                                    >
                                      ({catHabits.length})
                                    </span>
                                  </span>

                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 12,
                                      fontSize: 11,
                                      fontFamily:
                                        "var(--font-body), sans-serif",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                      title="Active Streaks"
                                    >
                                      <IconFire
                                        size={12}
                                        color="var(--accent)"
                                      />
                                      {categoryStats[cat]?.activeStreaks ?? 0}
                                    </span>
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                      title="Average Completion"
                                    >
                                      <IconClock
                                        size={12}
                                        color="var(--status-done)"
                                      />
                                      {categoryStats[cat]?.avgPct ?? 0}%
                                    </span>
                                  </div>

                                  {cat !== "Uncategorized" && (
                                    <div
                                      className="cat-actions"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        opacity: 0,
                                        transition: "opacity 0.2s",
                                      }}
                                    >
                                      <button
                                        className="cat-action-btn"
                                        onClick={(e) =>
                                          startEditCategory(cat, e)
                                        }
                                        title="Edit Category"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        className="cat-action-btn del"
                                        onClick={(e) =>
                                          confirmDeleteCategory(cat, e)
                                        }
                                        title="Delete Category"
                                      >
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
                                  initial={{
                                    height: 0,
                                    opacity: 0,
                                    overflow: "hidden",
                                  }}
                                  animate={{
                                    height: "auto",
                                    opacity: 1,
                                    transitionEnd: { overflow: "visible" },
                                  }}
                                  exit={{
                                    height: 0,
                                    opacity: 0,
                                    overflow: "hidden",
                                  }}
                                  transition={{
                                    duration: 0.35,
                                    ease: [0.16, 1, 0.3, 1],
                                  }}
                                >
                                  <Droppable droppableId={cat} type="habit">
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 12,
                                          paddingBottom: 4,
                                        }}
                                      >
                                        {catHabits.map((habit, hi) => {
                                          const { streak = 0, pct = 0 } =
                                            habitStats[habit.id] || {};
                                          const pctColor =
                                            pct >= 80
                                              ? "var(--status-done)"
                                              : pct >= 50
                                                ? "var(--status-partial)"
                                                : pct > 0
                                                  ? "var(--status-missed)"
                                                  : "var(--text-muted)";

                                          return (
                                            <Draggable
                                              draggableId={`habit-${habit.id}`}
                                              index={hi}
                                              key={habit.id}
                                            >
                                              {(provided, snapshot) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  className="habit-card"
                                                  style={{
                                                    ...provided.draggableProps
                                                      .style,
                                                    padding: "20px 20px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "stretch",
                                                    background:
                                                      snapshot.isDragging
                                                        ? "#1a1a1a"
                                                        : "#121212",
                                                    zIndex: snapshot.isDragging
                                                      ? 999
                                                      : "auto",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      width: "100%",
                                                    }}
                                                  >
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
                                                        justifyContent:
                                                          "center",
                                                        gap: 6,
                                                      }}
                                                    >
                                                      {/* Row 1: drag handle + name */}
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: 12,
                                                          minWidth: 0,
                                                        }}
                                                      >
                                                        <div
                                                          {...provided.dragHandleProps}
                                                          style={{
                                                            cursor: "grab",
                                                            color:
                                                              "var(--text-muted)",
                                                            display: "flex",
                                                            alignItems:
                                                              "center",
                                                            flexShrink: 0,
                                                          }}
                                                        >
                                                          <GripVertical
                                                            size={16}
                                                          />
                                                        </div>
                                                        <div className="habit-name-wrap">
                                                          <span
                                                            className="habit-name"
                                                            style={{
                                                              fontSize: 15,
                                                              color:
                                                                "var(--text-main)",
                                                              fontWeight: 500,
                                                              letterSpacing:
                                                                "0.01em",
                                                              display: "block",
                                                              whiteSpace:
                                                                "nowrap",
                                                              overflow:
                                                                "hidden",
                                                              textOverflow:
                                                                "ellipsis",
                                                              transition:
                                                                "color 0.18s",
                                                              minWidth: 0,
                                                            }}
                                                          >
                                                            {habit.name}
                                                          </span>
                                                          <div className="habit-name-tip">
                                                            {habit.name}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      {/* Row 2: stats + action buttons inline */}
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: 8,
                                                          paddingLeft: 28,
                                                        }}
                                                      >
                                                        {/* Stats */}
                                                        <div
                                                          className="habit-stats"
                                                          style={{
                                                            display: "flex",
                                                            gap: 12,
                                                            alignItems:
                                                              "center",
                                                          }}
                                                        >
                                                          <span
                                                            className={
                                                              streak > 0
                                                                ? "stat-text-active"
                                                                : "stat-text"
                                                            }
                                                            style={{
                                                              display: "flex",
                                                              alignItems:
                                                                "center",
                                                              gap: 5,
                                                              fontSize: 12,
                                                              color:
                                                                streak > 0
                                                                  ? "#999"
                                                                  : "#555",
                                                              fontFamily:
                                                                "var(--font-mono), monospace",
                                                            }}
                                                          >
                                                            <IconFire
                                                              size={14}
                                                              color={
                                                                streak > 0
                                                                  ? "var(--accent)"
                                                                  : "currentColor"
                                                              }
                                                            />
                                                            <span
                                                              style={{
                                                                opacity:
                                                                  streak > 0
                                                                    ? 1
                                                                    : 0.7,
                                                              }}
                                                            >
                                                              {streak}d
                                                            </span>
                                                          </span>
                                                          <span
                                                            className="stat-text"
                                                            style={{
                                                              display: "flex",
                                                              alignItems:
                                                                "center",
                                                              gap: 5,
                                                              fontSize: 12,
                                                              fontFamily:
                                                                "var(--font-mono), monospace",
                                                              color: pctColor,
                                                            }}
                                                          >
                                                            <IconClock
                                                              size={14}
                                                              color={pctColor}
                                                            />
                                                            {pct}%
                                                          </span>
                                                        </div>

                                                        {/* Action buttons -- immediately right of stats */}
                                                        <div
                                                          style={{
                                                            display: "flex",
                                                            gap: 1,
                                                          }}
                                                        >
                                                          <button
                                                            className={`cal-btn${expandedCalendar === habit.id ? " active" : ""}`}
                                                            onClick={() =>
                                                              setExpandedCalendar(
                                                                expandedCalendar ===
                                                                  habit.id
                                                                  ? null
                                                                  : habit.id,
                                                              )
                                                            }
                                                            title="View Calendar"
                                                          >
                                                            <Calendar
                                                              size={15}
                                                              color="currentColor"
                                                            />
                                                          </button>
                                                          <button
                                                            className="del-btn"
                                                            onClick={() =>
                                                              removeHabit(
                                                                habit.id,
                                                              )
                                                            }
                                                            title="Delete habit"
                                                          >
                                                            <Trash2
                                                              size={15}
                                                              color="currentColor"
                                                            />
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
                                                        {visibleDays.map(
                                                          (d, di) => {
                                                            const idx = d - 1;
                                                            const status =
                                                              habit.days[idx];
                                                            const isToday =
                                                              isCurrent &&
                                                              d === today;
                                                            const isFuture =
                                                              isFutureMonth ||
                                                              (isCurrent &&
                                                                d > today);
                                                            const isPulsing =
                                                              pulsingCell ===
                                                              `${habit.id}-${idx}`;
                                                            const dateObj =
                                                              new Date(
                                                                year,
                                                                month,
                                                                d,
                                                              );
                                                            const dayName =
                                                              dateObj.toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                  weekday:
                                                                    "short",
                                                                },
                                                              );
                                                            const isMissed =
                                                              status ===
                                                              STATUS.MISSED;
                                                            const dominoDelay =
                                                              di * 0.022;

                                                            return (
                                                              <motion.div
                                                                key={d}
                                                                className="pill-container"
                                                                style={{
                                                                  position:
                                                                    "relative",
                                                                  flexShrink: 0,
                                                                  height:
                                                                    PILL_H,
                                                                  display:
                                                                    "flex",
                                                                  alignItems:
                                                                    "flex-end",
                                                                  transformOrigin:
                                                                    "bottom",
                                                                }}
                                                                initial={{
                                                                  width: 0,
                                                                  opacity: 0,
                                                                  y: 10,
                                                                  scaleY: 0.4,
                                                                }}
                                                                animate={{
                                                                  width: PILL_W,
                                                                  opacity: 1,
                                                                  y: 0,
                                                                  scaleY: 1,
                                                                }}
                                                                exit={{
                                                                  width: 0,
                                                                  opacity: 0,
                                                                  y: 10,
                                                                  scaleY: 0.4,
                                                                  transition: {
                                                                    duration: 0.14,
                                                                    delay:
                                                                      (visibleDays.length -
                                                                        1 -
                                                                        di) *
                                                                      0.012,
                                                                  },
                                                                }}
                                                                transition={{
                                                                  width: {
                                                                    duration: 0.18,
                                                                    delay:
                                                                      dominoDelay,
                                                                    ease: [
                                                                      0.22, 1,
                                                                      0.36, 1,
                                                                    ],
                                                                  },
                                                                  opacity: {
                                                                    duration: 0.18,
                                                                    delay:
                                                                      dominoDelay,
                                                                  },
                                                                  y: {
                                                                    type: "spring",
                                                                    stiffness: 520,
                                                                    damping: 30,
                                                                    delay:
                                                                      dominoDelay,
                                                                  },
                                                                  scaleY: {
                                                                    type: "spring",
                                                                    stiffness: 520,
                                                                    damping: 30,
                                                                    delay:
                                                                      dominoDelay,
                                                                  },
                                                                }}
                                                              >
                                                                {!isFuture && (
                                                                  <div className="tooltip">
                                                                    {dayName},{" "}
                                                                    {MONTHS[
                                                                      month
                                                                    ].substring(
                                                                      0,
                                                                      3,
                                                                    )}{" "}
                                                                    {d} -{" "}
                                                                    <span
                                                                      style={{
                                                                        color:
                                                                          S[
                                                                            status
                                                                          ]
                                                                            .border,
                                                                        fontWeight: 600,
                                                                      }}
                                                                    >
                                                                      {
                                                                        S[
                                                                          status
                                                                        ].label
                                                                      }
                                                                    </span>
                                                                  </div>
                                                                )}

                                                                <motion.div
                                                                  className={
                                                                    isToday
                                                                        ? "pill"
                                                                        : ""
                                                                  }
                                                                  onClick={(e) => {
                                                                    if (isToday) {
                                                                      cycleStatus(habit.id, idx, e.shiftKey, true);
                                                                    }
                                                                  }}
                                                                  onTouchEnd={(e) => {
                                                                    if (isToday) {
                                                                      e.preventDefault();
                                                                      cycleStatus(habit.id, idx, e.shiftKey, true);
                                                                    }
                                                                  }}
                                                                  onMouseEnter={() => {
                                                                    if (isToday)
                                                                      hoveredCellRef.current =
                                                                        {
                                                                          hid: habit.id,
                                                                          idx,
                                                                        };
                                                                  }}
                                                                  onMouseLeave={() => {
                                                                    hoveredCellRef.current =
                                                                      null;
                                                                  }}
                                                                  initial={
                                                                    false
                                                                  }
                                                                  animate={{
                                                                    height:
                                                                      PILL_H,
                                                                    backgroundColor:
                                                                      isFuture
                                                                        ? "transparent"
                                                                        : isMissed
                                                                          ? "var(--status-missed)"
                                                                          : "var(--pill-none)",
                                                                    borderColor:
                                                                      isFuture
                                                                        ? "var(--border-main)"
                                                                        : isMissed
                                                                          ? "var(--status-missed)"
                                                                          : "var(--pill-none-border)",
                                                                    scale:
                                                                      isPulsing
                                                                        ? 1.15
                                                                        : 1,
                                                                    filter:
                                                                      isPulsing
                                                                        ? "brightness(1.5)"
                                                                        : "brightness(1)",
                                                                    boxShadow:
                                                                      isToday
                                                                        ? "0 0 0 2px #c9a227"
                                                                        : "none",
                                                                    opacity:
                                                                      isFuture
                                                                        ? 0.5
                                                                        : 1,
                                                                  }}
                                                                  transition={{
                                                                    height: {
                                                                      duration: 0.25,
                                                                      ease: [
                                                                        0.16, 1,
                                                                        0.3, 1,
                                                                      ],
                                                                    },
                                                                    backgroundColor:
                                                                      {
                                                                        duration: 0.35,
                                                                        ease: [
                                                                          0.16,
                                                                          1,
                                                                          0.3,
                                                                          1,
                                                                        ],
                                                                      },
                                                                    borderColor:
                                                                      {
                                                                        duration: 0.35,
                                                                        ease: [
                                                                          0.16,
                                                                          1,
                                                                          0.3,
                                                                          1,
                                                                        ],
                                                                      },
                                                                    scale: {
                                                                      type: "spring",
                                                                      stiffness: 280,
                                                                      damping: 22,
                                                                    },
                                                                    filter: {
                                                                      duration: 0.3,
                                                                      ease: "easeOut",
                                                                    },
                                                                    boxShadow: {
                                                                      duration: 0.3,
                                                                    },
                                                                  }}
                                                                  style={{
                                                                    width:
                                                                      PILL_W,
                                                                    borderRadius: 8,
                                                                    borderWidth: 1,
                                                                    borderStyle:
                                                                      "solid",
                                                                    cursor:
                                                                      isFuture
                                                                        ? "default"
                                                                        : "pointer",
                                                                    outline:
                                                                      "none",
                                                                    flexShrink: 0,
                                                                    overflow:
                                                                      "hidden",
                                                                    position:
                                                                      "relative",
                                                                  }}
                                                                >
                                                                  {status !==
                                                                    STATUS.NONE &&
                                                                    status !==
                                                                      STATUS.MISSED &&
                                                                    !isFuture && (
                                                                      <motion.div
                                                                        initial={
                                                                          false
                                                                        }
                                                                        animate={{
                                                                          height:
                                                                            status ===
                                                                            STATUS.DONE
                                                                              ? "100%"
                                                                              : "100%",
                                                                        }}
                                                                        transition={{
                                                                          type: "spring",
                                                                          stiffness: 180,
                                                                          damping: 22,
                                                                        }}
                                                                        style={{
                                                                          position:
                                                                            "absolute",
                                                                          bottom: 0,
                                                                          left: 0,
                                                                          right: 0,
                                                                          background:
                                                                            status ===
                                                                            STATUS.DONE
                                                                              ? "var(--status-done)"
                                                                              : "var(--status-partial)",
                                                                          boxShadow:
                                                                            status ===
                                                                            STATUS.DONE
                                                                              ? "0 0 10px var(--status-done-glow)"
                                                                              : "0 0 10px var(--status-partial-glow)",
                                                                        }}
                                                                      />
                                                                    )}
                                                                </motion.div>
                                                              </motion.div>
                                                            );
                                                          },
                                                        )}
                                                      </AnimatePresence>
                                                    </div>
                                                  </div>

                                                  {/* Heatmap calendar */}
                                                  <AnimatePresence>
                                                    {expandedCalendar ===
                                                      habit.id && (
                                                      <HeatmapCalendar
                                                        habitId={habit.id}
                                                        user={user}
                                                        supabase={supabase}
                                                        heatmapLogs={
                                                          heatmapLogs
                                                        }
                                                        setHeatmapLogs={
                                                          setHeatmapLogs
                                                        }
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
    </>
  );
}