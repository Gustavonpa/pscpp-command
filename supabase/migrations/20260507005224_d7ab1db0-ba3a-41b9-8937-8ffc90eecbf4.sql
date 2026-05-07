CREATE TABLE public.garmin_sleep_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  sleep_score numeric,
  resting_heart_rate numeric,
  body_battery numeric,
  respiration numeric,
  hrv_status text,
  sleep_quality text,
  sleep_duration text,
  sleep_need text,
  bedtime text,
  wake_time text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.garmin_sleep_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own garmin sleep" ON public.garmin_sleep_metrics
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_garmin_sleep_updated
  BEFORE UPDATE ON public.garmin_sleep_metrics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_garmin_sleep_user_date ON public.garmin_sleep_metrics (user_id, date DESC);