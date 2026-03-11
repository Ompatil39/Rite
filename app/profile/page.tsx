"use client";

import { useState, useEffect } from "react";
import { LogIn, LogOut, User, Activity, Flame, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfileDashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Error signing in with Google. Check console for details.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px 0", color: "#888" }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-outfit), sans-serif" }}>
      {!user ? (
        <div style={{
          background: "#121212", border: "1px solid #1c1c1c", borderRadius: 16,
          padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24
        }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
            <User size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#eee", marginBottom: 8 }}>Sign in to sync your data</h2>
            <p style={{ fontSize: 14, color: "#888", maxWidth: 400, margin: "0 auto" }}>
              Connect your Google account to securely save your habits and to-do lists across devices.
            </p>
          </div>
          <button
            onClick={handleLogin}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#fff", color: "#000", border: "none",
              padding: "12px 24px", borderRadius: 999, fontSize: 15, fontWeight: 600,
              cursor: "pointer", transition: "transform 0.15s, background 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
          >
            <LogIn size={18} />
            Sign in with Google
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{
            background: "#121212", border: "1px solid #1c1c1c", borderRadius: 16,
            padding: 32, display: "flex", alignItems: "center", gap: 24
          }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#c9a227", display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a0a" }}>
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <User size={32} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#eee", marginBottom: 4 }}>
                {user.user_metadata?.full_name || "Welcome back!"}
              </h2>
              <p style={{ fontSize: 14, color: "#888" }}>{user.email}</p>
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
            <div style={{ background: "#121212", border: "1px solid #1c1c1c", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "#888" }}>
                <Activity size={18} />
                <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Total Habits</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 300, color: "#eee" }}>5</div>
            </div>
            
            <div style={{ background: "#121212", border: "1px solid #1c1c1c", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "#c9a227" }}>
                <Flame size={18} />
                <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Longest Streak</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 300, color: "#eee" }}>12<span style={{ fontSize: 16, color: "#888", marginLeft: 8 }}>days</span></div>
            </div>

            <div style={{ background: "#121212", border: "1px solid #1c1c1c", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "#4ade80" }}>
                <CheckCircle2 size={18} />
                <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Completion Rate</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 300, color: "#eee" }}>84<span style={{ fontSize: 24, color: "#888" }}>%</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
