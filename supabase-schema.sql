-- Rite: Database migration to align with app code
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Your existing tables: habits, habit_logs, todos, profiles
-- This migration ONLY adds missing columns + constraints. Safe to re-run.

-- ══════════════════════════════════════════════════════
-- 1. ADD sort_order TO habits (used for drag-and-drop ordering)
-- ══════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE habits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════
-- 2. ADD sort_order TO todos (used for ordering)
-- ══════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE todos ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════
-- 3. UNIQUE constraint on habit_logs (habit_id, date)
--    Needed for upsert conflict resolution
-- ══════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'habit_logs_habit_id_date_key'
  ) THEN
    ALTER TABLE habit_logs ADD CONSTRAINT habit_logs_habit_id_date_key UNIQUE (habit_id, date);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════
-- 4. INDEXES (safe to re-run, uses IF NOT EXISTS)
-- ══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

-- ══════════════════════════════════════════════════════
-- 5. ROW-LEVEL SECURITY (idempotent — drops & recreates)
-- ══════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- HABITS policies
DROP POLICY IF EXISTS "Users can view own habits" ON habits;
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own habits" ON habits;
CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own habits" ON habits;
CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own habits" ON habits;
CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE USING (auth.uid() = user_id);

-- HABIT_LOGS policies
DROP POLICY IF EXISTS "Users can view own habit logs" ON habit_logs;
CREATE POLICY "Users can view own habit logs"
  ON habit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_logs.habit_id AND habits.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own habit logs" ON habit_logs;
CREATE POLICY "Users can insert own habit logs"
  ON habit_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_logs.habit_id AND habits.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own habit logs" ON habit_logs;
CREATE POLICY "Users can update own habit logs"
  ON habit_logs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_logs.habit_id AND habits.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own habit logs" ON habit_logs;
CREATE POLICY "Users can delete own habit logs"
  ON habit_logs FOR DELETE USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_logs.habit_id AND habits.user_id = auth.uid())
  );

-- TODOS policies
DROP POLICY IF EXISTS "Users can view own todos" ON todos;
CREATE POLICY "Users can view own todos"
  ON todos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own todos" ON todos;
CREATE POLICY "Users can insert own todos"
  ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own todos" ON todos;
CREATE POLICY "Users can update own todos"
  ON todos FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own todos" ON todos;
CREATE POLICY "Users can delete own todos"
  ON todos FOR DELETE USING (auth.uid() = user_id);
