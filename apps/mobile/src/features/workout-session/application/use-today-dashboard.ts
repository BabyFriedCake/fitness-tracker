import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import { createSqliteRestTimerRepository } from '@/database/repositories/rest-timer';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type { ExerciseRepository } from '@/domain/exercise';
import type {
  WorkoutTemplateId,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';
import type {
  RestTimerRepository,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import {
  continueWorkoutSessionRecovery,
  type LoadWorkoutSessionRecoveryResult,
} from './workout-session-completion-recovery';
import {
  createWorkoutSessionFromTemplate,
  loadTodayDashboard,
  type TodayDashboardData,
  type TodayDashboardRepositories,
} from './today-dashboard';
import type { WorkoutSessionIdKind } from './workout-session-flow';

export type TodayDashboardScreenState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly data: TodayDashboardData;
      readonly isCreatingSession: boolean;
      readonly isContinuingSession: boolean;
      readonly actionError?: string;
    };

export type TodayDashboardScreenControls = {
  readonly reload: () => void;
  readonly createSessionFromTemplate: (
    templateId: WorkoutTemplateId,
  ) => Promise<void>;
  readonly continueSession: (sessionId: WorkoutSessionId) => Promise<boolean>;
};

export type TodayDashboardScreenModel = {
  readonly state: TodayDashboardScreenState;
  readonly controls: TodayDashboardScreenControls;
};

export type UseTodayDashboardDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createWorkoutSessionRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutSessionRepository;
  readonly createWorkoutTemplateRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutTemplateRepository;
  readonly createExerciseRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => ExerciseRepository;
  readonly createRestTimerRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => RestTimerRepository;
  readonly now?: () => string;
  readonly createId?: (kind: WorkoutSessionIdKind) => string;
  readonly continueRecovery?: (
    repositories: {
      readonly workoutSessionRepository: WorkoutSessionRepository;
      readonly restTimerRepository: RestTimerRepository;
    },
    sessionId: WorkoutSessionId,
    now: string,
  ) => Promise<LoadWorkoutSessionRecoveryResult>;
};

const TODAY_LOAD_ERROR_MESSAGE =
  '今日训练加载失败。已保存的训练数据不会丢失，请重试。';
const TODAY_ACTION_ERROR_MESSAGE =
  '训练入口操作失败。已保存的训练数据不会丢失，请重试。';

