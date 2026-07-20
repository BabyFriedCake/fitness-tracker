import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteRestTimerRepository } from '@/database/repositories/rest-timer';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import type {
  RestTimerRepository,
  SessionExercise,
  SessionExerciseId,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { cancelSession, completeSession } from './workout-session-flow';
import {
  completeSessionExercise,
  recordWorkoutSet,
  resumeSessionExercise,
  skipSessionExercise,
} from './workout-session-execution';
import {
  createWorkoutSessionScreenData,
  getSessionExerciseNextSetNumber,
  loadWorkoutSessionScreen,
  type WorkoutSessionScreenData,
  type WorkoutSessionScreenRepositories,
} from './load-workout-session-screen';
import { setCurrentSessionPosition } from './workout-session-rest-timer';
import { closeActiveRestTimer } from './workout-session-completion-recovery';

export type WorkoutSessionRouteParams = {
  readonly id?: string | readonly string[];
};

export type WorkoutSetDraft = {
  readonly weight: string;
  readonly actualReps: string;
};

export type WorkoutSessionScreenState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'error';
      readonly message: string;
    }
  | {
      readonly status: 'ready';
      readonly data: WorkoutSessionScreenData;
      readonly setDraft: WorkoutSetDraft;
      readonly isMutating: boolean;
      readonly isConfirmingSkip: boolean;
      readonly endFlow: 'closed' | 'options' | 'confirm_cancel';
      readonly navigationIntent?: 'summary' | 'today';
      readonly actionError?: string;
    };

export type WorkoutSessionScreenControls = {
  readonly reload: () => void;
  readonly updateWeight: (value: string) => void;
  readonly updateActualReps: (value: string) => void;
  readonly recordSet: () => Promise<void>;
  readonly selectExercise: (exerciseId: SessionExerciseId) => Promise<void>;
  readonly requestSkipExercise: () => void;
  readonly cancelSkipExercise: () => void;
  readonly confirmSkipExercise: () => Promise<void>;
  readonly resumeExercise: () => Promise<void>;
  readonly completeExercise: () => Promise<void>;
  readonly requestEndSession: () => void;
  readonly continueSession: () => void;
  readonly requestCancelSession: () => void;
  readonly confirmCancelSession: () => Promise<void>;
  readonly confirmCompleteSession: () => Promise<void>;
  readonly clearNavigationIntent: () => void;
};

export type WorkoutSessionScreenModel = {
  readonly state: WorkoutSessionScreenState;
  readonly controls: WorkoutSessionScreenControls;
};

export type UseWorkoutSessionScreenDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createWorkoutSessionRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutSessionRepository;
  readonly createRestTimerRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => RestTimerRepository;
  readonly now?: () => string;
  readonly createWorkoutSetId?: () => string;
};

const SESSION_LOAD_ERROR_MESSAGE =
  '训练加载失败。已保存的训练数据不会受影响，请重试。';
const SESSION_NOT_FOUND_MESSAGE = '未找到这次训练。';
const SESSION_ACTION_ERROR_MESSAGE =
  '操作保存失败。已完成的训练数据不会丢失，请重试。';
const SESSION_END_ERROR_MESSAGE =
  '训练结束状态保存失败。已完成的组不会丢失，请重试。';
const INVALID_SET_INPUT_MESSAGE = '请输入有效的非负重量和非负整数次数。';

