import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Href } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type {
  Exercise,
  ExerciseId,
  ExerciseRepository,
} from '@/domain/exercise';
import type { WorkoutTemplateRepository } from '@/domain/workout-template';
import { createTemplateExerciseSelectionHref } from '@/features/exercise-library/application/exercise-selection-flow';

import {
  saveWorkoutTemplateCreateDraft,
  type WorkoutTemplateCreateFieldErrors,
  type WorkoutTemplateCreateIdFactory,
  type WorkoutTemplateCreateSaveResult,
} from './create-workout-template';
import {
  parseWorkoutTemplateCreateRouteDraft,
  serializeWorkoutTemplateCreateDraftRouteParams,
  type WorkoutTemplateCreateRouteParams,
} from './workout-template-create-route-params';

export type WorkoutTemplateCreateExerciseLoadStatus =
  'ready' | 'loading' | 'error';

export type WorkoutTemplateCreateDraftState = {
  readonly name: string;
  readonly description: string;
  readonly selectedExerciseIds: readonly ExerciseId[];
  readonly selectedExercises: readonly Exercise[];
  readonly selectedExerciseLoadStatus: WorkoutTemplateCreateExerciseLoadStatus;
};

type WorkoutTemplateCreateExitState = {
  readonly isConfirmingDiscard: boolean;
  readonly isExitAuthorized: boolean;
  readonly isSaved: boolean;
};

export type WorkoutTemplateCreateScreenState =
  | ({
      readonly status: 'loading';
      readonly draft: WorkoutTemplateCreateDraftState;
    } & WorkoutTemplateCreateExitState)
  | ({
      readonly status: 'ready';
      readonly draft: WorkoutTemplateCreateDraftState;
      readonly fieldErrors: WorkoutTemplateCreateFieldErrors;
      readonly saveError?: string;
      readonly isSaving: boolean;
    } & WorkoutTemplateCreateExitState)
  | ({
      readonly status: 'error';
      readonly draft: WorkoutTemplateCreateDraftState;
      readonly message: string;
    } & WorkoutTemplateCreateExitState);

export type WorkoutTemplateCreateScreenControls = {
  readonly updateName: (name: string) => void;
  readonly updateDescription: (description: string) => void;
  readonly createExerciseSelectionHref: () => Href;
  readonly save: () => Promise<WorkoutTemplateCreateSaveResult>;
  readonly reload: () => void;
  readonly shouldConfirmExit: () => boolean;
  readonly requestExit: () => boolean;
  readonly cancelExit: () => void;
  readonly confirmExit: () => void;
};

export type WorkoutTemplateCreateScreenModel = {
  readonly state: WorkoutTemplateCreateScreenState;
  readonly controls: WorkoutTemplateCreateScreenControls;
};

export type UseWorkoutTemplateCreateDependencies = {
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
  readonly now?: () => string;
  readonly createId?: WorkoutTemplateCreateIdFactory;
};

const TEMPLATE_CREATE_ERROR_MESSAGE =
  '训练模板保存失败。当前输入仍保留，请重新保存。';
const EXERCISE_LOAD_ERROR_MESSAGE =
  '动作信息加载失败。当前输入仍保留，请重新打开动作库后再试。';
const EXERCISE_LOADING_ERROR_MESSAGE = '动作信息正在加载，请稍后保存。';

