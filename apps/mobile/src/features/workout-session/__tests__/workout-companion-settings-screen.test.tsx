/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { WorkoutCompanionSettingsProvider } from '@/features/workout-session/application/workout-companion-settings';
import { WorkoutCompanionSettingsScreen } from '@/features/workout-session/screens/workout-companion-settings-screen';

describe('WorkoutCompanionSettingsScreen', () => {
  it('shows the current source mode and toggles the session settings', async () => {
    const { getByText, getByLabelText } = await render(
      <WorkoutCompanionSettingsProvider>
        <WorkoutCompanionSettingsScreen />
      </WorkoutCompanionSettingsProvider>,
    );

    expect(getByText('当前输入源：关闭')).toBeTruthy();

    await fireEvent.press(getByLabelText('选择Mock 自动计数输入源'));
    expect(getByText('当前输入源：Mock 自动计数')).toBeTruthy();

    const voiceSwitch = getByLabelText('切换语音教练');
    expect(voiceSwitch.props.value).toBe(true);
    await fireEvent(voiceSwitch, 'valueChange', false);
    expect(getByLabelText('切换语音教练').props.value).toBe(false);
  });
});
