import { useState, useRef, useEffect, useCallback } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const DEFAULT_HABITS = [
  "Morning Meditation",
  "Exercise",
  "Read 30 mins",
  "No Sugar",
  "Cold Shower",
  "Journal",
  "8h Sleep",
];

const STATUS = { NONE: 0, DONE: 1, PARTIAL: 2, MISSED: 3 };

const statusColors = {
  [STATUS.NONE]:    { bg: "#1e1e1e", border: "#252525" },
  [STATUS.DONE]:    { bg: "#4ade80", border: "#22c55e" },
  [STATUS.PARTIAL]: { bg: "#f59e0b", border: "#d97706" },
  [STATUS.MISSED]:  { bg: "#ef4444", border: "#dc2626" },
};

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function getStreak(days, daysInMonth) {
  let streak = 0;
  for (let d = daysInMonth - 1; d >= 0; d--) {
    if (days[d] === STATUS.DONE) streak++;
    else break;
  }
  return streak;
}

function getCompletion(days, daysInMonth) {
  let done = 0, total = 0;
  for (let d = 0; d < daysInMonth; d++) {
    if (days[d] !== STATUS.NONE) { total++; if (days[d] === STATUS.DONE) done++; }
  }
  return total === 0 ? null : Math.round((done / total) * 100);
}

