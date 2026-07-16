import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Href } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type { ExerciseId, ExerciseRepository } from '@/domain/exercise';
import type {
  TemplateExercise,
  WorkoutTemplate,
  WorkoutTemplateId,
  WorkoutTemplateRepository,
  WorkoutTemplateStatus,
} from '@/domain/workout-template';
import { createTemplateExerciseSelectionHref } from '@/features/exercise-library/application/exercise-selection-flow';

import {
  saveWorkoutTemplateEditDraft,
  type WorkoutTemplateEditExerciseDraft,
  type WorkoutTemplateEditFieldErrors,
  type WorkoutTemplateEditSaveResult,
} from './edit-workout-template';
import {
  parseWorkoutTemplateEditRouteDraft,
  serializeWorkoutTemplateEditDraftRouteParams,
  type WorkoutTemplateEditRouteParams,
} from './workout-template-edit-route-params';

export type WorkoutTemplateEditExerciseLoadStatus =
  'ready' | 'loading' | 'error';

export type WorkoutTemplateEditDraftState = {
  readonly templateId: WorkoutTemplateId;
  readonly name: string;
  readonly description: string;
  readonly exercises: readonly WorkoutTemplateEditExerciseDraft[];
  readonly exerciseLoadStatus: WorkoutTemplateEditExerciseLoadStatus;
};

type WorkoutTemplateEditExitState = {
  readonly isConfirmingDiscard: boolean;
  readonly isExitAuthorized: boolean;
  readonly isSaved: boolean;
};

export type WorkoutTemplateEditScreenState =
  | ({
      readonly status: 'loading';
      readonly draft: WorkoutTemplateEditDraftState | null;
    } & WorkoutTemplateEditExitState)
  | ({
      readonly status: 'ready';
      readonly templateStatus: WorkoutTemplateStatus;
      readonly draft: WorkoutTemplateEditDraftState;
      readonly fieldErrors: WorkoutTemplateEditFieldErrors;
      readonly saveError?: string;
      readonly isSaving: boolean;
      readonly pendingRemoveExerciseId?: ExerciseId;
    } & WorkoutTemplateEditExitState)
  | ({
      readonly status: 'notFound';
      readonly message: string;
      readonly draft: WorkoutTemplateEditDraftState | null;
    } & WorkoutTemplateEditExitState)
  | ({
      readonly status: 'error';
      readonly message: string;
      readonly draft: WorkoutTemplateEditDraftState | null;
    } & WorkoutTemplateEditExitState);

export type WorkoutTemplateEditScreenControls = {
  readonly updateName: (name: string) => void;
  readonly updateDescription: (description: string) => void;
  readonly updateExerciseConfig: (
    exerciseId: ExerciseId,
    field: 'targetSets' | 'targetRepsMin' | 'targetRepsMax' | 'restSeconds',
    value: string,
  ) => void;
  readonly moveExerciseUp: (exerciseId: ExerciseId) => void;
  readonly moveExerciseDown: (exerciseId: ExerciseId) => void;
  readonly requestRemoveExercise: (exerciseId: ExerciseId) => void;
  readonly cancelRemoveExercise: () => void;
  readonly confirmRemoveExercise: () => void;
  readonly createExerciseSelectionHref: () => Href;
  readonly save: () => Promise<WorkoutTemplateEditSaveResult>;
  readonly reload: () => void;
  readonly shouldConfirmExit: () => boolean;
  readonly requestExit: () => boolean;
  readonly cancelExit: () => void;
  readonly confirmExit: () => void;
};

export type WorkoutTemplateEditScreenModel = {
  readonly state: WorkoutTemplateEditScreenState;
  readonly controls: WorkoutTemplateEditScreenControls;
};

export type UseWorkoutTemplateEditDependencies = {
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
  readonly createTemplateExerciseId?: () => string;
};

const TEMPLATE_EDIT_LOAD_ERROR_MESSAGE =
  '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。';
const TEMPLATE_EDIT_NOT_FOUND_MESSAGE = '找不到要编辑的训练模板。';
const TEMPLATE_EDIT_SAVE_ERROR_MESSAGE =
  '训练模板保存失败。当前修改仍保留，请重新保存。';
const EXERCISE_LOAD_ERROR_MESSAGE =
  '动作信息加载失败。当前修改仍保留，请重新打开动作库后再试。';
const EXERCISE_LOADING_ERROR_MESSAGE = '动作信息正在加载，请稍后保存。';