export function useTodayDashboard({
  initializeDatabase = initializeApplicationDatabase,
  createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
  createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
  createExerciseRepository = createSqliteExerciseRepository,
  createRestTimerRepository = createSqliteRestTimerRepository,
  now = () => new Date().toISOString(),
  createId = createDefaultWorkoutSessionId,
  continueRecovery = continueWorkoutSessionRecovery,
}: UseTodayDashboardDependencies = {}): TodayDashboardScreenModel {
  const [state, setState] = useState<TodayDashboardScreenState>({
    status: 'loading',
  });
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const repositoriesRef = useRef<
    | (TodayDashboardRepositories & {
        readonly restTimerRepository: RestTimerRepository;
      })
    | null
  >(null);
  const isCreatingRef = useRef(false);
  const isContinuingRef = useRef(false);
  const hasFocusedRef = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ status: 'loading' });

    try {
      let repositories = repositoriesRef.current;

      if (!repositories) {
        const startupResult = await initializeDatabase();

        if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
          return;
        }

        if (startupResult.status === 'error') {
          setState({ status: 'error', message: TODAY_LOAD_ERROR_MESSAGE });
          return;
        }

        repositories = {
          workoutSessionRepository: createWorkoutSessionRepository(
            startupResult.database,
          ),
          workoutTemplateRepository: createWorkoutTemplateRepository(
            startupResult.database,
          ),
          exerciseRepository: createExerciseRepository(startupResult.database),
          restTimerRepository: createRestTimerRepository(
            startupResult.database,
          ),
        };
        repositoriesRef.current = repositories;
      }

      const result = await loadTodayDashboard(repositories);

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      setState(
        result.status === 'ready'
          ? {
              status: 'ready',
              data: result.data,
              isCreatingSession: false,
              isContinuingSession: false,
            }
          : { status: 'error', message: result.message },
      );
    } catch {
      if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        setState({ status: 'error', message: TODAY_LOAD_ERROR_MESSAGE });
      }
    }
  }, [
    createExerciseRepository,
    createRestTimerRepository,
    createWorkoutSessionRepository,
    createWorkoutTemplateRepository,
    initializeDatabase,
  ]);

  const refreshReadyState = useCallback(async (): Promise<void> => {
    const repositories = repositoriesRef.current;

    if (!repositories || !isMountedRef.current) {
      return;
    }

    const result = await loadTodayDashboard(repositories);

    if (!isMountedRef.current) {
      return;
    }

    setState(
      result.status === 'ready'
        ? {
            status: 'ready',
            data: result.data,
            isCreatingSession: false,
            isContinuingSession: false,
          }
        : { status: 'error', message: result.message },
    );
  }, []);

  const createSessionFromTemplate = useCallback(
    async (templateId: WorkoutTemplateId): Promise<void> => {
      const repositories = repositoriesRef.current;

      if (!repositories || isCreatingRef.current || isContinuingRef.current) {
        return;
      }

      isCreatingRef.current = true;
      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              isCreatingSession: true,
              actionError: undefined,
            }
          : current,
      );

      try {
        await createWorkoutSessionFromTemplate(repositories, templateId, {
          now,
          createId,
        });
        await refreshReadyState();
      } catch {
        if (isMountedRef.current) {
          setState((current) =>
            current.status === 'ready'
              ? {
                  ...current,
                  isCreatingSession: false,
                  actionError: TODAY_ACTION_ERROR_MESSAGE,
                }
              : current,
          );
        }
      } finally {
        isCreatingRef.current = false;
      }
    },
    [createId, now, refreshReadyState],
  );

  const continueSession = useCallback(
    async (sessionId: WorkoutSessionId): Promise<boolean> => {
      const repositories = repositoriesRef.current;

      if (!repositories || isContinuingRef.current || isCreatingRef.current) {
        return false;
      }

      isContinuingRef.current = true;
      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              isContinuingSession: true,
              actionError: undefined,
            }
          : current,
      );

      try {
        const result = await continueRecovery(
          {
            workoutSessionRepository: repositories.workoutSessionRepository,
            restTimerRepository: repositories.restTimerRepository,
          },
          sessionId,
          now(),
        );

        if (!isMountedRef.current) {
          return false;
        }

        if (result.status !== 'ready') {
          setState((current) =>
            current.status === 'ready'
              ? {
                  ...current,
                  isContinuingSession: false,
                  actionError: TODAY_ACTION_ERROR_MESSAGE,
                }
              : current,
          );
          return false;
        }

        setState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                data: {
                  ...current.data,
                  sessionEntry: {
                    status: 'in_progress',
                    sessionId: result.data.session.id,
                    workoutName: result.data.session.workoutNameSnapshot,
                    completedSetCount: result.runtime.completedSets,
                    totalTargetSetCount: result.runtime.targetSets,
                  },
                },
                isContinuingSession: false,
              }
            : current,
        );
        return true;
      } catch {
        if (isMountedRef.current) {
          setState((current) =>
            current.status === 'ready'
              ? {
                  ...current,
                  isContinuingSession: false,
                  actionError: TODAY_ACTION_ERROR_MESSAGE,
                }
              : current,
          );
        }
        return false;
      } finally {
        isContinuingRef.current = false;
      }
    },
    [continueRecovery, now],
  );

  useEffect(() => {
    isMountedRef.current = true;
    const initialLoadTimeout = setTimeout(() => {
      void load();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimeout);
      isMountedRef.current = false;
      requestIdRef.current += 1;
      repositoriesRef.current = null;
      isCreatingRef.current = false;
      isContinuingRef.current = false;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }

      void load();
    }, [load]),
  );

  return {
    state,
    controls: {
      reload: () => void load(),
      createSessionFromTemplate,
      continueSession,
    },
  };
}

function createDefaultWorkoutSessionId(kind: WorkoutSessionIdKind): string {
  return `workout-${kind}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isCurrentRequest(
  isMountedRef: { readonly current: boolean },
  requestIdRef: { readonly current: number },
  requestId: number,
): boolean {
  return isMountedRef.current && requestIdRef.current === requestId;
}
