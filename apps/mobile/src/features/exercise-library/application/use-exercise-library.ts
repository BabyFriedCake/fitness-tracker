import { useEffect, useState } from 'react';

import { initializeApplicationDatabase } from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import type {
  Equipment,
  Exercise,
  ExerciseRepository,
  MuscleGroup,
} from '@/domain/exercise';

import {
  EMPTY_EXERCISE_LIBRARY_FILTERS,
  hasActiveExerciseLibraryFilters,
  toggleExerciseLibraryEquipment,
  toggleExerciseLibraryMuscleGroup,
  type ExerciseLibraryFilters,
} from './exercise-library-filters';
import { filterExerciseLibrary } from './filter-exercise-library';

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

export type ExerciseLibraryScreenControls = {
  readonly filters: ExerciseLibraryFilters;
  readonly hasActiveFilters: boolean;
  readonly updateQuery: (queryText: string) => void;
  readonly toggleMuscleGroup: (muscleGroup: MuscleGroup) => void;
  readonly toggleEquipment: (equipment: Equipment) => void;
  readonly clearFilters: () => void;
};

export type ExerciseLibraryScreenModel = {
  readonly state: ExerciseLibraryScreenState;
  readonly controls: ExerciseLibraryScreenControls;
};

export function useExerciseLibrary(): ExerciseLibraryScreenModel {
  const [state, setState] = useState<ExerciseLibraryScreenState>({
    status: 'loading',
  });
  const [repository, setRepository] = useState<ExerciseRepository | null>(null);
  const [filters, setFilters] = useState<ExerciseLibraryFilters>(
    EMPTY_EXERCISE_LIBRARY_FILTERS,
  );

  useEffect(() => {
    let isMounted = true;

    async function initializeRepository(): Promise<void> {
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

      setRepository(createSqliteExerciseRepository(startupResult.database));
    }

    void initializeRepository();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!repository) {
      return;
    }

    const currentRepository = repository;
    let isMounted = true;

    async function loadExercises(): Promise<void> {
      const result = await filterExerciseLibrary(currentRepository, filters);

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
        result.exercises.length > 0 || hasActiveExerciseLibraryFilters(filters)
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
  }, [filters, repository]);

  return {
    state,
    controls: {
      filters,
      hasActiveFilters: hasActiveExerciseLibraryFilters(filters),
      updateQuery: (queryText) => {
        setFilters((currentFilters) => ({
          ...currentFilters,
          queryText,
        }));
      },
      toggleMuscleGroup: (muscleGroup) => {
        setFilters((currentFilters) =>
          toggleExerciseLibraryMuscleGroup(currentFilters, muscleGroup),
        );
      },
      toggleEquipment: (equipment) => {
        setFilters((currentFilters) =>
          toggleExerciseLibraryEquipment(currentFilters, equipment),
        );
      },
      clearFilters: () => {
        setFilters(EMPTY_EXERCISE_LIBRARY_FILTERS);
      },
    },
  };
}
