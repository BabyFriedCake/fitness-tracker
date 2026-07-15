import { useEffect, useState } from 'react';

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

export function useExerciseDetail(
  exerciseId: string,
): ExerciseDetailScreenState {
  const [state, setState] = useState<ExerciseDetailScreenState>({
    status: 'loading',
  });

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
          message: startupResult.error.message,
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
  }, [exerciseId]);

  return state;
}
