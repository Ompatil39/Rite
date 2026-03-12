import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function computeLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const uniqueSorted = Array.from(new Set(dates)).sort();
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueSorted.length; i++) {
    const prev = new Date(`${uniqueSorted[i - 1]}T00:00:00`);
    const curr = new Date(`${uniqueSorted[i]}T00:00:00`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count: habitsCount, error: habitsError } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: totalLogs, error: totalLogsError } = await supabase
    .from("habit_logs")
    .select("id, habits!inner(user_id)", { count: "exact", head: true })
    .eq("habits.user_id", user.id);

  const { count: completedLogs, error: completedLogsError } = await supabase
    .from("habit_logs")
    .select("id, habits!inner(user_id)", { count: "exact", head: true })
    .eq("habits.user_id", user.id)
    .eq("status", 1);

  const { data: completedDates, error: datesError } = await supabase
    .from("habit_logs")
    .select("date, habits!inner(user_id)")
    .eq("habits.user_id", user.id)
    .eq("status", 1);

  if (habitsError || totalLogsError || completedLogsError || datesError) {
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }

  const completionRate = totalLogs && totalLogs > 0
    ? Math.round(((completedLogs ?? 0) / totalLogs) * 100)
    : 0;

  const longestStreak = computeLongestStreak((completedDates ?? []).map((d: any) => d.date));

  return NextResponse.json(
    {
      totalHabits: habitsCount ?? 0,
      longestStreak,
      completionRate,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
