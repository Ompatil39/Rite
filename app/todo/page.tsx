"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Trash2, Check, Circle, Loader2, Pencil, ChevronDown } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Static styles — module-level to avoid recreating the string every render
// ---------------------------------------------------------------------------
const TODO_CSS = `
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
  .todo-edit-btn {
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
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
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
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
  }
  .todo-row:hover .todo-edit-btn,
  .todo-row:hover .todo-delete { opacity: 1; }
  .todo-edit-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-main);
    font-size: 15px;
    font-family: var(--font-body), sans-serif;
    line-height: 1.35;
    padding: 0;
    resize: none;
    overflow: hidden;
  }
  .completed-header {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 0;
    user-select: none;
    -webkit-user-select: none;
    color: var(--text-muted);
    transition: color 0.15s;
  }
  .completed-header:hover { color: var(--text-main); }
  @media (max-width: 768px) {
    .todo-page { padding: 0px 16px 88px !important; }
    .todo-row { padding: 14px 14px !important; }
    .todo-edit-btn, .todo-delete { opacity: 1 !important; }
  }
`;

// ---------------------------------------------------------------------------
// TodoRow
// ---------------------------------------------------------------------------
type TodoRowProps = {
  todo: Todo;
  isEditing: boolean;
  editText: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEditStart: (id: string, text: string) => void;
  onEditChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
};

