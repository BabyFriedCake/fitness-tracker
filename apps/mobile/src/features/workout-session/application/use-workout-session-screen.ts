import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteRestTimerRepository } from '@/database/repositories/rest-timer';
import { createSqliteWorkoutRuntimeSnapshotRepository } from '@/database/repositories/workout-runtime-snapshot';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import type {
  RestTimerRepository,
  SessionExercise,
  SessionExerciseId,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import {
  cancelSession,
  completeSession,
  startSession,
} from './workout-session-flow';
import {
  completeSessionExercise,
  recordWorkoutSet,
  resumeSessionExercise,
  skipSessionExercise,
} from './workout-session-execution';
import {
  NOOP_WORKOUT_COMPANION_EVENT_SOURCE,
  validateWorkoutCompanionRepCompletedEvent,
  type WorkoutCompanionEventSource,
} from './workout-companion-event-source';
import {
  completeWorkoutCompanionExercise,
  onWorkoutCompanionRep,
  type WorkoutCompanionExerciseFlowResult,
  type WorkoutCompanionRepFlowResult,
} from './workout-companion-runtime-flow';
import {
  createWorkoutSessionScreenData,
  loadWorkoutSessionScreen,
  type WorkoutSessionScreenData,
  type WorkoutSessionScreenRepositories,
} from './load-workout-session-screen';
import {
  completeRestTimer,
  skipRestTimer,
  startRestTimer,
  setCurrentSessionPosition,
} from './workout-session-rest-timer';
import { closeActiveRestTimer } from './workout-session-completion-recovery';
import {
  createWorkoutRuntimeSnapshot,
  createWorkoutCompanionRuntimeState,
  getSessionExerciseNextSetNumber,
  pauseWorkoutCompanionRuntime,
  pauseWorkoutRuntime,
  resumeWorkoutCompanionAfterRest,
  resumeWorkoutCompanionRuntime,
  resumeWorkoutRuntime,
  type WorkoutCompanionRuntimeState,
  saveRuntimeSnapshot,
  type WorkoutRuntimeDisplayStatus,
  type WorkoutRuntimeSnapshot,
} from './workout-runtime-engine';
import type { WorkoutRuntimeSnapshotRepository } from './workout-runtime-snapshot-repository';
import {
  createRepCompletedFeedbackEvents,
  createSetCompletedFeedbackEvent,
} from './workout-feedback-events';
import {
  speakWorkoutVoiceFeedbackEvent,
  type WorkoutVoiceFeedbackEvent,
  type WorkoutVoiceFeedbackAdapter,
} from './workout-voice-feedback';

export type WorkoutSessionRouteParams = {
  readonly id?: string | readonly string[];
};

export type WorkoutSetDraft = {
  readonly weight: string;
  readonly actualReps: string;
};

export type WorkoutSessionScreenRuntimeStatus = WorkoutRuntimeDisplayStatus;

export type WorkoutSessionScreenState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'error';
      readonly message: string;
    }
  | {
      readonly status: 'ready';
      readonly data: WorkoutSessionScreenData;
      readonly runtime: WorkoutRuntimeSnapshot;
      readonly companionRuntime?: WorkoutCompanionRuntimeState;
      readonly setDraft: WorkoutSetDraft;
      readonly isMutating: boolean;
      readonly isConfirmingSkip: boolean;
      readonly endFlow: 'closed' | 'options' | 'confirm_cancel';
      readonly navigationIntent?: 'summary' | 'today';
      readonly coachFeedback?: string;
      readonly canRetryCompanionEvent?: boolean;
      readonly actionError?: string;
    };

