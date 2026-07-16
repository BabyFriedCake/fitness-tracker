import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type { WorkoutTemplateRepository } from '@/domain/workout-template';

import {
  loadWorkoutTemplateList,
  type WorkoutTemplateListLoadResult,
  type WorkoutTemplateListItem,
} from './load-workout-template-list';

export type WorkoutTemplateListScreenState =
  | {
      readonly status: 'loading';
    }
  | {
      readonly status: 'ready';
      readonly templates: readonly WorkoutTemplateListItem[];
    }
  | {
      readonly status: 'empty';
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export type WorkoutTemplateListScreenControls = {
  readonly reload: () => void;
};

export type WorkoutTemplateListScreenModel = {
  readonly state: WorkoutTemplateListScreenState;
  readonly controls: WorkoutTemplateListScreenControls;
};

export type UseWorkoutTemplateListDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutTemplateRepository;
  readonly loadTemplates?: (
    repository: WorkoutTemplateRepository,
  ) => Promise<WorkoutTemplateListLoadResult>;
};

const TEMPLATE_LIST_ERROR_MESSAGE =
  '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。';

export function useWorkoutTemplateList({
  initializeDatabase = initializeApplicationDatabase,
  createRepository = createSqliteWorkoutTemplateRepository,
  loadTemplates = loadWorkoutTemplateList,
}: UseWorkoutTemplateListDependencies = {}): WorkoutTemplateListScreenModel {
  const [state, setState] = useState<WorkoutTemplateListScreenState>({
    status: 'loading',
  });
  const repositoryRef = useRef<WorkoutTemplateRepository | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const hasLoadedOnFocusRef = useRef(false);
  const dependenciesRef = useRef({
    initializeDatabase,
    createRepository,
    loadTemplates,
  });

  useEffect(() => {
    dependenciesRef.current = {
      initializeDatabase,
      createRepository,
      loadTemplates,
    };
  }, [createRepository, initializeDatabase, loadTemplates]);

  const beginRequest = useCallback((): number => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }, []);

  const isCurrentRequest = useCallback((requestId: number): boolean => {
    return isMountedRef.current && requestIdRef.current === requestId;
  }, []);

  const applyLoadResult = useCallback(
    (requestId: number, result: WorkoutTemplateListLoadResult) => {
      if (!isCurrentRequest(requestId)) {
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
        result.templates.length > 0
          ? {
              status: 'ready',
              templates: result.templates,
            }
          : {
              status: 'empty',
            },
      );
    },
    [isCurrentRequest],
  );

  const loadFromRepository = useCallback(
    async (
      repository: WorkoutTemplateRepository,
      requestId: number,
    ): Promise<void> => {
      const result = await dependenciesRef.current.loadTemplates(repository);
      applyLoadResult(requestId, result);
    },
    [applyLoadResult],
  );

  const loadList = useCallback(async (): Promise<void> => {
    const requestId = beginRequest();

    await Promise.resolve();

    if (!isCurrentRequest(requestId)) {
      return;
    }

    setState({
      status: 'loading',
    });

    try {
      const currentRepository = repositoryRef.current;

      if (currentRepository) {
        await loadFromRepository(currentRepository, requestId);
        return;
      }

      const startupResult = await dependenciesRef.current.initializeDatabase();

      if (!isCurrentRequest(requestId)) {
        return;
      }

      if (startupResult.status === 'error') {
        setState({
          status: 'error',
          message: TEMPLATE_LIST_ERROR_MESSAGE,
        });
        return;
      }

      const repository = dependenciesRef.current.createRepository(
        startupResult.database,
      );
      repositoryRef.current = repository;
      await loadFromRepository(repository, requestId);
    } catch {
      if (!isCurrentRequest(requestId)) {
        return;
      }

      setState({
        status: 'error',
        message: TEMPLATE_LIST_ERROR_MESSAGE,
      });
    }
  }, [beginRequest, isCurrentRequest, loadFromRepository]);

  useEffect(() => {
    isMountedRef.current = true;
    const initialLoadTimeout = setTimeout(() => {
      void loadList();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimeout);
      isMountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadList]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnFocusRef.current) {
        hasLoadedOnFocusRef.current = true;
        return;
      }

      if (repositoryRef.current) {
        void loadList();
      }
    }, [loadList]),
  );

  const reload = useCallback(() => {
    void loadList();
  }, [loadList]);

  return {
    state,
    controls: {
      reload,
    },
  };
}
