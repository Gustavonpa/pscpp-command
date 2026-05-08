CREATE TABLE public.garmin_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_date date NOT NULL,
  activity_datetime timestamptz,
  activity_name text,
  activity_type text,
  duration_minutes numeric,
  distance_km numeric,
  average_pace text,
  average_speed_kmh numeric,
  average_heart_rate numeric,
  max_heart_rate numeric,
  calories numeric,
  elevation_gain_meters numeric,
  elevation_loss_meters numeric,
  average_cadence numeric,
  max_cadence numeric,
  training_effect numeric,
  aerobic_training_effect numeric,
  anaerobic_training_effect numeric,
  average_power numeric,
  max_power numeric,
  perceived_effort numeric,
  notes text,
  source text NOT NULL DEFAULT 'garmin_csv',
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX garmin_training_unique_dedupe
  ON public.garmin_training_sessions (user_id, activity_date, COALESCE(activity_type,''), COALESCE(duration_minutes, -1));

CREATE INDEX garmin_training_user_date_idx
  ON public.garmin_training_sessions (user_id, activity_date DESC);

ALTER TABLE public.garmin_training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own garmin trainings"
  ON public.garmin_training_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER garmin_training_sessions_touch
  BEFORE UPDATE ON public.garmin_training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();