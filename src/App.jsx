import { useState, useRef, useEffect, useCallback } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEFAULT_HABITS = ["Morning Meditation","Read 20 Pages","Workout","No Sugar","Journal"];
const STATUS = { NONE: 0, DONE: 1, PARTIAL: 2, MISSED: 3 };

const S = {
  [STATUS.NONE]:    { bg: "#232323", border: "#2e2e2e", glow: "none",                label: "None"    },
  [STATUS.DONE]:    { bg: "#4ade80", border: "#4ade80", glow: "0 0 8px #4ade8055",  label: "Done"    },
  [STATUS.PARTIAL]: { bg: "#f59e0b", border: "#f59e0b", glow: "0 0 8px #f59e0b55",  label: "Partial" },
  [STATUS.MISSED]:  { bg: "#ef4444", border: "#ef4444", glow: "0 0 8px #ef444455",  label: "Missed"  },
};

// ── Hugeicons-style SVG components ──────────────────────────────────────────
const IconFire = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C12 2 7 7 7 12.5C7 15.538 9.239 18 12 18C14.761 18 17 15.538 17 12.5C17 10 15 8 15 8C15 8 14.5 11 12.5 11C11.5 11 11 10 11 9C11 7 12 5 12 2Z"/>
    <path d="M9.5 16C9.5 16 9 17.5 10.5 19C11.1 19.6 11.55 20 12 20C12.45 20 12.9 19.6 13.5 19C15 17.5 14.5 16 14.5 16"/>
  </svg>
);

const IconClock = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7V12L15 14"/>
  </svg>
);

const IconTrash = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6H21"/>
    <path d="M8 6V4H16V6"/>
    <path d="M19 6L18.2 19.1C18.1 19.6 17.6 20 17.1 20H6.9C6.4 20 5.9 19.6 5.8 19.1L5 6"/>
    <path d="M10 11V16M14 11V16"/>
  </svg>
);

const IconPlus = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M12 5V19M5 12H19"/>
  </svg>
);

const IconChevronLeft = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18L9 12L15 6"/>
  </svg>
);

const IconChevronRight = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18L15 12L9 6"/>
  </svg>
);
// ────────────────────────────────────────────────────────────────────────────

function getDaysInMonth(m, y) { return new Date(y, m + 1, 0).getDate(); }

function getStreak(days, dim) {
  let s = 0;
  for (let d = dim - 1; d >= 0; d--) { if (days[d] === STATUS.DONE) s++; else break; }
  return s;
}

