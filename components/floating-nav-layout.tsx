"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, User } from "lucide-react";

export default function FloatingNavLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Habits", icon: LayoutDashboard },
    { href: "/todo", label: "To-Do", icon: CheckSquare },
    { href: "/profile", label: "Profile", icon: User },
  ];

  let title = "OBSIDIAN";
  let subtitle = "Premium Tracking";
  if (pathname === "/") { title = "HABITS"; subtitle = "Track your daily progress"; }
  else if (pathname === "/todo") { title = "TO-DO"; subtitle = "Manage your tasks"; }
  else if (pathname === "/profile") { title = "PROFILE"; subtitle = "Your Dashboard"; }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <style>{`
        :root.light header {
          background: rgba(255, 255, 255, 0.85) !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 24px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05) inset !important;
        }
        :root.light header nav a { color: #666 !important; }
        :root.light header nav a[style*="background: rgb(201, 162, 39)"] { color: #ffffff !important; }
        :root.light header nav a[style*="background: transparent"]:hover { background: rgba(0,0,0,0.05) !important; color: #171717 !important; }
      `}</style>
      {/* Top Left Header */}
      <div style={{ position: "absolute", top: 32, left: 36, zIndex: 100 }}>
        <h1 style={{
          fontFamily: "var(--font-playfair), serif", fontSize: 36,
          letterSpacing: "0.02em", lineHeight: 1, color: "#c9a227",
          textShadow: "0 0 48px rgba(201,162,39,0.22)",
          margin: 0
        }}>{title}</h1>
        <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#666", textTransform: "uppercase", fontFamily: "var(--font-mono), monospace", marginTop: 6, margin: "6px 0 0 0" }}>
          {subtitle}
        </p>
      </div>

      {/* Center Floating Nav */}
      <header
        style={{
          position: "absolute",
          top: 32,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          padding: "6px",
          background: "rgba(12, 12, 12, 0.65)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 999,
          zIndex: 100,
          boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset",
        }}
      >
        {/* Logo Mark */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 16px 0 10px", borderRight: "1px solid rgba(255,255,255,0.1)", marginRight: 8 }}>
          <div style={{ 
            width: 28, 
            height: 28, 
            borderRadius: "50%", 
            background: "linear-gradient(135deg, #c9a227, #8a6d10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontFamily: "var(--font-playfair), serif",
            fontWeight: 700,
            fontSize: 16,
            boxShadow: "0 2px 8px rgba(201,162,39,0.4)"
          }}>
            O
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: "flex", gap: 4 }}>
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 999,
                  textDecoration: "none",
                  color: isActive ? "#000" : "#a0a0a0",
                  background: isActive ? "#c9a227" : "transparent",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  fontFamily: "var(--font-outfit), sans-serif",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isActive ? "0 4px 12px rgba(201,162,39,0.3)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#a0a0a0";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main
        style={{
          flex: 1,
          paddingTop: 120, // Space for the floating nav and headers
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
    </div>
  );
}
