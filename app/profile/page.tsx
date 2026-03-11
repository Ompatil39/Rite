"use client";

import { useState, useEffect } from "react";
import { LogIn, LogOut, User, Activity, Flame, CheckCircle2 } from "lucide-react";
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
    <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-body), sans-serif" }}>
      {!isLoggedIn ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: "linear-gradient(145deg, var(--bg-surface), var(--bg-surface-hover))",
            border: "1px solid var(--border-main)",
            borderRadius: 24,
            padding: "56px 40px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            boxShadow: "0 24px 48px var(--shadow-alpha)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Subtle background glow */}
          <div style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
            height: 300,
            background: "var(--accent)",
            opacity: 0.08,
            filter: "blur(60px)",
            borderRadius: "50%",
            pointerEvents: "none"
          }} />

          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.2 }}
            style={{ 
              width: 80, height: 80, borderRadius: "50%", 
              background: "var(--bg-base)", border: "1px solid var(--border-main)",
              display: "flex", alignItems: "center", justifyContent: "center", 
              color: "var(--accent)",
              boxShadow: "0 8px 16px var(--shadow-alpha)"
            }}
          >
            <User size={32} />
          </motion.div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: "var(--text-main)", marginBottom: 12, letterSpacing: "-0.02em" }}>Sign in to sync your data</h2>
            <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto", lineHeight: 1.5 }}>
              Connect your Google account to securely save your habits and to-do lists across devices. Never lose your streaks again.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--text-main)", color: "var(--bg-base)", border: "none",
              padding: "14px 28px", borderRadius: 999, fontSize: 15, fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
              position: "relative", zIndex: 1,
              marginTop: 8
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.73 22.36 10H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.93 3.28-4.78 3.28-8.32z" fill="currentColor"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.05-3.71 1.05-2.86 0-5.28-1.93-6.14-4.52H2.18v2.84C4.01 20.61 7.72 23 12 23z" fill="currentColor"/>
              <path d="M5.86 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.53 1 10.21 1 12s.43 3.47 1.18 4.96l3.68-2.84z" fill="currentColor"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.72 1 4.01 3.39 2.18 7.04l3.68 2.84c.86-2.59 3.28-4.5 6.14-4.5z" fill="currentColor"/>
            </svg>
            Continue with Google
          </motion.button>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
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

          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 16,
            padding: 32, display: "flex", alignItems: "center", gap: 24
          }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg-base)" }}>
              <User size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>Welcome back!</h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{user?.user_metadata?.full_name || user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
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