export function useWorkoutTemplateCreate(
  routeParams: WorkoutTemplateCreateRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
    createExerciseRepository = createSqliteExerciseRepository,
    now = () => new Date().toISOString(),
    createId = createDefaultId,
  }: UseWorkoutTemplateCreateDependencies = {},
): WorkoutTemplateCreateScreenModel {
  const routeParamsKey = JSON.stringify(routeParams);
  const routeDraft = useMemo(
    () =>
      parseWorkoutTemplateCreateRouteDraft(
        JSON.parse(routeParamsKey) as WorkoutTemplateCreateRouteParams,
      ),
    [routeParamsKey],
  );
  const [state, setState] = useState<WorkoutTemplateCreateScreenState>(() => ({
    status: 'loading',
    draft: createInitialDraftState(routeDraft),
    isConfirmingDiscard: false,
    isExitAuthorized: false,
    isSaved: false,
  }));
  const stateRef = useRef(state);
  const isMountedRef = useRef(false);
  const selectedExercisesRequestIdRef = useRef(0);
  const isSavingRef = useRef(false);
  const repositoriesRef = useRef<{
    readonly workoutTemplateRepository: WorkoutTemplateRepository;
    readonly exerciseRepository: ExerciseRepository;
  } | null>(null);
  const dependenciesRef = useRef({
    initializeDatabase,
    createWorkoutTemplateRepository,
    createExerciseRepository,
    now,
    createId,
  });

  const initializeRepositories = useCallback(async (): Promise<void> => {
    try {
      const startupResult = await dependenciesRef.current.initializeDatabase();

      if (!isMountedRef.current) {
        return;
      }

      if (startupResult.status === 'error') {
        setState((currentState) => ({
          status: 'error',
          draft: currentState.draft,
          message: TEMPLATE_CREATE_ERROR_MESSAGE,
          isConfirmingDiscard: currentState.isConfirmingDiscard,
          isExitAuthorized: currentState.isExitAuthorized,
          isSaved: currentState.isSaved,
        }));
        return;
      }

      repositoriesRef.current = {
        workoutTemplateRepository:
          dependenciesRef.current.createWorkoutTemplateRepository(
            startupResult.database,
          ),
        exerciseRepository: dependenciesRef.current.createExerciseRepository(
          startupResult.database,
        ),
      };

      setState((currentState) => ({
        status: 'ready',
        draft: markDraftForExerciseLoading(currentState.draft),
        fieldErrors: {},
        isSaving: false,
        isConfirmingDiscard: false,
        isExitAuthorized: currentState.isExitAuthorized,
        isSaved: false,
      }));
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setState((currentState) => ({
        status: 'error',
        draft: currentState.draft,
        message: TEMPLATE_CREATE_ERROR_MESSAGE,
        isConfirmingDiscard: currentState.isConfirmingDiscard,
        isExitAuthorized: currentState.isExitAuthorized,
        isSaved: currentState.isSaved,
      }));
    }
  }, []);

  const loadSelectedExercises = useCallback(
    async (
      repository: ExerciseRepository,
      selectedExerciseIds: readonly ExerciseId[],
    ): Promise<void> => {
      const requestId = selectedExercisesRequestIdRef.current + 1;
      selectedExercisesRequestIdRef.current = requestId;

      try {
        const exercises =
          await repository.getSelectedByIds(selectedExerciseIds);

        if (
          !isMountedRef.current ||
          selectedExercisesRequestIdRef.current !== requestId
        ) {
          return;
        }

        const { orderedExercises, missingExerciseIds } = orderSelectedExercises(
          selectedExerciseIds,
          exercises,
        );

        setState((currentState) =>
          currentState.status === 'ready'
            ? {
                ...currentState,
                draft: {
                  ...currentState.draft,
                  selectedExercises: orderedExercises,
                  selectedExerciseLoadStatus:
                    missingExerciseIds.length > 0 ? 'error' : 'ready',
                },
                fieldErrors: {
                  ...currentState.fieldErrors,
                  exercises:
                    missingExerciseIds.length > 0
                      ? formatMissingExercisesError(missingExerciseIds)
                      : undefined,
                },
                saveError: undefined,
              }
            : currentState,
        );
      } catch {
        if (
          !isMountedRef.current ||
          selectedExercisesRequestIdRef.current !== requestId
        ) {
          return;
        }

        setState((currentState) =>
          currentState.status === 'ready'
            ? {
                ...currentState,
                draft: {
                  ...currentState.draft,
                  selectedExercises: [],
                  selectedExerciseLoadStatus: 'error',
                },
                fieldErrors: {
                  ...currentState.fieldErrors,
                  exercises: EXERCISE_LOAD_ERROR_MESSAGE,
                },
                saveError: undefined,
              }
            : currentState,
        );
      }
    },
    [],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    dependenciesRef.current = {
      initializeDatabase,
      createWorkoutTemplateRepository,
      createExerciseRepository,
      now,
      createId,
    };
  }, [
    createExerciseRepository,
    createId,
    createWorkoutTemplateRepository,
    initializeDatabase,
    now,
  ]);

  useEffect(() => {
    const routeDraftTimeout = setTimeout(() => {
      setState((currentState) => applyRouteDraft(currentState, routeDraft));
    }, 0);

    return () => {
      clearTimeout(routeDraftTimeout);
    };
  }, [routeDraft]);

  useEffect(() => {
    isMountedRef.current = true;
    const startupTimeout = setTimeout(() => {
      void initializeRepositories();
    }, 0);

    return () => {
      clearTimeout(startupTimeout);
      isMountedRef.current = false;
      selectedExercisesRequestIdRef.current += 1;
    };
  }, [initializeRepositories]);

  const selectedExerciseIds = state.draft.selectedExerciseIds;
  const selectedExerciseLoadStatus = state.draft.selectedExerciseLoadStatus;

  useEffect(() => {
    const repositories = repositoriesRef.current;

    if (
      state.status !== 'ready' ||
      !repositories ||
      selectedExerciseLoadStatus !== 'loading'
    ) {
      return;
    }

    const selectedExercisesTimeout = setTimeout(() => {
      if (selectedExerciseIds.length === 0) {
        setState((currentState) =>
          currentState.status === 'ready'
            ? {
                ...currentState,
                draft: {
                  ...currentState.draft,
                  selectedExercises: [],
                  selectedExerciseLoadStatus: 'ready',
                },
                fieldErrors: {
                  ...currentState.fieldErrors,
                  exercises: undefined,
                },
              }
            : currentState,
        );
        return;
      }

      void loadSelectedExercises(
        repositories.exerciseRepository,
        selectedExerciseIds,
      );
    }, 0);

    return () => {
      clearTimeout(selectedExercisesTimeout);
    };
  }, [
    loadSelectedExercises,
    selectedExerciseIds,
    selectedExerciseLoadStatus,
    state.status,
  ]);

  const updateName = useCallback((name: string) => {
    setState((currentState) =>
      updateReadyDraft(currentState, {
        name,
        fieldErrors: {
          ...getFieldErrors(currentState),
          name: undefined,
        },
        saveError: undefined,
      }),
    );
  }, []);

  const updateDescription = useCallback((description: string) => {
    setState((currentState) =>
      updateReadyDraft(currentState, {
        description,
        saveError: undefined,
      }),
    );
  }, []);

  const createExerciseSelectionHref = useCallback((): Href => {
    const currentDraft = stateRef.current.draft;

    return createTemplateExerciseSelectionHref({
      returnTo: '/templates/new',
      alreadySelectedExerciseIds: currentDraft.selectedExerciseIds,
      returnParams: serializeWorkoutTemplateCreateDraftRouteParams({
        name: currentDraft.name,
        description: currentDraft.description,
        selectedExerciseIds: currentDraft.selectedExerciseIds,
      }),
    }) as Href;
  }, []);

  const save =
    useCallback(async (): Promise<WorkoutTemplateCreateSaveResult> => {
      if (isSavingRef.current) {
        return {
          status: 'error',
          message: TEMPLATE_CREATE_ERROR_MESSAGE,
        };
      }

      const repositories = repositoriesRef.current;

      if (!repositories || stateRef.current.status !== 'ready') {
        return {
          status: 'error',
          message: TEMPLATE_CREATE_ERROR_MESSAGE,
        };
      }

      const blockingError = getExerciseSaveBlockingError(
        stateRef.current.draft,
        stateRef.current.fieldErrors,
      );

      if (blockingError) {
        setState((currentState) =>
          currentState.status === 'ready'
            ? {
                ...currentState,
                fieldErrors: {
                  ...currentState.fieldErrors,
                  exercises: blockingError,
                },
              }
            : currentState,
        );
        return {
          status: 'invalid',
          fieldErrors: {
            exercises: blockingError,
          },
        };
      }

      isSavingRef.current = true;
      setState((currentState) =>
        currentState.status === 'ready'
          ? {
              ...currentState,
              fieldErrors: {},
              saveError: undefined,
              isSaving: true,
            }
          : currentState,
      );

      const currentDraft = stateRef.current.draft;
      const result = await saveWorkoutTemplateCreateDraft(
        repositories.workoutTemplateRepository,
        {
          name: currentDraft.name,
          description: currentDraft.description,
          exercises: currentDraft.selectedExercises,
        },
        {
          now: dependenciesRef.current.now,
          createId: dependenciesRef.current.createId,
        },
      );

      isSavingRef.current = false;

      if (!isMountedRef.current) {
        return result;
      }

      setState((currentState) => {
        if (currentState.status !== 'ready') {
          return currentState;
        }

        if (result.status === 'invalid') {
          return {
            ...currentState,
            fieldErrors: result.fieldErrors,
            isSaving: false,
          };
        }

        if (result.status === 'error') {
          return {
            ...currentState,
            saveError: result.message,
            isSaving: false,
          };
        }

        return {
          ...currentState,
          isSaving: false,
          isSaved: true,
        };
      });

      return result;
    }, []);

  const reload = useCallback(() => {
    setState((currentState) => ({
      status: 'loading',
      draft: markDraftForExerciseLoading(currentState.draft),
      isConfirmingDiscard: false,
      isExitAuthorized: false,
      isSaved: false,
    }));
    void initializeRepositories();
  }, [initializeRepositories]);

  const shouldConfirmExit = useCallback((): boolean => {
    return shouldConfirmExitForState(state);
  }, [state]);

  const requestExit = useCallback((): boolean => {
    if (!shouldConfirmExitForState(stateRef.current)) {
      return true;
    }

    setState((currentState) =>
      shouldConfirmExitForState(currentState)
        ? {
            ...currentState,
            isConfirmingDiscard: true,
          }
        : currentState,
    );
    return false;
  }, []);

  const cancelExit = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      isConfirmingDiscard: false,
    }));
  }, []);

  const confirmExit = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      isConfirmingDiscard: false,
      isExitAuthorized: true,
    }));
  }, []);

  return {
    state,
    controls: {
      updateName,
      updateDescription,
      createExerciseSelectionHref,
      save,
      reload,
      shouldConfirmExit,
      requestExit,
      cancelExit,
      confirmExit,
    },
  };
}

