"use client";

import { useState, useEffect } from "react";
import { LogOut, User, Activity, Flame, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { createClient } from "@/utils/supabase/client";

export default function ProfileDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalHabits: 0,
    longestStreak: 0,
    completionRate: 0,
    loading: true
  });

  const fetchStats = async (supabase: any, userId: string) => {
    try {
      // Fetch total habits
      const { count: habitsCount } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Fetch all logs to calculate true longest streak and overall completion
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('*, habits!inner(user_id)')
        .eq('habits.user_id', userId);

      if (logs) {
        const completedLogs = logs.filter((l: any) => l.status === 1).length;
        const totalLogs = logs.length;
        const completionRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0;
        
        // Real longest streak calculation
        const uniqueCompletedDates = [...new Set(
          logs.filter((l: any) => l.status === 1).map((l: any) => l.date)
        )].sort();
        
        let maxStreak = 0;
        if (uniqueCompletedDates.length > 0) {
          let currentStreak = 1;
          maxStreak = 1;
          for (let i = 1; i < uniqueCompletedDates.length; i++) {
            const prevDate = new Date(uniqueCompletedDates[i-1] as string | number);
            const currDate = new Date(uniqueCompletedDates[i] as string | number);
            
            // Handle timezone independent date difference to calculate consecutive days
            const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else if (diffDays > 1) {
              currentStreak = 1;
            }
          }
        }

        setStats({
          totalHabits: habitsCount || 0,
          longestStreak: maxStreak,
          completionRate,
          loading: false
        });
      } else {
        setStats({ totalHabits: habitsCount || 0, longestStreak: 0, completionRate: 0, loading: false });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    const supabase = createClient();

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        setUser(session.user);
        fetchStats(supabase, session.user.id);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setUser(session.user);
        fetchStats(supabase, session.user.id);
        if (event === 'SIGNED_IN') {
          setShowConfirmation(true);
          setTimeout(() => setShowConfirmation(false), 4000);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setStats({ totalHabits: 0, longestStreak: 0, completionRate: 0, loading: false });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
      },
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <div className="page-enter profile-page" style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-body), sans-serif" }}>
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
        @media (max-width: 520px) {
          .profile-page {
            padding: 0px 16px 88px !important;
          }
          .auth-card {
            padding: 52px 24px !important;
            gap: 22px !important;
          }
          .auth-title {
            font-size: 22px !important;
          }
          .auth-subtitle {
            font-size: 14px !important;
          }
          .auth-button {
            width: 100% !important;
          }
          .welcome-card {
            padding: 18px !important;
            gap: 14px !important;
            align-items: stretch !important;
            flex-wrap: wrap !important;
          }
          .welcome-avatar {
            width: 56px !important;
            height: 56px !important;
          }
          .welcome-title {
            font-size: 20px !important;
          }
          .welcome-subtitle {
            font-size: 13px !important;
          }
          .welcome-cta {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px 14px !important;
          }
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
            overflow: "hidden"
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
            <p className="auth-subtitle">
              Secure Google sync for your habits and to-dos.
            </p>
          </div>

          <motion.button
            className="auth-button"
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleLogin}
            style={{ cursor: "pointer", position: "relative", zIndex: 1, marginTop: 8 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.805 10.023H12.24v3.957h5.484c-.236 1.273-.944 2.351-2.006 3.075v2.554h3.24c1.897-1.747 2.99-4.319 2.99-7.366 0-.719-.065-1.408-.143-2.22Z" fill="#4285F4"/>
              <path d="M12.24 23c2.708 0 4.982-.897 6.643-2.437l-3.24-2.554c-.9.603-2.05.959-3.403.959-2.617 0-4.832-1.768-5.625-4.146H3.267v2.635A10.034 10.034 0 0 0 12.24 23Z" fill="#34A853"/>
              <path d="M6.615 14.822A5.99 5.99 0 0 1 6.3 12.999c0-.632.11-1.246.315-1.823V8.541H3.267A10.035 10.035 0 0 0 2.2 13c0 1.603.383 3.122 1.067 4.459l3.348-2.637Z" fill="#FBBC04"/>
              <path d="M12.24 7.03c1.474 0 2.796.507 3.838 1.503l2.88-2.88C17.218 4.03 14.946 3 12.24 3A10.034 10.034 0 0 0 3.267 8.541l3.348 2.635C7.408 8.798 9.623 7.03 12.24 7.03Z" fill="#EA4335"/>
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
                  fontFamily: "var(--font-body), sans-serif"
                }}
              >
                <CheckCircle2 size={20} color="#4ade80" />
                Successfully signed in! Your data is now syncing.
              </motion.div>
            )}
          </AnimatePresence>

          <div className="welcome-card" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 16,
            padding: 32, display: "flex", alignItems: "center", gap: 24
          }}>
            <div className="welcome-avatar" style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg-base)", flexShrink: 0 }}>
              <User size={32} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="welcome-title" style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>Welcome back!</h2>
              <p className="welcome-subtitle" style={{ fontSize: 14, color: "var(--text-muted)", overflowWrap: "anywhere" }}>{user?.user_metadata?.full_name || user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="welcome-cta"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "transparent", color: "#ef4444", border: "1px solid #ef4444",
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "var(--text-muted)" }}>
                <Activity size={18} />
                <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Total Habits</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ fontSize: 48, fontWeight: 300, color: "var(--text-main)", lineHeight: 1 }}>
                  {stats.loading ? "..." : stats.totalHabits}
                </div>
                <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="12" width="8" height="12" rx="2" fill="var(--text-muted)" opacity="0.3"/>
                  <rect x="13" y="8" width="8" height="16" rx="2" fill="var(--text-muted)" opacity="0.5"/>
                  <rect x="26" y="16" width="8" height="8" rx="2" fill="var(--text-muted)" opacity="0.3"/>
                  <rect x="39" y="4" width="8" height="20" rx="2" fill="var(--text-muted)" opacity="0.7"/>
                  <rect x="52" y="0" width="8" height="24" rx="2" fill="var(--text-main)"/>
                </svg>
              </div>
            </div>
            
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "var(--accent)" }}>
                <Flame size={18} />
                <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Longest Streak</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ fontSize: 48, fontWeight: 300, color: "var(--text-main)", lineHeight: 1 }}>
                  {stats.loading ? "..." : stats.longestStreak}
                  <span style={{ fontSize: 16, color: "var(--text-muted)", marginLeft: 8 }}>days</span>
                </div>
                <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 20 L14 16 L26 18 L38 8 L50 12 L58 4" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="58" cy="4" r="3" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="2"/>
                </svg>
              </div>
            </div>

            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "#4ade80" }}>
                <CheckCircle2 size={18} />
                <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Completion Rate</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ fontSize: 48, fontWeight: 300, color: "var(--text-main)", lineHeight: 1 }}>
                  {stats.loading ? "..." : stats.completionRate}
                  <span style={{ fontSize: 24, color: "var(--text-muted)" }}>%</span>
                </div>
                <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 24 L0 16 C15 16 20 8 30 10 C40 12 45 4 60 2 L60 24 Z" fill="url(#grad-completion)" opacity="0.2"/>
                  <path d="M0 16 C15 16 20 8 30 10 C40 12 45 4 60 2" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="grad-completion" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4ade80" stopOpacity="1"/>
                      <stop offset="1" stopColor="#4ade80" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