export function useWorkoutSessionScreen(
  routeParams: WorkoutSessionRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
    createRestTimerRepository = createSqliteRestTimerRepository,
    now = () => new Date().toISOString(),
    createWorkoutSetId = createDefaultWorkoutSetId,
  }: UseWorkoutSessionScreenDependencies = {},
): WorkoutSessionScreenModel {
  const [state, setState] = useState<WorkoutSessionScreenState>({
    status: 'loading',
  });
  const stateRef = useRef(state);
  const repositoriesRef = useRef<WorkoutSessionScreenRepositories | null>(null);
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const isMutatingRef = useRef(false);
  const hasFocusedRef = useRef(false);
  const silentRefreshRequestIdRef = useRef<number | null>(null);
  const refreshAfterMutationRef = useRef(false);
  const dependenciesRef = useRef({
    initializeDatabase,
    createWorkoutSessionRepository,
    createRestTimerRepository,
    now,
    createWorkoutSetId,
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    dependenciesRef.current = {
      initializeDatabase,
      createWorkoutSessionRepository,
      createRestTimerRepository,
      now,
      createWorkoutSetId,
    };
  }, [
    createRestTimerRepository,
    createWorkoutSessionRepository,
    createWorkoutSetId,
    initializeDatabase,
    now,
  ]);

  const commitState = useCallback((next: WorkoutSessionScreenState): void => {
    stateRef.current = next;
    setState(next);
  }, []);

  const load = useCallback(
    async (showLoading = true): Promise<void> => {
      const sessionId = parseWorkoutSessionId(routeParams.id);
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!showLoading) {
        silentRefreshRequestIdRef.current = requestId;
      }

      await Promise.resolve();

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        if (silentRefreshRequestIdRef.current === requestId) {
          silentRefreshRequestIdRef.current = null;
        }
        return;
      }

      if (showLoading) {
        commitState({ status: 'loading' });
      }

      if (!sessionId) {
        if (silentRefreshRequestIdRef.current === requestId) {
          silentRefreshRequestIdRef.current = null;
        }
        commitState({ status: 'error', message: SESSION_NOT_FOUND_MESSAGE });
        return;
      }

      try {
        let repositories = repositoriesRef.current;

        if (!repositories) {
          const startupResult =
            await dependenciesRef.current.initializeDatabase();

          if (!isCurrentRequest(requestIdRef, requestId, isMountedRef)) {
            return;
          }

          if (startupResult.status === 'error') {
            commitState({
              status: 'error',
              message: SESSION_LOAD_ERROR_MESSAGE,
            });
            return;
          }

          repositories = {
            workoutSessionRepository:
              dependenciesRef.current.createWorkoutSessionRepository(
                startupResult.database,
              ),
            restTimerRepository:
              dependenciesRef.current.createRestTimerRepository(
                startupResult.database,
              ),
          };
          repositoriesRef.current = repositories;
        }

        const result = await loadWorkoutSessionScreen(
          repositories,
          sessionId,
          dependenciesRef.current.now(),
        );

        if (!isCurrentRequest(requestIdRef, requestId, isMountedRef)) {
          return;
        }

        if (result.status === 'not_found') {
          commitState({ status: 'error', message: SESSION_NOT_FOUND_MESSAGE });
          return;
        }

        const current = stateRef.current;
        const shouldPreserveDraft =
          !showLoading &&
          current.status === 'ready' &&
          current.data.currentExercise?.id === result.data.currentExercise?.id;
        commitState({
          status: 'ready',
          data: result.data,
          setDraft: shouldPreserveDraft
            ? current.setDraft
            : createDefaultSetDraft(result.data.currentExercise),
          isMutating: false,
          isConfirmingSkip: shouldPreserveDraft
            ? current.isConfirmingSkip
            : false,
          endFlow: shouldPreserveDraft ? current.endFlow : 'closed',
          navigationIntent: shouldPreserveDraft
            ? current.navigationIntent
            : undefined,
          actionError: shouldPreserveDraft ? current.actionError : undefined,
        });
      } catch {
        if (isCurrentRequest(requestIdRef, requestId, isMountedRef)) {
          const current = stateRef.current;
          commitState(
            !showLoading && current.status === 'ready'
              ? { ...current, actionError: SESSION_LOAD_ERROR_MESSAGE }
              : { status: 'error', message: SESSION_LOAD_ERROR_MESSAGE },
          );
        }
      } finally {
        if (silentRefreshRequestIdRef.current === requestId) {
          silentRefreshRequestIdRef.current = null;
        }
      }
    },
    [commitState, routeParams.id],
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
      silentRefreshRequestIdRef.current = null;
      refreshAfterMutationRef.current = false;
    };
  }, [load]);

  const requestSilentRefresh = useCallback((): void => {
    if (!repositoriesRef.current) {
      return;
    }

    if (isMutatingRef.current) {
      refreshAfterMutationRef.current = true;
      return;
    }

    void load(false);
  }, [load]);

  const beginMutation = useCallback(
    (
      current: Extract<WorkoutSessionScreenState, { status: 'ready' }>,
    ): void => {
      if (silentRefreshRequestIdRef.current !== null) {
        refreshAfterMutationRef.current = true;
      }
      requestIdRef.current += 1;
      isMutatingRef.current = true;
      commitState({ ...current, isMutating: true, actionError: undefined });
    },
    [commitState],
  );

  const finishMutation = useCallback((): void => {
    isMutatingRef.current = false;

    if (refreshAfterMutationRef.current && isMountedRef.current) {
      refreshAfterMutationRef.current = false;
      void load(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }

      requestSilentRefresh();
    }, [requestSilentRefresh]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        requestSilentRefresh();
      }
    });

    return () => subscription.remove();
  }, [requestSilentRefresh]);

  const updateSetDraft = useCallback(
    (field: keyof WorkoutSetDraft, value: string) => {
      if (
        isMutatingRef.current ||
        (stateRef.current.status === 'ready' &&
          (stateRef.current.isConfirmingSkip ||
            stateRef.current.endFlow !== 'closed'))
      ) {
        return;
      }

      setState((current) => {
        const next: WorkoutSessionScreenState =
          current.status === 'ready'
            ? {
                ...current,
                setDraft: { ...current.setDraft, [field]: value },
                actionError: undefined,
              }
            : current;
        stateRef.current = next;
        return next;
      });
    },
    [],
  );

  const runExerciseMutation = useCallback(
    async (
      operation: (
        repository: WorkoutSessionRepository,
        sessionId: WorkoutSessionId,
        exercise: SessionExercise,
        timestamp: string,
      ) => ReturnType<typeof skipSessionExercise>,
      isAllowed: (exercise: SessionExercise) => boolean,
    ): Promise<void> => {
      const current = stateRef.current;
      const repositories = repositoriesRef.current;

      if (
        current.status !== 'ready' ||
        current.data.session.status !== 'in_progress' ||
        !current.data.currentExercise ||
        !repositories ||
        !isAllowed(current.data.currentExercise) ||
        current.isConfirmingSkip ||
        current.endFlow !== 'closed' ||
        isMutatingRef.current
      ) {
        return;
      }

      const currentExercise = current.data.currentExercise;
      beginMutation(current);

      try {
        const nextSession = await operation(
          repositories.workoutSessionRepository,
          current.data.session.id,
          currentExercise,
          dependenciesRef.current.now(),
        );

        if (!isMountedRef.current) {
          return;
        }

        commitState({
          ...current,
          data: createWorkoutSessionScreenData(
            nextSession,
            current.data.restTimerStatus,
          ),
          isMutating: false,
          isConfirmingSkip: false,
          actionError: undefined,
        });
      } catch {
        if (isMountedRef.current) {
          commitState({
            ...current,
            isMutating: false,
            isConfirmingSkip: false,
            actionError: SESSION_ACTION_ERROR_MESSAGE,
          });
        }
      } finally {
        finishMutation();
      }
    },
    [beginMutation, commitState, finishMutation],
  );

  const recordSet = useCallback(async (): Promise<void> => {
    const current = stateRef.current;
    const repositories = repositoriesRef.current;

    if (
      current.status !== 'ready' ||
      current.data.session.status !== 'in_progress' ||
      !current.data.currentExercise ||
      current.data.currentExercise.isSkipped ||
      current.data.currentExercise.isCompleted ||
      current.isConfirmingSkip ||
      current.endFlow !== 'closed' ||
      !repositories ||
      isMutatingRef.current
    ) {
      return;
    }

    const parsedDraft = parseWorkoutSetDraft(current.setDraft);

    if (!parsedDraft) {
      commitState({ ...current, actionError: INVALID_SET_INPUT_MESSAGE });
      return;
    }

    beginMutation(current);

    try {
      const nextSession = await recordWorkoutSet(
        repositories.workoutSessionRepository,
        {
          sessionId: current.data.session.id,
          sessionExerciseId: current.data.currentExercise.id,
          actualReps: parsedDraft.actualReps,
          weight: parsedDraft.weight,
          completedAt: dependenciesRef.current.now(),
        },
        {
          createWorkoutSetId: dependenciesRef.current.createWorkoutSetId,
        },
      );

      if (!isMountedRef.current) {
        return;
      }

      commitState({
        ...current,
        data: createWorkoutSessionScreenData(
          nextSession,
          current.data.restTimerStatus,
        ),
        isMutating: false,
        isConfirmingSkip: false,
        actionError: undefined,
      });
    } catch {
      if (isMountedRef.current) {
        commitState({
          ...current,
          isMutating: false,
          isConfirmingSkip: false,
          actionError: SESSION_ACTION_ERROR_MESSAGE,
        });
      }
    } finally {
      finishMutation();
    }
  }, [beginMutation, commitState, finishMutation]);

  const selectExercise = useCallback(
    async (exerciseId: SessionExerciseId): Promise<void> => {
      const current = stateRef.current;
      const repositories = repositoriesRef.current;

      if (
        current.status !== 'ready' ||
        current.data.session.status !== 'in_progress' ||
        current.data.currentExercise?.id === exerciseId ||
        current.isConfirmingSkip ||
        current.endFlow !== 'closed' ||
        !repositories ||
        isMutatingRef.current
      ) {
        return;
      }

      const targetExercise = current.data.orderedExercises.find(
        (exercise) => exercise.id === exerciseId,
      );

      if (!targetExercise?.isEnabled) {
        return;
      }

      beginMutation(current);

      try {
        const nextSession = await setCurrentSessionPosition(
          repositories.workoutSessionRepository,
          {
            sessionId: current.data.session.id,
            sessionExerciseId: targetExercise.id,
            currentSetNumber: getSessionExerciseNextSetNumber(targetExercise),
            updatedAt: dependenciesRef.current.now(),
          },
        );

        if (!isMountedRef.current) {
          return;
        }

        const nextData = createWorkoutSessionScreenData(
          nextSession,
          current.data.restTimerStatus,
        );
        commitState({
          ...current,
          data: nextData,
          setDraft: createDefaultSetDraft(nextData.currentExercise),
          isMutating: false,
          isConfirmingSkip: false,
          actionError: undefined,
        });
      } catch {
        if (isMountedRef.current) {
          commitState({
            ...current,
            isMutating: false,
            isConfirmingSkip: false,
            actionError: SESSION_ACTION_ERROR_MESSAGE,
          });
        }
      } finally {
        finishMutation();
      }
    },
    [beginMutation, commitState, finishMutation],
  );

  const requestSkipExercise = useCallback((): void => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      current.data.session.status !== 'in_progress' ||
      !current.data.currentExercise ||
      current.data.currentExercise.isSkipped ||
      current.data.currentExercise.isCompleted ||
      current.isConfirmingSkip ||
      current.endFlow !== 'closed' ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({ ...current, isConfirmingSkip: true, actionError: undefined });
  }, [commitState]);

  const cancelSkipExercise = useCallback((): void => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      !current.isConfirmingSkip ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({ ...current, isConfirmingSkip: false });
  }, [commitState]);

  const confirmSkipExercise = useCallback(async (): Promise<void> => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      !current.isConfirmingSkip ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({ ...current, isConfirmingSkip: false });
    await runExerciseMutation(
      (repository, sessionId, exercise, timestamp) =>
        skipSessionExercise(
          repository,
          { sessionId, sessionExerciseId: exercise.id },
          { now: () => timestamp },
        ),
      (exercise) => !exercise.isSkipped && !exercise.isCompleted,
    );
  }, [commitState, runExerciseMutation]);

  const resumeExercise = useCallback(
    () =>
      runExerciseMutation(
        (repository, sessionId, exercise, timestamp) =>
          resumeSessionExercise(
            repository,
            { sessionId, sessionExerciseId: exercise.id },
            { now: () => timestamp },
          ),
        (exercise) => exercise.isSkipped && !exercise.isCompleted,
      ),
    [runExerciseMutation],
  );

  const completeExercise = useCallback(
    () =>
      runExerciseMutation(
        (repository, sessionId, exercise, timestamp) =>
          completeSessionExercise(
            repository,
            { sessionId, sessionExerciseId: exercise.id },
            { now: () => timestamp },
          ),
        (exercise) => !exercise.isSkipped && !exercise.isCompleted,
      ),
    [runExerciseMutation],
  );

  const requestEndSession = useCallback((): void => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      current.data.session.status !== 'in_progress' ||
      current.isConfirmingSkip ||
      current.endFlow !== 'closed' ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({ ...current, endFlow: 'options', actionError: undefined });
  }, [commitState]);

  const continueSession = useCallback((): void => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      current.endFlow === 'closed' ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({ ...current, endFlow: 'closed' });
  }, [commitState]);

  const requestCancelSession = useCallback((): void => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      current.data.session.status !== 'in_progress' ||
      current.endFlow !== 'options' ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({ ...current, endFlow: 'confirm_cancel' });
  }, [commitState]);

  const runSessionEndMutation = useCallback(
    async (
      operation: (
        repository: WorkoutSessionRepository,
        sessionId: WorkoutSessionId,
        endedAt: string,
      ) =>
        ReturnType<typeof completeSession> | ReturnType<typeof cancelSession>,
      navigationIntent: 'summary' | 'today',
      requiredEndFlow: 'options' | 'confirm_cancel',
    ): Promise<void> => {
      const current = stateRef.current;
      const repositories = repositoriesRef.current;

      if (
        current.status !== 'ready' ||
        current.data.session.status !== 'in_progress' ||
        current.endFlow !== requiredEndFlow ||
        !repositories ||
        isMutatingRef.current
      ) {
        return;
      }

      beginMutation(current);

      try {
        const endedAt = dependenciesRef.current.now();
        await closeActiveRestTimer(
          repositories.restTimerRepository,
          current.data.session.id,
          endedAt,
        );
        const nextSession = await operation(
          repositories.workoutSessionRepository,
          current.data.session.id,
          endedAt,
        );

        if (!isMountedRef.current) {
          return;
        }

        commitState({
          ...current,
          data: createWorkoutSessionScreenData(
            nextSession,
            current.data.restTimerStatus,
          ),
          isMutating: false,
          isConfirmingSkip: false,
          endFlow: 'closed',
          navigationIntent,
          actionError: undefined,
        });
      } catch {
        if (isMountedRef.current) {
          commitState({
            ...current,
            isMutating: false,
            actionError: SESSION_END_ERROR_MESSAGE,
          });
        }
      } finally {
        finishMutation();
      }
    },
    [beginMutation, commitState, finishMutation],
  );

  const confirmCompleteSession = useCallback(
    () => runSessionEndMutation(completeSession, 'summary', 'options'),
    [runSessionEndMutation],
  );

  const confirmCancelSession = useCallback(
    () => runSessionEndMutation(cancelSession, 'today', 'confirm_cancel'),
    [runSessionEndMutation],
  );

  const clearNavigationIntent = useCallback((): void => {
    const current = stateRef.current;

    if (current.status === 'ready' && current.navigationIntent) {
      commitState({ ...current, navigationIntent: undefined });
    }
  }, [commitState]);

  return {
    state,
    controls: {
      reload: () => {
        void load();
      },
      updateWeight: (value) => updateSetDraft('weight', value),
      updateActualReps: (value) => updateSetDraft('actualReps', value),
      recordSet,
      selectExercise,
      requestSkipExercise,
      cancelSkipExercise,
      confirmSkipExercise,
      resumeExercise,
      completeExercise,
      requestEndSession,
      continueSession,
      requestCancelSession,
      confirmCancelSession,
      confirmCompleteSession,
      clearNavigationIntent,
    },
  };
}

