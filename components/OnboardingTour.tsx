"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight } from "lucide-react";

const TOUR_KEY = "rite_tour_done";

type Step = {
  target: string; // data-tour value
  title: string;
  body: string;
  position: "above" | "below";
};

const STEPS: Step[] = [
  {
    target: "add-habit",
    title: "Start your first ritual",
    body: "Name a habit, tag it to a category, then press Enter or + to add it.",
    position: "above",
  },
  {
    target: "sort-buttons",
    title: "Sort your habits",
    body: "Switch between manual order, sort by streak, or by completion rate.",
    position: "below",
  },
  {
    target: "habit-grid",
    title: "Your habit grid",
    body: "Click any cell to cycle through Done, Partial, or Missed. Scroll-wheel works too.",
    position: "below",
  },
  {
    target: "category-header",
    title: "Categories",
    body: "Group habits by category. Drag the handle to reorder — habits too.",
    position: "below",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 10;

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && !localStorage.getItem(TOUR_KEY)) {
      // Small delay so the page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const measureTarget = useCallback((target: string) => {
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  // Re-measure on step change and on scroll/resize
  useEffect(() => {
    if (!visible) return;
    measureTarget(STEPS[step].target);

    const update = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measureTarget(STEPS[step].target));
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, step, measureTarget]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(TOUR_KEY, "1");
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  if (!mounted || !visible) return null;

  const current = STEPS[step];

  // Tooltip dimensions (estimated)
  const TT_W = 280;
  const TT_H = 110;

  // Compute tooltip position
  let ttTop = 0;
  let ttLeft = 0;
  let arrowSide: "top" | "bottom" = "top";

  if (rect) {
    const spotLeft = rect.left - PAD;
    const spotTop = rect.top - PAD;
    const spotW = rect.width + PAD * 2;
    const spotH = rect.height + PAD * 2;

    if (current.position === "below") {
      ttTop = spotTop + spotH + 14;
      arrowSide = "top";
    } else {
      ttTop = spotTop - TT_H - 14;
      arrowSide = "bottom";
    }

    ttLeft = spotLeft + spotW / 2 - TT_W / 2;
    // clamp within viewport
    ttLeft = Math.max(12, Math.min(ttLeft, window.innerWidth - TT_W - 12));
  } else {
    // No target found yet — center on screen
    ttTop = window.innerHeight / 2 - TT_H / 2;
    ttLeft = window.innerWidth / 2 - TT_W / 2;
    arrowSide = "top";
  }

  return createPortal(
    <>
      {/* CSS */}
      <style>{`
        @keyframes tourFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tourCardIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .tour-overlay {
          animation: tourFadeIn 0.25s ease both;
        }
        .tour-card {
          animation: tourCardIn 0.28s cubic-bezier(0.16,1,0.3,1) both;
        }
        .tour-spotlight {
          position: fixed;
          border-radius: 12px;
          box-shadow:
            0 0 0 9999px rgba(0,0,0,0.72),
            0 0 0 2px rgba(201,162,39,0.55),
            0 0 20px rgba(201,162,39,0.15);
          pointer-events: none;
          transition: top 0.3s cubic-bezier(0.16,1,0.3,1),
                      left 0.3s cubic-bezier(0.16,1,0.3,1),
                      width 0.3s cubic-bezier(0.16,1,0.3,1),
                      height 0.3s cubic-bezier(0.16,1,0.3,1);
          z-index: 9998;
        }
        .tour-card {
          position: fixed;
          width: ${TT_W}px;
          background: var(--bg-surface, #161618);
          border: 1px solid rgba(201,162,39,0.35);
          border-radius: 14px;
          padding: 16px 18px 14px;
          z-index: 9999;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,162,39,0.1);
          transition: top 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .tour-arrow {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
        }
        .tour-arrow.top {
          bottom: 100%;
          border-bottom: 7px solid rgba(201,162,39,0.35);
        }
        .tour-arrow.bottom {
          top: 100%;
          border-top: 7px solid rgba(201,162,39,0.35);
        }
        .tour-btn-next {
          display: flex; align-items: center; gap: 5px;
          background: var(--accent, #c9a227);
          color: #0a0a0a;
          border: none; border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          transition: opacity 0.15s, transform 0.12s;
        }
        .tour-btn-next:hover { opacity: 0.88; transform: scale(1.03); }
        .tour-btn-skip {
          background: none; border: none;
          color: var(--text-muted, #888);
          font-size: 11px;
          font-family: var(--font-mono, monospace);
          cursor: pointer;
          padding: 6px 8px;
          letter-spacing: 0.06em;
          transition: color 0.15s;
        }
        .tour-btn-skip:hover { color: var(--text-main, #d0d0d0); }
        .tour-dismiss {
          position: absolute; top: 10px; right: 10px;
          background: none; border: none;
          color: var(--text-muted, #888);
          cursor: pointer; padding: 2px;
          display: flex; align-items: center;
          transition: color 0.15s;
        }
        .tour-dismiss:hover { color: var(--text-main, #d0d0d0); }
      `}</style>

      {/* Spotlight cutout */}
      {rect && (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="tour-card"
        style={{ top: ttTop, left: ttLeft }}
      >
        {/* Arrow — only shown when spotlight target exists */}
        {rect && <div className={`tour-arrow ${arrowSide}`} />}

        {/* Dismiss X */}
        <button className="tour-dismiss" onClick={dismiss} aria-label="Close tour">
          <X size={13} />
        </button>

        {/* Step counter */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 16 : 5,
                height: 5,
                borderRadius: 99,
                background: i === step ? "var(--accent, #c9a227)" : "var(--border-main, #242426)",
                transition: "width 0.25s ease, background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ fontFamily: "var(--font-body, sans-serif)", marginBottom: 14 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-main, #d0d0d0)",
            marginBottom: 5,
            letterSpacing: "0.01em",
          }}>
            {current.title}
          </div>
          <div style={{
            fontSize: 12,
            color: "var(--text-muted, #888)",
            lineHeight: 1.55,
          }}>
            {current.body}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="tour-btn-skip" onClick={dismiss}>SKIP</button>
          <button className="tour-btn-next" onClick={next}>
            {step === STEPS.length - 1 ? "DONE" : "NEXT"}
            {step < STEPS.length - 1 && <ArrowRight size={12} />}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}