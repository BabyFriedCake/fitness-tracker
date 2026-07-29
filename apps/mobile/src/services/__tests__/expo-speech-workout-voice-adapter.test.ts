import {
  createExpoSpeechWorkoutVoiceFeedbackAdapter,
  type ExpoSpeechModule,
} from '@/services/expo-speech-workout-voice-adapter';

describe('Expo speech workout voice adapter', () => {
  it('uses local Chinese speech with the configured rate', async () => {
    const speech = createSpeechModule();
    const adapter = createExpoSpeechWorkoutVoiceFeedbackAdapter({ speech });

    const speaking = adapter.speak('第 1 次');

    await Promise.resolve();
    expect(speech.stop).toHaveBeenCalledTimes(1);
    expect(speech.speak).toHaveBeenCalledWith(
      '第 1 次',
      expect.objectContaining({ language: 'zh-CN', rate: 0.52 }),
    );

    getSpeechOptions(speech).onDone?.();
    await expect(speaking).resolves.toBeUndefined();
  });

  it('replaces an older pending message instead of creating a stale queue', async () => {
    const speech = createSpeechModule();
    const adapter = createExpoSpeechWorkoutVoiceFeedbackAdapter({ speech });

    const first = adapter.speak('第 1 次');
    const second = adapter.speak('第 2 次');

    await Promise.resolve();
    await Promise.resolve();

    expect(speech.stop).toHaveBeenCalledTimes(2);
    expect(speech.speak).toHaveBeenCalledTimes(1);
    expect(speech.speak).toHaveBeenCalledWith('第 2 次', expect.any(Object));

    getSpeechOptions(speech).onDone?.();
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
  });

  it('exposes a foreground cleanup operation that stops native speech', async () => {
    const speech = createSpeechModule();
    const adapter = createExpoSpeechWorkoutVoiceFeedbackAdapter({ speech });

    await adapter.stop();

    expect(speech.stop).toHaveBeenCalledTimes(1);
  });

  it('does not start an older message when it is superseded while native stop is pending', async () => {
    const stopResolvers: (() => void)[] = [];
    const speech = createSpeechModule({
      stop: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            stopResolvers.push(resolve);
          }),
      ),
    });
    const adapter = createExpoSpeechWorkoutVoiceFeedbackAdapter({ speech });

    const first = adapter.speak('第 1 次');
    const second = adapter.speak('第 2 次');

    stopResolvers[0]?.();
    await Promise.resolve();
    stopResolvers[1]?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(speech.speak).toHaveBeenCalledTimes(1);
    expect(speech.speak).toHaveBeenCalledWith('第 2 次', expect.any(Object));

    getSpeechOptions(speech).onDone?.();
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
  });

  it('rejects native failures so the existing application fallback can isolate them', async () => {
    const speech = createSpeechModule();
    const adapter = createExpoSpeechWorkoutVoiceFeedbackAdapter({ speech });

    const speaking = adapter.speak('休息 90 秒');

    await Promise.resolve();
    const error = new Error('speech unavailable');
    getSpeechOptions(speech).onError?.(error);

    await expect(speaking).rejects.toThrow('speech unavailable');
  });
});

function createSpeechModule(
  overrides: Partial<jest.Mocked<ExpoSpeechModule>> = {},
): jest.Mocked<ExpoSpeechModule> {
  return {
    speak: jest.fn(),
    stop: jest.fn(async () => undefined),
    ...overrides,
  };
}

function getSpeechOptions(speech: jest.Mocked<ExpoSpeechModule>) {
  const options = speech.speak.mock.calls.at(-1)?.[1];

  if (!options) {
    throw new Error('Expected speech options.');
  }

  return options;
}
