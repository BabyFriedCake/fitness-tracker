import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { WorkoutCompanionEventSourceMode } from './workout-companion-event-source';

export type WorkoutCompanionSettingsState = {
  readonly voiceFeedbackEnabled: boolean;
  readonly inputSourceMode: WorkoutCompanionEventSourceMode;
};

export type WorkoutCompanionSettingsContextValue =
  WorkoutCompanionSettingsState & {
    readonly setVoiceFeedbackEnabled: (value: boolean) => void;
    readonly setInputSourceMode: (
      value: WorkoutCompanionEventSourceMode,
    ) => void;
  };

const DEFAULT_WORKOUT_COMPANION_SETTINGS: WorkoutCompanionSettingsState = {
  voiceFeedbackEnabled: true,
  inputSourceMode: 'mock_auto_rep',
};

const WORKOUT_COMPANION_SETTINGS_CONTEXT =
  createContext<WorkoutCompanionSettingsContextValue>({
    ...DEFAULT_WORKOUT_COMPANION_SETTINGS,
    setVoiceFeedbackEnabled: () => undefined,
    setInputSourceMode: () => undefined,
  });

export function WorkoutCompanionSettingsProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [inputSourceMode, setInputSourceMode] =
    useState<WorkoutCompanionEventSourceMode>('mock_auto_rep');

  const value = useMemo<WorkoutCompanionSettingsContextValue>(
    () => ({
      voiceFeedbackEnabled,
      inputSourceMode,
      setVoiceFeedbackEnabled,
      setInputSourceMode,
    }),
    [inputSourceMode, voiceFeedbackEnabled],
  );

  return (
    <WORKOUT_COMPANION_SETTINGS_CONTEXT.Provider value={value}>
      {children}
    </WORKOUT_COMPANION_SETTINGS_CONTEXT.Provider>
  );
}

export function useWorkoutCompanionSettings() {
  return useContext(WORKOUT_COMPANION_SETTINGS_CONTEXT);
}
