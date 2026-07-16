export const WORKOUT_TEMPLATE_CONSTRAINTS_SQL = `
DROP INDEX IF EXISTS idx_template_exercises_exercise;
DROP INDEX IF EXISTS idx_template_exercises_template;
DROP INDEX IF EXISTS idx_template_exercise_position;
DROP INDEX IF EXISTS idx_workout_templates_updated_at;
DROP INDEX IF EXISTS idx_workout_templates_status;

CREATE TABLE workout_templates_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK (
    (status = 'active' AND archived_at IS NULL)
    OR (status = 'archived' AND archived_at IS NOT NULL)
  )
);

INSERT INTO workout_templates_v2 (
  id,
  name,
  description,
  status,
  created_at,
  updated_at,
  archived_at
)
SELECT
  id,
  name,
  description,
  status,
  created_at,
  updated_at,
  archived_at
FROM workout_templates;

CREATE TABLE workout_template_exercises_v2 (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  target_sets INTEGER NOT NULL CHECK (target_sets > 0),
  target_reps_min INTEGER NOT NULL CHECK (target_reps_min > 0),
  target_reps_max INTEGER NOT NULL
    CHECK (target_reps_max >= target_reps_min),
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds >= 0),
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

INSERT INTO workout_template_exercises_v2 (
  id,
  template_id,
  exercise_id,
  position,
  target_sets,
  target_reps_min,
  target_reps_max,
  rest_seconds,
  group_key,
  created_at,
  updated_at
)
SELECT
  id,
  template_id,
  exercise_id,
  position,
  target_sets,
  target_reps_min,
  target_reps_max,
  rest_seconds,
  group_key,
  created_at,
  updated_at
FROM workout_template_exercises;

DROP TABLE workout_template_exercises;
DROP TABLE workout_templates;

ALTER TABLE workout_templates_v2
RENAME TO workout_templates;

ALTER TABLE workout_template_exercises_v2
RENAME TO workout_template_exercises;

CREATE INDEX idx_workout_templates_status
ON workout_templates(status);

CREATE INDEX idx_workout_templates_updated_at
ON workout_templates(updated_at DESC);

CREATE UNIQUE INDEX idx_template_exercise_position
ON workout_template_exercises(template_id, position);

CREATE INDEX idx_template_exercises_template
ON workout_template_exercises(template_id);

CREATE INDEX idx_template_exercises_exercise
ON workout_template_exercises(exercise_id);
`;
