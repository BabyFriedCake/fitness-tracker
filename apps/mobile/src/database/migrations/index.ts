import { INITIAL_SCHEMA_SQL } from '@/database/migrations/0001-initial-schema';
import { WORKOUT_TEMPLATE_CONSTRAINTS_SQL } from '@/database/migrations/0002-workout-template-constraints';

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
] as const satisfies readonly Migration[];
