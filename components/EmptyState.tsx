"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { MAX_HABIT_NAME_LENGTH, SUGGESTED_HABITS } from "./constants";
import { clampHabitName } from "./utils";

type EmptyStateProps = {
  isMobile: boolean;
  onAdd: (name: string, category: string) => void | Promise<void>;
  onAddSuggested: (name: string, category: string) => void | Promise<void>;
};

export default function EmptyState({
  isMobile,
  onAdd,
  onAddSuggested,
}: EmptyStateProps) {
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const habitNameCount = newHabit.length;
  const showCounter = inputFocused || habitNameCount > 0;

  const handleAdd = () => {
    const name = clampHabitName(newHabit.trim());
    if (!name) return;
    void onAdd(name, newCategory.trim());
    setNewHabit("");
    setNewCategory("");
  };

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
          background: transparent;
          border: 1.5px dashed #3a3a2a;
          border-radius: 999px;
          padding: 6px 6px 6px 20px;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        .es-add-wrap:hover {
          border-color: rgba(201,162,39,0.45);
        }
        .es-add-wrap.focused {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(201,162,39,0.08);
        }

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
          width: 34px; height: 34px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: none;
          transition: opacity 0.15s, transform 0.12s;
          flex-shrink: 0;
          opacity: 0.92;
        }
        .es-add-btn:hover  { opacity: 1; transform: scale(1.06); }
        .es-add-btn:active { transform: scale(0.96); opacity: 0.85; }

        :root.light .es-add-wrap { background: transparent !important; border-color: rgba(201,162,39,0.3) !important; box-shadow: none !important; }
        :root.light .es-add-wrap:hover { border-color: rgba(201,162,39,0.6) !important; }
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
            Your streak starts today. Choose a Discipline or forge your own.
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
            STARTER DISCIPLINES
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
              placeholder="Name your ritual... "
              value={newHabit}
              maxLength={MAX_HABIT_NAME_LENGTH}
              onChange={(e) => setNewHabit(clampHabitName(e.target.value))}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
            <input
              className="es-add-input es-add-input-cat"
              placeholder="Tag it"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
            <button className="es-add-btn" onClick={handleAdd} title="Add habit" style={{ marginLeft: 8 }}>
              <Plus size={16} color="#0a0a0a" strokeWidth={2.5} />
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
