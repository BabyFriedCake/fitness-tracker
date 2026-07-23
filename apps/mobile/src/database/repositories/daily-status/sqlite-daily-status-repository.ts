import {
  DAILY_STATUS_VALUES,
  type DailyStatus,
  type DailyStatusRepository,
  type DailyStatusValue,
} from '@/domain/daily-status';
import type { DatabaseConnection } from '@/database/types';

type DailyStatusRow = {
  readonly id: string;
  readonly local_date: string;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
};

export function createSqliteDailyStatusRepository(
  database: DatabaseConnection,
): DailyStatusRepository {
  return {
    findByLocalDate: async (localDate) => {
      assertLocalDate(localDate);
      const row = await database.getFirstAsync<DailyStatusRow>(
        `SELECT id, local_date, status, created_at, updated_at
         FROM daily_statuses
         WHERE local_date = ?;`,
        localDate,
      );

      return row ? mapDailyStatusRow(row) : null;
    },
    save: async (input) => {
      assertLocalDate(input.localDate);
      assertDailyStatusValue(input.status);
      assertTimestamp(input.updatedAt);
      const id = `daily-status-${input.localDate}`;

      await database.runAsync(
        `INSERT INTO daily_statuses (
           id, local_date, status, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(local_date) DO UPDATE SET
           status = excluded.status,
           updated_at = excluded.updated_at;`,
        id,
        input.localDate,
        input.status,
        input.updatedAt,
        input.updatedAt,
      );

      const saved = await database.getFirstAsync<DailyStatusRow>(
        `SELECT id, local_date, status, created_at, updated_at
         FROM daily_statuses
         WHERE local_date = ?;`,
        input.localDate,
      );

      if (!saved) {
        throw new Error('DailyStatus was not persisted.');
      }

      return mapDailyStatusRow(saved);
    },
  };
}

function mapDailyStatusRow(row: DailyStatusRow): DailyStatus {
  assertLocalDate(row.local_date);
  assertDailyStatusValue(row.status);
  assertTimestamp(row.created_at);
  assertTimestamp(row.updated_at);

  return {
    id: row.id,
    localDate: row.local_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertLocalDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('DailyStatus localDate must use YYYY-MM-DD.');
  }
}

function assertDailyStatusValue(
  value: string,
): asserts value is DailyStatusValue {
  if (!DAILY_STATUS_VALUES.includes(value as DailyStatusValue)) {
    throw new Error('DailyStatus value is invalid.');
  }
}

function assertTimestamp(value: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error('DailyStatus timestamp is invalid.');
  }
}
