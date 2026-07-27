import type {
  SaveUserSettingInput,
  UserSetting,
  UserSettingKey,
} from './types';

export type UserSettingRepository = {
  readonly findByKey: (key: UserSettingKey) => Promise<UserSetting | null>;
  readonly save: (input: SaveUserSettingInput) => Promise<UserSetting>;
};