function getPct(days, dim) {
  let done = 0, total = 0;
  for (let d = 0; d < dim; d++) { if (days[d] !== STATUS.NONE) { total++; if (days[d] === STATUS.DONE) done++; } }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export default function App() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [habits, setHabits] = useState(() =>
    DEFAULT_HABITS.map(name => ({ name, days: Array(31).fill(STATUS.NONE), id: Math.random() }))
  );
  const [newHabit, setNewHabit] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [pulsingCell, setPulsingCell] = useState(null);
  const hoveredCellRef = useRef(null);
  const gridRefs = useRef({});
  const cycleRef = useRef(null);

  const dim = getDaysInMonth(month, year);
  const dayNums = Array.from({ length: dim }, (_, i) => i + 1);
  const today = now.getDate();
  const isCurrent = month === now.getMonth() && year === now.getFullYear();

  // pill width auto-fits 31 days into the available track
  const PILL_W = 24;
  const PILL_H = 40;
  const PILL_GAP = 4;

  const triggerPulse = useCallback((hid, idx) => {
    const key = `${hid}-${idx}`;
    setPulsingCell(key);
    setTimeout(() => setPulsingCell(k => k === key ? null : k), 220);
  }, []);

  function cycleStatus(hid, idx, reverse = false, pulse = false) {
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
    const refs = gridRefs.current;
    const handlers = [];
    Object.entries(refs).forEach(([hid, el]) => {
      if (!el) return;
      const fn = (e) => {
        if (!hoveredCellRef.current || String(hoveredCellRef.current.hid) !== String(hid)) return;
        e.preventDefault(); e.stopPropagation();
        cycleRef.current(hoveredCellRef.current.hid, hoveredCellRef.current.idx, e.deltaY < 0, true);
      };
      el.addEventListener("wheel", fn, { passive: false });
      handlers.push({ el, fn });
    });
    return () => handlers.forEach(({ el, fn }) => el.removeEventListener("wheel", fn));
  }, [habits.length]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  function addHabit() {
    if (!newHabit.trim()) return;
    setHabits(prev => [...prev, { name: newHabit.trim(), days: Array(31).fill(STATUS.NONE), id: Math.random() }]);
    setNewHabit("");
  }

  function removeHabit(id) { setHabits(prev => prev.filter(h => h.id !== id)); }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#d0d0d0", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Bebas+Neue&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pillPop { 0%{transform:scale(1)} 45%{transform:scale(1.38);filter:brightness(1.8)} 100%{transform:scale(1)} }

        .page-enter { animation: fadeIn 0.45s ease forwards; }
        .card       { animation: fadeUp 0.45s ease both; }

        .pill {
          cursor: pointer;
          transition: transform 0.11s ease, filter 0.11s ease, background 0.18s ease, box-shadow 0.18s ease;
          flex-shrink: 0;
        }
        .pill:hover  { transform: scale(1.15); filter: brightness(1.28); }
        .pill-pop    { animation: pillPop 0.22s cubic-bezier(0.34,1.56,0.64,1); }

        .habit-card {
          background: #121212;
          border: 1px solid #1c1c1c;
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.22s ease, box-shadow 0.22s ease;
        }
        .habit-card:hover              { border-color: #282828; box-shadow: 0 6px 40px rgba(0,0,0,0.45); }
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
          max-width: 460px;
        }
        .add-wrap.focused { border-color: #c9a227; box-shadow: 0 0 0 3px rgba(201,162,39,0.08); }

        .add-input {
          background: transparent; border: none;
          color: #c8c8c8; font-size: 14px; font-family: 'Inter', sans-serif;
          outline: none; flex: 1; min-width: 0;
        }
        .add-input::placeholder { color: #3a3a3a; }

        .add-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: #c9a227; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .add-btn:hover  { background: #ddb83a; transform: scale(1.07); }
        .add-btn:active { transform: scale(0.95); }

        ::-webkit-scrollbar { height: 4px; width: 4px; background: #0e0e0e; }
        ::-webkit-scrollbar-thumb { background: #252525; border-radius: 4px; }
      `}</style>

      <div className="page-enter" style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 36px 88px" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 52 }}>
          <div>
            <h1 style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 62,
              letterSpacing: "0.05em", lineHeight: 1, color: "#c9a227",
              textShadow: "0 0 48px rgba(201,162,39,0.22)",
            }}>OBSIDIAN</h1>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#383838", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginTop: 7 }}>
              Premium Habit Tracking
            </p>
          </div>

          {/* Month Navigator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "10px 16px" }}>
            <button className="nav-btn" onClick={prevMonth}><IconChevronLeft size={15} /></button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#aaa", letterSpacing: "0.12em", minWidth: 116, textAlign: "center" }}>
              {MONTHS[month].toUpperCase()} {year}
            </span>
            <button className="nav-btn" onClick={nextMonth}><IconChevronRight size={15} /></button>
          </div>
        </div>

        {/* ── LEGEND ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 20 }}>
          {[STATUS.DONE, STATUS.PARTIAL, STATUS.MISSED].map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: S[s].bg, boxShadow: S[s].glow }} />
              <span style={{ fontSize: 10, color: "#454545", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>
                {S[s].label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* ── DAY HEADER ── */}
        <div style={{ paddingLeft: 300, marginBottom: 8, display: "flex", gap: PILL_GAP, alignItems: "center" }}>
          {dayNums.map(d => {
            const isT = isCurrent && d === today;
            return (
              <div key={d} style={{
                width: PILL_W, textAlign: "center", flexShrink: 0,
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: isT ? "#c9a227" : "#303030",
                fontWeight: isT ? "500" : "400",
                position: "relative", paddingBottom: 6,
              }}>
                {String(d).padStart(2, "0")}
                {isT && (
                  <div style={{
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                    width: 3, height: 3, borderRadius: "50%", background: "#c9a227",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── HABIT CARDS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {habits.map((habit, hi) => {
            const streak = getStreak(habit.days, dim);
            const pct = getPct(habit.days, dim);
            const pctColor = pct >= 80 ? "#4ade80" : pct >= 50 ? "#f59e0b" : pct > 0 ? "#ef4444" : "#3a3a3a";

            return (
              <div
                key={habit.id}
                className="habit-card card"
                style={{ animationDelay: `${hi * 0.065}s`, padding: "16px 20px", display: "flex", alignItems: "center" }}
              >
                {/* Left label */}
                <div style={{ width: 300, flexShrink: 0, paddingRight: 24 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span className="habit-name" style={{
                      fontSize: 15, color: "#c0c0c0", fontWeight: 500,
                      letterSpacing: "-0.01em", display: "block",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      transition: "color 0.18s",
                    }}>
                      {habit.name}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#484848", fontFamily: "'JetBrains Mono', monospace" }}>
                      <IconFire size={13} color={streak > 0 ? "#c9a227" : "#484848"} />
                      <span style={{ color: streak > 0 ? "#888" : "#484848" }}>{streak} days</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: pctColor }}>
                      <IconClock size={13} color={pctColor} />
                      {pct}%
                    </span>
                    <button className="del-btn" onClick={() => removeHabit(habit.id)} title="Delete habit">
                      <IconTrash size={14} color="currentColor" />
                    </button>
                  </div>
                </div>

                {/* Pill track */}
                <div
                  ref={el => { gridRefs.current[habit.id] = el; }}
                  style={{ display: "flex", gap: PILL_GAP, alignItems: "flex-end", height: PILL_H }}
                >
                  {dayNums.map(d => {
                    const idx = d - 1;
                    const status = habit.days[idx];
                    const isToday = isCurrent && d === today;
                    const isFuture = isCurrent && d > today;
                    const meta = S[status];
                    const isPulsing = pulsingCell === `${habit.id}-${idx}`;
                    const h = isFuture ? PILL_H * 0.7
                      : status === STATUS.DONE    ? PILL_H
                      : status === STATUS.PARTIAL ? PILL_H * 0.72
                      : status === STATUS.MISSED  ? PILL_H * 0.5
                      : PILL_H * 0.7;

                    return (
                      <div
                        key={d}
                        className={[!isFuture ? "pill" : "", isPulsing ? "pill-pop" : ""].filter(Boolean).join(" ")}
                        onClick={() => !isFuture && cycleStatus(habit.id, idx, false, true)}
                        onMouseEnter={() => { if (!isFuture) hoveredCellRef.current = { hid: habit.id, idx }; }}
                        onMouseLeave={() => { hoveredCellRef.current = null; }}
                        title={`Day ${String(d).padStart(2,"0")} · ${meta.label}`}
                        style={{
                          width: PILL_W,
                          height: h,
                          borderRadius: 8,
                          background: isFuture ? "#141414"
                            : status === STATUS.NONE ? "#1d1d1d"
                            : meta.bg,
                          border: `1px solid ${
                            isFuture ? "#191919"
                            : status === STATUS.NONE ? "#272727"
                            : meta.border
                          }`,
                          opacity: isFuture ? 0.28 : 1,
                          cursor: isFuture ? "default" : "pointer",
                          boxShadow: (isToday && !isFuture)
                            ? `0 0 0 2px #c9a227, ${(!isFuture && status !== STATUS.NONE) ? meta.glow : "none"}`
                            : (!isFuture && status !== STATUS.NONE) ? meta.glow : "none",
                          outline: "none",
                          flexShrink: 0,
                          transition: "height 0.18s ease, transform 0.11s, filter 0.11s, box-shadow 0.18s, background 0.18s, border-color 0.18s",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
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
            <button className="add-btn" onClick={addHabit} title="Add habit">
              <IconPlus size={18} color="#0a0a0a" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}