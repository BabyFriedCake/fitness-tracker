import type { DailyStatus, DailyStatusValue } from './types';

export type DailyStatusRepository = {
  readonly findByLocalDate: (localDate: string) => Promise<DailyStatus | null>;
  readonly save: (input: {
    readonly localDate: string;
    readonly status: DailyStatusValue;
    readonly updatedAt: string;
  }) => Promise<DailyStatus>;
};