const TodoRow = memo(function TodoRow({
  todo,
  isEditing,
  editText,
  onToggle,
  onDelete,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: TodoRowProps) {
  return (
    <motion.div
      className="todo-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ willChange: "transform, opacity" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-main)")}
    >
      {/* Checkbox — always visible */}
      <button
        type="button"
        className="todo-checkbox"
        onClick={() => onToggle(todo.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          marginTop: 2,
          color: todo.completed ? "#4ade80" : "var(--text-muted)",
          transition: "color 0.2s",
        }}
      >
        {todo.completed ? <Check size={20} /> : <Circle size={20} />}
      </button>

      {/* Text or edit input */}
      {isEditing ? (
        <input
          autoFocus
          className="todo-edit-input"
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onEditSave(); }
            if (e.key === "Escape") onEditCancel();
          }}
          onBlur={onEditSave}
          style={{ fontSize: 15 }}
        />
      ) : (
        <button
          type="button"
          className="todo-row-main"
          onClick={() => onToggle(todo.id)}
        >
          <span
            className="todo-text"
            style={{
              fontSize: 15,
              color: todo.completed ? "var(--text-muted)" : "var(--text-main)",
              textDecoration: todo.completed ? "line-through" : "none",
              transition: "color 0.2s",
            }}
          >
            {todo.text}
          </span>
        </button>
      )}

      {/* Edit button — hidden unless hovered (CSS), not shown for completed */}
      {!todo.completed && !isEditing && (
        <button
          type="button"
          className="todo-edit-btn"
          onClick={() => onEditStart(todo.id, todo.text)}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          title="Edit"
        >
          <Pencil size={15} />
        </button>
      )}

      {/* Delete */}
      {!isEditing && (
        <button
          type="button"
          className="todo-delete"
          onClick={() => onDelete(todo.id)}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      )}
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const supabaseRef = useRef(createClient());
  const todosRef = useRef<Todo[]>([]);

  useEffect(() => { todosRef.current = todos; }, [todos]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadTodos = useCallback(async (userId: string) => {
    const { data } = await supabaseRef.current
      .from("todos")
      .select("id, text, completed, sort_order")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setTodos(data.map((t: any) => ({
        id: t.id, text: t.text, completed: t.completed, sort_order: t.sort_order,
      })));
    }
    setLoading(false);
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = supabaseRef.current;
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) { setUser(u); loadTodos(u.id); }
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); loadTodos(session.user.id); }
      else { setUser(null); setTodos([]); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadTodos]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const addTodo = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const sortOrder = todosRef.current.length;

    if (user) {
      const { data, error } = await supabaseRef.current
        .from("todos")
        .insert({ user_id: user.id, text: trimmed, completed: false, sort_order: sortOrder })
        .select()
        .single();
      if (!error && data) {
        setTodos((prev) => [
          { id: data.id, text: data.text, completed: data.completed, sort_order: data.sort_order },
          ...prev,
        ]);
      }
    } else {
      setTodos((prev) => [
        { id: crypto.randomUUID(), text: trimmed, completed: false, sort_order: prev.length },
        ...prev,
      ]);
    }
  }, [user]);

  // ── Toggle ────────────────────────────────────────────────────────────────
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
      await supabaseRef.current.from("todos").update({ completed: nextCompleted }).eq("id", id);
    }
  }, [user]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
    if (user) await supabaseRef.current.from("todos").delete().eq("id", id);
  }, [user, editingId]);

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = useCallback((id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  const saveEdit = useCallback(async () => {
    const trimmed = editText.trim();
    if (!trimmed || !editingId) { cancelEdit(); return; }
    const id = editingId;
    setEditingId(null);
    setEditText("");
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, text: trimmed } : t));
    if (user) {
      await supabaseRef.current.from("todos").update({ text: trimmed }).eq("id", id);
    }
  }, [editingId, editText, user, cancelEdit]);

  const handleEditChange = useCallback((text: string) => setEditText(text), []);

  // ── Split active / completed ──────────────────────────────────────────────
  const { activeTodos, completedTodos } = useMemo(() => ({
    activeTodos: todos.filter((t) => !t.completed),
    completedTodos: todos.filter((t) => t.completed),
  }), [todos]);

  return (
    <div
      className="page-enter todo-page"
      style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-body), sans-serif" }}
    >
      <style>{TODO_CSS}</style>

      <TodoComposer onAdd={addTodo} />

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 size={24} color="var(--text-muted)" />
          </motion.div>
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Active todos */}
          <AnimatePresence>
            {activeTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                isEditing={editingId === todo.id}
                editText={editText}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onEditStart={startEdit}
                onEditChange={handleEditChange}
                onEditSave={saveEdit}
                onEditCancel={cancelEdit}
              />
            ))}
          </AnimatePresence>

          {/* Empty state — only when no todos at all */}
          {todos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{ textAlign: "center", padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
            >
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg-surface)", border: "1px dashed var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={28} color="var(--accent)" />
              </div>
              <div>
                <p style={{ color: "var(--text-main)", fontWeight: 600, marginBottom: 4 }}>You&apos;re all caught up</p>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Add a task above to get started.</p>
              </div>
            </motion.div>
          )}

          {/* Completed section */}
          {completedTodos.length > 0 && (
            <div style={{ marginTop: activeTodos.length > 0 ? 8 : 0 }}>
              {/* Header */}
              <div
                className="completed-header"
                onClick={() => setCompletedCollapsed((v) => !v)}
              >
                <ChevronDown
                  size={15}
                  style={{
                    flexShrink: 0,
                    transform: completedCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
                <span style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}>
                  COMPLETED
                </span>
                <span style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono), monospace",
                  color: "var(--text-muted)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-main)",
                  borderRadius: 9999,
                  padding: "1px 7px",
                  marginLeft: 2,
                }}>
                  {completedTodos.length}
                </span>
              </div>

              {/* Completed rows */}
              <AnimatePresence>
                {!completedCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4, opacity: 0.65 }}>
                      <AnimatePresence>
                        {completedTodos.map((todo) => (
                          <TodoRow
                            key={todo.id}
                            todo={todo}
                            isEditing={false}
                            editText=""
                            onToggle={toggleTodo}
                            onDelete={deleteTodo}
                            onEditStart={startEdit}
                            onEditChange={handleEditChange}
                            onEditSave={saveEdit}
                            onEditCancel={cancelEdit}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      )}
    </div>
  );
}