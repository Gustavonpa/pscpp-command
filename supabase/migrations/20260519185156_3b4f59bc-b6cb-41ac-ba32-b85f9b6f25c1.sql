-- Dedupe weekly_plan_items keeping earliest created row per (user, week, category, day, title)
DELETE FROM public.weekly_plan_items a
USING public.weekly_plan_items b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.week_start = b.week_start
  AND a.category = b.category
  AND a.day_of_week = b.day_of_week
  AND a.title = b.title;

-- Keep the OLDEST instead (delete newer dupes)
DELETE FROM public.weekly_plan_items a
USING public.weekly_plan_items b
WHERE a.created_at > b.created_at
  AND a.user_id = b.user_id
  AND a.week_start = b.week_start
  AND a.category = b.category
  AND a.day_of_week = b.day_of_week
  AND a.title = b.title;

-- Unique constraint to prevent future duplicates
ALTER TABLE public.weekly_plan_items
  ADD CONSTRAINT weekly_plan_items_unique_per_week
  UNIQUE (user_id, week_start, category, day_of_week, title);