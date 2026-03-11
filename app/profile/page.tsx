"use client";

import { useState, useEffect } from "react";
import { LogIn, LogOut, User, Activity, Flame, CheckCircle2 } from "lucide-react";

export default function ProfileDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsLoggedIn(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto", padding: "0px 36px 88px", fontFamily: "var(--font-outfit), sans-serif" }}>
      {!isLoggedIn ? (
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
              <User size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#eee", marginBottom: 4 }}>Welcome back!</h2>
              <p style={{ fontSize: 14, color: "#888" }}>user@example.com</p>
            </div>
            <button
              onClick={() => setIsLoggedIn(false)}
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