function createInitialDraftState(input: {
  readonly name: string;
  readonly description: string;
  readonly selectedExerciseIds: readonly ExerciseId[];
}): WorkoutTemplateCreateDraftState {
  return {
    name: input.name,
    description: input.description,
    selectedExerciseIds: input.selectedExerciseIds,
    selectedExercises: [],
    selectedExerciseLoadStatus:
      input.selectedExerciseIds.length > 0 ? 'loading' : 'ready',
  };
}

function applyRouteDraft(
  state: WorkoutTemplateCreateScreenState,
  routeDraft: ReturnType<typeof parseWorkoutTemplateCreateRouteDraft>,
): WorkoutTemplateCreateScreenState {
  const idsChanged = !areExerciseIdsEqual(
    state.draft.selectedExerciseIds,
    routeDraft.selectedExerciseIds,
  );
  const draft: WorkoutTemplateCreateDraftState = {
    ...state.draft,
    name: routeDraft.name,
    description: routeDraft.description,
    selectedExerciseIds: routeDraft.selectedExerciseIds,
    selectedExercises: idsChanged ? [] : state.draft.selectedExercises,
    selectedExerciseLoadStatus: idsChanged
      ? routeDraft.selectedExerciseIds.length > 0
        ? 'loading'
        : 'ready'
      : state.draft.selectedExerciseLoadStatus,
  };

  if (state.status === 'ready') {
    return {
      ...state,
      draft,
      fieldErrors: {
        ...state.fieldErrors,
        exercises: routeDraft.duplicateSelectionIgnored
          ? '该动作已添加，不能重复选择。'
          : idsChanged
            ? undefined
            : state.fieldErrors.exercises,
      },
      saveError: undefined,
      isSaved: false,
      isExitAuthorized: false,
    };
  }

  return {
    ...state,
    draft,
    isSaved: false,
    isExitAuthorized: false,
  };
}

