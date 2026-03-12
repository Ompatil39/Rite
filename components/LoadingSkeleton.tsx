export default function LoadingSkeleton() {
  return (
    <div
      style={{
        background: "transparent",
        color: "inherit",
        fontFamily: "var(--font-body), sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .skeleton-line {
          background: linear-gradient(
            90deg,
            var(--bg-surface) 25%,
            var(--border-main) 50%,
            var(--bg-surface) 75%
          );
          background-size: 800px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>

      <div
        className="page-container"
        style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 88px" }}
      >
        {/* Month nav skeleton */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%" }} />
          <div className="skeleton-line" style={{ width: 160, height: 20 }} />
          <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%" }} />
        </div>

        {/* Habit card skeletons */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-main)",
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div className="skeleton-line" style={{ width: 120 + i * 20, height: 16 }} />
              <div className="skeleton-line" style={{ width: 60, height: 14 }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: 7 }, (_, j) => (
                <div
                  key={j}
                  className="skeleton-line"
                  style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
