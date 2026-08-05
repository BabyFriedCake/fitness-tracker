/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  ApplicationResetProvider,
  useApplicationReset,
} from '@/features/application-reset';
import { deleteDatabaseAsync } from 'expo-sqlite';

import { WorkoutCompanionSettingsProvider } from '@/features/workout-session/application/workout-companion-settings';
import { WorkoutCompanionSettingsScreen } from '@/features/workout-session/screens/workout-companion-settings-screen';

jest.mock('expo-sqlite', () => ({
  deleteDatabaseAsync: jest.fn(async () => undefined),
}));

const mockedDeleteDatabaseAsync = jest.mocked(deleteDatabaseAsync);

describe('WorkoutCompanionSettingsScreen', () => {
  it('shows the current source mode and toggles the session settings', async () => {
    const { getByText, getByLabelText } = await render(
      <WorkoutCompanionSettingsProvider>
        <WorkoutCompanionSettingsScreen />
      </WorkoutCompanionSettingsProvider>,
    );

    expect(getByText('当前输入源：Mock 自动计数')).toBeTruthy();

    await fireEvent.press(getByLabelText('选择关闭输入源'));
    expect(getByText('当前输入源：关闭')).toBeTruthy();
    expect(getByText('音频权限')).toBeTruthy();
    expect(
      getByText(
        '当前版本只显示权限边界，不请求系统音频权限。后续会在真实 Voice/TTS 接入时补齐平台级请求与降级策略。',
      ),
    ).toBeTruthy();

    const voiceSwitch = getByLabelText('切换语音教练');
    expect(voiceSwitch.props.value).toBe(true);
    await fireEvent(voiceSwitch, 'valueChange', false);
    expect(getByLabelText('切换语音教练').props.value).toBe(false);
  });

  it('resets the development database and bumps the reset version', async () => {
    const resetVersions: number[] = [];

    function ResetVersionProbe() {
      const { resetVersion } = useApplicationReset();

      resetVersions.push(resetVersion);

      return <Text accessibilityLabel="reset-version">{resetVersion}</Text>;
    }

    const { getByLabelText, getByText } = await render(
      <ApplicationResetProvider>
        <WorkoutCompanionSettingsProvider>
          <WorkoutCompanionSettingsScreen />
          <ResetVersionProbe />
        </WorkoutCompanionSettingsProvider>
      </ApplicationResetProvider>,
    );

    expect(getByText('0')).toBeTruthy();

    await fireEvent.press(getByLabelText('重置开发环境数据'));

    expect(mockedDeleteDatabaseAsync).toHaveBeenCalled();
    expect(resetVersions.at(-1)).toBe(1);
  });
});
