"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LogOut, User, Activity, Flame, CheckCircle2, Zap, Calendar, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { createClient } from "@/utils/supabase/client";
import { TOUR_KEY } from "@/components/OnboardingTour";

type StatsPayload = {
  totalHabits: number;
  longestStreak: number;
  currentStreak: number;
  completionRate: number;
  logsThisMonth: number;
};

// --- Dynamic mini bar chart (Total Habits) ---
function MiniBarChart({ value, max = 10 }: { value: number; max?: number }) {
  const bars = 5;
  const effectiveMax = Math.max(max, value, 1);
  // Each bar represents a "bucket" — last bar always = current value
  const heights = Array.from({ length: bars }, (_, i) => {
    const frac = (i + 1) / bars;
    return Math.round(frac * value);
  });

  return (
    <svg width="60" height="28" viewBox="0 0 60 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {heights.map((h, i) => {
        const barH = Math.max(4, Math.round((h / effectiveMax) * 28));
        const x = i * 13;
        const y = 28 - barH;
        const isLast = i === bars - 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={9}
            height={barH}
            rx={2}
            fill={isLast ? "var(--text-main)" : "var(--text-muted)"}
            opacity={isLast ? 1 : 0.25 + (i / bars) * 0.45}
          />
        );
      })}
    </svg>
  );
}

// --- Dynamic sparkline (Longest Streak) ---
// Draws a rising line whose peak reflects the streak magnitude
function StreakSparkline({ value, color = "var(--accent)" }: { value: number; color?: string }) {
  const W = 60, H = 24;
  // Normalise: clamp to [0,30] days for visual range
  const norm = Math.min(value / 30, 1);
  const points: [number, number][] = [
    [2, H - 4],
    [14, H - 4 - norm * 6],
    [26, H - 4 - norm * 10],
    [38, H - 4 - norm * 16],
    [50, H - 4 - norm * 18],
    [W - 2, H - 4 - norm * (H - 6)],
  ];
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const [cx, cy] = points[points.length - 1];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={d} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={3} fill="var(--bg-surface)" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// --- Dynamic area chart (Completion Rate) ---
function CompletionArea({ value }: { value: number }) {
  const W = 60, H = 24;
  const pct = Math.min(value / 100, 1);
  // Build a smooth area curve where the "height" of the curve reflects pct
  const topY = H - 2 - pct * (H - 4);
  const midY = H - 2 - pct * (H - 8);
  const areaPath = `M0 ${H - 2} L0 ${H - 2 - pct * 6} C15 ${H - 2 - pct * 8} 20 ${midY} 30 ${midY - 2} C40 ${midY - 4} 45 ${topY + 2} ${W} ${topY} L${W} ${H - 2} Z`;
  const linePath = `M0 ${H - 2 - pct * 6} C15 ${H - 2 - pct * 8} 20 ${midY} 30 ${midY - 2} C40 ${midY - 4} 45 ${topY + 2} ${W} ${topY}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-completion" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop stopColor="#4ade80" stopOpacity="0.8" />
          <stop offset="1" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#grad-completion)" opacity={0.2} />
      <path d={linePath} stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// --- Dynamic radial arc (Current Streak) ---
function CurrentStreakArc({ value }: { value: number }) {
  const W = 48, H = 28, R = 20;
  const cx = W / 2, cy = H + 2;
  const norm = Math.min(value / 30, 1);
  const startAngle = Math.PI;
  const endAngle = Math.PI + norm * Math.PI;
  const x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
  const x2 = cx + R * Math.cos(endAngle), y2 = cy + R * Math.sin(endAngle);
  const largeArc = norm > 0.5 ? 1 : 0;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Track */}
      <path
        d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        stroke="var(--text-muted)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity={0.2}
      />
      {/* Fill */}
      {value > 0 && (
        <path
          d={`M${x1} ${y1} A${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// --- Dynamic dots (Logs This Month) ---
function MonthDots({ value, max = 60 }: { value: number; max?: number }) {
  const total = 20;
  const filled = Math.round((Math.min(value, max) / max) * total);
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: total }, (_, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        return (
          <circle
            key={i}
            cx={3 + col * 6}
            cy={6 + row * 12}
            r={2.2}
            fill={i < filled ? "#60a5fa" : "var(--text-muted)"}
            opacity={i < filled ? 0.9 : 0.2}
          />
        );
      })}
    </svg>
  );
}

