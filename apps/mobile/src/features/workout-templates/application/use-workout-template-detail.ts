import { useCallback, useEffect, useRef, useState } from 'react';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type { ExerciseRepository } from '@/domain/exercise';
import type {
  WorkoutTemplateId,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';

import {
  loadWorkoutTemplateDetail,
  type WorkoutTemplateDetail,
} from './load-workout-template-detail';

export type WorkoutTemplateDetailRouteParams = {
  readonly id?: string | readonly string[];
};

export type WorkoutTemplateDetailScreenState =
  | {
      readonly status: 'loading';
    }
  | {
      readonly status: 'ready';
      readonly template: WorkoutTemplateDetail;
    }
  | {
      readonly status: 'notFound';
      readonly message: string;
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export type WorkoutTemplateDetailScreenControls = {
  readonly reload: () => void;
};

export type WorkoutTemplateDetailScreenModel = {
  readonly state: WorkoutTemplateDetailScreenState;
  readonly controls: WorkoutTemplateDetailScreenControls;
};

export type UseWorkoutTemplateDetailDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createWorkoutTemplateRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutTemplateRepository;
  readonly createExerciseRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => ExerciseRepository;
};

const TEMPLATE_DETAIL_LOAD_ERROR_MESSAGE =
  '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。';
const TEMPLATE_DETAIL_NOT_FOUND_MESSAGE = '找不到要查看的训练模板。';

export function useWorkoutTemplateDetail(
  routeParams: WorkoutTemplateDetailRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
    createExerciseRepository = createSqliteExerciseRepository,
  }: UseWorkoutTemplateDetailDependencies = {},
): WorkoutTemplateDetailScreenModel {
  const templateId = firstParamValue(routeParams.id) as
    WorkoutTemplateId | undefined;
  const [state, setState] = useState<WorkoutTemplateDetailScreenState>({
    status: 'loading',
  });
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const dependenciesRef = useRef({
    initializeDatabase,
    createWorkoutTemplateRepository,
    createExerciseRepository,
  });

  useEffect(() => {
    dependenciesRef.current = {
      initializeDatabase,
      createWorkoutTemplateRepository,
      createExerciseRepository,
    };
  }, [
    createExerciseRepository,
    createWorkoutTemplateRepository,
    initializeDatabase,
  ]);

  const isCurrentRequest = useCallback((requestId: number): boolean => {
    return isMountedRef.current && requestIdRef.current === requestId;
  }, []);

  const loadTemplate = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ status: 'loading' });

    if (!templateId) {
      setState({
        status: 'notFound',
        message: TEMPLATE_DETAIL_NOT_FOUND_MESSAGE,
      });
      return;
    }

    try {
      const startupResult = await dependenciesRef.current.initializeDatabase();

      if (!isCurrentRequest(requestId)) {
        return;
      }

      if (startupResult.status === 'error') {
        setState({
          status: 'error',
          message: TEMPLATE_DETAIL_LOAD_ERROR_MESSAGE,
        });
        return;
      }

      const result = await loadWorkoutTemplateDetail(
        {
          workoutTemplateRepository:
            dependenciesRef.current.createWorkoutTemplateRepository(
              startupResult.database,
            ),
          exerciseRepository: dependenciesRef.current.createExerciseRepository(
            startupResult.database,
          ),
        },
        templateId,
      );

      if (!isCurrentRequest(requestId)) {
        return;
      }

      setState(result);
    } catch {
      if (!isCurrentRequest(requestId)) {
        return;
      }

      setState({
        status: 'error',
        message: TEMPLATE_DETAIL_LOAD_ERROR_MESSAGE,
      });
    }
  }, [isCurrentRequest, templateId]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadTimeout = setTimeout(() => {
      void loadTemplate();
    }, 0);

    return () => {
      clearTimeout(loadTimeout);
      isMountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadTemplate]);

  return {
    state,
    controls: {
      reload: () => {
        void loadTemplate();
      },
    },
  };
}

function firstParamValue(
  value?: string | readonly string[],
): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}
