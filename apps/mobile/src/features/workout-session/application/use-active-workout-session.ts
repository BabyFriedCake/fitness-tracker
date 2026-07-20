import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteRestTimerRepository } from '@/database/repositories/rest-timer';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import type {
  RestTimerRepository,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import type {
  WorkoutSessionScreenData,
  WorkoutSessionScreenRepositories,
} from './load-workout-session-screen';
import type { WorkoutRuntimeSnapshot } from './workout-runtime-engine';
import {
  continueWorkoutSessionRecovery,
  loadRecoverableWorkoutSessionRecovery,
} from './workout-session-completion-recovery';

export type RecoverableWorkoutSessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly data: WorkoutSessionScreenData;
      readonly runtime: WorkoutRuntimeSnapshot;
      readonly isContinuing?: boolean;
      readonly continueError?: string;
    };

export type UseActiveWorkoutSessionDependencies = {
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
};

const RECOVERY_LOAD_ERROR_MESSAGE =
  '进行中的训练加载失败。已保存的数据不会丢失，请重试。';
const RECOVERY_CONTINUE_ERROR_MESSAGE =
  '训练恢复失败。已保存的数据不会丢失，请重试。';
const getCurrentTimestamp = () => new Date().toISOString();

export function useRecoverableWorkoutSession({
  initializeDatabase = initializeApplicationDatabase,
  createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
  createRestTimerRepository = createSqliteRestTimerRepository,
  now = getCurrentTimestamp,
}: UseActiveWorkoutSessionDependencies = {}): {
  readonly state: RecoverableWorkoutSessionState;
  readonly reload: () => void;
  readonly continueSession: (sessionId: WorkoutSessionId) => Promise<boolean>;
} {
  const [state, setState] = useState<RecoverableWorkoutSessionState>({
    status: 'loading',
  });
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const hasFocusedRef = useRef(false);
  const repositoriesRef = useRef<WorkoutSessionScreenRepositories | null>(null);
  const isContinuingRef = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const startupResult = await initializeDatabase();

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      if (startupResult.status === 'error') {
        repositoriesRef.current = null;
        setState({ status: 'error', message: RECOVERY_LOAD_ERROR_MESSAGE });
        return;
      }

      const repositories: WorkoutSessionScreenRepositories = {
        workoutSessionRepository: createWorkoutSessionRepository(
          startupResult.database,
        ),
        restTimerRepository: createRestTimerRepository(startupResult.database),
      };
      repositoriesRef.current = repositories;
      const result = await loadRecoverableWorkoutSessionRecovery(
        repositories,
        now(),
      );

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      setState(
        result.status === 'ready'
          ? {
              status: 'ready',
              data: result.data,
              runtime: result.runtime,
              isContinuing: false,
            }
          : { status: 'empty' },
      );
    } catch {
      if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        setState({ status: 'error', message: RECOVERY_LOAD_ERROR_MESSAGE });
      }
    }
  }, [
    createRestTimerRepository,
    createWorkoutSessionRepository,
    initializeDatabase,
    now,
  ]);

  const continueSession = useCallback(
    async (sessionId: WorkoutSessionId): Promise<boolean> => {
      const repositories = repositoriesRef.current;

      if (!repositories || isContinuingRef.current) {
        return false;
      }

      isContinuingRef.current = true;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              isContinuing: true,
              continueError: undefined,
            }
          : current,
      );

      try {
        const result = await continueWorkoutSessionRecovery(
          repositories,
          sessionId,
          now(),
        );

        if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
          return false;
        }

        if (result.status !== 'ready') {
          setState({
            status: 'error',
            message: RECOVERY_CONTINUE_ERROR_MESSAGE,
          });
          return false;
        }

        setState({
          status: 'ready',
          data: result.data,
          runtime: result.runtime,
          isContinuing: false,
        });
        return true;
      } catch {
        if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
          setState((current) =>
            current.status === 'ready'
              ? {
                  ...current,
                  isContinuing: false,
                  continueError: RECOVERY_CONTINUE_ERROR_MESSAGE,
                }
              : current,
          );
        }
        return false;
      } finally {
        isContinuingRef.current = false;
      }
    },
    [now],
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
    reload: () => void load(),
    continueSession,
  };
}

function isCurrentRequest(
  isMountedRef: { readonly current: boolean },
  requestIdRef: { readonly current: number },
  requestId: number,
): boolean {
  return isMountedRef.current && requestIdRef.current === requestId;
}
