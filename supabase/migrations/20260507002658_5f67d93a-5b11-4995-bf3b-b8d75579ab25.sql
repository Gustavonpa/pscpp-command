
-- Tables for PSCPP Command Center

CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  wake_time TIME,
  sleep_hours NUMERIC(4,2),
  garmin_sleep_score INT,
  energy INT,
  mood INT,
  did_training BOOLEAN DEFAULT false,
  did_study BOOLEAN DEFAULT false,
  phone_before_block BOOLEAN DEFAULT false,
  meal_ready BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  questions INT DEFAULT 0,
  correct INT DEFAULT 0,
  wrong INT DEFAULT 0,
  difficulty TEXT,
  next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  duration_minutes INT,
  distance_km NUMERIC(5,2),
  is_long_run BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.weekly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  rating INT,
  what_worked TEXT,
  what_blocked TEXT,
  biggest_distraction TEXT,
  o2con_progress TEXT,
  o2finance_progress TEXT,
  relationship_quality TEXT,
  next_week_focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: users manage own rows
CREATE POLICY "own checkins" ON public.daily_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own studies" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own trainings" ON public.training_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reviews" ON public.weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
