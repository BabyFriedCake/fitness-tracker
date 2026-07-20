export type WorkoutSessionSchemaRow = {
  readonly id: string;
  readonly source_template_id: string | null;
  readonly workout_name_snapshot: string;
  readonly status: string;
  readonly daily_status: string | null;
  readonly notes: string | null;
  readonly started_at: string | null;
  readonly ended_at: string | null;
  readonly current_session_exercise_id: string | null;
  readonly current_set_number: number | null;
  readonly was_edited: number;
  readonly edited_at: string | null;
  readonly is_deleted: number;
  readonly created_at: string;
  readonly updated_at: string;
};

export type SessionExerciseSchemaRow = {
  readonly id: string;
  readonly session_id: string;
  readonly source_exercise_id: string;
  readonly exercise_name_snapshot: string;
  readonly primary_muscle_group_snapshot: string | null;
  readonly equipment_snapshot: string | null;
  readonly position: number;
  readonly is_enabled: number;
  readonly is_skipped: number;
  readonly is_completed: number;
  readonly target_sets: number;
  readonly target_reps_min: number;
  readonly target_reps_max: number;
  readonly current_rest_seconds: number;
  readonly group_key: string | null;
  readonly completed_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type WorkoutSetSchemaRow = {
  readonly id: string;
  readonly session_exercise_id: string;
  readonly set_number: number;
  readonly set_type: string;
  readonly actual_reps: number;
  readonly weight: number;
  readonly is_completed: number;
  readonly is_extra_set: number;
  readonly completed_at: string;
  readonly weight_unit: string;
  readonly is_deleted: number;
  readonly was_edited: number;
  readonly edited_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};
