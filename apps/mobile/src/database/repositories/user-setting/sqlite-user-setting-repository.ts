import type { DatabaseConnection } from '@/database/types';
import type {
  SaveUserSettingInput,
  UserSetting,
  UserSettingKey,
  UserSettingRepository,
} from '@/domain/user-setting';

type UserSettingRow = {
  readonly key: string;
  readonly value_json: string;
  readonly updated_at: string;
};

export function createSqliteUserSettingRepository(
  database: DatabaseConnection,
): UserSettingRepository {
  return {
    findByKey: async (key) => {
      const row = await database.getFirstAsync<UserSettingRow>(
        `SELECT key, value_json, updated_at
         FROM user_settings
         WHERE key = ?
         LIMIT 1;`,
        key,
      );

      return row ? mapUserSettingRow(row) : null;
    },
    save: async (input) => {
      assertUserSettingInput(input);

      await database.runAsync(
        `INSERT INTO user_settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_at = excluded.updated_at;`,
        input.key,
        input.valueJson,
        input.updatedAt,
      );

      const row = await database.getFirstAsync<UserSettingRow>(
        `SELECT key, value_json, updated_at
         FROM user_settings
         WHERE key = ?
         LIMIT 1;`,
        input.key,
      );

      if (!row) {
        throw new Error('UserSetting was not persisted.');
      }

      return mapUserSettingRow(row);
    },
  };
}

function mapUserSettingRow(row: UserSettingRow): UserSetting {
  assertUserSettingInput({
    key: row.key,
    valueJson: row.value_json,
    updatedAt: row.updated_at,
  });

  return {
    key: row.key as UserSettingKey,
    valueJson: row.value_json,
    updatedAt: row.updated_at,
  };
}

function assertUserSettingInput(input: SaveUserSettingInput): void {
  if (!input.key.trim()) {
    throw new Error('UserSetting key cannot be empty.');
  }

  try {
    JSON.parse(input.valueJson);
  } catch {
    throw new Error('UserSetting valueJson must be valid JSON.');
  }

  if (!Number.isFinite(Date.parse(input.updatedAt))) {
    throw new Error('UserSetting updatedAt must be an ISO 8601 timestamp.');
  }
}
