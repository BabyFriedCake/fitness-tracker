export const WORKOUT_SESSION_SCHEMA_SQL = `
DROP INDEX IF EXISTS idx_sets_deleted;
DROP INDEX IF EXISTS idx_sets_completed_at;
DROP INDEX IF EXISTS idx_sets_session_exercise;
DROP INDEX IF EXISTS idx_set_number_active;
DROP INDEX IF EXISTS idx_session_exercises_exercise;
DROP INDEX IF EXISTS idx_session_exercises_session;
DROP INDEX IF EXISTS idx_session_exercise_position;
DROP INDEX IF EXISTS idx_sessions_deleted;
DROP INDEX IF EXISTS idx_sessions_template;
DROP INDEX IF EXISTS idx_sessions_started_at;
DROP INDEX IF EXISTS idx_sessions_status;

CREATE TABLE workout_sessions_v3 (
  id TEXT PRIMARY KEY,
  source_template_id TEXT,
  workout_name_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  daily_status TEXT
    CHECK (
      daily_status IS NULL
      OR daily_status IN ('normal', 'fatigued', 'menstrual', 'unwell')
    ),
  notes TEXT,
  started_at TEXT,
  ended_at TEXT,
  current_session_exercise_id TEXT,
  current_set_number INTEGER
    CHECK (current_set_number IS NULL OR current_set_number > 0),
  was_edited INTEGER NOT NULL DEFAULT 0
    CHECK (was_edited IN (0, 1)),
  edited_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0
    CHECK (is_deleted IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  CHECK (
    (status = 'draft' AND started_at IS NULL AND ended_at IS NULL)
    OR (
      status = 'in_progress'
      AND started_at IS NOT NULL
      AND ended_at IS NULL
    )
    OR (
      status = 'completed'
      AND started_at IS NOT NULL
      AND ended_at IS NOT NULL
    )
    OR (status = 'cancelled' AND ended_at IS NOT NULL)
  ),

  FOREIGN KEY (source_template_id)
    REFERENCES workout_templates(id)
    ON DELETE SET NULL
);

INSERT INTO workout_sessions_v3 (
  id,
  source_template_id,
  workout_name_snapshot,
  status,
  daily_status,
  notes,
  started_at,
  ended_at,
  current_session_exercise_id,
  current_set_number,
  was_edited,
  edited_at,
  is_deleted,
  created_at,
  updated_at
)
SELECT
  id,
  source_template_id,
  name_snapshot,
  status,
  daily_status,
  note,
  started_at,
  ended_at,
  current_session_exercise_id,
  current_set_number,
  was_edited,
  edited_at,
  is_deleted,
  created_at,
  updated_at
FROM workout_sessions;

CREATE TABLE workout_session_exercises_v3 (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  source_exercise_id TEXT NOT NULL,
  exercise_name_snapshot TEXT NOT NULL,
  primary_muscle_group_snapshot TEXT,
  equipment_snapshot TEXT,
  position INTEGER NOT NULL CHECK (position > 0),
  is_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (is_enabled IN (0, 1)),
  is_skipped INTEGER NOT NULL DEFAULT 0
    CHECK (is_skipped IN (0, 1)),
  is_completed INTEGER NOT NULL DEFAULT 0
    CHECK (is_completed IN (0, 1)),
  target_sets INTEGER NOT NULL CHECK (target_sets > 0),
  target_reps_min INTEGER NOT NULL CHECK (target_reps_min > 0),
  target_reps_max INTEGER NOT NULL
    CHECK (target_reps_max >= target_reps_min),
  current_rest_seconds INTEGER NOT NULL
    CHECK (current_rest_seconds >= 0),
  group_key TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_id)
    REFERENCES workout_sessions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (source_exercise_id)
    REFERENCES exercises(id)
    ON DELETE RESTRICT
);

INSERT INTO workout_session_exercises_v3 (
  id,
  session_id,
  source_exercise_id,
  exercise_name_snapshot,
  primary_muscle_group_snapshot,
  equipment_snapshot,
  position,
  is_enabled,
  is_skipped,
  is_completed,
  target_sets,
  target_reps_min,
  target_reps_max,
  current_rest_seconds,
  group_key,
  completed_at,
  created_at,
  updated_at
)
SELECT
  id,
  session_id,
  exercise_id,
  exercise_name_snapshot,
  primary_muscle_group_snapshot,
  equipment_snapshot,
  position,
  is_enabled,
  is_skipped,
  CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END,
  target_sets,
  target_reps_min,
  target_reps_max,
  rest_seconds,
  group_key,
  completed_at,
  created_at,
  updated_at
FROM workout_session_exercises;

CREATE TABLE workout_sets_v3 (
  id TEXT PRIMARY KEY,
  session_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  set_type TEXT NOT NULL DEFAULT 'normal'
    CHECK (set_type = 'normal'),
  actual_reps INTEGER NOT NULL CHECK (actual_reps >= 0),
  weight REAL NOT NULL CHECK (weight >= 0),
  is_completed INTEGER NOT NULL DEFAULT 1
    CHECK (is_completed IN (0, 1)),
  is_extra_set INTEGER NOT NULL DEFAULT 0
    CHECK (is_extra_set IN (0, 1)),
  completed_at TEXT NOT NULL,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  is_deleted INTEGER NOT NULL DEFAULT 0
    CHECK (is_deleted IN (0, 1)),
  was_edited INTEGER NOT NULL DEFAULT 0
    CHECK (was_edited IN (0, 1)),
  edited_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_exercise_id)
    REFERENCES workout_session_exercises(id)
    ON DELETE CASCADE
);

INSERT INTO workout_sets_v3 (
  id,
  session_exercise_id,
  set_number,
  set_type,
  actual_reps,
  weight,
  is_completed,
  is_extra_set,
  completed_at,
  weight_unit,
  is_deleted,
  was_edited,
  edited_at,
  created_at,
  updated_at
)
SELECT
  id,
  session_exercise_id,
  set_number,
  set_type,
  reps,
  weight_value,
  is_completed,
  is_extra,
  completed_at,
  weight_unit,
  is_deleted,
  was_edited,
  edited_at,
  created_at,
  updated_at
FROM workout_sets;

DROP TABLE workout_sets;
DROP TABLE workout_session_exercises;
DROP TABLE workout_sessions;

ALTER TABLE workout_sessions_v3
RENAME TO workout_sessions;

ALTER TABLE workout_session_exercises_v3
RENAME TO workout_session_exercises;

ALTER TABLE workout_sets_v3
RENAME TO workout_sets;

CREATE INDEX idx_sessions_status
ON workout_sessions(status);

CREATE INDEX idx_sessions_started_at
ON workout_sessions(started_at DESC);

CREATE INDEX idx_sessions_template
ON workout_sessions(source_template_id);

CREATE INDEX idx_sessions_deleted
ON workout_sessions(is_deleted);

CREATE UNIQUE INDEX idx_session_exercise_position
ON workout_session_exercises(session_id, position);

CREATE INDEX idx_session_exercises_session
ON workout_session_exercises(session_id);

CREATE INDEX idx_session_exercises_exercise
ON workout_session_exercises(source_exercise_id);

CREATE UNIQUE INDEX idx_set_number_active
ON workout_sets(session_exercise_id, set_number)
WHERE is_deleted = 0;

CREATE INDEX idx_sets_session_exercise
ON workout_sets(session_exercise_id);

CREATE INDEX idx_sets_completed_at
ON workout_sets(completed_at DESC);

CREATE INDEX idx_sets_deleted
ON workout_sets(is_deleted);
`;