export default function ProfileDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalHabits: 0,
    longestStreak: 0,
    currentStreak: 0,
    completionRate: 0,
    logsThisMonth: 0,
    loading: true,
  });

  const statsCacheRef = useRef<{ userId: string; data: StatsPayload; ts: number } | null>(null);
  const STATS_CACHE_KEY = "rite.profile.stats";
  const STATS_CACHE_TTL = 60_000;

  const readStatsCache = useCallback((userId: string): StatsPayload | null => {
    const now = Date.now();
    const memory = statsCacheRef.current;
    if (memory && memory.userId === userId && now - memory.ts < STATS_CACHE_TTL) {
      return memory.data;
    }
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { userId: string; data: StatsPayload; ts: number };
      if (parsed.userId === userId && now - parsed.ts < STATS_CACHE_TTL) {
        statsCacheRef.current = parsed;
        return parsed.data;
      }
    } catch (_err) {
      return null;
    }
    return null;
  }, []);

  const writeStatsCache = useCallback((userId: string, data: StatsPayload) => {
    const payload = { userId, data, ts: Date.now() };
    statsCacheRef.current = payload;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify(payload));
    }
  }, []);

  const clearStatsCache = useCallback(() => {
    statsCacheRef.current = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STATS_CACHE_KEY);
    }
  }, []);

  const fetchStats = useCallback(
    async (userId: string) => {
      const cached = readStatsCache(userId);
      if (cached) {
        setStats({ ...cached, loading: false });
        return;
      }
      try {
        setStats((prev) => ({ ...prev, loading: true }));
        const res = await fetch("/api/profile/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load stats");
        const data = await res.json();
        const payload: StatsPayload = {
          totalHabits: data.totalHabits ?? 0,
          longestStreak: data.longestStreak ?? 0,
          currentStreak: data.currentStreak ?? 0,
          completionRate: data.completionRate ?? 0,
          logsThisMonth: data.logsThisMonth ?? 0,
        };
        writeStatsCache(userId, payload);
        setStats({ ...payload, loading: false });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    },
    [readStatsCache, writeStatsCache]
  );

  useEffect(() => {
    const supabase = createClient();
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        setUser(session.user);
        fetchStats(session.user.id);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setUser(session.user);
        fetchStats(session.user.id);
        if (event === "SIGNED_IN") {
          setShowConfirmation(true);
          setTimeout(() => setShowConfirmation(false), 4000);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
        clearStatsCache();
        setStats({
          totalHabits: 0,
          longestStreak: 0,
          currentStreak: 0,
          completionRate: 0,
          logsThisMonth: 0,
          loading: false,
        });
      }
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [fetchStats, clearStatsCache]);

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const statCards = [
    {
      icon: <Activity size={18} />,
      label: "Total Habits",
      color: "var(--text-muted)",
      value: stats.loading ? null : stats.totalHabits,
      suffix: null,
      visual: <MiniBarChart value={stats.totalHabits} />,
    },
    {
      icon: <Flame size={18} />,
      label: "Longest Streak",
      color: "var(--accent)",
      value: stats.loading ? null : stats.longestStreak,
      suffix: <span style={{ fontSize: 16, color: "var(--text-muted)", marginLeft: 8 }}>days</span>,
      visual: <StreakSparkline value={stats.longestStreak} color="var(--accent)" />,
    },
    {
      icon: <CheckCircle2 size={18} />,
      label: "Completion Rate",
      color: "#4ade80",
      value: stats.loading ? null : stats.completionRate,
      suffix: <span style={{ fontSize: 24, color: "var(--text-muted)" }}>%</span>,
      visual: <CompletionArea value={stats.completionRate} />,
    },
    {
      icon: <Zap size={18} />,
      label: "Current Streak",
      color: "var(--accent)",
      value: stats.loading ? null : stats.currentStreak,
      suffix: <span style={{ fontSize: 16, color: "var(--text-muted)", marginLeft: 8 }}>days</span>,
      visual: <CurrentStreakArc value={stats.currentStreak} />,
    },
    {
      icon: <Calendar size={18} />,
      label: "Logs This Month",
      color: "#60a5fa",
      value: stats.loading ? null : stats.logsThisMonth,
      suffix: null,
      visual: <MonthDots value={stats.logsThisMonth} />,
    },
  ];

  const handleReplayTour = () => {
    localStorage.removeItem(TOUR_KEY);
    window.location.href = "/";
  };

  return (
    <div
      className="page-enter profile-page"
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "0px 36px 88px",
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      <style>{`
        .auth-card {
          background: linear-gradient(145deg, var(--bg-surface), var(--bg-surface-hover));
          border: 1px solid rgba(201, 162, 39, 0.12);
          box-shadow:
            0 28px 64px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .auth-icon {
          color: rgba(201, 162, 39, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-title {
          font-size: 28px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 10px;
          letter-spacing: -0.03em;
        }
        .auth-subtitle {
          font-size: 15px;
          color: var(--text-muted);
          max-width: 420px;
          margin: 0 auto;
          line-height: 1.45;
        }
        .auth-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--bg-surface-hover);
          color: var(--text-main);
          border: 1px solid rgba(201, 162, 39, 0.18);
          padding: 14px 28px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 600;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
        }
        .stat-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-main);
          border-radius: 16px;
          padding: 22px 24px 20px;
          transition: border-color 0.15s;
        }
        .stat-card:hover {
          border-color: rgba(201, 162, 39, 0.2);
        }
        @media (max-width: 520px) {
          .profile-page { padding: 0px 16px 88px !important; }
          .auth-card { padding: 52px 24px !important; gap: 22px !important; }
          .auth-title { font-size: 22px !important; }
          .auth-subtitle { font-size: 14px !important; }
          .auth-button { width: 100% !important; }
          .welcome-card {
            padding: 18px !important;
            gap: 14px !important;
            align-items: stretch !important;
            flex-wrap: wrap !important;
          }
          .welcome-avatar { width: 56px !important; height: 56px !important; }
          .welcome-title { font-size: 20px !important; }
          .welcome-subtitle { font-size: 13px !important; }
          .welcome-cta { width: 100% !important; justify-content: center !important; padding: 10px 14px !important; }
        }
      `}</style>

      {!isLoggedIn ? (
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            borderRadius: 24,
            padding: "72px 44px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 32,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="auth-icon"
            style={{ position: "relative", zIndex: 1 }}
          >
            <User size={28} strokeWidth={1.8} />
          </motion.div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 className="auth-title">Your progress, everywhere</h2>
            <p className="auth-subtitle">Secure Google sync for your habits and to-dos.</p>
          </div>

          <motion.button
            className="auth-button"
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleLogin}
            style={{ cursor: "pointer", position: "relative", zIndex: 1, marginTop: 8 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.805 10.023H12.24v3.957h5.484c-.236 1.273-.944 2.351-2.006 3.075v2.554h3.24c1.897-1.747 2.99-4.319 2.99-7.366 0-.719-.065-1.408-.143-2.22Z" fill="#4285F4" />
              <path d="M12.24 23c2.708 0 4.982-.897 6.643-2.437l-3.24-2.554c-.9.603-2.05.959-3.403.959-2.617 0-4.832-1.768-5.625-4.146H3.267v2.635A10.034 10.034 0 0 0 12.24 23Z" fill="#34A853" />
              <path d="M6.615 14.822A5.99 5.99 0 0 1 6.3 12.999c0-.632.11-1.246.315-1.823V8.541H3.267A10.035 10.035 0 0 0 2.2 13c0 1.603.383 3.122 1.067 4.459l3.348-2.637Z" fill="#FBBC04" />
              <path d="M12.24 7.03c1.474 0 2.796.507 3.838 1.503l2.88-2.88C17.218 4.03 14.946 3 12.24 3A10.034 10.034 0 0 0 3.267 8.541l3.348 2.635C7.408 8.798 9.623 7.03 12.24 7.03Z" fill="#EA4335" />
            </svg>
            Continue with Google
          </motion.button>
        </motion.div>
      ) : (
        <div className="profile-container" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <AnimatePresence>
            {showConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid #4ade80",
                  color: "var(--text-main)",
                  padding: "16px 24px",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 8px 24px rgba(74,222,128,0.15)",
                  fontWeight: 500,
                  fontFamily: "var(--font-body), sans-serif",
                }}
              >
                <CheckCircle2 size={20} color="#4ade80" />
                Successfully signed in! Your data is now syncing.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Welcome card — unchanged */}
          <div
            className="welcome-card"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-main)",
              borderRadius: 16,
              padding: 32,
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div
              className="welcome-avatar"
              style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--bg-base)", flexShrink: 0,
              }}
            >
              <User size={32} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="welcome-title" style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>
                Welcome back!
              </h2>
              <p className="welcome-subtitle" style={{ fontSize: 14, color: "var(--text-muted)", overflowWrap: "anywhere" }}>
                {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
            <button
              onClick={handleReplayTour}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "transparent", color: "var(--text-muted)",
                border: "1px solid var(--border-main)", padding: "8px 16px",
                borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
                marginRight: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border-main)";
              }}
            >
              <RotateCcw size={15} />
              Replay Tour
            </button>
            <button
              onClick={handleLogout}
              className="welcome-cta"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "transparent", color: "#ef4444",
                border: "1px solid #ef4444", padding: "8px 16px",
                borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>

          {/* Stat cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {statCards.map((card, idx) => (
              <motion.div
                key={card.label}
                className="stat-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * idx, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Label row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: card.color }}>
                  {card.icon}
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                    {card.label}
                  </span>
                </div>

                {/* Value + visual */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 44, fontWeight: 300, color: "var(--text-main)", lineHeight: 1 }}>
                    {card.value === null ? (
                      <span style={{ fontSize: 28, color: "var(--text-muted)" }}>…</span>
                    ) : (
                      <>
                        {card.value}
                        {card.suffix}
                      </>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 8 }}>
                    {card.visual}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}