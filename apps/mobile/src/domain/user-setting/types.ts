export type UserSettingKey = string & {
  readonly __brand: 'UserSettingKey';
};

export type UserSetting = {
  readonly key: UserSettingKey;
  readonly valueJson: string;
  readonly updatedAt: string;
};

export type SaveUserSettingInput = {
  readonly key: string;
  readonly valueJson: string;
  readonly updatedAt: string;
};
