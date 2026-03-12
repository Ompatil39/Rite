"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

type TodoComposerProps = {
  onAdd: (text: string) => void | Promise<void>;
};

function TodoComposer({ onAdd }: TodoComposerProps) {
  const [text, setText] = useState("");
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const syncComposerHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    syncComposerHeight(composerRef.current);
  }, [text]);

  const handleAdd = () => {
    const value = text.trim();
    if (!value) return;
    void onAdd(value);
    setText("");
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
        value={text}
        rows={1}
        onChange={(e) => {
          setText(e.target.value);
          syncComposerHeight(e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAdd();
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
        onClick={handleAdd}
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
