"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, FolderOpen, ArrowRight } from "lucide-react";

type DeleteCategoryModalProps = {
  categoryToDelete: string | null;
  habitCount?: number; // how many habits live in this category
  onCancel: () => void;
  onConfirm: () => void;
};

// Spring preset reused across children
const SPRING = { type: "spring" as const, stiffness: 380, damping: 28 };

export default function DeleteCategoryModal({
  categoryToDelete,
  habitCount = 0,
  onCancel,
  onConfirm,
}: DeleteCategoryModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  // Auto-focus cancel (safer default) when modal opens
  useEffect(() => {
    if (categoryToDelete) {
      const t = setTimeout(() => cancelRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [categoryToDelete]);

  // Focus trap: Tab cycles only between the two buttons
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onCancel(); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      if (document.activeElement === cancelRef.current) {
        deleteRef.current?.focus();
      } else {
        cancelRef.current?.focus();
      }
    }
  };

  const pluralHabits = habitCount === 1 ? "1 habit" : `${habitCount} habits`;

  return (
    <>
      <style>{`
        .dcm-overlay {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          z-index: 999999;
          padding: 16px;
        }
        .dcm-backdrop {
          position: absolute; inset: 0;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .dcm-card {
          position: relative;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 20px;
          width: 100%; max-width: 420px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 32px 64px rgba(0,0,0,0.6),
            0 8px 24px rgba(0,0,0,0.4);
          overflow: hidden;
          outline: none;
        }

        /* Danger stripe at top */
        .dcm-danger-bar {
          height: 3px;
          background: linear-gradient(90deg, #ef4444 0%, #f97316 100%);
          opacity: 0.85;
        }

        .dcm-body { padding: 28px 28px 24px; }

        /* Icon badge */
        .dcm-icon-wrap {
          width: 48px; height: 48px;
          border-radius: 14px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .dcm-title {
          font-size: 18px; font-weight: 650;
          color: var(--text-main, #ececec);
          font-family: var(--font-display, serif);
          letter-spacing: -0.01em;
          margin-bottom: 8px;
          line-height: 1.25;
        }

        .dcm-body-text {
          font-size: 14px; line-height: 1.6;
          color: var(--text-muted, #666);
          font-family: var(--font-body, sans-serif);
          margin-bottom: 20px;
        }

        /* Category name chip */
        .dcm-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 3px 9px;
          font-size: 13px; font-weight: 600;
          color: var(--text-main, #ececec);
          font-family: var(--font-body, sans-serif);
          white-space: nowrap;
          max-width: 240px;
          overflow: hidden; text-overflow: ellipsis;
          vertical-align: middle;
          margin: 0 2px;
        }

        /* Consequence callout */
        .dcm-consequence {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 24px;
        }
        .dcm-consequence-icon {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px; opacity: 0.45;
        }
        .dcm-consequence-text {
          font-size: 12.5px;
          color: var(--text-muted, #666);
          font-family: var(--font-mono, monospace);
          letter-spacing: 0.01em;
          line-height: 1.5;
        }
        .dcm-consequence-text strong {
          color: var(--text-main, #ececec);
          font-weight: 600;
        }

        /* Buttons */
        .dcm-actions {
          display: flex; align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .dcm-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 13.5px; font-weight: 600;
          font-family: var(--font-body, sans-serif);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s, transform 0.1s, border-color 0.15s;
          outline: none;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .dcm-btn:active { transform: scale(0.97); }
        .dcm-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--accent, #c9a227);
        }

        .dcm-btn-cancel {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted, #888);
        }
        .dcm-btn-cancel:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.18);
          color: var(--text-main, #ececec);
        }

        .dcm-btn-delete {
          background: #ef4444;
          border: 1px solid transparent;
          color: #fff;
          box-shadow: 0 4px 12px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .dcm-btn-delete:hover {
          background: #dc2626;
          box-shadow: 0 6px 18px rgba(239,68,68,0.38), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .dcm-btn-delete:focus-visible {
          box-shadow: 0 0 0 2px #f87171, 0 6px 18px rgba(239,68,68,0.38);
        }

        /* ── Light mode ───────────────────────────────────────── */
        :root.light .dcm-card {
          background: #ffffff;
          border-color: #e5e5e0;
          box-shadow: 0 32px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06);
        }
        :root.light .dcm-chip {
          background: rgba(0,0,0,0.04);
          border-color: rgba(0,0,0,0.1);
        }
        :root.light .dcm-consequence {
          background: rgba(0,0,0,0.025);
          border-color: rgba(0,0,0,0.08);
        }
        :root.light .dcm-btn-cancel {
          border-color: #ddd;
          color: #74746e;
        }
        :root.light .dcm-btn-cancel:hover {
          background: #f5f5f3;
          border-color: #ccc;
          color: #1a1a18;
        }

        @media (max-width: 480px) {
          .dcm-card  { border-radius: 16px; }
          .dcm-body  { padding: 22px 20px 20px; }
          .dcm-actions { flex-direction: column-reverse; }
          .dcm-btn   { width: 100%; justify-content: center; }
        }
      `}</style>

      <AnimatePresence>
        {categoryToDelete && (
          <div className="dcm-overlay" onKeyDown={handleKeyDown}>
            {/* Backdrop */}
            <motion.div
              className="dcm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCancel}
            />

            {/* Card */}
            <motion.div
              className="dcm-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="dcm-title"
              aria-describedby="dcm-desc"
              tabIndex={-1}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={SPRING}
            >
              {/* Top danger stripe */}
              <div className="dcm-danger-bar" />

              <div className="dcm-body">

                {/* Icon + title */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.05 }}
                >
                  <div className="dcm-icon-wrap">
                    <Trash2 size={22} color="#ef4444" strokeWidth={1.8} />
                  </div>
                  <h3 className="dcm-title" id="dcm-title">
                    Delete category
                  </h3>
                </motion.div>

                {/* Description with inline category chip */}
                <motion.p
                  className="dcm-body-text"
                  id="dcm-desc"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.09 }}
                >
                  You're about to delete{" "}
                  <span className="dcm-chip">
                    <FolderOpen size={12} strokeWidth={2} />
                    {categoryToDelete}
                  </span>
                  . This action cannot be undone.
                </motion.p>

                {/* Consequence callout */}
                <motion.div
                  className="dcm-consequence"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.13 }}
                >
                  <span className="dcm-consequence-icon">
                    <ArrowRight size={14} strokeWidth={2.2} />
                  </span>
                  <span className="dcm-consequence-text">
                    {habitCount > 0 ? (
                      <>
                        <strong>{pluralHabits}</strong> will be moved to{" "}
                        <strong>Uncategorized</strong> — no tracking data will be lost.
                      </>
                    ) : (
                      <>This category is empty. Nothing else will be affected.</>
                    )}
                  </span>
                </motion.div>

                {/* Buttons */}
                <motion.div
                  className="dcm-actions"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.16 }}
                >
                  <button
                    ref={cancelRef}
                    className="dcm-btn dcm-btn-cancel"
                    onClick={onCancel}
                  >
                    Cancel
                  </button>
                  <button
                    ref={deleteRef}
                    className="dcm-btn dcm-btn-delete"
                    onClick={onConfirm}
                  >
                    <Trash2 size={14} strokeWidth={2.2} />
                    Delete category
                  </button>
                </motion.div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
