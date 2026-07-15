export type DatabaseErrorCode =
  'database_open_failed' | 'database_migration_failed' | 'database_unavailable';

export type DatabaseError = {
  readonly code: DatabaseErrorCode;
  readonly message: string;
};

export function toDatabaseError(
  error: unknown,
  code: DatabaseErrorCode,
): DatabaseError {
  if (isDatabaseError(error)) {
    return error;
  }

  return {
    code,
    message: getSafeDatabaseMessage(code),
  };
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

function getSafeDatabaseMessage(code: DatabaseErrorCode): string {
  switch (code) {
    case 'database_open_failed':
      return '本地数据库打开失败，训练数据未被修改。';
    case 'database_migration_failed':
      return '本地数据库升级失败，训练数据未被修改。';
    case 'database_unavailable':
      return '本地数据库暂时不可用，请稍后重试。';
  }
}
