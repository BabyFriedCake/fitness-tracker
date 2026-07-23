import { useCallback, useEffect, useRef, useState } from 'react';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import { createSqliteTodayWorkoutPlanRepository } from '@/database/repositories/today-workout-plan';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type { ExerciseRepository } from '@/domain/exercise';
import type {
  TodayWorkoutPlan,
  TodayWorkoutPlanId,
  TodayWorkoutPlanRepository,
} from '@/domain/today-workout-plan';
import type {
  WorkoutTemplate,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';
import type {
  SessionExerciseId,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { startTodayPlan } from './today-dashboard';
import type { WorkoutSessionIdKind } from './workout-session-flow';

export type TodayPlanDetailRouteParams = {
  readonly id?: string | readonly string[];
};

export type TodayPlanDetailData = {
  readonly plan: TodayWorkoutPlan;
  readonly template: WorkoutTemplate;
  readonly session?: WorkoutSession;
  readonly exercises: readonly TodayPlanDetailExercise[];
};

export type TodayPlanDetailExercise = {
  readonly id: string;
  readonly name: string;
  readonly targetSets: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly restSeconds: number;
};

export type TodayPlanDetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'notFound'; readonly message: string }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly data: TodayPlanDetailData;
      readonly isStarting: boolean;
      readonly actionError?: string;
    };

export type TodayPlanDetailControls = {
  readonly reload: () => void;
  readonly prepareEdit: () => Promise<boolean>;
  readonly updateExerciseConfig: (
    sessionExerciseId: SessionExerciseId,
    input: TodayPlanSessionExerciseConfigInput,
  ) => Promise<boolean>;
  readonly startPlan: () => Promise<WorkoutSessionId | null>;
};

export type UseTodayPlanDetailDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createTodayWorkoutPlanRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => TodayWorkoutPlanRepository;
  readonly createWorkoutTemplateRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutTemplateRepository;
  readonly createWorkoutSessionRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutSessionRepository;
  readonly createExerciseRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => ExerciseRepository;
  readonly now?: () => string;
  readonly createId?: (kind: WorkoutSessionIdKind) => string;
};

const DETAIL_ERROR_MESSAGE =
  '今日训练计划加载失败。已保存的训练数据不会丢失，请重试。';
const DETAIL_NOT_FOUND_MESSAGE = '没有找到这个今日训练计划。';
const START_ERROR_MESSAGE = '训练启动失败。已保存的训练数据不会丢失，请重试。';
const EDIT_ERROR_MESSAGE =
  '本次训练配置保存失败。已保存的训练数据不会丢失，请重试。';

export type TodayPlanSessionExerciseConfigInput = {
  readonly targetSets: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly restSeconds: number;
};

