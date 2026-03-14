"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import { MONTHS, S } from "./constants";

type HeatmapCalendarProps = {
  habitId: string;
  user: User | null;
  supabase: ReturnType<typeof createClient>;
  heatmapLogs: Record<string, Record<string, number>>;
  setHeatmapLogs: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
};

const STATUS_COLORS: Record<number, string> = {
  0: "var(--pill-none)",
  1: "var(--status-done)",
  2: "var(--status-partial)",
  3: "var(--status-missed)",
};

export default function HeatmapCalendar({
  habitId,
  user,
  supabase,
  heatmapLogs,
  setHeatmapLogs,
}: HeatmapCalendarProps) {
  const [loading, setLoading] = useState(!heatmapLogs[habitId]);
  // Track whether we've already kicked off a fetch for this habitId so that
  // re-renders (e.g. from setHeatmapLogs updating the parent) never trigger
  // a second network request. Previously `heatmapLogs` was in the dep array,
  // so every other habit expanding caused this effect to re-run.
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Already have data or already fetching — bail immediately
    if (!user || heatmapLogs[habitId] || fetchedRef.current) {
      setLoading(false);
      return;
    }

    fetchedRef.current = true;

    const fetchYearData = async () => {
      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const { data } = await supabase
        .from("habit_logs")
        .select("date, status")
        .eq("habit_id", habitId)
        .gte("date", fmt(yearAgo))
        .lte("date", fmt(today));

      const dateMap: Record<string, number> = {};
      (data || []).forEach((log: any) => {
        dateMap[log.date] = log.status;
      });

      setHeatmapLogs((prev) => ({ ...prev, [habitId]: dateMap }));
      setLoading(false);
    };

    fetchYearData();
  // Intentionally omitting heatmapLogs — we only need to check it on mount.
  // Including it caused every sibling habit expansion to re-run this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitId, user, supabase, setHeatmapLogs]);

  const logs = heatmapLogs[habitId] || {};

  // Memoize the week grid — it only changes when logs or habitId changes,
  // not on every parent re-render.
  const { weeks, monthLabels, today } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday

    const weeks: { date: Date; status: number }[][] = [];
    let current = new Date(start);
    let week: { date: Date; status: number }[] = [];

    while (current <= today) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      week.push({ date: new Date(current), status: logs[dateStr] || 0 });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
      current.setDate(current.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);

    let lastMonth = -1;
    const monthLabels = weeks.map((w) => {
      const m = w[0]?.date.getMonth();
      if (m !== undefined && m !== lastMonth) {
        lastMonth = m;
        return MONTHS[m].slice(0, 3);
      }
      return "";
    });

    return { weeks, monthLabels, today };
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: "hidden", marginTop: 8 }}
    >
      <div
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border-main)",
          borderRadius: 10,
          padding: "12px 16px",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 16, color: "var(--text-muted)", fontSize: 12 }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Month labels */}
            <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    fontSize: 9,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* 7-row grid */}
            <div style={{ display: "flex", gap: 2 }}>
              {weeks.map((w, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {w.map((d, di) => (
                    <div
                      key={di}
                      title={`${d.date.toLocaleDateString()}: ${S[d.status]?.label ?? "None"}`}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: STATUS_COLORS[d.status] ?? STATUS_COLORS[0],
                        opacity: d.date > today ? 0.2 : 1,
                        transition: "background 0.15s",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                justifyContent: "flex-end",
              }}
            >
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Less</span>
              {[0, 2, 1].map((s) => (
                <div
                  key={s}
                  style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[s] }}
                />
              ))}
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>More</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}