function updateReadyDraft(
  state: WorkoutTemplateCreateScreenState,
  updates: {
    readonly name?: string;
    readonly description?: string;
    readonly fieldErrors?: WorkoutTemplateCreateFieldErrors;
    readonly saveError?: string;
  },
): WorkoutTemplateCreateScreenState {
  if (state.status !== 'ready') {
    return state;
  }

  return {
    ...state,
    draft: {
      ...state.draft,
      ...(typeof updates.name === 'string' ? { name: updates.name } : {}),
      ...(typeof updates.description === 'string'
        ? { description: updates.description }
        : {}),
    },
    fieldErrors: updates.fieldErrors ?? state.fieldErrors,
    saveError: updates.saveError,
    isSaved: false,
    isExitAuthorized: false,
  };
}

function markDraftForExerciseLoading(
  draft: WorkoutTemplateCreateDraftState,
): WorkoutTemplateCreateDraftState {
  return {
    ...draft,
    selectedExercises:
      draft.selectedExerciseIds.length > 0 ? [] : draft.selectedExercises,
    selectedExerciseLoadStatus:
      draft.selectedExerciseIds.length > 0 ? 'loading' : 'ready',
  };
}

function getExerciseSaveBlockingError(
  draft: WorkoutTemplateCreateDraftState,
  fieldErrors: WorkoutTemplateCreateFieldErrors,
): string | undefined {
  if (draft.selectedExerciseLoadStatus === 'loading') {
    return EXERCISE_LOADING_ERROR_MESSAGE;
  }

  if (draft.selectedExerciseLoadStatus === 'error') {
    return fieldErrors.exercises ?? EXERCISE_LOAD_ERROR_MESSAGE;
  }

  if (draft.selectedExerciseIds.length !== draft.selectedExercises.length) {
    return EXERCISE_LOAD_ERROR_MESSAGE;
  }

  return undefined;
}

