/*
# Create interview_sessions table

1. New Tables
- `interview_sessions`
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (text, not null — stores Clerk user ID)
  - `target_role` (text, the role the candidate is interviewing for)
  - `interview_type` (text, the interview mode label)
  - `transcript` (jsonb, the full chat transcript)
  - `evaluation` (jsonb, the AI evaluation result)
  - `created_at` (timestamptz, default now)
2. Security
- Enable RLS on `interview_sessions`.
- Owner-scoped CRUD: each authenticated user can only access their own sessions.
- Policies use `user_id` column for ownership checks.
3. Notes
- The app uses Clerk (not Supabase Auth) for authentication, so user_id is a text column
  storing the Clerk user ID rather than a uuid referencing auth.users.
- The server-side evaluate route inserts using the service role key, which bypasses RLS.
- SELECT policies allow authenticated users to read their own sessions by matching user_id.
*/

CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  target_role text NOT NULL,
  interview_type text NOT NULL,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  evaluation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON interview_sessions;
CREATE POLICY "select_own_sessions" ON interview_sessions FOR SELECT
  TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON interview_sessions;
CREATE POLICY "insert_own_sessions" ON interview_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON interview_sessions;
CREATE POLICY "update_own_sessions" ON interview_sessions FOR UPDATE
  TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON interview_sessions;
CREATE POLICY "delete_own_sessions" ON interview_sessions FOR DELETE
  TO authenticated USING (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON interview_sessions (created_at DESC);
