/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { PersonalCenterScreen } from '@/features/workout-session/screens/personal-center-screen';

describe('PersonalCenterScreen', () => {
  it('opens preference settings and returns to Today', async () => {
    const onBack = jest.fn();
    const onOpenSettings = jest.fn();
    const { getByLabelText, getByText } = await render(
      <PersonalCenterScreen onBack={onBack} onOpenSettings={onOpenSettings} />,
    );

    expect(getByText('我的训练')).toBeTruthy();
    expect(getByText('尚未设置身体数据')).toBeTruthy();

    await fireEvent.press(getByLabelText('打开偏好设置'));
    await fireEvent.press(getByLabelText('返回今天'));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
