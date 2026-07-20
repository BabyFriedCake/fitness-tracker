import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import type { WorkoutSessionRepository } from '@/domain/workout-session';

import {
  loadWorkoutSessionHistory,
  type WorkoutSessionHistoryItem,
} from './workout-session-history';

export type WorkoutSessionHistoryScreenState =
  | { readonly status: 'loading' }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly items: readonly WorkoutSessionHistoryItem[];
    };

export type UseWorkoutSessionHistoryDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createWorkoutSessionRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutSessionRepository;
};

const HISTORY_LOAD_ERROR_MESSAGE =
  '历史训练加载失败。已保存的训练数据不会受影响，请重试。';

export function useWorkoutSessionHistory({
  initializeDatabase = initializeApplicationDatabase,
  createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
}: UseWorkoutSessionHistoryDependencies = {}): {
  readonly state: WorkoutSessionHistoryScreenState;
  readonly reload: () => void;
} {
  const [state, setState] = useState<WorkoutSessionHistoryScreenState>({
    status: 'loading',
  });
  const repositoryRef = useRef<WorkoutSessionRepository | null>(null);
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const hasFocusedRef = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ status: 'loading' });

    try {
      let repository = repositoryRef.current;

      if (!repository) {
        const startupResult = await initializeDatabase();

        if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
          return;
        }

        if (startupResult.status === 'error') {
          setState({ status: 'error', message: HISTORY_LOAD_ERROR_MESSAGE });
          return;
        }

        repository = createWorkoutSessionRepository(startupResult.database);
        repositoryRef.current = repository;
      }

      const result = await loadWorkoutSessionHistory(repository);

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      if (result.status === 'error') {
        setState({ status: 'error', message: result.message });
        return;
      }

      setState(
        result.items.length > 0
          ? { status: 'ready', items: result.items }
          : { status: 'empty' },
      );
    } catch {
      if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        setState({ status: 'error', message: HISTORY_LOAD_ERROR_MESSAGE });
      }
    }
  }, [createWorkoutSessionRepository, initializeDatabase]);

  useEffect(() => {
    isMountedRef.current = true;
    const initialLoadTimeout = setTimeout(() => {
      void load();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimeout);
      isMountedRef.current = false;
      requestIdRef.current += 1;
      repositoryRef.current = null;
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

  return { state, reload: () => void load() };
}

function isCurrentRequest(
  isMountedRef: { readonly current: boolean },
  requestIdRef: { readonly current: number },
  requestId: number,
): boolean {
  return isMountedRef.current && requestIdRef.current === requestId;
}
