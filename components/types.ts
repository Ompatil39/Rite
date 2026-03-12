export type Habit = {
  id: string;          // UUID from Supabase
  name: string;
  category: string;
  days: number[];
  sort_order: number;
};
