export type DatabaseConnection = {
  readonly execAsync: (source: string) => Promise<void>;
  readonly runAsync: (
    source: string,
    ...params: DatabaseValue[]
  ) => Promise<unknown>;
  readonly getFirstAsync: <T>(
    source: string,
    ...params: DatabaseValue[]
  ) => Promise<T | null>;
  readonly getAllAsync: <T>(
    source: string,
    ...params: DatabaseValue[]
  ) => Promise<T[]>;
  readonly closeAsync?: () => Promise<void>;
};

export type DatabaseValue = string | number | null | Uint8Array;
