import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { SqlJsStatic, SqlValue } from 'sql.js';

let sqlJsPromise: Promise<SqlJsStatic> | undefined;

export type SQLiteDatabase = SqliteMemoryDatabase;

export async function openDatabaseAsync(): Promise<SQLiteDatabase> {
  const SQL = await getSqlJs();

  return new SqliteMemoryDatabase(new SQL.Database());
}

async function getSqlJs(): Promise<SqlJsStatic> {
  sqlJsPromise ??= initSqlJs();

  return sqlJsPromise;
}

class SqliteMemoryDatabase {
  constructor(private readonly database: initSqlJs.Database) {}

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async runAsync(source: string, ...params: SqlValue[]): Promise<unknown> {
    this.database.exec(source, params);

    return {
      changes: this.database.getRowsModified(),
      lastInsertRowId: 0,
    };
  }

  async getFirstAsync<T>(
    source: string,
    ...params: SqlValue[]
  ): Promise<T | null> {
    const rows = await this.getAllAsync<T>(source, ...params);

    return rows[0] ?? null;
  }

  async getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]> {
    const results = this.database.exec(source, params);
    const result = results[0];

    if (!result) {
      return [];
    }

    return result.values.map((values) =>
      Object.fromEntries(
        result.columns.map((column, index) => [column, values[index]]),
      ),
    ) as T[];
  }

  async closeAsync(): Promise<void> {
    this.database.close();
  }
}
