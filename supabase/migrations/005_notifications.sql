-- ── notifications ──────────────────────────────────────────────
-- Stores in-app notifications, e.g. @mention in a comment.

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid            NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  wedding_id  uuid            NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  task_id     uuid            NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type        text            NOT NULL DEFAULT 'mention',
  message     text,
  read        boolean         NOT NULL DEFAULT false,
  created_at  timestamptz     NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id, read, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (
    wedding_id = public.get_user_wedding_id()
  );

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
