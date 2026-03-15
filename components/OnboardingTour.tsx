"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

export const TOUR_KEY = "rite_tour_done";
const TOUR_PHASE_KEY = "rite_tour_phase";

type Phase = "welcome" | "pick" | "tour";

type SpotlightStep = {
  target: string;
  title: string;
  body: string;
  position: "above" | "below";
  icon: string;
  shortcut?: string;
  waitForUser?: boolean;
  /** Extra px to shift tooltip away from target (positive = further away) */
  extraOffset?: number;
};

const PICK_STEPS: SpotlightStep[] = [
  {
    target: "suggestions",
    title: "Choose a starter discipline",
    body: "Click any habit below to add it and start your first streak today.",
    position: "below",
    icon: "✦",
    waitForUser: true,
  },
  {
    target: "add-habit",
    title: "Or forge your own",
    body: "Type a habit name, tag it to a category, then press Enter or +.",
    position: "above",
    icon: "✎",
    shortcut: "Enter to add",
    waitForUser: true,
  },
];

const TOUR_STEPS: SpotlightStep[] = [
  {
    target: "sort-buttons",
    title: "Sort your habits",
    body: "Switch between manual order, sort by streak, or by completion rate.",
    position: "below",
    icon: "⇅",
  },
  {
    target: "habit-grid",
    title: "Log your days",
    body: "Click any cell to cycle Done → Partial → Missed. Scroll-wheel works too.",
    position: "below",
    icon: "▦",
    shortcut: "Scroll to cycle",
  },
  {
    target: "habit-cell",
    title: "Add notes",
    body: "Right-click any logged cell to attach a note for that day.",
    position: "above",
    icon: "✎",
    shortcut: "Right-click a cell",
    extraOffset: 48,
  },
  {
    target: "color-dot",
    title: "Colour your habit",
    body: "Click the dot next to a habit name to assign it a colour — shows up across the grid.",
    position: "below",
    icon: "◉",
  },
  {
    target: "category-header",
    title: "Categories",
    body: "Group habits by category. Drag the handle to reorder — habits too.",
    position: "below",
    icon: "⠿",
  },
  {
    target: "add-habit",
    title: "Add more rituals",
    body: "Come back here anytime to name a new habit and tag it to a category.",
    position: "above",
    icon: "✦",
    extraOffset: 36,
  },
];

const ICON_COLORS = ["#c9a227", "#7eb8f7", "#4ade80", "#a78bfa", "#f59e0b", "#c9a227"];

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 12;
const TT_W = 288;

