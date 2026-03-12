"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Check, Circle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  sort_order: number;
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const syncComposerHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;

    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  };

  // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Load todos from Supabase ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
  const loadTodos = useCallback(async (userId: string) => {
    const { data } = await supabaseRef.current
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setTodos(
        data.map((t: any) => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          sort_order: t.sort_order,
        }))
      );
    }
    setLoading(false);
  }, []);

  // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Auth + initial load ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
  useEffect(() => {
    const supabase = supabaseRef.current;

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser(u);
        loadTodos(u.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadTodos(session.user.id);
        } else {
          setUser(null);
          setTodos([]);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [loadTodos]);

  // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Add todo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const text = newTodo.trim();

    if (user) {
      const { data, error } = await supabaseRef.current
        .from("todos")
        .insert({
          user_id: user.id,
          text,
          completed: false,
          sort_order: todos.length,
        })
        .select()
        .single();

      if (!error && data) {
        setTodos((prev) => [
          { id: data.id, text: data.text, completed: data.completed, sort_order: data.sort_order },
          ...prev,
        ]);
      }
    } else {
      // Anonymous fallback
      setTodos((prev) => [
        { id: crypto.randomUUID(), text, completed: false, sort_order: prev.length },
        ...prev,
      ]);
    }
    setNewTodo("");
  };

  // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Toggle todo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
  const toggleTodo = async (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    if (user) {
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        await supabaseRef.current
          .from("todos")
          .update({ completed: !todo.completed })
          .eq("id", id);
      }
    }
  };

  // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Delete todo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (user) {
      await supabaseRef.current.from("todos").delete().eq("id", id);
    }
  };

  useEffect(() => {
    syncComposerHeight(composerRef.current);
  }, [newTodo]);

  return (
    <div className="page-enter todo-page" style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-body), sans-serif" }}>
      <style>{`
        .todo-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 20px;
          background: var(--bg-surface);
          border: 1px solid var(--border-main);
          border-radius: 12px;
          transition: border-color 0.2s;
        }

        .todo-row-main {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
          min-width: 0;
          width: 100%;
          padding: 0;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .todo-checkbox {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .todo-text {
          display: block;
          flex: 1;
          min-width: 0;
          line-height: 1.35;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .todo-delete {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          align-self: flex-start;
          flex-shrink: 0;
          padding: 4px;
          margin-top: 2px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .todo-page { padding: 0px 16px 88px !important; }
          .todo-row { padding: 14px 14px !important; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 24, padding: "6px 6px 6px 20px", marginBottom: 32 }}>
        <textarea
          ref={composerRef}
          value={newTodo}
          rows={1}
          onChange={e => {
            setNewTodo(e.target.value);
            syncComposerHeight(e.currentTarget);
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addTodo();
            }
          }}
          placeholder="What needs to be done?"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-main)",
            fontSize: 14,
            outline: "none",
            flex: 1,
            minWidth: 0,
            resize: "none",
            overflow: "hidden",
            minHeight: 38,
            maxHeight: 120,
            lineHeight: 1.4,
            padding: "10px 0 8px",
            fontFamily: "var(--font-body), sans-serif",
          }}
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

      {/* Loading state */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={24} color="var(--text-muted)" />
          </motion.div>
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <AnimatePresence>
            {todos.map(todo => (
              <motion.div
                key={todo.id}
                className="todo-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  willChange: "transform, opacity",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-focus)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-main)"}
              >
                <button
                  type="button"
                  className="todo-row-main"
                  onClick={() => toggleTodo(todo.id)}
                >
                  <div
                    className="todo-checkbox"
                    style={{ color: todo.completed ? "#4ade80" : "var(--text-muted)", transition: "color 0.2s" }}
                  >
                    {todo.completed ? <Check size={20} /> : <Circle size={20} />}
                  </div>
                  <div
                    className="todo-text"
                    style={{
                      fontSize: 15,
                      color: todo.completed ? "var(--text-muted)" : "var(--text-main)",
                      textDecoration: todo.completed ? "line-through" : "none",
                      transition: "color 0.2s",
                    }}
                  >
                    {todo.text}
                  </div>
                </button>
                <button
                  type="button"
                  className="todo-delete"
                  onClick={() => deleteTodo(todo.id)}
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
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg-surface)", border: "1px dashed var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <Check size={28} color="var(--accent)" />
              </div>
              <div>
                <p style={{ color: "var(--text-main)", fontWeight: 600, marginBottom: 4 }}>You&apos;re all caught up</p>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Add a task above to get started.</p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