export function useWorkoutTemplateEdit(
  routeParams: WorkoutTemplateEditRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
    createExerciseRepository = createSqliteExerciseRepository,
    now = () => new Date().toISOString(),
    createTemplateExerciseId = createDefaultTemplateExerciseId,
  }: UseWorkoutTemplateEditDependencies = {},
): WorkoutTemplateEditScreenModel {
  const routeParamsKey = JSON.stringify(routeParams);
  const routeDraft = useMemo(
    () =>
      parseWorkoutTemplateEditRouteDraft(
        JSON.parse(routeParamsKey) as WorkoutTemplateEditRouteParams,
      ),
    [routeParamsKey],
  );
  const templateId = routeDraft.templateId as WorkoutTemplateId | undefined;
  const [state, setState] = useState<WorkoutTemplateEditScreenState>({
    status: 'loading',
    draft: null,
    isConfirmingDiscard: false,
    isExitAuthorized: false,
    isSaved: false,
  });
  const stateRef = useRef(state);
  const baselineDraftKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
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
    createTemplateExerciseId,
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    dependenciesRef.current = {
      initializeDatabase,
      createWorkoutTemplateRepository,
      createExerciseRepository,
      now,
      createTemplateExerciseId,
    };
  }, [
    createExerciseRepository,
    createTemplateExerciseId,
    createWorkoutTemplateRepository,
    initializeDatabase,
    now,
  ]);

  const isCurrentRequest = useCallback((requestId: number): boolean => {
    return isMountedRef.current && requestIdRef.current === requestId;
  }, []);

  const loadTemplate = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((currentState) => ({
      status: 'loading',
      draft: currentState.draft,
      isConfirmingDiscard: false,
      isExitAuthorized: false,
      isSaved: currentState.isSaved,
    }));

    if (!templateId) {
      setState({
        status: 'notFound',
        message: TEMPLATE_EDIT_NOT_FOUND_MESSAGE,
        draft: null,
        isConfirmingDiscard: false,
        isExitAuthorized: false,
        isSaved: false,
      });
      return;
    }

    try {
      const startupResult = await dependenciesRef.current.initializeDatabase();

      if (!isCurrentRequest(requestId)) {
        return;
      }

      if (startupResult.status === 'error') {
        setState((currentState) => ({
          status: 'error',
          message: TEMPLATE_EDIT_LOAD_ERROR_MESSAGE,
          draft: currentState.draft,
          isConfirmingDiscard: currentState.isConfirmingDiscard,
          isExitAuthorized: currentState.isExitAuthorized,
          isSaved: currentState.isSaved,
        }));
        return;
      }

      const repositories = {
        workoutTemplateRepository:
          dependenciesRef.current.createWorkoutTemplateRepository(
            startupResult.database,
          ),
        exerciseRepository: dependenciesRef.current.createExerciseRepository(
          startupResult.database,
        ),
      };
      repositoriesRef.current = repositories;

      const template = await repositories.workoutTemplateRepository.getById(
        templateId,
        { includeArchived: true },
      );

      if (!isCurrentRequest(requestId)) {
        return;
      }

      if (!template) {
        setState({
          status: 'notFound',
          message: TEMPLATE_EDIT_NOT_FOUND_MESSAGE,
          draft: null,
          isConfirmingDiscard: false,
          isExitAuthorized: false,
          isSaved: false,
        });
        return;
      }

      const draft = applyRouteDraftToTemplate(template, routeDraft);
      const hydratedDraft = await hydrateExerciseDetails(
        repositories.exerciseRepository,
        draft,
      );
      const readyDraft =
        routeDraft.exerciseDraftState.status === 'invalid'
          ? {
              ...hydratedDraft,
              exerciseLoadStatus: 'error' as const,
            }
          : hydratedDraft;

      if (!isCurrentRequest(requestId)) {
        return;
      }

      baselineDraftKeyRef.current = createDraftKey(
        buildDraftFromTemplate(template),
      );
      setState({
        status: 'ready',
        templateStatus: template.status,
        draft: readyDraft,
        fieldErrors: {
          ...(routeDraft.duplicateSelectionIgnored
            ? { exercises: '该动作已添加，不能重复选择。' }
            : {}),
          ...(routeDraft.exerciseDraftState.status === 'invalid'
            ? { exercises: '动作草稿参数无效，请重新打开动作库后再试。' }
            : {}),
        },
        saveError: undefined,
        isSaving: false,
        isConfirmingDiscard: false,
        isExitAuthorized: false,
        isSaved: false,
      });
    } catch {
      if (!isCurrentRequest(requestId)) {
        return;
      }

      setState((currentState) => ({
        status: 'error',
        message: TEMPLATE_EDIT_LOAD_ERROR_MESSAGE,
        draft: currentState.draft,
        isConfirmingDiscard: currentState.isConfirmingDiscard,
        isExitAuthorized: currentState.isExitAuthorized,
        isSaved: currentState.isSaved,
      }));
    }
  }, [isCurrentRequest, routeDraft, templateId]);

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

  const updateExerciseConfig = useCallback(
    (
      exerciseId: ExerciseId,
      field: 'targetSets' | 'targetRepsMin' | 'targetRepsMax' | 'restSeconds',
      value: string,
    ) => {
      setState((currentState) => {
        if (
          currentState.status !== 'ready' ||
          currentState.templateStatus === 'archived' ||
          currentState.isSaving
        ) {
          return currentState;
        }

        const exerciseConfigs = {
          ...currentState.fieldErrors.exerciseConfigs,
        };
        delete exerciseConfigs[exerciseId];

        return {
          ...currentState,
          draft: {
            ...currentState.draft,
            exercises: currentState.draft.exercises.map((exercise) =>
              exercise.exerciseId === exerciseId
                ? {
                    ...exercise,
                    [field]: value,
                  }
                : exercise,
            ),
          },
          fieldErrors: {
            ...currentState.fieldErrors,
            exerciseConfigs,
          },
          saveError: undefined,
          isSaved: false,
          isExitAuthorized: false,
        };
      });
    },
    [],
  );

  const moveExerciseUp = useCallback((exerciseId: ExerciseId) => {
    setState((currentState) =>
      moveExerciseInReadyDraft(currentState, exerciseId, -1),
    );
  }, []);

  const moveExerciseDown = useCallback((exerciseId: ExerciseId) => {
    setState((currentState) =>
      moveExerciseInReadyDraft(currentState, exerciseId, 1),
    );
  }, []);

  const requestRemoveExercise = useCallback((exerciseId: ExerciseId) => {
    setState((currentState) =>
      currentState.status === 'ready' &&
      currentState.templateStatus !== 'archived' &&
      !currentState.isSaving
        ? {
            ...currentState,
            pendingRemoveExerciseId: exerciseId,
          }
        : currentState,
    );
  }, []);

  const cancelRemoveExercise = useCallback(() => {
    setState((currentState) =>
      currentState.status === 'ready'
        ? {
            ...currentState,
            pendingRemoveExerciseId: undefined,
          }
        : currentState,
    );
  }, []);

  const confirmRemoveExercise = useCallback(() => {
    setState((currentState) => {
      if (
        currentState.status !== 'ready' ||
        currentState.templateStatus === 'archived' ||
        currentState.isSaving ||
        !currentState.pendingRemoveExerciseId
      ) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          exercises: currentState.draft.exercises.filter(
            (exercise) =>
              exercise.exerciseId !== currentState.pendingRemoveExerciseId,
          ),
        },
        fieldErrors: {
          ...currentState.fieldErrors,
          exercises: undefined,
        },
        saveError: undefined,
        pendingRemoveExerciseId: undefined,
        isSaved: false,
        isExitAuthorized: false,
      };
    });
  }, []);

  const createExerciseSelectionHref = useCallback((): Href => {
    const currentState = stateRef.current;
    const currentDraft = currentState.draft;

    if (
      !currentDraft ||
      (currentState.status === 'ready' &&
        (currentState.templateStatus === 'archived' || currentState.isSaving))
    ) {
      return '/exercises' as Href;
    }

    return createTemplateExerciseSelectionHref({
      returnTo: '/templates/[id]',
      alreadySelectedExerciseIds: currentDraft.exercises.map(
        (exercise) => exercise.exerciseId,
      ),
      returnParams: serializeWorkoutTemplateEditDraftRouteParams({
        templateId: currentDraft.templateId,
        name: currentDraft.name,
        description: currentDraft.description,
        exercises: currentDraft.exercises,
      }),
    }) as Href;
  }, []);

  const save = useCallback(async (): Promise<WorkoutTemplateEditSaveResult> => {
    if (isSavingRef.current) {
      return {
        status: 'error',
        message: TEMPLATE_EDIT_SAVE_ERROR_MESSAGE,
      };
    }

    const currentState = stateRef.current;
    const repositories = repositoriesRef.current;

    if (
      !repositories ||
      currentState.status !== 'ready' ||
      currentState.templateStatus === 'archived'
    ) {
      return {
        status: 'error',
        message: TEMPLATE_EDIT_SAVE_ERROR_MESSAGE,
      };
    }

    const blockingError = getExerciseSaveBlockingError(
      currentState.draft,
      currentState.fieldErrors,
    );

    if (blockingError) {
      setState((latestState) =>
        latestState.status === 'ready'
          ? {
              ...latestState,
              fieldErrors: {
                ...latestState.fieldErrors,
                exercises: blockingError,
              },
            }
          : latestState,
      );
      return {
        status: 'invalid',
        fieldErrors: {
          exercises: blockingError,
        },
      };
    }

    isSavingRef.current = true;
    const submittedDraft = currentState.draft;
    const submittedDraftKey = createDraftKey(submittedDraft);
    setState((latestState) =>
      latestState.status === 'ready'
        ? {
            ...latestState,
            fieldErrors: {},
            saveError: undefined,
            isSaving: true,
          }
        : latestState,
    );

    const result = await saveWorkoutTemplateEditDraft(
      repositories.workoutTemplateRepository,
      submittedDraft,
      {
        now: dependenciesRef.current.now,
        createTemplateExerciseId:
          dependenciesRef.current.createTemplateExerciseId,
      },
    );

    isSavingRef.current = false;

    if (!isMountedRef.current) {
      return result;
    }

    setState((latestState) => {
      if (latestState.status !== 'ready') {
        return latestState;
      }

      if (result.status === 'invalid') {
        return {
          ...latestState,
          fieldErrors: result.fieldErrors,
          isSaving: false,
        };
      }

      if (result.status === 'error') {
        return {
          ...latestState,
          saveError: result.message,
          isSaving: false,
        };
      }

      baselineDraftKeyRef.current = submittedDraftKey;
      const currentDraftKey = createDraftKey(latestState.draft);

      return {
        ...latestState,
        isSaving: false,
        isSaved: currentDraftKey === submittedDraftKey,
      };
    });

    return result;
  }, []);

  const reload = useCallback(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const shouldConfirmExit = useCallback((): boolean => {
    return shouldConfirmExitForState(state, baselineDraftKeyRef.current);
  }, [state]);

  const requestExit = useCallback((): boolean => {
    if (stateRef.current.status === 'ready' && stateRef.current.isSaving) {
      return false;
    }

    if (
      !shouldConfirmExitForState(stateRef.current, baselineDraftKeyRef.current)
    ) {
      return true;
    }

    setState((currentState) =>
      shouldConfirmExitForState(currentState, baselineDraftKeyRef.current)
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
    setState((currentState) =>
      currentState.status === 'ready' && currentState.isSaving
        ? currentState
        : {
            ...currentState,
            isConfirmingDiscard: false,
            isExitAuthorized: true,
          },
    );
  }, []);

  return {
    state,
    controls: {
      updateName,
      updateDescription,
      updateExerciseConfig,
      moveExerciseUp,
      moveExerciseDown,
      requestRemoveExercise,
      cancelRemoveExercise,
      confirmRemoveExercise,
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

function applyRouteDraftToTemplate(
  template: WorkoutTemplate,
  routeDraft: ReturnType<typeof parseWorkoutTemplateEditRouteDraft>,
): WorkoutTemplateEditDraftState {
  const templateDraft = buildDraftFromTemplate(template);

  if (routeDraft.exerciseDraftState.status !== 'valid') {
    return {
      ...templateDraft,
      name: routeDraft.name ?? templateDraft.name,
      description: routeDraft.description ?? templateDraft.description,
    };
  }

  return {
    ...templateDraft,
    name: routeDraft.name ?? templateDraft.name,
    description: routeDraft.description ?? templateDraft.description,
    exercises: routeDraft.exerciseDraftState.exercises,
    exerciseLoadStatus: 'loading',
  };
}

function buildDraftFromTemplate(
  template: WorkoutTemplate,
  exercises: readonly WorkoutTemplateEditExerciseDraft[] = template.exercises.map(
    toExerciseDraft,
  ),
): WorkoutTemplateEditDraftState {
  return {
    templateId: template.id,
    name: template.name,
    description: template.description ?? '',
    exercises,
    exerciseLoadStatus: 'loading',
  };
}

async function hydrateExerciseDetails(
  repository: ExerciseRepository,
  draft: WorkoutTemplateEditDraftState,
): Promise<WorkoutTemplateEditDraftState> {
  const hydratedExercises: WorkoutTemplateEditExerciseDraft[] = [];
  const missingExerciseIds: ExerciseId[] = [];

  for (const exerciseDraft of draft.exercises) {
    const exercise = await repository.getById(exerciseDraft.exerciseId);

    if (!exercise) {
      missingExerciseIds.push(exerciseDraft.exerciseId);
      hydratedExercises.push(exerciseDraft);
      continue;
    }

    hydratedExercises.push({
      ...exerciseDraft,
      exercise,
    });
  }

  return {
    ...draft,
    exercises: hydratedExercises,
    exerciseLoadStatus: missingExerciseIds.length > 0 ? 'error' : 'ready',
  };
}

function toExerciseDraft(
  exercise: TemplateExercise,
): WorkoutTemplateEditExerciseDraft {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    targetSets: String(exercise.targetSets),
    targetRepsMin: String(exercise.targetReps.min),
    targetRepsMax: String(exercise.targetReps.max),
    restSeconds: String(exercise.restSeconds),
    createdAt: exercise.createdAt,
  };
}

function updateReadyDraft(
  state: WorkoutTemplateEditScreenState,
  updates: {
    readonly name?: string;
    readonly description?: string;
    readonly fieldErrors?: WorkoutTemplateEditFieldErrors;
    readonly saveError?: string;
  },
): WorkoutTemplateEditScreenState {
  if (
    state.status !== 'ready' ||
    state.templateStatus === 'archived' ||
    state.isSaving
  ) {
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

function moveExerciseInReadyDraft(
  state: WorkoutTemplateEditScreenState,
  exerciseId: ExerciseId,
  direction: -1 | 1,
): WorkoutTemplateEditScreenState {
  if (
    state.status !== 'ready' ||
    state.templateStatus === 'archived' ||
    state.isSaving
  ) {
    return state;
  }

  const fromIndex = state.draft.exercises.findIndex(
    (exercise) => exercise.exerciseId === exerciseId,
  );
  const toIndex = fromIndex + direction;

  if (fromIndex < 0 || toIndex < 0 || toIndex >= state.draft.exercises.length) {
    return state;
  }

  const exercises = [...state.draft.exercises];
  const [exercise] = exercises.splice(fromIndex, 1);
  exercises.splice(toIndex, 0, exercise);

  return {
    ...state,
    draft: {
      ...state.draft,
      exercises,
    },
    saveError: undefined,
    isSaved: false,
    isExitAuthorized: false,
  };
}

function getExerciseSaveBlockingError(
  draft: WorkoutTemplateEditDraftState,
  fieldErrors: WorkoutTemplateEditFieldErrors,
): string | undefined {
  if (draft.exerciseLoadStatus === 'loading') {
    return EXERCISE_LOADING_ERROR_MESSAGE;
  }

  if (draft.exerciseLoadStatus === 'error') {
    return fieldErrors.exercises ?? EXERCISE_LOAD_ERROR_MESSAGE;
  }

  if (draft.exercises.some((exercise) => !exercise.exercise)) {
    return EXERCISE_LOAD_ERROR_MESSAGE;
  }

  return undefined;
}

function getFieldErrors(
  state: WorkoutTemplateEditScreenState,
): WorkoutTemplateEditFieldErrors {
  return state.status === 'ready' ? state.fieldErrors : {};
}

function shouldConfirmExitForState(
  state: WorkoutTemplateEditScreenState,
  baselineDraftKey: string | null,
): boolean {
  if (
    !state.draft ||
    state.isExitAuthorized ||
    state.isSaved ||
    (state.status === 'ready' && state.templateStatus === 'archived')
  ) {
    return false;
  }

  if (state.status === 'ready' && state.isSaving) {
    return true;
  }

  return createDraftKey(state.draft) !== baselineDraftKey;
}

function createDraftKey(draft: WorkoutTemplateEditDraftState): string {
  return JSON.stringify({
    name: draft.name.trim(),
    description: draft.description.trim(),
    exercises: draft.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      targetSets: exercise.targetSets,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      restSeconds: exercise.restSeconds,
    })),
  });
}

function createDefaultTemplateExerciseId(): string {
  return `templateExercise-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
