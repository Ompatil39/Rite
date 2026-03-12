"use client";

import { memo, useState } from "react";
import { Plus } from "lucide-react";
import { MAX_HABIT_NAME_LENGTH } from "./constants";
import { clampHabitName } from "./utils";

type HabitComposerProps = {
  isMobile: boolean;
  onAdd: (name: string, category: string) => void | Promise<void>;
};

function HabitComposer({ isMobile, onAdd }: HabitComposerProps) {
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const habitNameCount = newHabit.length;
  const showHabitNameCounter = inputFocused || habitNameCount > 0;

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
          onChange={(e) => setNewHabit(clampHabitName(e.target.value))}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <input
          className="add-input add-input-cat"
          placeholder="Category (optional)"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button className="add-btn" onClick={handleAdd} title="Add habit" style={{ marginLeft: 8 }}>
          <Plus size={16} color="#0a0a0a" strokeWidth={2.5} />
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
  );
}

export default memo(HabitComposer);
