CREATE TABLE IF NOT EXISTS public_exercises (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published', 'archived')),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  instruction TEXT NOT NULL,
  image_uri TEXT,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  license TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public_workout_templates (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published', 'archived')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public_template_exercises (
  template_id TEXT NOT NULL REFERENCES public_workout_templates(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  exercise_id TEXT NOT NULL,
  sets INTEGER NOT NULL CHECK (sets > 0),
  target_reps INTEGER NOT NULL CHECK (target_reps > 0),
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds >= 0),
  weight_kg NUMERIC CHECK (weight_kg IS NULL OR weight_kg >= 0),
  PRIMARY KEY (template_id, position)
);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('exercise', 'workout_template', 'admin_user')),
  resource_id TEXT NOT NULL,
  before_version INTEGER,
  after_version INTEGER,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  roles TEXT[] NOT NULL CHECK (cardinality(roles) > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_exercises_status ON public_exercises(status);
CREATE INDEX IF NOT EXISTS idx_public_templates_status ON public_workout_templates(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON admin_audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