type TodayPlanDetailRepositories = {
  readonly todayWorkoutPlanRepository: TodayWorkoutPlanRepository;
  readonly workoutTemplateRepository: WorkoutTemplateRepository;
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly exerciseRepository: ExerciseRepository;
};

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function useTodayPlanDetail(
  routeParams: TodayPlanDetailRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createTodayWorkoutPlanRepository = createSqliteTodayWorkoutPlanRepository,
    createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
    createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
    createExerciseRepository = createSqliteExerciseRepository,
    now = getCurrentTimestamp,
    createId = createDefaultWorkoutSessionId,
  }: UseTodayPlanDetailDependencies = {},
): {
  readonly state: TodayPlanDetailState;
  readonly controls: TodayPlanDetailControls;
} {
  const [state, setState] = useState<TodayPlanDetailState>({
    status: 'loading',
  });
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const repositoriesRef = useRef<TodayPlanDetailRepositories | null>(null);
  const isStartingRef = useRef(false);
  const planId = parsePlanId(routeParams.id);

  const getRepositories =
    useCallback(async (): Promise<TodayPlanDetailRepositories> => {
      if (repositoriesRef.current) {
        return repositoriesRef.current;
      }

      const startupResult = await initializeDatabase();

      if (startupResult.status === 'error') {
        throw new Error('Database startup failed.');
      }

      const repositories: TodayPlanDetailRepositories = {
        todayWorkoutPlanRepository: createTodayWorkoutPlanRepository(
          startupResult.database,
        ),
        workoutTemplateRepository: createWorkoutTemplateRepository(
          startupResult.database,
        ),
        workoutSessionRepository: createWorkoutSessionRepository(
          startupResult.database,
        ),
        exerciseRepository: createExerciseRepository(startupResult.database),
      };
      repositoriesRef.current = repositories;

      return repositories;
    }, [
      createExerciseRepository,
      createTodayWorkoutPlanRepository,
      createWorkoutSessionRepository,
      createWorkoutTemplateRepository,
      initializeDatabase,
    ]);

  const load = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ status: 'loading' });

    if (!planId) {
      setState({ status: 'notFound', message: DETAIL_NOT_FOUND_MESSAGE });
      return;
    }

    try {
      const repositories = await getRepositories();
      const result = await loadTodayPlanDetail(repositories, planId);

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      setState(
        result.status === 'ready'
          ? {
              status: 'ready',
              data: result.data,
              isStarting: false,
            }
          : { status: result.status, message: result.message },
      );
    } catch {
      if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        setState({ status: 'error', message: DETAIL_ERROR_MESSAGE });
      }
    }
  }, [getRepositories, planId]);

  const startPlan = useCallback(async (): Promise<WorkoutSessionId | null> => {
    if (!planId || isStartingRef.current) {
      return null;
    }

    const repositories = repositoriesRef.current;

    if (!repositories) {
      return null;
    }

    isStartingRef.current = true;
    setState((current) =>
      current.status === 'ready'
        ? { ...current, isStarting: true, actionError: undefined }
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

      if (result.status === 'ready') {
        return result.sessionId;
      }

      await load();
      return null;
    } catch {
      if (isMountedRef.current) {
        setState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                isStarting: false,
                actionError: START_ERROR_MESSAGE,
              }
            : current,
        );
      }
      return null;
    } finally {
      isStartingRef.current = false;
    }
  }, [createId, load, now, planId]);

  const prepareEdit = useCallback(async (): Promise<boolean> => {
    if (!planId || isStartingRef.current) {
      return false;
    }

    const repositories = repositoriesRef.current;

    if (!repositories) {
      return false;
    }

    isStartingRef.current = true;
    setState((current) =>
      current.status === 'ready'
        ? { ...current, isStarting: true, actionError: undefined }
        : current,
    );

    try {
      const result = await startTodayPlan(repositories, planId, {
        now,
        createId,
      });

      if (!isMountedRef.current) {
        return false;
      }

      if (result.status !== 'ready') {
        await load();
        return false;
      }

      const detail = await loadTodayPlanDetail(repositories, planId);

      if (!isMountedRef.current) {
        return false;
      }

      setState(
        detail.status === 'ready'
          ? {
              status: 'ready',
              data: detail.data,
              isStarting: false,
            }
          : { status: detail.status, message: detail.message },
      );

      return (
        detail.status === 'ready' && detail.data.session?.status === 'draft'
      );
    } catch {
      if (isMountedRef.current) {
        setState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                isStarting: false,
                actionError: EDIT_ERROR_MESSAGE,
              }
            : current,
        );
      }
      return false;
    } finally {
      isStartingRef.current = false;
    }
  }, [createId, load, now, planId]);

  const updateExerciseConfig = useCallback(
    async (
      sessionExerciseId: SessionExerciseId,
      input: TodayPlanSessionExerciseConfigInput,
    ): Promise<boolean> => {
      if (!planId || isStartingRef.current) {
        return false;
      }

      const repositories = repositoriesRef.current;

      if (!repositories) {
        return false;
      }

      isStartingRef.current = true;
      setState((current) =>
        current.status === 'ready'
          ? { ...current, isStarting: true, actionError: undefined }
          : current,
      );

      try {
        const result = await updateTodayPlanDraftSessionExerciseConfig(
          repositories,
          planId,
          sessionExerciseId,
          input,
          now(),
        );

        if (!isMountedRef.current) {
          return false;
        }

        if (result.status !== 'updated') {
          setState((current) =>
            current.status === 'ready'
              ? {
                  ...current,
                  isStarting: false,
                  actionError:
                    result.status === 'not_editable'
                      ? '只有尚未开始的训练草稿可以编辑。'
                      : EDIT_ERROR_MESSAGE,
                }
              : current,
          );
          return false;
        }

        const detail = await loadTodayPlanDetail(repositories, planId);

        if (!isMountedRef.current) {
          return false;
        }

        setState(
          detail.status === 'ready'
            ? {
                status: 'ready',
                data: detail.data,
                isStarting: false,
              }
            : { status: detail.status, message: detail.message },
        );
        return true;
      } catch {
        if (isMountedRef.current) {
          setState((current) =>
            current.status === 'ready'
              ? {
                  ...current,
                  isStarting: false,
                  actionError: EDIT_ERROR_MESSAGE,
                }
              : current,
          );
        }
        return false;
      } finally {
        isStartingRef.current = false;
      }
    },
    [now, planId],
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
      isStartingRef.current = false;
    };
  }, [load]);

  return {
    state,
    controls: {
      reload: () => void load(),
      prepareEdit,
      updateExerciseConfig,
      startPlan,
    },
  };
}

