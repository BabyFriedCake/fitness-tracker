import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteUserSettingRepository } from '@/database/repositories/user-setting';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type {
  UserSettingKey,
  UserSettingRepository,
} from '@/domain/user-setting';
import type {
  WorkoutTemplateId,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';
import { DEFAULT_TEMPLATE_EXERCISE_CONFIG } from '@/features/workout-templates/application/workout-template-create-defaults';

export type OnboardingStep = 'welcome' | 'goal' | 'template' | 'completed';
export type OnboardingTemplateChoice = 'blank' | 'example';

export type OnboardingProgress = {
  readonly step: OnboardingStep;
  readonly templateChoice?: OnboardingTemplateChoice;
  readonly createdTemplateId?: WorkoutTemplateId;
  readonly updatedAt: string;
  readonly completedAt?: string;
};

export type OnboardingGateState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly isCompleted: boolean };

export type OnboardingScreenState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly progress: OnboardingProgress;
      readonly isSubmitting: boolean;
      readonly actionError?: string;
    };

export type OnboardingScreenControls = {
  readonly reload: () => void;
  readonly startSetup: () => Promise<void>;
  readonly skipGoal: () => Promise<void>;
  readonly chooseTemplate: (choice: OnboardingTemplateChoice) => Promise<void>;
  readonly createBlankTemplate: () => Promise<boolean>;
  readonly createExampleTemplate: () => Promise<boolean>;
  readonly complete: () => Promise<boolean>;
};

export type OnboardingScreenModel = {
  readonly state: OnboardingScreenState;
  readonly controls: OnboardingScreenControls;
};

export type OnboardingDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createUserSettingRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => UserSettingRepository;
  readonly createWorkoutTemplateRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutTemplateRepository;
  readonly now?: () => string;
  readonly createId?: (kind: OnboardingIdKind) => string;
};

type OnboardingRepositories = {
  readonly userSettingRepository: UserSettingRepository;
  readonly workoutTemplateRepository: WorkoutTemplateRepository;
};

type OnboardingIdKind = 'workout_template' | 'template_exercise';

export const ONBOARDING_STATE_SETTING_KEY =
  'onboarding_state' as UserSettingKey;

const ONBOARDING_ERROR_MESSAGE =
  '首次设置加载失败。已保存的训练数据不会丢失，请重试。';
const ONBOARDING_ACTION_ERROR_MESSAGE =
  '首次设置保存失败。已保存的训练数据不会丢失，请重试。';

const EXAMPLE_EXERCISE_IDS = [
  'exercise-barbell-bench-press',
  'exercise-lat-pulldown',
  'exercise-dumbbell-shoulder-press',
  'exercise-leg-press',
] as const;

export function useOnboardingGate({
  initializeDatabase = initializeApplicationDatabase,
  createUserSettingRepository = createSqliteUserSettingRepository,
}: Pick<
  OnboardingDependencies,
  'initializeDatabase' | 'createUserSettingRepository'
> = {}): OnboardingGateState {
  const [state, setState] = useState<OnboardingGateState>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const startupResult = await initializeDatabase();

        if (cancelled) {
          return;
        }

        if (startupResult.status === 'error') {
          setState({ status: 'ready', isCompleted: true });
          return;
        }

        const repository = createUserSettingRepository(startupResult.database);
        const progress = await loadOnboardingProgress(repository);

        if (!cancelled) {
          setState({
            status: 'ready',
            isCompleted: progress.step === 'completed',
          });
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'ready', isCompleted: true });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [createUserSettingRepository, initializeDatabase]);

  return state;
}

