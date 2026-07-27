export const TODAY_WORKOUT_PLAN_SQL = `
CREATE TABLE today_workout_plans (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  source_template_id TEXT NOT NULL,
  session_id TEXT,
  title_snapshot TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  status TEXT NOT NULL
    CHECK (status IN ('planned', 'draft', 'in_progress', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  UNIQUE(local_date, source_template_id),
  UNIQUE(session_id),

  FOREIGN KEY (source_template_id)
    REFERENCES workout_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (session_id)
    REFERENCES workout_sessions(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_today_workout_plans_local_date
ON today_workout_plans(local_date, position ASC);

CREATE INDEX idx_today_workout_plans_template
ON today_workout_plans(source_template_id);

CREATE INDEX idx_today_workout_plans_status
ON today_workout_plans(status);
`;