function parseWorkoutSessionId(
  value: WorkoutSessionRouteParams['id'],
): WorkoutSessionId | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  return value as WorkoutSessionId;
}

function createDefaultSetDraft(
  exercise: SessionExercise | undefined,
): WorkoutSetDraft {
  const lastSet = exercise?.sets.at(-1);

  return {
    weight: String(lastSet?.weight ?? 0),
    actualReps: String(lastSet?.actualReps ?? exercise?.targetRepsMin ?? 0),
  };
}

function parseWorkoutSetDraft(
  draft: WorkoutSetDraft,
): { readonly weight: number; readonly actualReps: number } | null {
  const normalizedWeight = draft.weight.trim();
  const normalizedReps = draft.actualReps.trim();

  if (
    !/^(?:\d+|\d*\.\d+)$/.test(normalizedWeight) ||
    !/^\d+$/.test(normalizedReps)
  ) {
    return null;
  }

  const weight = Number(normalizedWeight);
  const actualReps = Number(normalizedReps);

  if (
    !Number.isFinite(weight) ||
    weight < 0 ||
    !Number.isSafeInteger(actualReps) ||
    actualReps < 0
  ) {
    return null;
  }

  return { weight, actualReps };
}

function isCurrentRequest(
  requestIdRef: { readonly current: number },
  requestId: number,
  isMountedRef: { readonly current: boolean },
): boolean {
  return isMountedRef.current && requestIdRef.current === requestId;
}

function createDefaultWorkoutSetId(): string {
  return `workout-set-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
