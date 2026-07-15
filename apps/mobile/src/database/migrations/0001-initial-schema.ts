export const INITIAL_SCHEMA_SQL = `
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_en TEXT,
  exercise_type TEXT NOT NULL DEFAULT 'strength',
  primary_muscle_group TEXT NOT NULL,
  secondary_muscle_groups_json TEXT,
  equipment TEXT NOT NULL,
  description TEXT,
  image_uri TEXT,
  source_name TEXT,
  source_reference TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_exercises_name_zh
ON exercises(name_zh);

CREATE INDEX idx_exercises_name_en
ON exercises(name_en);

CREATE INDEX idx_exercises_muscle_equipment
ON exercises(primary_muscle_group, equipment);

CREATE INDEX idx_exercises_active
ON exercises(is_active);

CREATE TABLE workout_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX idx_workout_templates_status
ON workout_templates(status);

CREATE INDEX idx_workout_templates_updated_at
ON workout_templates(updated_at DESC);

CREATE TABLE workout_template_exercises (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  target_sets INTEGER NOT NULL,
  target_reps_min INTEGER NOT NULL,
  target_reps_max INTEGER NOT NULL,
  rest_seconds INTEGER NOT NULL,
  group_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (template_id)
    REFERENCES workout_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (exercise_id)
    REFERENCES exercises(id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_template_exercise_position
ON workout_template_exercises(template_id, position);

CREATE INDEX idx_template_exercises_template
ON workout_template_exercises(template_id);

CREATE INDEX idx_template_exercises_exercise
ON workout_template_exercises(exercise_id);

CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  source_template_id TEXT,
  name_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  daily_status TEXT,
  started_at TEXT,
  ended_at TEXT,
  note TEXT,
  current_session_exercise_id TEXT,
  current_set_number INTEGER,
  was_edited INTEGER NOT NULL DEFAULT 0,
  edited_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (source_template_id)
    REFERENCES workout_templates(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_sessions_status
ON workout_sessions(status);

CREATE INDEX idx_sessions_started_at
ON workout_sessions(started_at DESC);

CREATE INDEX idx_sessions_template
ON workout_sessions(source_template_id);

CREATE INDEX idx_sessions_deleted
ON workout_sessions(is_deleted);

CREATE TABLE workout_session_exercises (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name_snapshot TEXT NOT NULL,
  primary_muscle_group_snapshot TEXT,
  equipment_snapshot TEXT,
  position INTEGER NOT NULL,
  target_sets INTEGER NOT NULL,
  target_reps_min INTEGER NOT NULL,
  target_reps_max INTEGER NOT NULL,
  rest_seconds INTEGER NOT NULL,
  group_key TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  is_skipped INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_id)
    REFERENCES workout_sessions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (exercise_id)
    REFERENCES exercises(id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_session_exercise_position
ON workout_session_exercises(session_id, position);

CREATE INDEX idx_session_exercises_session
ON workout_session_exercises(session_id);

CREATE INDEX idx_session_exercises_exercise
ON workout_session_exercises(exercise_id);

CREATE TABLE workout_sets (
  id TEXT PRIMARY KEY,
  session_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal',
  weight_value REAL,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  reps INTEGER,
  is_completed INTEGER NOT NULL DEFAULT 1,
  is_extra INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  was_edited INTEGER NOT NULL DEFAULT 0,
  edited_at TEXT,
  completed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_exercise_id)
    REFERENCES workout_session_exercises(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_set_number_active
ON workout_sets(session_exercise_id, set_number)
WHERE is_deleted = 0;

CREATE INDEX idx_sets_session_exercise
ON workout_sets(session_exercise_id);

CREATE INDEX idx_sets_completed_at
ON workout_sets(completed_at DESC);

CREATE INDEX idx_sets_deleted
ON workout_sets(is_deleted);

CREATE TABLE rest_timer_states (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  session_exercise_id TEXT NOT NULL,
  previous_set_number INTEGER,
  next_set_number INTEGER,
  original_duration_seconds INTEGER NOT NULL,
  started_at TEXT,
  target_end_at TEXT,
  paused_remaining_seconds INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_id)
    REFERENCES workout_sessions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (session_exercise_id)
    REFERENCES workout_session_exercises(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_rest_timer_status
ON rest_timer_states(status);

CREATE INDEX idx_rest_timer_target_end
ON rest_timer_states(target_end_at);

CREATE TABLE daily_statuses (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_daily_status_date
ON daily_statuses(local_date DESC);

CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
