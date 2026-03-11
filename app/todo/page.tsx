"use client";

import { useState } from "react";
import { Plus, Trash2, Check, Circle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function TodoList() {
  const [todos, setTodos] = useState<{ id: number; text: string; completed: boolean }[]>([]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([{ id: Date.now(), text: newTodo.trim(), completed: false }, ...todos]);
    setNewTodo("");
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-body), sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 999, padding: "6px 6px 6px 20px", marginBottom: 32 }}>
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
          placeholder="What needs to be done?"
          style={{ background: "transparent", border: "none", color: "var(--text-main)", fontSize: 14, outline: "none", flex: 1 }}
        />
        <button
          onClick={addTodo}
          style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg-base)", transition: "transform 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.07)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <Plus size={18} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AnimatePresence>
          {todos.map(todo => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px", background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 12,
                transition: "border-color 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-focus)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-main)"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => toggleTodo(todo.id)}>
                <div style={{ color: todo.completed ? "#4ade80" : "var(--text-muted)", transition: "color 0.2s" }}>
                  {todo.completed ? <Check size={20} /> : <Circle size={20} />}
                </div>
                <span style={{
                  fontSize: 15, color: todo.completed ? "var(--text-muted)" : "var(--text-main)",
                  textDecoration: todo.completed ? "line-through" : "none",
                  transition: "color 0.2s"
                }}>
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {todos.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ textAlign: "center", padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
          >
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg-surface)", border: "1px dashed var(--border-focus)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <Check size={28} opacity={0.5} />
            </div>
            <div>
              <p style={{ color: "var(--text-main)", fontWeight: 600, marginBottom: 4 }}>You're all caught up</p>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Add a task above to get started.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
