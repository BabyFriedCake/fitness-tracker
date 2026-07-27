import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import { createSqliteDailyStatusRepository } from '@/database/repositories/daily-status';
import { createSqliteRestTimerRepository } from '@/database/repositories/rest-timer';
import { createSqliteTodayWorkoutPlanRepository } from '@/database/repositories/today-workout-plan';
import { createSqliteWorkoutRuntimeSnapshotRepository } from '@/database/repositories/workout-runtime-snapshot';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type { ExerciseRepository } from '@/domain/exercise';
import type {
  DailyStatusRepository,
  DailyStatusValue,
} from '@/domain/daily-status';
import type {
  TodayWorkoutPlanId,
  TodayWorkoutPlanRepository,
} from '@/domain/today-workout-plan';
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
  addTodayPlanFromTemplate,
  loadTodayDashboard,
  startTodayPlan,
  toLocalDateKey,
  type TodayDashboardData,
  type TodayDashboardRepositories,
} from './today-dashboard';
import type { WorkoutSessionIdKind } from './workout-session-flow';
import type { WorkoutSessionScreenRepositories } from './load-workout-session-screen';
import type { WorkoutRuntimeSnapshotRepository } from './workout-runtime-snapshot-repository';

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
  readonly addTodayPlanFromTemplate: (
    templateId: WorkoutTemplateId,
  ) => Promise<boolean>;
  readonly startTodayPlan: (
    planId: TodayWorkoutPlanId,
  ) => Promise<WorkoutSessionId | null>;
  readonly createSessionFromTemplate: (
    templateId: WorkoutTemplateId,
  ) => Promise<void>;
  readonly continueSession: (sessionId: WorkoutSessionId) => Promise<boolean>;
  readonly updateDailyStatus: (status: DailyStatusValue) => Promise<void>;
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
  readonly createTodayWorkoutPlanRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => TodayWorkoutPlanRepository;
  readonly createExerciseRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => ExerciseRepository;
  readonly createDailyStatusRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => DailyStatusRepository;
  readonly createRestTimerRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => RestTimerRepository;
  readonly createWorkoutRuntimeSnapshotRepository?: () => WorkoutRuntimeSnapshotRepository;
  readonly now?: () => string;
  readonly createId?: (kind: WorkoutSessionIdKind) => string;
  readonly createTodayPlanId?: () => string;
  readonly continueRecovery?: (
    repositories: WorkoutSessionScreenRepositories,
    sessionId: WorkoutSessionId,
    now: string,
  ) => Promise<LoadWorkoutSessionRecoveryResult>;
};

const TODAY_LOAD_ERROR_MESSAGE =
  '今日训练加载失败。已保存的训练数据不会丢失，请重试。';