function orderSelectedExercises(
  selectedExerciseIds: readonly ExerciseId[],
  exercises: readonly Exercise[],
): {
  readonly orderedExercises: readonly Exercise[];
  readonly missingExerciseIds: readonly ExerciseId[];
} {
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const missingExerciseIds: ExerciseId[] = [];
  const orderedExercises = selectedExerciseIds.flatMap((exerciseId) => {
    const exercise = exerciseById.get(exerciseId);

    if (!exercise) {
      missingExerciseIds.push(exerciseId);
      return [];
    }

    return [exercise];
  });

  return {
    orderedExercises,
    missingExerciseIds,
  };
}

function formatMissingExercisesError(
  missingExerciseIds: readonly ExerciseId[],
): string {
  return `找不到已选择的动作：${missingExerciseIds.join('，')}。请重新打开动作库后再试。`;
}

function getFieldErrors(
  state: WorkoutTemplateCreateScreenState,
): WorkoutTemplateCreateFieldErrors {
  return state.status === 'ready' ? state.fieldErrors : {};
}

function shouldConfirmExitForState(
  state: WorkoutTemplateCreateScreenState,
): boolean {
  return !state.isExitAuthorized && !state.isSaved && isDraftDirty(state.draft);
}

function isDraftDirty(draft: WorkoutTemplateCreateDraftState): boolean {
  return (
    draft.name.trim().length > 0 ||
    draft.description.trim().length > 0 ||
    draft.selectedExerciseIds.length > 0
  );
}

function areExerciseIdsEqual(
  left: readonly ExerciseId[],
  right: readonly ExerciseId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

function createDefaultId(kind: 'template' | 'templateExercise'): string {
  return `${kind}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
