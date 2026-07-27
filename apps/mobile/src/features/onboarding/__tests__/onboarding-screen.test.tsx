/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type { OnboardingScreenControls } from '@/features/onboarding/application/onboarding-state';
import { OnboardingContent } from '@/features/onboarding/screens/onboarding-screen';

describe('OnboardingScreen', () => {
  it('starts the setup flow from the welcome step', async () => {
    const controls = buildControls();

    const { getByText, getByLabelText } = await render(
      <OnboardingContent
        state={{
          status: 'ready',
          progress: {
            step: 'welcome',
            updatedAt: '2026-07-27T01:00:00.000Z',
          },
          isSubmitting: false,
        }}
        controls={controls}
        onFinish={jest.fn()}
      />,
    );

    expect(getByText('欢迎使用 Fitness Tracker。')).toBeTruthy();
    await fireEvent.press(getByLabelText('开始首次设置'));

    expect(controls.startSetup).toHaveBeenCalledTimes(1);
  });

  it('creates an example template from the template step', async () => {
    const controls = buildControls();

    const { getByText, getByLabelText } = await render(
      <OnboardingContent
        state={{
          status: 'ready',
          progress: {
            step: 'template',
            templateChoice: 'example',
            updatedAt: '2026-07-27T01:00:00.000Z',
          },
          isSubmitting: false,
        }}
        controls={controls}
        onFinish={jest.fn()}
      />,
    );

    expect(getByText('创建第一个模板。')).toBeTruthy();
    await fireEvent.press(getByLabelText('创建示例训练模板'));

    expect(controls.createExampleTemplate).toHaveBeenCalledTimes(1);
  });

  it('finishes onboarding from the completed step', async () => {
    const onFinish = jest.fn();

    const { getByLabelText } = await render(
      <OnboardingContent
        state={{
          status: 'ready',
          progress: {
            step: 'completed',
            updatedAt: '2026-07-27T01:00:00.000Z',
            completedAt: '2026-07-27T01:00:00.000Z',
          },
          isSubmitting: false,
        }}
        controls={buildControls()}
        onFinish={onFinish}
      />,
    );

    await fireEvent.press(getByLabelText('完成首次设置并进入今天'));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('keeps a stable retry path for loading errors', async () => {
    const controls = buildControls();

    const { getByText, getByLabelText } = await render(
      <OnboardingContent
        state={{
          status: 'error',
          message: '首次设置加载失败。已保存的训练数据不会丢失，请重试。',
        }}
        controls={controls}
        onFinish={jest.fn()}
      />,
    );

    expect(getByText('首次设置加载失败')).toBeTruthy();
    await fireEvent.press(getByLabelText('重新加载首次设置'));

    expect(controls.reload).toHaveBeenCalledTimes(1);
  });
});

function buildControls(): OnboardingScreenControls {
  return {
    reload: jest.fn(),
    startSetup: jest.fn(async () => undefined),
    skipGoal: jest.fn(async () => undefined),
    chooseTemplate: jest.fn(async () => undefined),
    createBlankTemplate: jest.fn(async () => true),
    createExampleTemplate: jest.fn(async () => true),
    complete: jest.fn(async () => true),
  };
}