export function useOnboarding({
  initializeDatabase = initializeApplicationDatabase,
  createUserSettingRepository = createSqliteUserSettingRepository,
  createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
  now = () => new Date().toISOString(),
  createId = createDefaultOnboardingId,
}: OnboardingDependencies = {}): OnboardingScreenModel {
  const [state, setState] = useState<OnboardingScreenState>({
    status: 'loading',
  });
  const repositoriesRef = useRef<OnboardingRepositories | null>(null);
  const isMountedRef = useRef(false);

  const getRepositories =
    useCallback(async (): Promise<OnboardingRepositories> => {
      if (repositoriesRef.current) {
        return repositoriesRef.current;
      }

      const startupResult = await initializeDatabase();

      if (startupResult.status === 'error') {
        throw new Error('Database startup failed.');
      }

      const repositories = {
        userSettingRepository: createUserSettingRepository(
          startupResult.database,
        ),
        workoutTemplateRepository: createWorkoutTemplateRepository(
          startupResult.database,
        ),
      };
      repositoriesRef.current = repositories;

      return repositories;
    }, [
      createUserSettingRepository,
      createWorkoutTemplateRepository,
      initializeDatabase,
    ]);

  const load = useCallback(async (): Promise<void> => {
    setState({ status: 'loading' });

    try {
      const repositories = await getRepositories();
      const progress = await loadOnboardingProgress(
        repositories.userSettingRepository,
        now,
      );

      if (!isMountedRef.current) {
        return;
      }

      setState({
        status: 'ready',
        progress,
        isSubmitting: false,
      });
    } catch {
      if (isMountedRef.current) {
        setState({ status: 'error', message: ONBOARDING_ERROR_MESSAGE });
      }
    }
  }, [getRepositories, now]);

  useEffect(() => {
    isMountedRef.current = true;
    void load();

    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  const persistProgress = useCallback(
    async (progress: OnboardingProgress): Promise<void> => {
      const repositories = await getRepositories();
      await saveOnboardingProgress(
        repositories.userSettingRepository,
        progress,
      );

      if (isMountedRef.current) {
        setState({
          status: 'ready',
          progress,
          isSubmitting: false,
        });
      }
    },
    [getRepositories],
  );

  const transition = useCallback(
    async (
      next: Pick<OnboardingProgress, 'step' | 'templateChoice'>,
    ): Promise<void> => {
      const progress = {
        step: next.step,
        ...(next.templateChoice ? { templateChoice: next.templateChoice } : {}),
        updatedAt: now(),
      };
      await persistProgress(progress);
    },
    [now, persistProgress],
  );

  const complete = useCallback(async (): Promise<boolean> => {
    try {
      await persistProgress({
        step: 'completed',
        updatedAt: now(),
        completedAt: now(),
      });
      return true;
    } catch {
      setActionError(setState);
      return false;
    }
  }, [now, persistProgress]);

  const createTemplate = useCallback(
    async (choice: OnboardingTemplateChoice): Promise<boolean> => {
      if (state.status !== 'ready' || state.isSubmitting) {
        return false;
      }

      setState({ ...state, isSubmitting: true, actionError: undefined });

      try {
        const repositories = await getRepositories();
        const createdAt = now();
        const templateId = createId('workout_template') as WorkoutTemplateId;

        await repositories.workoutTemplateRepository.create({
          id: templateId,
          name: choice === 'blank' ? '我的第一个训练模板' : '全身基础训练',
          description:
            choice === 'blank'
              ? '从空白模板开始添加动作。'
              : '适合第一次体验的基础全身训练。',
          exercises:
            choice === 'blank'
              ? []
              : EXAMPLE_EXERCISE_IDS.map((exerciseId, index) => ({
                  id: createId('template_exercise'),
                  templateId,
                  exerciseId,
                  position: index + 1,
                  targetSets: DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetSets,
                  targetRepsMin: DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMin,
                  targetRepsMax: DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMax,
                  restSeconds: DEFAULT_TEMPLATE_EXERCISE_CONFIG.restSeconds,
                  createdAt,
                  updatedAt: createdAt,
                })),
          createdAt,
          updatedAt: createdAt,
        });

        await persistProgress({
          step: 'completed',
          templateChoice: choice,
          createdTemplateId: templateId,
          updatedAt: now(),
          completedAt: now(),
        });

        return true;
      } catch {
        setActionError(setState);
        return false;
      }
    },
    [createId, getRepositories, now, persistProgress, state],
  );

  return {
    state,
    controls: {
      reload: () => {
        void load();
      },
      startSetup: () => transition({ step: 'goal' }),
      skipGoal: () => transition({ step: 'template' }),
      chooseTemplate: (choice) =>
        transition({ step: 'template', templateChoice: choice }),
      createBlankTemplate: () => createTemplate('blank'),
      createExampleTemplate: () => createTemplate('example'),
      complete,
    },
  };
}

export async function loadOnboardingProgress(
  repository: UserSettingRepository,
  now: () => string = () => new Date().toISOString(),
): Promise<OnboardingProgress> {
  const setting = await repository.findByKey(ONBOARDING_STATE_SETTING_KEY);

  if (!setting) {
    return { step: 'welcome', updatedAt: now() };
  }

  return parseOnboardingProgress(setting.valueJson, now);
}

export async function saveOnboardingProgress(
  repository: UserSettingRepository,
  progress: OnboardingProgress,
): Promise<OnboardingProgress> {
  const saved = await repository.save({
    key: ONBOARDING_STATE_SETTING_KEY,
    valueJson: JSON.stringify(progress),
    updatedAt: progress.updatedAt,
  });

  return parseOnboardingProgress(saved.valueJson, () => saved.updatedAt);
}

function parseOnboardingProgress(
  valueJson: string,
  now: () => string,
): OnboardingProgress {
  try {
    const parsed = JSON.parse(valueJson) as Partial<OnboardingProgress>;
    const step = isOnboardingStep(parsed.step) ? parsed.step : 'welcome';

    return {
      step,
      ...(isOnboardingTemplateChoice(parsed.templateChoice)
        ? { templateChoice: parsed.templateChoice }
        : {}),
      ...(typeof parsed.createdTemplateId === 'string' &&
      parsed.createdTemplateId.trim()
        ? { createdTemplateId: parsed.createdTemplateId as WorkoutTemplateId }
        : {}),
      updatedAt:
        typeof parsed.updatedAt === 'string' &&
        Number.isFinite(Date.parse(parsed.updatedAt))
          ? parsed.updatedAt
          : now(),
      ...(typeof parsed.completedAt === 'string' &&
      Number.isFinite(Date.parse(parsed.completedAt))
        ? { completedAt: parsed.completedAt }
        : {}),
    };
  } catch {
    return { step: 'welcome', updatedAt: now() };
  }
}

function isOnboardingStep(value: unknown): value is OnboardingStep {
  return (
    value === 'welcome' ||
    value === 'goal' ||
    value === 'template' ||
    value === 'completed'
  );
}

function isOnboardingTemplateChoice(
  value: unknown,
): value is OnboardingTemplateChoice {
  return value === 'blank' || value === 'example';
}

function setActionError(
  setState: Dispatch<SetStateAction<OnboardingScreenState>>,
): void {
  setState((current) =>
    current.status === 'ready'
      ? {
          ...current,
          isSubmitting: false,
          actionError: ONBOARDING_ACTION_ERROR_MESSAGE,
        }
      : current,
  );
}

function createDefaultOnboardingId(kind: OnboardingIdKind): string {
  return `onboarding-${kind}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
