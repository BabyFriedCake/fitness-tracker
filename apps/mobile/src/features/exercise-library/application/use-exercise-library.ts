import { useEffect, useState } from 'react';

import { initializeApplicationDatabase } from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import type { Exercise } from '@/domain/exercise';

import { loadExerciseLibrary } from './load-exercise-library';

export type ExerciseLibraryScreenState =
  | {
      readonly status: 'loading';
    }
  | {
      readonly status: 'ready';
      readonly exercises: readonly Exercise[];
    }
  | {
      readonly status: 'empty';
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export function useExerciseLibrary(): ExerciseLibraryScreenState {
  const [state, setState] = useState<ExerciseLibraryScreenState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadExercises(): Promise<void> {
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
      const result = await loadExerciseLibrary(repository);

      if (!isMounted) {
        return;
      }

      if (result.status === 'error') {
        setState({
          status: 'error',
          message: result.message,
        });
        return;
      }

      setState(
        result.exercises.length > 0
          ? {
              status: 'ready',
              exercises: result.exercises,
            }
          : {
              status: 'empty',
            },
      );
    }

    void loadExercises();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
