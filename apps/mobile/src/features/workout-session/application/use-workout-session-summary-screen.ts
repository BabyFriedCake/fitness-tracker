import { useCallback, useEffect, useRef, useState } from 'react';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import type {
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import {
  loadWorkoutSessionSummary,
  type WorkoutSessionSummary,
} from './workout-session-completion-recovery';
import type { WorkoutSessionRouteParams } from './use-workout-session-screen';

export type WorkoutSessionSummaryScreenState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly summary: WorkoutSessionSummary };

export type UseWorkoutSessionSummaryScreenDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createWorkoutSessionRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutSessionRepository;
};

const SUMMARY_LOAD_ERROR_MESSAGE =
  '训练总结加载失败。已保存的训练数据不会受影响，请重试。';
const SUMMARY_NOT_FOUND_MESSAGE = '未找到这次训练。';
const SUMMARY_NOT_COMPLETED_MESSAGE = '这次训练尚未完成，暂无总结。';

export function useWorkoutSessionSummaryScreen(
  routeParams: WorkoutSessionRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
  }: UseWorkoutSessionSummaryScreenDependencies = {},
): {
  readonly state: WorkoutSessionSummaryScreenState;
  readonly reload: () => void;
} {
  const [state, setState] = useState<WorkoutSessionSummaryScreenState>({
    status: 'loading',
  });
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const sessionId = parseWorkoutSessionId(routeParams.id);
    setState({ status: 'loading' });

    if (!sessionId) {
      setState({ status: 'error', message: SUMMARY_NOT_FOUND_MESSAGE });
      return;
    }

    try {
      const startupResult = await initializeDatabase();

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      if (startupResult.status === 'error') {
        setState({ status: 'error', message: SUMMARY_LOAD_ERROR_MESSAGE });
        return;
      }

      const result = await loadWorkoutSessionSummary(
        createWorkoutSessionRepository(startupResult.database),
        sessionId,
      );

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      if (result.status === 'not_found') {
        setState({ status: 'error', message: SUMMARY_NOT_FOUND_MESSAGE });
        return;
      }

      if (result.status === 'not_completed') {
        setState({ status: 'error', message: SUMMARY_NOT_COMPLETED_MESSAGE });
        return;
      }

      setState({ status: 'ready', summary: result.summary });
    } catch {
      if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        setState({ status: 'error', message: SUMMARY_LOAD_ERROR_MESSAGE });
      }
    }
  }, [createWorkoutSessionRepository, initializeDatabase, routeParams.id]);

  useEffect(() => {
    isMountedRef.current = true;
    const initialLoadTimeout = setTimeout(() => {
      void load();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimeout);
      isMountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [load]);

  return { state, reload: () => void load() };
}

function parseWorkoutSessionId(
  value: WorkoutSessionRouteParams['id'],
): WorkoutSessionId | null {
  return typeof value === 'string' && value.trim()
    ? (value as WorkoutSessionId)
    : null;
}

function isCurrentRequest(
  isMountedRef: { readonly current: boolean },
  requestIdRef: { readonly current: number },
  requestId: number,
): boolean {
  return isMountedRef.current && requestIdRef.current === requestId;
}
