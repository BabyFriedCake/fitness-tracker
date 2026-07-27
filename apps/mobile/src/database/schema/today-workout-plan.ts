export type TodayWorkoutPlanSchemaRow = {
  readonly id: string;
  readonly local_date: string;
  readonly source_template_id: string;
  readonly session_id: string | null;
  readonly title_snapshot: string;
  readonly position: number;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
};
