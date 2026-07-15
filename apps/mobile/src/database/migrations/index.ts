import { INITIAL_SCHEMA_SQL } from '@/database/migrations/0001-initial-schema';

export type Migration = {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
};

export const MIGRATIONS = [
  {
    version: 1,
    name: '0001_initial_schema',
    sql: INITIAL_SCHEMA_SQL,
  },
] as const satisfies readonly Migration[];
