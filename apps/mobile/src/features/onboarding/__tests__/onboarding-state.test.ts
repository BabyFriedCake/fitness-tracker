/// <reference types="jest" />

import type { UserSetting, UserSettingRepository } from '@/domain/user-setting';
import {
  loadOnboardingProgress,
  ONBOARDING_STATE_SETTING_KEY,
  saveOnboardingProgress,
} from '@/features/onboarding/application/onboarding-state';

describe('Onboarding state application helpers', () => {
  it('starts at welcome when no progress exists', async () => {
    const repository = buildUserSettingRepository();

    await expect(
      loadOnboardingProgress(repository, () => '2026-07-27T01:00:00.000Z'),
    ).resolves.toEqual({
      step: 'welcome',
      updatedAt: '2026-07-27T01:00:00.000Z',
    });
  });

  it('falls back to a welcome state for corrupted progress JSON', async () => {
    const repository = buildUserSettingRepository({
      valueJson: '{broken',
      updatedAt: '2026-07-27T01:00:00.000Z',
    });

    await expect(
      loadOnboardingProgress(repository, () => '2026-07-27T02:00:00.000Z'),
    ).resolves.toEqual({
      step: 'welcome',
      updatedAt: '2026-07-27T02:00:00.000Z',
    });
  });

  it('saves completed onboarding progress through UserSetting', async () => {
    const save = jest.fn(async (input) => ({
      key: ONBOARDING_STATE_SETTING_KEY,
      valueJson: input.valueJson,
      updatedAt: input.updatedAt,
    }));
    const repository = buildUserSettingRepository({ save });

    await expect(
      saveOnboardingProgress(repository, {
        step: 'completed',
        updatedAt: '2026-07-27T03:00:00.000Z',
        completedAt: '2026-07-27T03:00:00.000Z',
      }),
    ).resolves.toEqual({
      step: 'completed',
      updatedAt: '2026-07-27T03:00:00.000Z',
      completedAt: '2026-07-27T03:00:00.000Z',
    });
    expect(save).toHaveBeenCalledWith({
      key: ONBOARDING_STATE_SETTING_KEY,
      valueJson: JSON.stringify({
        step: 'completed',
        updatedAt: '2026-07-27T03:00:00.000Z',
        completedAt: '2026-07-27T03:00:00.000Z',
      }),
      updatedAt: '2026-07-27T03:00:00.000Z',
    });
  });
});

function buildUserSettingRepository(
  overrides: {
    readonly valueJson?: string;
    readonly updatedAt?: string;
    readonly save?: UserSettingRepository['save'];
  } = {},
): UserSettingRepository {
  return {
    findByKey: jest.fn(async () => {
      if (!overrides.valueJson) {
        return null;
      }

      return {
        key: ONBOARDING_STATE_SETTING_KEY,
        valueJson: overrides.valueJson,
        updatedAt: overrides.updatedAt ?? '2026-07-27T01:00:00.000Z',
      } satisfies UserSetting;
    }),
    save:
      overrides.save ??
      jest.fn(async (input) => ({
        key: ONBOARDING_STATE_SETTING_KEY,
        valueJson: input.valueJson,
        updatedAt: input.updatedAt,
      })),
  };
}
