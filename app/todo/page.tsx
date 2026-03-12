"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Trash2, Check, Circle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import TodoComposer from "@/components/TodoComposer";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  sort_order: number;
};

type TodoRowProps = {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

const TodoRow = memo(function TodoRow({ todo, onToggle, onDelete }: TodoRowProps) {
  return (
    <motion.div
      className="todo-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        willChange: "transform, opacity",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-main)")}
    >
      <button type="button" className="todo-row-main" onClick={() => onToggle(todo.id)}>
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
        onClick={() => onDelete(todo.id)}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
});

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const todosRef = useRef<Todo[]>([]);

  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  // Load todos from Supabase
  const loadTodos = useCallback(async (userId: string) => {
    const { data } = await supabaseRef.current
      .from("todos")
      .select("id, text, completed, sort_order")
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

  // Auth + initial load
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

  // Add todo
  const addTodo = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const sortOrder = todosRef.current.length;

    if (user) {
      const { data, error } = await supabaseRef.current
        .from("todos")
        .insert({
          user_id: user.id,
          text: trimmed,
          completed: false,
          sort_order: sortOrder,
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
        { id: crypto.randomUUID(), text: trimmed, completed: false, sort_order: prev.length },
        ...prev,
      ]);
    }
  }, [user]);

  // Toggle todo
  const toggleTodo = useCallback(async (id: string) => {
    let nextCompleted: boolean | null = null;
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        nextCompleted = !t.completed;
        return { ...t, completed: nextCompleted };
      })
    );
    if (user && nextCompleted !== null) {
      await supabaseRef.current
        .from("todos")
        .update({ completed: nextCompleted })
        .eq("id", id);
    }
  }, [user]);

  // Delete todo
  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (user) {
      await supabaseRef.current.from("todos").delete().eq("id", id);
    }
  }, [user]);

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

      <TodoComposer onAdd={addTodo} />

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
            {todos.map((todo) => (
              <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
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
