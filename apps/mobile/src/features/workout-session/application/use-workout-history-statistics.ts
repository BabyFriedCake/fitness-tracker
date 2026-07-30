import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import type { WorkoutSessionRepository } from '@/domain/workout-session';

import {
  loadWorkoutHistoryStatistics,
  type WorkoutHistoryStatistics,
  type WorkoutHistoryStatisticsPeriod,
} from './workout-history-statistics';

export type WorkoutHistoryStatisticsScreenState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly statistics: WorkoutHistoryStatistics };

export type UseWorkoutHistoryStatisticsDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createWorkoutSessionRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutSessionRepository;
  readonly now?: () => Date;
};

const STATISTICS_LOAD_ERROR_MESSAGE =
  '训练统计加载失败。已保存的训练数据不会受影响，请重试。';
const defaultNow = (): Date => new Date();

export function useWorkoutHistoryStatistics(
  period: WorkoutHistoryStatisticsPeriod,
  {
    initializeDatabase = initializeApplicationDatabase,
    createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
    now = defaultNow,
  }: UseWorkoutHistoryStatisticsDependencies = {},
): {
  readonly state: WorkoutHistoryStatisticsScreenState;
  readonly reload: () => void;
} {
  const [state, setState] = useState<WorkoutHistoryStatisticsScreenState>({
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
          setState({ status: 'error', message: STATISTICS_LOAD_ERROR_MESSAGE });
          return;
        }

        repository = createWorkoutSessionRepository(startupResult.database);
        repositoryRef.current = repository;
      }

      const result = await loadWorkoutHistoryStatistics(
        repository,
        period,
        now(),
      );

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      setState(
        result.status === 'ready'
          ? { status: 'ready', statistics: result.statistics }
          : { status: 'error', message: result.message },
      );
    } catch {
      if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        setState({ status: 'error', message: STATISTICS_LOAD_ERROR_MESSAGE });
      }
    }
  }, [createWorkoutSessionRepository, initializeDatabase, now, period]);

  useEffect(() => {
    isMountedRef.current = true;
    const initialLoadTimeout = setTimeout(() => void load(), 0);

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
