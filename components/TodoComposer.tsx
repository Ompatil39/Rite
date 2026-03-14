"use client";

import { memo, useRef } from "react";
import { Plus } from "lucide-react";

type TodoComposerProps = {
  onAdd: (text: string) => void | Promise<void>;
};

function TodoComposer({ onAdd }: TodoComposerProps) {
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // Guard against multiple simultaneous submissions. Using a ref (not state)
  // so toggling it never triggers a re-render.
  const isSubmittingRef = useRef(false);

  const syncHeight = (element: HTMLTextAreaElement) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      element.style.height = "0px";
      element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
    });
  };

  const handleAdd = async () => {
    if (isSubmittingRef.current) return;
    const el = composerRef.current;
    if (!el) return;
    const value = el.value.trim();
    if (!value) return;

    isSubmittingRef.current = true;
    // Clear the textarea immediately so the UI feels instant
    el.value = "";
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;

    try {
      await onAdd(value);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-main)",
        borderRadius: 24,
        padding: "6px 6px 6px 20px",
        marginBottom: 32,
      }}
    >
      <textarea
        ref={composerRef}
        rows={1}
        onChange={(e) => syncHeight(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleAdd();
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
        onClick={() => void handleAdd()}
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "var(--accent)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--bg-base)",
          transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.07)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

export default memo(TodoComposer);