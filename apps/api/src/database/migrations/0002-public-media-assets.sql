CREATE TABLE IF NOT EXISTS public_media_assets (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES public_exercises(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
  distribution_scope TEXT NOT NULL CHECK (distribution_scope IN ('personal', 'public')),
  uri TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  license TEXT NOT NULL,
  attribution TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_media_exercise ON public_media_assets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_public_media_review ON public_media_assets(review_status, distribution_scope);

ALTER TABLE admin_audit_events
  DROP CONSTRAINT IF EXISTS admin_audit_events_resource_type_check;
ALTER TABLE admin_audit_events
  ADD CONSTRAINT admin_audit_events_resource_type_check
  CHECK (resource_type IN ('exercise', 'workout_template', 'admin_user', 'media_asset'));