export type WorkoutSessionScreenControls = {
  readonly reload: () => void;
  readonly startWorkout: () => Promise<void>;
  readonly pauseWorkout: () => void;
  readonly resumeWorkout: () => void;
  readonly updateWeight: (value: string) => void;
  readonly updateActualReps: (value: string) => void;
  readonly recordSet: () => Promise<void>;
  readonly selectExercise: (exerciseId: SessionExerciseId) => Promise<void>;
  readonly requestSkipExercise: () => void;
  readonly cancelSkipExercise: () => void;
  readonly confirmSkipExercise: () => Promise<void>;
  readonly resumeExercise: () => Promise<void>;
  readonly completeExercise: () => Promise<void>;
  readonly retryCompanionEvent: () => void;
  readonly finishRest: () => Promise<void>;
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

type PersistedSetCompanionResult = Extract<
  WorkoutCompanionRepFlowResult,
  { readonly status: 'set_completed' }
>;

type PendingCompanionRecovery =
  | {
      readonly kind: 'set_completion';
      readonly event: unknown;
      readonly runtime: WorkoutCompanionRuntimeState;
    }
  | {
      readonly kind: 'rest_timer';
      readonly result: PersistedSetCompanionResult;
      readonly durationSeconds: number;
    }
  | {
      readonly kind: 'exercise_completion';
      readonly result: PersistedSetCompanionResult;
    }
  | {
      readonly kind: 'session_completion';
      readonly result: WorkoutCompanionExerciseFlowResult;
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
  readonly createWorkoutRuntimeSnapshotRepository?: () => WorkoutRuntimeSnapshotRepository;
  readonly now?: () => string;
  readonly createWorkoutSetId?: () => string;
  readonly createRestTimerId?: () => string;
  readonly workoutCompanionEventSource?: WorkoutCompanionEventSource;
  readonly voiceFeedbackEnabled?: boolean;
  readonly voiceAdapter?: WorkoutVoiceFeedbackAdapter;
};

const SESSION_LOAD_ERROR_MESSAGE =
  '训练加载失败。已保存的训练数据不会受影响，请重试。';
const SESSION_NOT_FOUND_MESSAGE = '未找到这次训练。';
const SESSION_ACTION_ERROR_MESSAGE =
  '操作保存失败。已完成的训练数据不会丢失，请重试。';
const SESSION_END_ERROR_MESSAGE =
  '训练结束状态保存失败。已完成的组不会丢失，请重试。';
const SNAPSHOT_PERSIST_ERROR_MESSAGE =
  '训练运行状态保存失败。当前训练数据不会丢失，请重试。';
const INVALID_SET_INPUT_MESSAGE = '请输入有效的非负重量和非负整数次数。';
const INVALID_WEIGHT_INPUT_MESSAGE = '请输入有效的非负重量后重试。';
const INVALID_COMPANION_EVENT_MESSAGE = '陪练事件无效，训练进度未更新。';
const COMPANION_PERSIST_ERROR_MESSAGE =
  '本组保存失败，训练进度已保留，请重试。';
const NOOP_VOICE_ADAPTER: WorkoutVoiceFeedbackAdapter = {
  speak: () => undefined,
};

export function useWorkoutSessionScreen(
  routeParams: WorkoutSessionRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
    createRestTimerRepository = createSqliteRestTimerRepository,
    createWorkoutRuntimeSnapshotRepository = createSqliteWorkoutRuntimeSnapshotRepository,
    now = () => new Date().toISOString(),
    createWorkoutSetId = createDefaultWorkoutSetId,
    createRestTimerId = createDefaultRestTimerId,
    workoutCompanionEventSource = NOOP_WORKOUT_COMPANION_EVENT_SOURCE,
    voiceFeedbackEnabled = true,
    voiceAdapter = NOOP_VOICE_ADAPTER,
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
  const runtimeSnapshotWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const companionEventWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const companionSubscriptionRef = useRef(0);
  const pendingCompanionRecoveryRef =
    useRef<PendingCompanionRecovery>(undefined);
  const dependenciesRef = useRef({
    initializeDatabase,
    createWorkoutSessionRepository,
    createRestTimerRepository,
    createWorkoutRuntimeSnapshotRepository,
    now,
    createWorkoutSetId,
    createRestTimerId,
    workoutCompanionEventSource,
    voiceFeedbackEnabled,
    voiceAdapter,
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    dependenciesRef.current = {
      initializeDatabase,
      createWorkoutSessionRepository,
      createRestTimerRepository,
      createWorkoutRuntimeSnapshotRepository,
      now,
      createWorkoutSetId,
      createRestTimerId,
      workoutCompanionEventSource,
      voiceFeedbackEnabled,
      voiceAdapter,
    };
  }, [
    createRestTimerRepository,
    createWorkoutRuntimeSnapshotRepository,
    createWorkoutSessionRepository,
    createWorkoutSetId,
    createRestTimerId,
    initializeDatabase,
    now,
    workoutCompanionEventSource,
    voiceAdapter,
    voiceFeedbackEnabled,
  ]);

  const commitState = useCallback((next: WorkoutSessionScreenState): void => {
    stateRef.current = next;
    setState(next);
  }, []);

  const runtimeSnapshotSyncKey = createRuntimeSnapshotSyncKey(state);

  useEffect(() => {
    if (!runtimeSnapshotSyncKey) {
      return;
    }

    const current = stateRef.current;
    const repositories = repositoriesRef.current;

    if (current.status !== 'ready' || !repositories) {
      return;
    }

    const snapshot = {
      ...current.runtime,
      updatedAt: dependenciesRef.current.now(),
    };
    runtimeSnapshotWriteChainRef.current = runtimeSnapshotWriteChainRef.current
      .then(async () => {
        const result = await saveRuntimeSnapshot(
          repositories.workoutRuntimeSnapshotRepository,
          snapshot,
        );

        if (
          !result.success &&
          isMountedRef.current &&
          createRuntimeSnapshotSyncKey(stateRef.current) ===
            runtimeSnapshotSyncKey
        ) {
          const latest = stateRef.current;

          if (latest.status === 'ready') {
            commitState({
              ...latest,
              actionError: SNAPSHOT_PERSIST_ERROR_MESSAGE,
            });
          }
        }
      })
      .catch(() => {
        if (!isMountedRef.current) {
          return;
        }

        const latest = stateRef.current;

        if (
          latest.status === 'ready' &&
          createRuntimeSnapshotSyncKey(latest) === runtimeSnapshotSyncKey
        ) {
          commitState({
            ...latest,
            actionError: SNAPSHOT_PERSIST_ERROR_MESSAGE,
          });
        }
      });
  }, [commitState, runtimeSnapshotSyncKey]);

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
            workoutRuntimeSnapshotRepository:
              dependenciesRef.current.createWorkoutRuntimeSnapshotRepository(),
          };
          repositoriesRef.current = repositories;
        }

        const requestNow = dependenciesRef.current.now();
        const result = await loadWorkoutSessionScreen(
          repositories,
          sessionId,
          requestNow,
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
          current.runtime.currentExercise?.id ===
            result.runtime.currentExercise?.id;
        const companionRuntime = createCompanionRuntimeForScreen(
          result.data.session,
          result.runtime,
          shouldPreserveDraft && current.status === 'ready'
            ? current.companionRuntime
            : undefined,
          result.data.restTimerStatus,
          result.data.restRemainingSeconds,
        );
        commitState({
          status: 'ready',
          data: result.data,
          runtime: result.runtime,
          companionRuntime,
          setDraft: shouldPreserveDraft
            ? current.setDraft
            : createDefaultSetDraft(result.runtime.currentExercise),
          isMutating: false,
          isConfirmingSkip: shouldPreserveDraft
            ? current.isConfirmingSkip
            : false,
          endFlow: shouldPreserveDraft ? current.endFlow : 'closed',
          navigationIntent: shouldPreserveDraft
            ? current.navigationIntent
            : undefined,
          coachFeedback: shouldPreserveDraft
            ? current.coachFeedback
            : undefined,
          canRetryCompanionEvent: shouldPreserveDraft
            ? current.canRetryCompanionEvent
            : false,
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
      companionSubscriptionRef.current += 1;
      pendingCompanionRecoveryRef.current = undefined;
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
          (stateRef.current.runtime.status !== 'running' ||
            (stateRef.current.data.session.status === 'in_progress' &&
              stateRef.current.companionRuntime?.phase !== 'running' &&
              stateRef.current.companionRuntime?.phase !== 'resting') ||
            stateRef.current.isConfirmingSkip ||
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

  const startWorkout = useCallback(async (): Promise<void> => {
    const current = stateRef.current;
    const repositories = repositoriesRef.current;

    if (
      current.status !== 'ready' ||
      current.data.session.status !== 'draft' ||
      current.isConfirmingSkip ||
      current.endFlow !== 'closed' ||
      !repositories ||
      isMutatingRef.current
    ) {
      return;
    }

    beginMutation(current);

    try {
      const nextSession = await startSession(
        repositories.workoutSessionRepository,
        current.data.session.id,
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
        runtime: createWorkoutRuntimeSnapshot(
          nextSession,
          current.data.restTimerStatus,
        ),
        companionRuntime: createWorkoutCompanionRuntimeState(nextSession),
        isMutating: false,
        actionError: undefined,
      });
    } catch {
      if (isMountedRef.current) {
        commitState({
          ...current,
          isMutating: false,
          actionError: SESSION_ACTION_ERROR_MESSAGE,
        });
      }
    } finally {
      finishMutation();
    }
  }, [beginMutation, commitState, finishMutation]);

  const pauseWorkout = useCallback((): void => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      current.data.session.status !== 'in_progress' ||
      current.runtime.status !== 'running' ||
      current.companionRuntime?.phase !== 'running' ||
      current.isConfirmingSkip ||
      current.endFlow !== 'closed' ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({
      ...current,
      runtime: pauseWorkoutRuntime(current.runtime),
      companionRuntime: current.companionRuntime
        ? pauseWorkoutCompanionRuntime(current.companionRuntime)
        : undefined,
      actionError: undefined,
    });
  }, [commitState]);

  const resumeWorkout = useCallback((): void => {
    const current = stateRef.current;

    if (
      current.status !== 'ready' ||
      current.data.session.status !== 'in_progress' ||
      current.runtime.status !== 'paused' ||
      current.companionRuntime?.phase !== 'paused' ||
      current.isConfirmingSkip ||
      current.endFlow !== 'closed' ||
      isMutatingRef.current
    ) {
      return;
    }

    commitState({
      ...current,
      runtime: resumeWorkoutRuntime(current.runtime),
      companionRuntime: current.companionRuntime
        ? resumeWorkoutCompanionRuntime(current.companionRuntime)
        : undefined,
      actionError: undefined,
    });
  }, [commitState]);

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
        current.runtime.status !== 'running' ||
        (current.companionRuntime !== undefined &&
          current.companionRuntime.phase !== 'running') ||
        !current.runtime.currentExercise ||
        !repositories ||
        !isAllowed(current.runtime.currentExercise) ||
        current.isConfirmingSkip ||
        current.endFlow !== 'closed' ||
        isMutatingRef.current
      ) {
        return;
      }

      const currentExercise = current.runtime.currentExercise;
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
          runtime: createWorkoutRuntimeSnapshot(
            nextSession,
            current.data.restTimerStatus,
          ),
          companionRuntime: createCompanionRuntimeForScreen(
            nextSession,
            createWorkoutRuntimeSnapshot(
              nextSession,
              current.data.restTimerStatus,
            ),
            undefined,
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
      current.runtime.status !== 'running' ||
      current.companionRuntime?.phase !== 'running' ||
      !current.runtime.currentExercise ||
      current.runtime.currentExercise.isSkipped ||
      current.runtime.currentExercise.isCompleted ||
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
      const completedAt = dependenciesRef.current.now();
      const nextSession = await recordWorkoutSet(
        repositories.workoutSessionRepository,
        {
          sessionId: current.data.session.id,
          sessionExerciseId: current.runtime.currentExercise.id,
          actualReps: parsedDraft.actualReps,
          weight: parsedDraft.weight,
          completedAt,
        },
        {
          createWorkoutSetId: dependenciesRef.current.createWorkoutSetId,
        },
      );
      const nextExercise = nextSession.sessionExercises.find(
        (exercise) => exercise.id === current.runtime.currentExercise?.id,
      );

      if (nextExercise) {
        const voiceEvents: WorkoutVoiceFeedbackEvent[] = [
          ...createRepCompletedFeedbackEvents({
            sessionId: nextSession.id,
            exercise: nextExercise,
            actualReps: parsedDraft.actualReps,
          }),
        ];

        const completedSet = nextExercise.sets.find(
          (workoutSet) =>
            workoutSet.completedAt === completedAt &&
            workoutSet.actualReps === parsedDraft.actualReps &&
            workoutSet.weight === parsedDraft.weight,
        );

        if (completedSet) {
          voiceEvents.push(
            createSetCompletedFeedbackEvent({
              sessionId: nextSession.id,
              exercise: nextExercise,
              workoutSet: completedSet,
            }),
          );
        }

        speakWorkoutVoiceFeedbackEvents(voiceEvents, dependenciesRef.current);
      }

      if (!isMountedRef.current) {
        return;
      }

      commitState({
        ...current,
        data: createWorkoutSessionScreenData(
          nextSession,
          current.data.restTimerStatus,
        ),
        runtime: createWorkoutRuntimeSnapshot(
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
        current.runtime.status !== 'running' ||
        current.companionRuntime?.phase !== 'running' ||
        current.runtime.currentExercise?.id === exerciseId ||
        current.isConfirmingSkip ||
        current.endFlow !== 'closed' ||
        !repositories ||
        isMutatingRef.current
      ) {
        return;
      }

      const targetExercise = current.runtime.orderedExercises.find(
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
        const nextRuntime = createWorkoutRuntimeSnapshot(
          nextSession,
          current.data.restTimerStatus,
        );
        commitState({
          ...current,
          data: nextData,
          runtime: nextRuntime,
          companionRuntime: createCompanionRuntimeForScreen(
            nextSession,
            nextRuntime,
            undefined,
            current.data.restTimerStatus,
          ),
          setDraft: createDefaultSetDraft(nextRuntime.currentExercise),
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
      current.runtime.status !== 'running' ||
      current.companionRuntime?.phase !== 'running' ||
      !current.runtime.currentExercise ||
      current.runtime.currentExercise.isSkipped ||
      current.runtime.currentExercise.isCompleted ||
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

  const processCompanionEvent = useCallback(
    async (
      event: unknown,
      subscriptionId: number,
      runtimeInstance: WorkoutCompanionRuntimeState['instance'],
      retryRuntime?: WorkoutCompanionRuntimeState,
    ): Promise<void> => {
      const current = stateRef.current;
      const repositories = repositoriesRef.current;

      if (
        current.status !== 'ready' ||
        current.data.session.status !== 'in_progress' ||
        !current.companionRuntime ||
        current.companionRuntime.instance !== runtimeInstance ||
        subscriptionId !== companionSubscriptionRef.current ||
        !repositories ||
        isMutatingRef.current
      ) {
        return;
      }

      const eventRuntime = retryRuntime ?? current.companionRuntime;

      const validation = validateWorkoutCompanionRepCompletedEvent(
        event,
        eventRuntime,
      );

      if (validation.status === 'invalid') {
        commitState({
          ...current,
          actionError: INVALID_COMPANION_EVENT_MESSAGE,
        });
        return;
      }

      const exercise =
        eventRuntime.orderedExercises[
          eventRuntime.progress.currentExerciseIndex
        ];
      const reachesTarget =
        !!exercise &&
        eventRuntime.progress.completedReps + 1 >=
          getCompanionExerciseTargetReps(exercise);
      const weight = reachesTarget
        ? parseWorkoutSetWeight(current.setDraft.weight)
        : 0;

      if (reachesTarget && weight === null) {
        pendingCompanionRecoveryRef.current = {
          kind: 'set_completion',
          event: validation.event,
          runtime: eventRuntime,
        };
        commitState({
          ...current,
          canRetryCompanionEvent: true,
          actionError: INVALID_WEIGHT_INPUT_MESSAGE,
        });
        return;
      }

      if (reachesTarget) {
        isMutatingRef.current = true;
        commitState({
          ...current,
          companionRuntime: {
            ...eventRuntime,
            phase: 'set_completion_pending',
          },
          isMutating: true,
          canRetryCompanionEvent: false,
          actionError: undefined,
        });
      }

      let result: Awaited<ReturnType<typeof onWorkoutCompanionRep>>;

      try {
        result = await onWorkoutCompanionRep(
          repositories.workoutSessionRepository,
          eventRuntime,
          {
            weight: weight ?? 0,
            completedAt: new Date(validation.event.timestamp).toISOString(),
            createWorkoutSetId: dependenciesRef.current.createWorkoutSetId,
          },
        );
      } catch {
        if (
          reachesTarget &&
          isCurrentCompanionSubscription(
            subscriptionId,
            runtimeInstance,
            companionSubscriptionRef,
            stateRef,
            isMountedRef,
          )
        ) {
          pendingCompanionRecoveryRef.current = {
            kind: 'set_completion',
            event: validation.event,
            runtime: eventRuntime,
          };
          commitState({
            ...current,
            companionRuntime: {
              ...eventRuntime,
              phase: 'set_completion_pending',
            },
            isMutating: false,
            canRetryCompanionEvent: true,
            actionError: COMPANION_PERSIST_ERROR_MESSAGE,
          });
        }
        isMutatingRef.current = false;
        return;
      }

      if (
        !isCurrentCompanionSubscription(
          subscriptionId,
          runtimeInstance,
          companionSubscriptionRef,
          stateRef,
          isMountedRef,
        )
      ) {
        isMutatingRef.current = false;
        return;
      }

      speakWorkoutVoiceFeedbackEvents(result.events, dependenciesRef.current);

      if (result.status === 'ignored') {
        isMutatingRef.current = false;
        return;
      }

      if (result.status === 'rep_completed') {
        commitState({
          ...current,
          companionRuntime: result.runtime,
          coachFeedback: `已完成第 ${validation.event.repNumber} 次`,
          actionError: undefined,
        });
        return;
      }

      pendingCompanionRecoveryRef.current = undefined;
      let nextSession: WorkoutSession = result.session;
      let nextCompanionRuntime = result.runtime;
      let restTimerStatus = current.data.restTimerStatus;
      let restRemainingSeconds = current.data.restRemainingSeconds;
      let actionError: string | undefined;

      if (result.runtime.phase === 'resting') {
        try {
          const timer = await startRestTimer(
            repositories,
            {
              sessionId: result.session.id,
              sessionExerciseId: result.workoutSet.sessionExerciseId,
              durationSeconds: exercise?.currentRestSeconds ?? 0,
              startedAt: dependenciesRef.current.now(),
              previousSetNumber: result.workoutSet.setNumber,
              nextSetNumber: result.workoutSet.setNumber + 1,
            },
            {
              createRestTimerId: dependenciesRef.current.createRestTimerId,
            },
          );
          restTimerStatus = 'running';
          restRemainingSeconds = timer.originalDurationSeconds;
          nextCompanionRuntime = {
            ...result.runtime,
            restRemainingSeconds,
          };
          nextSession =
            (await repositories.workoutSessionRepository.findById(
              result.session.id,
            )) ?? result.session;
        } catch {
          pendingCompanionRecoveryRef.current = {
            kind: 'rest_timer',
            result,
            durationSeconds: exercise?.currentRestSeconds ?? 0,
          };
          nextCompanionRuntime = {
            ...result.runtime,
            phase: 'set_completion_pending',
          };
          actionError = COMPANION_PERSIST_ERROR_MESSAGE;
        }
      } else if (result.runtime.phase === 'exercise_completion_pending') {
        commitState({
          ...current,
          data: createWorkoutSessionScreenData(result.session, restTimerStatus),
          runtime: createWorkoutRuntimeSnapshot(
            result.session,
            restTimerStatus,
          ),
          companionRuntime: result.runtime,
          isMutating: true,
          coachFeedback: '正在保存训练结果',
          actionError: undefined,
        });

        let exerciseResult: WorkoutCompanionExerciseFlowResult | undefined;

        try {
          exerciseResult = await completeWorkoutCompanionExercise(
            repositories.workoutSessionRepository,
            result.runtime,
            dependenciesRef.current.now(),
          );
          speakWorkoutVoiceFeedbackEvents(
            [exerciseResult.event],
            dependenciesRef.current,
          );
          nextSession = exerciseResult.session;
          nextCompanionRuntime = exerciseResult.runtime;
        } catch {
          pendingCompanionRecoveryRef.current = {
            kind: 'exercise_completion',
            result,
          };
          actionError = COMPANION_PERSIST_ERROR_MESSAGE;
        }

        if (exerciseResult?.runtime.phase === 'completed') {
          try {
            const endedAt = dependenciesRef.current.now();
            await closeActiveRestTimer(
              repositories.restTimerRepository,
              exerciseResult.session.id,
              endedAt,
            );
            nextSession = await completeSession(
              repositories.workoutSessionRepository,
              exerciseResult.session.id,
              endedAt,
            );
          } catch {
            pendingCompanionRecoveryRef.current = {
              kind: 'session_completion',
              result: exerciseResult,
            };
            nextCompanionRuntime = {
              ...exerciseResult.runtime,
              phase: 'exercise_completion_pending',
            };
            actionError = COMPANION_PERSIST_ERROR_MESSAGE;
          }
        }
      }

      if (!isMountedRef.current) {
        isMutatingRef.current = false;
        return;
      }

      const nextRuntime = createWorkoutRuntimeSnapshot(
        nextSession,
        restTimerStatus,
      );
      commitState({
        ...current,
        data: createWorkoutSessionScreenData(
          nextSession,
          restTimerStatus,
          restRemainingSeconds,
        ),
        runtime: nextRuntime,
        companionRuntime: nextCompanionRuntime,
        setDraft:
          nextCompanionRuntime.progress.currentExerciseIndex ===
          current.companionRuntime.progress.currentExerciseIndex
            ? current.setDraft
            : createDefaultSetDraft(nextRuntime.currentExercise),
        isMutating: false,
        coachFeedback:
          nextCompanionRuntime.phase === 'completed'
            ? '训练已完成'
            : result.runtime.phase === 'resting'
              ? '本组已完成，开始休息'
              : '动作已完成',
        navigationIntent:
          nextCompanionRuntime.phase === 'completed' ? 'summary' : undefined,
        canRetryCompanionEvent:
          pendingCompanionRecoveryRef.current !== undefined,
        actionError,
      });
      isMutatingRef.current = false;
    },
    [commitState],
  );

  const companionRuntimeInstance =
    state.status === 'ready' ? state.companionRuntime?.instance : undefined;
  const companionSessionId =
    state.status === 'ready' ? state.data.session.id : undefined;

  useEffect(() => {
    if (!companionRuntimeInstance || !companionSessionId) {
      return;
    }

    const source = workoutCompanionEventSource;
    const subscriptionId = companionSubscriptionRef.current + 1;
    companionSubscriptionRef.current = subscriptionId;
    source.subscribe((event) => {
      companionEventWriteChainRef.current = companionEventWriteChainRef.current
        .catch(() => undefined)
        .then(() =>
          processCompanionEvent(
            event,
            subscriptionId,
            companionRuntimeInstance,
          ),
        );
    });

    return () => {
      companionSubscriptionRef.current += 1;
      source.unsubscribe();
    };
  }, [
    companionRuntimeInstance,
    companionSessionId,
    processCompanionEvent,
    workoutCompanionEventSource,
  ]);

  const retryCompanionEvent = useCallback((): void => {
    const current = stateRef.current;
    const recovery = pendingCompanionRecoveryRef.current;

    if (
      current.status !== 'ready' ||
      !current.companionRuntime ||
      !recovery ||
      isMutatingRef.current
    ) {
      return;
    }

    const subscriptionId = companionSubscriptionRef.current;
    const runtimeInstance = current.companionRuntime.instance;
    companionEventWriteChainRef.current = companionEventWriteChainRef.current
      .catch(() => undefined)
      .then(async () => {
        if (recovery.kind === 'set_completion') {
          await processCompanionEvent(
            recovery.event,
            subscriptionId,
            runtimeInstance,
            recovery.runtime,
          );
          return;
        }

        const latest = stateRef.current;
        const repositories = repositoriesRef.current;

        if (
          latest.status !== 'ready' ||
          latest.companionRuntime?.instance !== runtimeInstance ||
          !repositories ||
          !isMountedRef.current
        ) {
          return;
        }

        isMutatingRef.current = true;
        commitState({
          ...latest,
          isMutating: true,
          canRetryCompanionEvent: false,
          actionError: undefined,
        });

        try {
          if (recovery.kind === 'rest_timer') {
            const timer = await startRestTimer(
              repositories,
              {
                sessionId: recovery.result.session.id,
                sessionExerciseId: recovery.result.workoutSet.sessionExerciseId,
                durationSeconds: recovery.durationSeconds,
                startedAt: dependenciesRef.current.now(),
                previousSetNumber: recovery.result.workoutSet.setNumber,
                nextSetNumber: recovery.result.workoutSet.setNumber + 1,
              },
              {
                createRestTimerId: dependenciesRef.current.createRestTimerId,
              },
            );
            const session =
              (await repositories.workoutSessionRepository.findById(
                recovery.result.session.id,
              )) ?? recovery.result.session;
            pendingCompanionRecoveryRef.current = undefined;
            commitState({
              ...latest,
              data: createWorkoutSessionScreenData(
                session,
                'running',
                timer.originalDurationSeconds,
              ),
              runtime: createWorkoutRuntimeSnapshot(session, 'running'),
              companionRuntime: {
                ...recovery.result.runtime,
                restRemainingSeconds: timer.originalDurationSeconds,
              },
              isMutating: false,
              canRetryCompanionEvent: false,
              coachFeedback: '本组已完成，开始休息',
            });
            return;
          }

          if (recovery.kind === 'exercise_completion') {
            const exerciseResult = await completeWorkoutCompanionExercise(
              repositories.workoutSessionRepository,
              recovery.result.runtime,
              dependenciesRef.current.now(),
            );
            speakWorkoutVoiceFeedbackEvents(
              [exerciseResult.event],
              dependenciesRef.current,
            );

            if (exerciseResult.runtime.phase !== 'completed') {
              pendingCompanionRecoveryRef.current = undefined;
              const runtime = createWorkoutRuntimeSnapshot(
                exerciseResult.session,
              );
              commitState({
                ...latest,
                data: createWorkoutSessionScreenData(exerciseResult.session),
                runtime,
                companionRuntime: exerciseResult.runtime,
                setDraft: createDefaultSetDraft(runtime.currentExercise),
                isMutating: false,
                canRetryCompanionEvent: false,
                coachFeedback: '动作已完成',
              });
              return;
            }

            pendingCompanionRecoveryRef.current = {
              kind: 'session_completion',
              result: exerciseResult,
            };
          }

          const sessionRecovery =
            recovery.kind === 'session_completion'
              ? recovery
              : pendingCompanionRecoveryRef.current;

          if (sessionRecovery?.kind !== 'session_completion') {
            return;
          }

          const endedAt = dependenciesRef.current.now();
          await closeActiveRestTimer(
            repositories.restTimerRepository,
            sessionRecovery.result.session.id,
            endedAt,
          );
          const completed = await completeSession(
            repositories.workoutSessionRepository,
            sessionRecovery.result.session.id,
            endedAt,
          );
          pendingCompanionRecoveryRef.current = undefined;
          commitState({
            ...latest,
            data: createWorkoutSessionScreenData(completed),
            runtime: createWorkoutRuntimeSnapshot(completed),
            companionRuntime: {
              ...sessionRecovery.result.runtime,
              phase: 'completed',
            },
            isMutating: false,
            canRetryCompanionEvent: false,
            coachFeedback: '训练已完成',
            navigationIntent: 'summary',
          });
        } catch {
          if (isMountedRef.current) {
            const failed = stateRef.current;

            if (failed.status === 'ready') {
              commitState({
                ...failed,
                isMutating: false,
                canRetryCompanionEvent: true,
                actionError: COMPANION_PERSIST_ERROR_MESSAGE,
              });
            }
          }
        } finally {
          isMutatingRef.current = false;
        }
      });
  }, [commitState, processCompanionEvent]);

  const transitionRest = useCallback(
    async (transition: 'completed' | 'skipped'): Promise<void> => {
      const current = stateRef.current;
      const repositories = repositoriesRef.current;

      if (
        current.status !== 'ready' ||
        current.companionRuntime?.phase !== 'resting' ||
        !repositories ||
        isMutatingRef.current
      ) {
        return;
      }

      beginMutation(current);
      try {
        const operation =
          transition === 'completed' ? completeRestTimer : skipRestTimer;
        await operation(repositories.restTimerRepository, {
          sessionId: current.data.session.id,
          now: dependenciesRef.current.now(),
        });
        if (isMountedRef.current) {
          const runtime = createWorkoutRuntimeSnapshot(
            current.data.session,
            'completed',
          );
          commitState({
            ...current,
            data: createWorkoutSessionScreenData(
              current.data.session,
              'completed',
              0,
            ),
            runtime,
            companionRuntime: {
              ...resumeWorkoutCompanionAfterRest(current.companionRuntime),
              restRemainingSeconds: undefined,
            },
            isMutating: false,
            coachFeedback: '休息结束，准备下一组',
            actionError: undefined,
          });
        }
      } catch {
        if (isMountedRef.current) {
          commitState({
            ...current,
            isMutating: false,
            actionError: SESSION_ACTION_ERROR_MESSAGE,
          });
        }
      } finally {
        finishMutation();
      }
    },
    [beginMutation, commitState, finishMutation],
  );

  const finishRest = useCallback(
    () => transitionRest('skipped'),
    [transitionRest],
  );

  useEffect(() => {
    if (
      state.status !== 'ready' ||
      state.companionRuntime?.phase !== 'resting' ||
      state.data.restTimerStatus !== 'running' ||
      state.companionRuntime.restRemainingSeconds === undefined
    ) {
      return;
    }

    const interval = setInterval(() => {
      const current = stateRef.current;

      if (
        current.status !== 'ready' ||
        current.companionRuntime?.phase !== 'resting' ||
        isMutatingRef.current
      ) {
        return;
      }

      const remaining = current.companionRuntime.restRemainingSeconds ?? 0;

      if (remaining <= 1) {
        commitState({
          ...current,
          companionRuntime: {
            ...current.companionRuntime,
            restRemainingSeconds: 0,
          },
        });
        clearInterval(interval);
        void transitionRest('completed');
        return;
      }

      commitState({
        ...current,
        companionRuntime: {
          ...current.companionRuntime,
          restRemainingSeconds: remaining - 1,
        },
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    commitState,
    state.status,
    state.status === 'ready' ? state.data.restTimerStatus : undefined,
    state.status === 'ready' ? state.companionRuntime?.instance : undefined,
    state.status === 'ready' ? state.companionRuntime?.phase : undefined,
    transitionRest,
  ]);

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
          runtime: createWorkoutRuntimeSnapshot(
            nextSession,
            current.data.restTimerStatus,
          ),
          companionRuntime: current.companionRuntime
            ? { ...current.companionRuntime, phase: 'completed' }
            : undefined,
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
      startWorkout,
      pauseWorkout,
      resumeWorkout,
      updateWeight: (value) => updateSetDraft('weight', value),
      updateActualReps: (value) => updateSetDraft('actualReps', value),
      recordSet,
      selectExercise,
      requestSkipExercise,
      cancelSkipExercise,
      confirmSkipExercise,
      resumeExercise,
      completeExercise,
      retryCompanionEvent,
      finishRest,
      requestEndSession,
      continueSession,
      requestCancelSession,
      confirmCancelSession,
      confirmCompleteSession,
      clearNavigationIntent,
    },
  };
}

function createRuntimeSnapshotSyncKey(
  state: WorkoutSessionScreenState,
): string | null {
  if (state.status !== 'ready') {
    return null;
  }

  return JSON.stringify([
    state.data.session.id,
    state.data.session.status,
    state.data.session.updatedAt,
    state.runtime.status,
    state.runtime.currentSessionExerciseId,
    state.runtime.currentSetNumber,
    state.runtime.completedSets,
    state.runtime.targetSets,
    state.runtime.restTimerStatus,
  ]);
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

function speakWorkoutVoiceFeedbackEvents(
  events: readonly WorkoutVoiceFeedbackEvent[],
  dependencies: {
    readonly voiceFeedbackEnabled: boolean;
    readonly voiceAdapter: WorkoutVoiceFeedbackAdapter;
  },
): void {
  events.forEach((event) => {
    void speakWorkoutVoiceFeedbackEvent(event, {
      isEnabled: dependencies.voiceFeedbackEnabled,
      voiceAdapter: dependencies.voiceAdapter,
    }).catch(() => undefined);
  });
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

function createDefaultRestTimerId(): string {
  return `rest-timer-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createCompanionRuntimeForScreen(
  session: WorkoutSession,
  runtime: WorkoutRuntimeSnapshot,
  existing: WorkoutCompanionRuntimeState | undefined,
  restTimerStatus?: WorkoutSessionScreenData['restTimerStatus'],
  restRemainingSeconds?: number,
): WorkoutCompanionRuntimeState | undefined {
  if (session.status !== 'in_progress') {
    return undefined;
  }

  if (
    existing &&
    existing.progress.sessionId === session.id &&
    existing.orderedExercises[existing.progress.currentExerciseIndex]?.id ===
      runtime.currentExercise?.id
  ) {
    return existing;
  }

  let companionRuntime: WorkoutCompanionRuntimeState;

  try {
    companionRuntime = createWorkoutCompanionRuntimeState(session);
  } catch {
    return undefined;
  }

  if (restTimerStatus === 'running' || restTimerStatus === 'paused') {
    return {
      ...companionRuntime,
      phase: 'resting',
      restRemainingSeconds: restRemainingSeconds ?? 0,
    };
  }

  return runtime.status === 'paused'
    ? pauseWorkoutCompanionRuntime(companionRuntime)
    : companionRuntime;
}

function getCompanionExerciseTargetReps(exercise: SessionExercise): number {
  return exercise.targetRepsMin === exercise.targetRepsMax
    ? exercise.targetRepsMax
    : exercise.targetRepsMin;
}

function parseWorkoutSetWeight(value: string): number | null {
  const normalized = value.trim();

  if (!/^(?:\d+|\d*\.\d+)$/.test(normalized)) {
    return null;
  }

  const weight = Number(normalized);
  return Number.isFinite(weight) && weight >= 0 ? weight : null;
}

function isCurrentCompanionSubscription(
  subscriptionId: number,
  runtimeInstance: WorkoutCompanionRuntimeState['instance'],
  subscriptionRef: { readonly current: number },
  screenStateRef: { readonly current: WorkoutSessionScreenState },
  mountedRef: { readonly current: boolean },
): boolean {
  const current = screenStateRef.current;
  return (
    mountedRef.current &&
    subscriptionRef.current === subscriptionId &&
    current.status === 'ready' &&
    current.companionRuntime?.instance === runtimeInstance
  );
}