const CSS = `
  @keyframes ot-fade { from{opacity:0} to{opacity:1} }
  @keyframes ot-card { from{opacity:0;transform:translateY(10px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes ot-icon { 0%,100%{transform:scale(1)} 40%{transform:scale(1.22) rotate(-6deg)} 70%{transform:scale(1.1) rotate(4deg)} }
  @keyframes ot-dots { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }

  .ot-overlay {
    position:fixed;inset:0;z-index:9997;
    background:rgba(0,0,0,0.82);
    display:flex;align-items:center;justify-content:center;
    animation:ot-fade 0.25s ease both;
  }
  .ot-welcome-card {
    background:var(--bg-surface,#161618);
    border:1px solid rgba(201,162,39,0.28);
    border-radius:20px;padding:40px 36px 30px;
    width:352px;text-align:center;position:relative;
    box-shadow:0 32px 80px rgba(0,0,0,0.6);
    animation:ot-card 0.38s cubic-bezier(0.16,1,0.3,1) 0.05s both;
  }
  .ot-logo {
    font-family:var(--font-serif,Georgia,serif);
    font-size:40px;font-weight:700;color:var(--accent,#c9a227);
    letter-spacing:0.14em;display:inline-block;margin-bottom:4px;
  }
  .ot-tagline {
    font-family:var(--font-mono,monospace);font-size:10px;
    letter-spacing:0.22em;color:var(--text-muted,#888);margin-bottom:18px;
  }
  .ot-divider {
    width:40px;height:1px;
    background:linear-gradient(90deg,transparent,rgba(201,162,39,0.45),transparent);
    margin:0 auto 18px;
  }
  .ot-desc {
    font-size:13px;color:var(--text-muted,#888);line-height:1.7;
    margin-bottom:24px;font-family:var(--font-body,sans-serif);
  }
  .ot-dot-row { display:flex;justify-content:center;gap:6px;margin-bottom:24px; }
  .ot-dot {
    width:6px;height:6px;border-radius:50%;
    background:var(--accent,#c9a227);
    animation:ot-dots 1.6s ease-in-out infinite;
  }
  .ot-dot:nth-child(2){animation-delay:0.25s}
  .ot-dot:nth-child(3){animation-delay:0.5s}

  .ot-spotlight {
    position:fixed;border-radius:12px;
    box-shadow:
      0 0 0 9999px rgba(0,0,0,0.76),
      0 0 0 2px rgba(201,162,39,0.55),
      0 0 28px rgba(201,162,39,0.14);
    pointer-events:none;
    transition:
      top 0.3s cubic-bezier(0.16,1,0.3,1),
      left 0.3s cubic-bezier(0.16,1,0.3,1),
      width 0.3s cubic-bezier(0.16,1,0.3,1),
      height 0.3s cubic-bezier(0.16,1,0.3,1);
    z-index:9998;
  }
  .ot-tip {
    position:fixed;width:${TT_W}px;
    background:var(--bg-surface,#161618);
    border:1px solid rgba(201,162,39,0.28);
    border-radius:16px;padding:18px 18px 14px;
    z-index:9999;
    box-shadow:0 20px 60px rgba(0,0,0,0.55),0 0 0 1px rgba(201,162,39,0.07);
    transition:top 0.3s cubic-bezier(0.16,1,0.3,1),left 0.3s cubic-bezier(0.16,1,0.3,1);
    animation:ot-card 0.3s cubic-bezier(0.16,1,0.3,1) both;
  }
  .ot-arrow {
    position:absolute;left:50%;transform:translateX(-50%);
    width:0;height:0;
    border-left:7px solid transparent;border-right:7px solid transparent;
  }
  .ot-arrow.top    {bottom:100%;border-bottom:7px solid rgba(201,162,39,0.32)}
  .ot-arrow.bottom {top:100%;   border-top:   7px solid rgba(201,162,39,0.32)}
  .ot-progress-track {
    height:3px;border-radius:99px;
    background:var(--border-main,#242426);
    margin-bottom:14px;overflow:hidden;
  }
  .ot-progress-fill {
    height:100%;border-radius:99px;background:var(--accent,#c9a227);
    transition:width 0.35s cubic-bezier(0.16,1,0.3,1);
  }
  .ot-step-icon {
    font-size:24px;line-height:1;margin-bottom:10px;display:inline-block;
    animation:ot-icon 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .ot-wait-hint {
    display:flex;align-items:center;gap:6px;
    margin-top:10px;padding:7px 10px;
    background:rgba(201,162,39,0.06);border:1px solid rgba(201,162,39,0.18);
    border-radius:8px;font-size:10px;font-family:var(--font-mono,monospace);
    color:var(--accent,#c9a227);letter-spacing:0.06em;
  }
  .ot-shortcut {
    display:inline-flex;align-items:center;gap:4px;margin-top:8px;
    font-size:9px;letter-spacing:0.08em;
    color:var(--text-muted,#888);font-family:var(--font-mono,monospace);
  }
  .ot-shortcut kbd, .ot-kbd-row kbd {
    background:var(--bg-base,#111);
    border:1px solid var(--border-main,#242426);
    border-radius:4px;padding:1px 5px;font-size:9px;
    font-family:var(--font-mono,monospace);color:var(--text-muted,#888);
  }
  .ot-kbd-row {
    display:flex;align-items:center;justify-content:center;gap:4px;
    margin-top:10px;font-size:9px;letter-spacing:0.06em;
    color:var(--text-muted,#888);font-family:var(--font-mono,monospace);
  }
  .ot-btn-primary {
    display:flex;align-items:center;gap:5px;
    background:var(--accent,#c9a227);color:#0a0a0a;
    border:none;border-radius:8px;padding:8px 16px;
    font-size:11px;font-weight:700;letter-spacing:0.08em;
    cursor:pointer;font-family:var(--font-mono,monospace);
    transition:opacity 0.15s,transform 0.12s;
  }
  .ot-btn-primary:hover{opacity:0.88;transform:scale(1.02)}
  .ot-btn-primary.full{width:100%;justify-content:center;padding:11px 0;font-size:12px}
  .ot-btn-ghost {
    display:flex;align-items:center;gap:4px;
    background:none;border:1px solid var(--border-main,#242426);
    color:var(--text-muted,#888);
    border-radius:8px;padding:8px 12px;
    font-size:11px;letter-spacing:0.04em;
    cursor:pointer;font-family:var(--font-mono,monospace);
    transition:border-color 0.15s,color 0.15s;
  }
  .ot-btn-ghost:hover{border-color:var(--accent,#c9a227);color:var(--accent,#c9a227)}
  .ot-btn-skip {
    background:none;border:none;color:var(--text-muted,#888);
    font-size:10px;font-family:var(--font-mono,monospace);
    cursor:pointer;padding:4px 6px;letter-spacing:0.06em;
    transition:color 0.15s;margin-right:auto;
  }
  .ot-btn-skip:hover{color:var(--text-main,#d0d0d0)}
  .ot-dismiss {
    position:absolute;top:13px;right:13px;
    background:none;border:none;color:var(--text-muted,#888);
    cursor:pointer;padding:3px;display:flex;align-items:center;
    transition:color 0.15s;
  }
  .ot-dismiss:hover{color:var(--text-main,#d0d0d0)}
  .ot-welcome-kbd {
    margin-top:12px;font-size:10px;color:var(--text-muted,#888);
    font-family:var(--font-mono,monospace);letter-spacing:0.06em;
  }
  .ot-welcome-kbd kbd {
    background:var(--bg-base,#111);
    border:1px solid var(--border-main,#242426);
    border-radius:4px;padding:1px 5px;font-size:9px;
  }
`;

