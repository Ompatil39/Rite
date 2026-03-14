"use client";

import { useEffect, useRef } from "react";

type DeleteHabitModalProps = {
  habitToDelete: { id: string; name: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteHabitModal({
  habitToDelete,
  onCancel,
  onConfirm,
}: DeleteHabitModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when modal opens (safe default)
  useEffect(() => {
    if (habitToDelete) confirmBtnRef.current?.focus();
  }, [habitToDelete]);

  // Close on Escape
  useEffect(() => {
    if (!habitToDelete) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [habitToDelete, onCancel]);

  if (!habitToDelete) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 800,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        className="delete-modal"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 801,
          background: "var(--bg-surface, #161616)",
          border: "1px solid var(--border-main)",
          borderRadius: 16,
          padding: "24px 24px 20px",
          width: "min(360px, calc(100vw - 32px))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 15,
            }}
          >
            🗑
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "var(--font-body), sans-serif",
              color: "var(--text-main)",
            }}
          >
            Delete habit?
          </h3>
        </div>

        {/* Body */}
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 13,
            fontFamily: "var(--font-body), sans-serif",
            color: "var(--text-muted)",
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: "var(--text-main)", fontWeight: 500 }}>
            "{habitToDelete.name}"
          </strong>{" "}
          and all its logs will be permanently deleted. This cannot be undone.
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 10,
              border: "1px solid var(--border-main)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "var(--font-body), sans-serif",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-focus)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-main)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 10,
              border: "1.5px solid var(--status-missed, #ef4444)",
              background: "rgba(239,68,68,0.1)",
              color: "var(--status-missed, #ef4444)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-body), sans-serif",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
