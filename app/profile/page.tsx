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
            const prevDate = new Date(uniqueCompletedDates[i-1]);
            const currDate = new Date(uniqueCompletedDates[i]);
            
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
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-main)", borderRadius: 16,
          padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24
        }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <User size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", marginBottom: 8 }}>Sign in to sync your data</h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
              Connect your Google account to securely save your habits and to-do lists across devices.
            </p>
          </div>
          <button
            onClick={handleLogin}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--text-main)", color: "var(--bg-base)", border: "none",
              padding: "12px 24px", borderRadius: 999, fontSize: 15, fontWeight: 600,
              cursor: "pointer", transition: "transform 0.15s, filter 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.9)"}
            onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
          >
            <LogIn size={18} />
            Sign in with Google
          </button>
        </div>
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
