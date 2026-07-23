import { INITIAL_SCHEMA_SQL } from '@/database/migrations/0001-initial-schema';
import { WORKOUT_TEMPLATE_CONSTRAINTS_SQL } from '@/database/migrations/0002-workout-template-constraints';
import { WORKOUT_SESSION_SCHEMA_SQL } from '@/database/migrations/0003-workout-session-schema';
import { EXERCISE_DATASET_METADATA_SQL } from '@/database/migrations/0004-exercise-dataset-metadata';
import { TODAY_WORKOUT_PLAN_SQL } from '@/database/migrations/0005-today-workout-plan';

export type Migration = {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
  readonly disableForeignKeysDuringMigration?: boolean;
};

export const MIGRATIONS = [
  {
    version: 1,
    name: '0001_initial_schema',
    sql: INITIAL_SCHEMA_SQL,
  },
  {
    version: 2,
    name: '0002_workout_template_constraints',
    sql: WORKOUT_TEMPLATE_CONSTRAINTS_SQL,
    disableForeignKeysDuringMigration: true,
  },
  {
    version: 3,
    name: '0003_workout_session_schema',
    sql: WORKOUT_SESSION_SCHEMA_SQL,
    disableForeignKeysDuringMigration: true,
  },
  {
    version: 4,
    name: '0004_exercise_dataset_metadata',
    sql: EXERCISE_DATASET_METADATA_SQL,
  },
  {
    version: 5,
    name: '0005_today_workout_plan',
    sql: TODAY_WORKOUT_PLAN_SQL,
  },
] as const satisfies readonly Migration[];
