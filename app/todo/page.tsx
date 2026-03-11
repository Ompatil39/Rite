"use client";

import { useState } from "react";
import { Plus, Trash2, Check, Circle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Review weekly goals", completed: false },
    { id: 2, text: "Buy groceries", completed: true },
    { id: 3, text: "Call mom", completed: false },
  ]);
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
    <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-outfit), sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", background: "#121212", border: "1px solid #222", borderRadius: 999, padding: "6px 6px 6px 20px", marginBottom: 32 }}>
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
          placeholder="What needs to be done?"
          style={{ background: "transparent", border: "none", color: "#c8c8c8", fontSize: 14, outline: "none", flex: 1 }}
        />
        <button
          onClick={addTodo}
          style={{ width: 38, height: 38, borderRadius: "50%", background: "#c9a227", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a0a", transition: "transform 0.15s" }}
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
                padding: "16px 20px", background: "#121212", border: "1px solid #1c1c1c", borderRadius: 12,
                transition: "border-color 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#333"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1c1c1c"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => toggleTodo(todo.id)}>
                <div style={{ color: todo.completed ? "#4ade80" : "#555", transition: "color 0.2s" }}>
                  {todo.completed ? <Check size={20} /> : <Circle size={20} />}
                </div>
                <span style={{
                  fontSize: 15, color: todo.completed ? "#666" : "#d0d0d0",
                  textDecoration: todo.completed ? "line-through" : "none",
                  transition: "color 0.2s"
                }}>
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.color = "#555"}
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {todos.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 14 }}>
            No tasks yet. Add one above!
          </div>
        )}
      </div>
    </div>
  );
}
