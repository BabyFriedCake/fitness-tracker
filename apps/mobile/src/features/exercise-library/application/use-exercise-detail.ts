import { useCallback, useEffect, useState } from 'react';

import { initializeApplicationDatabase } from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import type { Exercise } from '@/domain/exercise';

import { loadExerciseDetail } from './load-exercise-detail';

export type ExerciseDetailScreenState =
  | {
      readonly status: 'loading';
    }
  | {
      readonly status: 'ready';
      readonly exercise: Exercise;
    }
  | {
      readonly status: 'not-found';
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export type ExerciseDetailScreenModel = {
  readonly state: ExerciseDetailScreenState;
  readonly reload: () => void;
};

export function useExerciseDetail(
  exerciseId: string,
): ExerciseDetailScreenModel {
  const [state, setState] = useState<ExerciseDetailScreenState>({
    status: 'loading',
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setReloadVersion((currentVersion) => currentVersion + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail(): Promise<void> {
      const startupResult = await initializeApplicationDatabase();

      if (!isMounted) {
        return;
      }

      if (startupResult.status === 'error') {
        setState({
          status: 'error',
          message: '动作详情加载失败，请稍后重试。',
        });
        return;
      }

      const repository = createSqliteExerciseRepository(startupResult.database);
      const result = await loadExerciseDetail(repository, exerciseId);

      if (!isMounted) {
        return;
      }

      setState(result);
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [exerciseId, reloadVersion]);

  return { state, reload };
}
