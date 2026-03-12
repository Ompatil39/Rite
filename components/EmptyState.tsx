"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { MAX_HABIT_NAME_LENGTH, SUGGESTED_HABITS } from "./constants";

type EmptyStateProps = {
  newHabit: string;
  setNewHabit: (v: string) => void;
  newCategory: string;
  setNewCategory: (v: string) => void;
  inputFocused: boolean;
  setInputFocused: (v: boolean) => void;
  isMobile: boolean;
  onAdd: () => void;
  onAddSuggested: (name: string, category: string) => void;
};

export default function EmptyState({
  newHabit,
  setNewHabit,
  newCategory,
  setNewCategory,
  inputFocused,
  setInputFocused,
  isMobile,
  onAdd,
  onAddSuggested,
}: EmptyStateProps) {
  const habitNameCount = newHabit.length;
  const showCounter = inputFocused || habitNameCount > 0;

  return (
    <div
      style={{
        background: "transparent",
        color: "inherit",
        fontFamily: "var(--font-body), sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes emptyFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
        .empty-suggest:hover  { border-color: var(--accent); background: var(--bg-surface); }
        .empty-suggest:active { transform: scale(0.98); }
        .empty-suggest .cat-label {
          font-size: 11px;
          font-family: var(--font-mono), monospace;
          color: var(--text-muted);
          letter-spacing: 0.06em;
        }
        :root.light .empty-suggest:hover { background: #ffffff; }

        .es-add-wrap {
          display: flex;
          align-items: center;
          background: #121212;
          border: 1px solid #222;
          border-radius: 999px;
          padding: 6px 6px 6px 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        .es-add-wrap.focused { border-color: var(--accent); }

        .es-add-input {
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 14px;
          font-family: var(--font-body), sans-serif;
          outline: none;
          flex: 1;
          min-width: 0;
        }
        .es-add-input::placeholder { color: var(--text-muted); opacity: 0.5; }

        .es-add-input-cat {
          flex: none;
          width: 170px;
          border-left: 1px solid var(--border-main);
          padding-left: 16px;
          margin-left: 8px;
        }

        .es-add-btn {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.28);
          transition: box-shadow 0.15s, transform 0.12s;
          flex-shrink: 0;
        }
        .es-add-btn:active {
          transform: scale(0.98);
          box-shadow: 0 6px 14px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.18);
        }

        :root.light .es-add-wrap   { background: #ffffff; border-color: var(--border-main); }
        :root.light .es-add-input  { color: #1a1a18; }
        :root.light .es-add-input::placeholder { color: #888; }
        :root.light .es-add-input-cat { border-left-color: var(--border-main); }

        @media (max-width: 768px) {
          .es-add-wrap { padding-left: 14px; }
          .es-add-input-cat { width: 140px; }
        }
      `}</style>

      <div
        className="page-container"
        style={{ maxWidth: 480, margin: "0 auto", padding: "0 24px 88px" }}
      >
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
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
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Suggestions
          </span>
          {SUGGESTED_HABITS.map((h) => (
            <button
              key={h.name}
              className="empty-suggest"
              onClick={() => onAddSuggested(h.name, h.category)}
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
          <div className={`es-add-wrap${inputFocused ? " focused" : ""}`}>
            <input
              className="es-add-input"
              placeholder="Cultivate a new habit..."
              value={newHabit}
              maxLength={MAX_HABIT_NAME_LENGTH}
              onChange={(e) => setNewHabit(e.target.value.slice(0, MAX_HABIT_NAME_LENGTH))}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
            />
            <input
              className="es-add-input es-add-input-cat"
              placeholder="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
            />
            <button className="es-add-btn" onClick={onAdd} title="Add habit" style={{ marginLeft: 8 }}>
              <Plus size={18} color="#0a0a0a" />
            </button>
          </div>

          {showCounter && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 8,
                paddingLeft: 20,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color:
                      habitNameCount === MAX_HABIT_NAME_LENGTH
                        ? "var(--accent)"
                        : "var(--text-muted)",
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
        </motion.div>
      </div>
    </div>
  );
}
