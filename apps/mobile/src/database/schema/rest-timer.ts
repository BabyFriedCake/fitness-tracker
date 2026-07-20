export type RestTimerSchemaRow = {
  readonly id: string;
  readonly session_id: string;
  readonly session_exercise_id: string;
  readonly previous_set_number: number | null;
  readonly next_set_number: number | null;
  readonly original_duration_seconds: number;
  readonly started_at: string | null;
  readonly target_end_at: string | null;
  readonly paused_remaining_seconds: number | null;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
};
