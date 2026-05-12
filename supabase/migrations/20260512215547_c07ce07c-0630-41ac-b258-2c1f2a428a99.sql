
ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS specific_content text,
  ADD COLUMN IF NOT EXISTS mastery_level integer,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS errors_to_review text;

CREATE TABLE IF NOT EXISTS public.weekly_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  category text NOT NULL,
  day_of_week smallint NOT NULL,
  title text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_items_user_week
  ON public.weekly_plan_items (user_id, week_start);

ALTER TABLE public.weekly_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own weekly plan" ON public.weekly_plan_items;
CREATE POLICY "own weekly plan"
  ON public.weekly_plan_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_weekly_plan_items_updated_at ON public.weekly_plan_items;
CREATE TRIGGER trg_weekly_plan_items_updated_at
  BEFORE UPDATE ON public.weekly_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