export default function HabitTracker() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year] = useState(now.getFullYear());
  const [habits, setHabits] = useState(() =>
    DEFAULT_HABITS.map(name => ({ name, days: Array(31).fill(STATUS.NONE) }))
  );
  const [newHabit, setNewHabit] = useState("");
  const [adding, setAdding] = useState(false);
  const [pulsingCell, setPulsingCell] = useState(null);
  const hoveredCellRef = useRef(null);
  const gridRef = useRef(null);
  const cycleStatusRef = useRef(null);

  const triggerPulse = useCallback((hi, idx) => {
    const key = `${hi}-${idx}`;
    setPulsingCell(key);
    setTimeout(() => setPulsingCell(k => k === key ? null : k), 180);
  }, []);

  const daysInMonth = getDaysInMonth(month, year);
  const dayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = now.getDate();
  const isCurrentMonth = month === now.getMonth();

  function cycleStatus(habitIdx, dayIdx, reverse = false, pulse = false) {
    setHabits(prev => prev.map((h, hi) => {
      if (hi !== habitIdx) return h;
      const days = [...h.days];
      const cur = days[dayIdx];
      if (!reverse) {
        days[dayIdx] = cur === STATUS.NONE ? STATUS.DONE
          : cur === STATUS.DONE ? STATUS.PARTIAL
          : cur === STATUS.PARTIAL ? STATUS.MISSED
          : STATUS.NONE;
      } else {
        days[dayIdx] = cur === STATUS.NONE ? STATUS.MISSED
          : cur === STATUS.MISSED ? STATUS.PARTIAL
          : cur === STATUS.PARTIAL ? STATUS.DONE
          : STATUS.NONE;
      }
      return { ...h, days };
    }));
    if (pulse) triggerPulse(habitIdx, dayIdx);
  }

  useEffect(() => { cycleStatusRef.current = cycleStatus; });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!hoveredCellRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const { hi, idx } = hoveredCellRef.current;
      cycleStatusRef.current(hi, idx, e.deltaY < 0, true);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  function addHabit() {
    if (!newHabit.trim()) return;
    setHabits(prev => [...prev, { name: newHabit.trim(), days: Array(31).fill(STATUS.NONE) }]);
    setNewHabit("");
    setAdding(false);
  }

  function removeHabit(idx) {
    setHabits(prev => prev.filter((_, i) => i !== idx));
  }

  const totalDone = habits.reduce((acc, h) =>
    acc + h.days.slice(0, daysInMonth).filter(d => d === STATUS.DONE).length, 0);
  const totalPossible = habits.length * daysInMonth;
  const overallPct = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#111",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: "#e8e8e8",
      padding: "48px 40px 80px",
      boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { height: 4px; background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

        .cell-bar {
          cursor: pointer;
          border-radius: 3px;
          transition: transform 0.1s ease, filter 0.12s ease, height 0.12s ease, background 0.12s ease;
        }
        .cell-bar:hover { transform: scaleY(1.15); filter: brightness(1.35); }

        @keyframes bar-pulse {
          0%   { transform: scaleY(1) scaleX(1); }
          40%  { transform: scaleY(1.22) scaleX(1.12); filter: brightness(1.5); }
          100% { transform: scaleY(1) scaleX(1); }
        }
        .cell-pulse { animation: bar-pulse 0.18s ease-out; }

        .habit-row { transition: background 0.1s; border-radius: 4px; }
        .habit-row:hover { background: rgba(255,255,255,0.025); }
        .habit-row:hover .row-label { color: #f0c060 !important; }
        .habit-row:hover .remove-btn { opacity: 1 !important; }

        .remove-btn {
          opacity: 0 !important;
          background: none; border: none; cursor: pointer;
          color: #555; font-size: 16px; line-height: 1; flex-shrink: 0;
          transition: opacity 0.15s, color 0.15s;
        }
        .remove-btn:hover { color: #ef4444 !important; }

        .month-btn {
          background: none; border: 1px solid #222;
          color: #666; cursor: pointer; padding: 5px 11px;
          border-radius: 4px; font-size: 11px; font-family: 'DM Mono', monospace;
          letter-spacing: 0.08em; transition: all 0.15s;
        }
        .month-btn:hover { border-color: #f0c060; color: #f0c060; }
        .month-btn.active { border-color: #f0c060; color: #f0c060; background: rgba(240,192,96,0.08); }

        .add-btn {
          background: none; border: 1px dashed #2a2a2a;
          color: #555; cursor: pointer; padding: 7px 18px;
          border-radius: 4px; font-size: 13px; font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .add-btn:hover { border-color: #f0c060; color: #f0c060; }

        input.habit-input {
          background: #181818; border: 1px solid #2e2e2e;
          color: #e0e0e0; padding: 8px 14px; border-radius: 4px;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          outline: none; width: 220px;
        }
        input.habit-input::placeholder { color: #444; }
        input.habit-input:focus { border-color: #f0c060; }

        .confirm-btn {
          background: #f0c060; border: none; color: #111;
          padding: 8px 16px; border-radius: 4px; cursor: pointer;
          font-size: 12px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }
        .confirm-btn:hover { background: #ffd070; }

        .cancel-btn {
          background: none; border: none; color: #666; cursor: pointer;
          font-size: 13px; font-family: 'DM Sans', sans-serif; transition: color 0.15s;
        }
        .cancel-btn:hover { color: #aaa; }

        .stat-card {
          background: #161616; border: 1px solid #222;
          border-radius: 8px; padding: 14px 22px; min-width: 110px;
          transition: border-color 0.2s;
        }
        .stat-card:hover { border-color: #2e2e2e; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 44, gap: 24 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
            Daily Tracking — {year}
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, color: "#ececec" }}>
            Habit{" "}<span style={{ fontStyle: "italic", color: "#f0c060" }}>Tracker</span>
          </h1>
          <div style={{ marginTop: 12, fontSize: 13, color: "#666", fontFamily: "'DM Mono', monospace" }}>
            {overallPct}% monthly completion · {habits.length} habits
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 440, justifyContent: "flex-end" }}>
          {MONTHS.map((m, i) => (
            <button key={m} className={`month-btn ${month === i ? "active" : ""}`} onClick={() => setMonth(i)}>
              {m.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 44 }}>
        {[
          { label: "Habits", value: habits.length },
          { label: "Days in Month", value: daysInMonth },
          { label: "Completions", value: totalDone },
          { label: "Overall Rate", value: `${overallPct}%` },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 24, fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: "#f0c060", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── GRID ── */}
      <div ref={gridRef} style={{ overflowX: "auto", paddingBottom: 16 }}>
        <div style={{ minWidth: 860 }}>

          {/* Day numbers header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8, paddingLeft: 234 }}>
            {dayNums.map(d => {
              const isT = isCurrentMonth && d === today;
              return (
                <div key={d} style={{
                  width: 20, marginRight: 3, textAlign: "center",
                  fontSize: 10, fontFamily: "'DM Mono', monospace",
                  color: isT ? "#f0c060" : "#555",
                  fontWeight: isT ? "600" : "400",
                }}>
                  {d}
                </div>
              );
            })}
            <div style={{ width: 50 }} />
          </div>

          {/* Rule */}
          <div style={{ height: 1, background: "#1e1e1e", marginBottom: 4 }} />

          {/* Habit rows */}
          {habits.map((habit, hi) => {
            const streak = getStreak(habit.days, daysInMonth);
            const pct = getCompletion(habit.days, daysInMonth);
            return (
              <div key={hi} className="habit-row" style={{
                display: "flex", alignItems: "center",
                borderBottom: "1px solid #181818",
                padding: "7px 0",
              }}>
                {/* Label */}
                <div style={{ width: 234, display: "flex", alignItems: "center", gap: 6, paddingRight: 16, flexShrink: 0 }}>
                  <button className="remove-btn" onClick={() => removeHabit(hi)}>×</button>
                  <span className="row-label" style={{
                    fontSize: 13, color: "#c0c0c0", fontWeight: 400,
                    transition: "color 0.15s",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
                  }}>{habit.name}</span>
                  {streak >= 2 && (
                    <span style={{
                      fontSize: 10, fontFamily: "'DM Mono', monospace",
                      color: "#f0c060", background: "rgba(240,192,96,0.1)",
                      padding: "2px 5px", borderRadius: 3, whiteSpace: "nowrap",
                      border: "1px solid rgba(240,192,96,0.18)",
                    }}>🔥{streak}</span>
                  )}
                </div>

                {/* Bars */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
                  {dayNums.map(d => {
                    const idx = d - 1;
                    const status = habit.days[idx];
                    const isToday = isCurrentMonth && d === today;
                    const isFuture = isCurrentMonth && d > today;
                    const sc = statusColors[status];
                    const barH = status === STATUS.DONE ? 32
                      : status === STATUS.PARTIAL ? 24
                      : status === STATUS.MISSED ? 18
                      : 28;
                    const isPulsing = pulsingCell === `${hi}-${idx}`;
                    return (
                      <div
                        key={d}
                        className={[isFuture ? "" : "cell-bar", isPulsing ? "cell-pulse" : ""].join(" ").trim()}
                        onClick={() => !isFuture && cycleStatus(hi, idx, false, true)}
                        onMouseEnter={() => { if (!isFuture) hoveredCellRef.current = { hi, idx }; }}
                        onMouseLeave={() => { hoveredCellRef.current = null; }}
                        title={`${habit.name} — Day ${d}: ${["Not logged","Done","Partial","Missed"][status]}`}
                        style={{
                          width: 18, height: barH,
                          background: isFuture ? "#161616" : sc.bg,
                          border: `1px solid ${isFuture ? "#1a1a1a" : sc.border}`,
                          opacity: isFuture ? 0.3 : 1,
                          cursor: isFuture ? "default" : "pointer",
                          borderRadius: 3,
                          outline: isToday && !isFuture ? "1.5px solid #f0c060" : "none",
                          outlineOffset: 1,
                          flexShrink: 0,
                        }}
                      />
                    );
                  })}
                </div>

                {/* % */}
                <div style={{
                  marginLeft: 14, fontSize: 12, fontFamily: "'DM Mono', monospace",
                  textAlign: "right", minWidth: 36,
                  color: pct === null ? "#333"
                    : pct >= 80 ? "#4ade80"
                    : pct >= 50 ? "#f59e0b"
                    : "#ef4444",
                }}>
                  {pct !== null ? `${pct}%` : "—"}
                </div>
              </div>
            );
          })}

          {/* Add habit */}
          <div style={{ paddingTop: 14, paddingLeft: 234 }}>
            {adding ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="habit-input"
                  autoFocus
                  placeholder="New habit name…"
                  value={newHabit}
                  onChange={e => setNewHabit(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") setAdding(false); }}
                />
                <button className="confirm-btn" onClick={addHabit}>Add</button>
                <button className="cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            ) : (
              <button className="add-btn" onClick={() => setAdding(true)}>+ Add habit</button>
            )}
          </div>
        </div>
      </div>

      {/* ── LEGEND ── */}
      <div style={{ marginTop: 52, display: "flex", gap: 20, alignItems: "center", borderTop: "1px solid #1a1a1a", paddingTop: 24, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Legend</span>
        {[
          { status: STATUS.DONE, label: "Done" },
          { status: STATUS.PARTIAL, label: "Partial" },
          { status: STATUS.MISSED, label: "Missed" },
          { status: STATUS.NONE, label: "Not logged" },
        ].map(({ status, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: statusColors[status].bg, border: `1px solid ${statusColors[status].border}` }} />
            <span style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono', monospace" }}>{label}</span>
          </div>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#444", fontFamily: "'DM Mono', monospace" }}>
          Click or scroll ↑↓ to cycle · 🔥 = streak · outlined = today
        </span>
      </div>
    </div>
  );
}