const TODAY_ACTION_ERROR_MESSAGE =
  '训练入口操作失败。已保存的训练数据不会丢失，请重试。';

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function useTodayDashboard({
  initializeDatabase = initializeApplicationDatabase,
  createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
  createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
  createTodayWorkoutPlanRepository = createSqliteTodayWorkoutPlanRepository,
  createExerciseRepository = createSqliteExerciseRepository,
  createDailyStatusRepository = createSqliteDailyStatusRepository,
  createRestTimerRepository = createSqliteRestTimerRepository,
  createWorkoutRuntimeSnapshotRepository = createSqliteWorkoutRuntimeSnapshotRepository,
  now = getCurrentTimestamp,
  createId = createDefaultWorkoutSessionId,
  createTodayPlanId = createDefaultTodayWorkoutPlanId,
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
        readonly workoutRuntimeSnapshotRepository: WorkoutRuntimeSnapshotRepository;
      })
    | null
  >(null);
  const isCreatingRef = useRef(false);
  const isContinuingRef = useRef(false);
  const hasFocusedRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
          todayWorkoutPlanRepository: createTodayWorkoutPlanRepository(
            startupResult.database,
          ),
          exerciseRepository: createExerciseRepository(startupResult.database),
          dailyStatusRepository: createDailyStatusRepository(
            startupResult.database,
          ),
          restTimerRepository: createRestTimerRepository(
            startupResult.database,
          ),
          workoutRuntimeSnapshotRepository:
            createWorkoutRuntimeSnapshotRepository(),
        };
        repositoriesRef.current = repositories;
      }

      const result = await loadTodayDashboard(repositories, new Date(now()));

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
    createDailyStatusRepository,
    createRestTimerRepository,
    createWorkoutRuntimeSnapshotRepository,
    createWorkoutSessionRepository,
    createWorkoutTemplateRepository,
    createTodayWorkoutPlanRepository,
    initializeDatabase,
    now,
  ]);

  const refreshReadyState = useCallback(async (): Promise<void> => {
    const repositories = repositoriesRef.current;

    if (!repositories || !isMountedRef.current) {
      return;
    }

    const result = await loadTodayDashboard(repositories, new Date(now()));

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
  }, [now]);

  const updateDailyStatus = useCallback(
    async (status: DailyStatusValue): Promise<void> => {
      const repositories = repositoriesRef.current;

      if (!repositories || !isMountedRef.current) {
        return;
      }

      try {
        const currentTime = now();
        await repositories.dailyStatusRepository.save({
          localDate: toLocalDateKey(new Date(currentTime)),
          status,
          updatedAt: currentTime,
        });

        if (isMountedRef.current) {
          await refreshReadyState();
        }
      } catch {
        if (isMountedRef.current) {
          setState((current) =>
            current.status === 'ready'
              ? { ...current, actionError: TODAY_ACTION_ERROR_MESSAGE }
              : current,
          );
        }
      }
    },
    [now, refreshReadyState],
  );

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

  const addPlanFromTemplate = useCallback(
    async (templateId: WorkoutTemplateId): Promise<boolean> => {
      const repositories = repositoriesRef.current;
      const currentState = stateRef.current;

      if (
        !repositories ||
        isCreatingRef.current ||
        isContinuingRef.current ||
        currentState.status !== 'ready'
      ) {
        return false;
      }

      isCreatingRef.current = true;
      setState((current) =>
        current.status === 'ready'
          ? { ...current, isCreatingSession: true, actionError: undefined }
          : current,
      );

      try {
        const currentTime = now();
        const result = await addTodayPlanFromTemplate(
          repositories,
          templateId,
          {
            localDate: toLocalDateKey(new Date(currentTime)),
            now,
            createId: createTodayPlanId,
            position: currentState.data.todayPlans.length + 1,
          },
        );

        if (!isMountedRef.current) {
          return false;
        }

        if (result.status !== 'added') {
          setState((current) =>
            current.status === 'ready'
              ? {
                  ...current,
                  isCreatingSession: false,
                  actionError:
                    result.status === 'duplicate_template'
                      ? '今天已经添加过这个训练模板。'
                      : TODAY_ACTION_ERROR_MESSAGE,
                }
              : current,
          );
          return false;
        }

        await refreshReadyState();
        return true;
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
        return false;
      } finally {
        isCreatingRef.current = false;
      }
    },
    [createTodayPlanId, now, refreshReadyState],
  );

  const startPlan = useCallback(
    async (planId: TodayWorkoutPlanId): Promise<WorkoutSessionId | null> => {
      const repositories = repositoriesRef.current;

      if (!repositories || isCreatingRef.current || isContinuingRef.current) {
        return null;
      }

      isCreatingRef.current = true;
      setState((current) =>
        current.status === 'ready'
          ? { ...current, isCreatingSession: true, actionError: undefined }
          : current,
      );

      try {
        const result = await startTodayPlan(repositories, planId, {
          now,
          createId,
        });

        if (!isMountedRef.current) {
          return null;
        }

        await refreshReadyState();

        if (result.status === 'ready') {
          return result.sessionId;
        }

        if (result.status === 'completed') {
          return null;
        }

        setState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                isCreatingSession: false,
                actionError: TODAY_ACTION_ERROR_MESSAGE,
              }
            : current,
        );
        return null;
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
        return null;
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
            workoutRuntimeSnapshotRepository:
              repositories.workoutRuntimeSnapshotRepository,
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
      addTodayPlanFromTemplate: addPlanFromTemplate,
      startTodayPlan: startPlan,
      createSessionFromTemplate,
      continueSession,
      updateDailyStatus,
    },
  };
}

function createDefaultWorkoutSessionId(kind: WorkoutSessionIdKind): string {
  return `workout-${kind}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createDefaultTodayWorkoutPlanId(): string {
  return `today-plan-${Date.now().toString(36)}-${Math.random()
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