// ---------------------------------------------------------------------------
// Spotlight — measures target and renders cutout + tip
// ---------------------------------------------------------------------------
function SpotlightView({
  step, stepIndex, totalSteps, iconColor,
  onNext, onPrev, onDismiss, showNav,
}: {
  step: SpotlightStep; stepIndex: number; totalSteps: number; iconColor: string;
  onNext?: () => void; onPrev?: () => void; onDismiss: () => void; showNav: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.target]);

  useEffect(() => {
    const t = setTimeout(measure, 280);
    const upd = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", upd);
    window.addEventListener("scroll", upd, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", upd);
      window.removeEventListener("scroll", upd, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [measure]);

  const TT_H = 170;
  let ttTop = 0, ttLeft = 0;
  let arrowSide: "top" | "bottom" = "top";

  if (rect) {
    const sTop = rect.top - PAD, sLeft = rect.left - PAD;
    const sW = rect.width + PAD * 2, sH = rect.height + PAD * 2;
    const extra = step.extraOffset ?? 0;
    if (step.position === "above") {
      ttTop = sTop - TT_H - 14 - extra; arrowSide = "bottom";
    } else {
      ttTop = sTop + sH + 14 + extra; arrowSide = "top";
    }
    ttLeft = sLeft + sW / 2 - TT_W / 2;
    ttLeft = Math.max(12, Math.min(ttLeft, window.innerWidth - TT_W - 12));
    ttTop  = Math.max(12, Math.min(ttTop,  window.innerHeight - TT_H - 12));
  } else {
    ttTop  = window.innerHeight / 2 - TT_H / 2;
    ttLeft = window.innerWidth  / 2 - TT_W / 2;
  }

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <>
      {rect && (
        <div className="ot-spotlight" style={{
          top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
        }} />
      )}
      <div className="ot-tip" style={{ top: ttTop, left: ttLeft }}>
        {rect && <div className={`ot-arrow ${arrowSide}`} />}
        <button className="ot-dismiss" onClick={onDismiss}><X size={13} /></button>

        <div className="ot-progress-track">
          <div className="ot-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="ot-step-icon" style={{ color: iconColor }}>{step.icon}</div>

        <div style={{ fontFamily: "var(--font-body,sans-serif)", marginBottom: showNav ? 14 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main,#d0d0d0)", marginBottom: 5 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted,#888)", lineHeight: 1.6 }}>
            {step.body}
          </div>
          {step.shortcut && <div className="ot-shortcut"><kbd>{step.shortcut}</kbd></div>}
          {step.waitForUser && (
            <div className="ot-wait-hint">↑ interact above to continue</div>
          )}
        </div>

        {showNav && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {onPrev && <button className="ot-btn-ghost" onClick={onPrev}><ArrowLeft size={11} /> BACK</button>}
              <button className="ot-btn-skip" onClick={onDismiss}>SKIP</button>
              {onNext && (
                <button className="ot-btn-primary" onClick={onNext}>
                  {stepIndex === totalSteps - 1 ? "DONE" : "NEXT"}
                  {stepIndex < totalSteps - 1 && <ArrowRight size={11} />}
                </button>
              )}
            </div>
            <div className="ot-kbd-row">
              <kbd>←</kbd><kbd>→</kbd> navigate &nbsp;·&nbsp; <kbd>Esc</kbd> skip
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
type Props = { isEmpty: boolean };

export default function OnboardingTour({ isEmpty }: Props) {
  const [mounted, setMounted]   = useState(false);
  const [phase, setPhase]       = useState<Phase | "done">("welcome");
  const [pickStep, setPickStep] = useState(0);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || localStorage.getItem(TOUR_KEY)) return;
    const saved = localStorage.getItem(TOUR_PHASE_KEY) as Phase | null;
    if (saved) setPhase(saved);
  }, []);

  const dismiss = useCallback(() => {
    setPhase("done");
    localStorage.setItem(TOUR_KEY, "1");
    localStorage.removeItem(TOUR_PHASE_KEY);
  }, []);

  const goToPick = useCallback(() => {
    setPhase("pick");
    localStorage.setItem(TOUR_PHASE_KEY, "pick");
  }, []);

  const goToTour = useCallback(() => {
    setPhase("tour");
    setTourStep(0);
    localStorage.setItem(TOUR_PHASE_KEY, "tour");
  }, []);

  // When the empty state disappears (habit added) while in "pick" → advance to tour
  useEffect(() => {
    if (!isEmpty && phase === "pick") goToTour();
  }, [isEmpty, phase, goToTour]);

  // Keyboard
  useEffect(() => {
    if (!mounted || phase === "done") return;
    const handler = (e: KeyboardEvent) => {
      if (phase === "welcome") {
        if (e.key === "Enter") goToPick();
        if (e.key === "Escape") dismiss();
      } else if (phase === "pick") {
        if (e.key === "Escape") dismiss();
        if (e.key === "ArrowRight") setPickStep((s) => Math.min(s + 1, PICK_STEPS.length - 1));
        if (e.key === "ArrowLeft")  setPickStep((s) => Math.max(s - 1, 0));
      } else if (phase === "tour") {
        if (e.key === "ArrowRight" || e.key === "Enter") {
          if (tourStep < TOUR_STEPS.length - 1) setTourStep((s) => s + 1);
          else dismiss();
        }
        if (e.key === "ArrowLeft" && tourStep > 0) setTourStep((s) => s - 1);
        if (e.key === "Escape") dismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted, phase, tourStep, dismiss, goToPick]);

  if (!mounted) return null;
  if (typeof window !== "undefined" && localStorage.getItem(TOUR_KEY)) return null;
  if (phase === "done") return null;

  return createPortal(
    <>
      <style>{CSS}</style>

      {phase === "welcome" && (
        <div className="ot-overlay">
          <div className="ot-welcome-card">
            <button className="ot-dismiss" onClick={dismiss}><X size={14} /></button>
            <div className="ot-logo">RITE</div>
            <div className="ot-tagline">BUILD · TRACK · BECOME</div>
            <div className="ot-divider" />
            <p className="ot-desc">
              Build lasting habits through daily rituals.<br />
              Track streaks, log progress, and become<br />who you want to be — one day at a time.
            </p>
            <div className="ot-dot-row">
              <div className="ot-dot" /><div className="ot-dot" /><div className="ot-dot" />
            </div>
            <button className="ot-btn-primary full" onClick={goToPick}>
              SHOW ME AROUND <ArrowRight size={13} />
            </button>
            <div style={{ marginTop: 10 }}>
              <button className="ot-btn-skip" onClick={dismiss}>skip intro</button>
            </div>
            <div className="ot-welcome-kbd">
              <kbd>Enter</kbd> to start &nbsp;·&nbsp; <kbd>Esc</kbd> to skip
            </div>
          </div>
        </div>
      )}

      {phase === "pick" && isEmpty && (
        <SpotlightView
          step={PICK_STEPS[pickStep]}
          stepIndex={pickStep}
          totalSteps={PICK_STEPS.length}
          iconColor={ICON_COLORS[pickStep]}
          onNext={pickStep < PICK_STEPS.length - 1 ? () => setPickStep((s) => s + 1) : undefined}
          onPrev={pickStep > 0 ? () => setPickStep((s) => s - 1) : undefined}
          onDismiss={dismiss}
          showNav={false}
        />
      )}

      {phase === "tour" && !isEmpty && (
        <SpotlightView
          step={TOUR_STEPS[tourStep]}
          stepIndex={tourStep}
          totalSteps={TOUR_STEPS.length}
          iconColor={ICON_COLORS[tourStep % ICON_COLORS.length]}
          onNext={tourStep < TOUR_STEPS.length - 1 ? () => setTourStep((s) => s + 1) : dismiss}
          onPrev={tourStep > 0 ? () => setTourStep((s) => s - 1) : undefined}
          onDismiss={dismiss}
          showNav={true}
        />
      )}
    </>,
    document.body
  );
}