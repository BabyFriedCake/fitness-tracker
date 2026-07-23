export const DAILY_STATUS_VALUES = [
  'normal',
  'fatigued',
  'menstrual',
  'unwell',
] as const;

export type DailyStatusValue = (typeof DAILY_STATUS_VALUES)[number];

export type DailyStatus = {
  readonly id: string;
  readonly localDate: string;
  readonly status: DailyStatusValue;
  readonly createdAt: string;
  readonly updatedAt: string;
};
