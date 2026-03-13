"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, User } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

export default function FloatingNavLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (window.innerWidth <= 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
          setIsVisible(false); // Scroll down
        } else {
          setIsVisible(true); // Scroll up
        }
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const links = useMemo(() => [
    { href: "/", label: "Habits", icon: LayoutDashboard },
    { href: "/todo", label: "To-Do", icon: CheckSquare },
    { href: "/profile", label: "Profile", icon: User },
  ], []);

  return (
    <div className="min-h-screen-stable" style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        .month-nav-slot-root { display: none; }
        @media (max-width: 768px) {
          .theme-toggle-btn {
  top: auto !important;
  bottom: 100px !important;
  right: 19px !important;
}
          .top-left-header { top: 16px !important; left: 16px !important; position: absolute !important; }
          .top-left-header h1 { font-size: 28px !important; }
          .floating-nav {
            top: auto !important;
            bottom: 24px !important;
            width: calc(100% - 32px) !important;
            padding: 8px !important;
          }
          #month-nav-slot, .month-nav-slot-root {
            display: flex !important;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 16px;
            right: 16px;
            z-index: 101;
          }
          .month-nav-pill-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--bg-surface);
            border: 1px solid var(--border-main);
            border-radius: 9999px;
            padding: 4px 10px;
          }
          .floating-nav.nav-hidden {
            transform: translate(-50%, calc(100% + 32px)) !important;
            opacity: 0;
            pointer-events: none;
          }
          .floating-nav.nav-visible {
            transform: translate(-50%, 0) !important;
            opacity: 1;
          }
          .floating-nav nav { width: 100%; justify-content: space-between; }
          .floating-nav a { padding: 8px 12px !important; flex-direction: column; gap: 4px !important; font-size: 11px !important; flex: 1; justify-content: center; }
          .main-content { padding-top: 80px !important; padding-bottom: 100px !important; }
        }
      `}</style>
      {/* Top Left Header */}
      <div className="top-left-header" style={{ position: "absolute", top: 32, left: 36, zIndex: 100 }}>
        <h1 style={{
          fontFamily: "var(--font-display), serif", fontSize: 36,
          letterSpacing: "0.02em", lineHeight: 1, color: "var(--accent)",
          textShadow: "0 0 48px rgba(201,162,39,0.22)",
          margin: 0
        }}>RITE</h1>
        <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "var(--text-muted)", textTransform: "uppercase", fontFamily: "var(--font-mono), monospace", marginTop: 6, margin: "6px 0 0 0" }}>
          Premium Tracking
        </p>
      </div>

      {/* Mobile month nav portal target — hidden on desktop via CSS */}
      <div id="month-nav-slot" className="month-nav-slot-root" />

      {/* Center Floating Nav */}
      <header
        className={`floating-nav ${isVisible ? "nav-visible" : "nav-hidden"}`}
        style={{
          position: "fixed",
          top: 32,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          padding: "6px",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          background: "var(--nav-bg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--border-main)",
          borderRadius: 999,
          zIndex: 100,
          boxShadow: "0 24px 48px var(--shadow-alpha), 0 0 0 1px var(--border-main) inset",
        }}
      >
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
                  color: isActive ? "var(--bg-base)" : "var(--text-muted)",
                  background: isActive ? "var(--accent)" : "transparent",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  fontFamily: "var(--font-body), sans-serif",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isActive ? "0 4px 12px rgba(201,162,39,0.3)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-main)";
                    e.currentTarget.style.background = "var(--bg-surface-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-muted)";
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
        className="main-content"
        style={{
          flex: 1,
          boxSizing: "border-box",
          minHeight: 0,
          paddingTop: 120, // Space for the floating nav and headers
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
    </div>
  );
}