export type Habit = {
  id: string;          // UUID from Supabase
  name: string;
  category: string;
  days: number[];
  sort_order: number;
  createdAt: string;   // ISO date string, e.g. "2025-03-04" — used to blank out pre-creation cells
  color?: string;      // Optional hex color for habit accent e.g. "#4ade80"
};