export type LoadTodayPlanDetailResult =
  | { readonly status: 'ready'; readonly data: TodayPlanDetailData }
  | { readonly status: 'notFound'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

export async function loadTodayPlanDetail(
  repositories: TodayPlanDetailRepositories,
  planId: TodayWorkoutPlanId,
): Promise<LoadTodayPlanDetailResult> {
  try {
    const plan = await repositories.todayWorkoutPlanRepository.findById(planId);

    if (!plan) {
      return { status: 'notFound', message: DETAIL_NOT_FOUND_MESSAGE };
    }

    const template = await repositories.workoutTemplateRepository.getById(
      plan.sourceTemplateId,
    );

    if (!template) {
      return { status: 'notFound', message: DETAIL_NOT_FOUND_MESSAGE };
    }

    const session = plan.sessionId
      ? ((await repositories.workoutSessionRepository.findById(
          plan.sessionId,
        )) ?? undefined)
      : undefined;
    const exercises = await Promise.all(
      template.exercises.map(async (templateExercise) => {
        const exercise = await repositories.exerciseRepository.getById(
          templateExercise.exerciseId,
        );

        return {
          id: templateExercise.id,
          name:
            exercise?.nameZh ??
            exercise?.nameEn ??
            exercise?.slug ??
            templateExercise.exerciseId,
          targetSets: templateExercise.targetSets,
          targetRepsMin: templateExercise.targetReps.min,
          targetRepsMax: templateExercise.targetReps.max,
          restSeconds: templateExercise.restSeconds,
        };
      }),
    );

    return { status: 'ready', data: { plan, template, session, exercises } };
  } catch {
    return { status: 'error', message: DETAIL_ERROR_MESSAGE };
  }
}

export type UpdateTodayPlanDraftSessionExerciseConfigResult =
  | { readonly status: 'updated'; readonly session: WorkoutSession }
  | { readonly status: 'plan_not_found' }
  | { readonly status: 'session_not_found' }
  | { readonly status: 'exercise_not_found' }
  | { readonly status: 'not_editable' }
  | { readonly status: 'invalid_input' };

export async function updateTodayPlanDraftSessionExerciseConfig(
  repositories: Pick<
    TodayPlanDetailRepositories,
    'todayWorkoutPlanRepository' | 'workoutSessionRepository'
  >,
  planId: TodayWorkoutPlanId,
  sessionExerciseId: SessionExerciseId,
  input: TodayPlanSessionExerciseConfigInput,
  updatedAt: string,
): Promise<UpdateTodayPlanDraftSessionExerciseConfigResult> {
  if (!isValidExerciseConfigInput(input)) {
    return { status: 'invalid_input' };
  }

  const plan = await repositories.todayWorkoutPlanRepository.findById(planId);

  if (!plan) {
    return { status: 'plan_not_found' };
  }

  if (!plan.sessionId) {
    return { status: 'session_not_found' };
  }

  const session = await repositories.workoutSessionRepository.findById(
    plan.sessionId,
  );

  if (!session) {
    return { status: 'session_not_found' };
  }

  if (session.status !== 'draft') {
    return { status: 'not_editable' };
  }

  let didUpdate = false;
  const nextSession: WorkoutSession = {
    ...session,
    sessionExercises: session.sessionExercises.map((exercise) => {
      if (exercise.id !== sessionExerciseId) {
        return exercise;
      }

      didUpdate = true;

      return {
        ...exercise,
        targetSets: input.targetSets,
        targetRepsMin: input.targetRepsMin,
        targetRepsMax: input.targetRepsMax,
        currentRestSeconds: input.restSeconds,
      };
    }),
    updatedAt,
  };

  if (!didUpdate) {
    return { status: 'exercise_not_found' };
  }

  const saved = await repositories.workoutSessionRepository.update(nextSession);

  return { status: 'updated', session: saved };
}

function parsePlanId(
  value: string | readonly string[] | undefined,
): TodayWorkoutPlanId | null {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw && raw.trim().length > 0 ? (raw as TodayWorkoutPlanId) : null;
}

function isValidExerciseConfigInput(
  input: TodayPlanSessionExerciseConfigInput,
): boolean {
  return (
    Number.isInteger(input.targetSets) &&
    input.targetSets > 0 &&
    Number.isInteger(input.targetRepsMin) &&
    input.targetRepsMin > 0 &&
    Number.isInteger(input.targetRepsMax) &&
    input.targetRepsMax >= input.targetRepsMin &&
    Number.isInteger(input.restSeconds) &&
    input.restSeconds >= 0
  );
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
