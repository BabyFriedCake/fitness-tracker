import { useCallback, useEffect, useRef, useState } from 'react';
import type { Href } from 'expo-router';

import {
  initializeApplicationDatabase,
  type DatabaseStartupResult,
} from '@/database/bootstrap';
import { createSqliteExerciseRepository } from '@/database/repositories/exercise';
import { createSqliteTodayWorkoutPlanRepository } from '@/database/repositories/today-workout-plan';
import { createSqliteWorkoutSessionRepository } from '@/database/repositories/workout-session';
import { createSqliteWorkoutTemplateRepository } from '@/database/repositories/workout-template';
import type { ExerciseId, ExerciseRepository } from '@/domain/exercise';
import type {
  TodayWorkoutPlanId,
  TodayWorkoutPlanRepository,
} from '@/domain/today-workout-plan';
import type { WorkoutTemplateRepository } from '@/domain/workout-template';
import type {
  SessionExerciseId,
  WorkoutSession,
  WorkoutSessionRepository,
} from '@/domain/workout-session';
import { createSessionExerciseSelectionHref } from '@/features/exercise-library/application/exercise-selection-flow';

import { startTodayPlan } from './today-dashboard';
import type { WorkoutSessionIdKind } from './workout-session-flow';

export type TodayPlanEditRouteParams = {
  readonly id?: string | readonly string[];
  readonly selectedExerciseId?: string | readonly string[];
  readonly selectionContext?: string | readonly string[];
};

export type TodayPlanEditExerciseDraft = {
  readonly id: SessionExerciseId;
  readonly sourceExerciseId: ExerciseId;
  readonly name: string;
  readonly targetSets: string;
  readonly targetReps: string;
  readonly restSeconds: string;
};

export type TodayPlanEditDraft = {
  readonly planId: TodayWorkoutPlanId;
  readonly session: WorkoutSession;
  readonly title: string;
  readonly exercises: readonly TodayPlanEditExerciseDraft[];
};

export type TodayPlanEditState =
  | { readonly status: 'loading' }
  | { readonly status: 'notFound'; readonly message: string }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly draft: TodayPlanEditDraft;
      readonly isSaving: boolean;
      readonly fieldErrors: Readonly<Record<string, string>>;
      readonly pendingRemoveExerciseId?: SessionExerciseId;
      readonly actionError?: string;
      readonly isSaved: boolean;
    };

export type TodayPlanEditControls = {
  readonly reload: () => void;
  readonly updateExerciseConfig: (
    sessionExerciseId: SessionExerciseId,
    field: 'targetSets' | 'targetReps' | 'restSeconds',
    value: string,
  ) => void;
  readonly createExerciseSelectionHref: () => Href;
  readonly requestRemoveExercise: (
    sessionExerciseId: SessionExerciseId,
  ) => void;
  readonly cancelRemoveExercise: () => void;
  readonly confirmRemoveExercise: () => void;
  readonly save: () => Promise<boolean>;
};

export type UseTodayPlanEditDependencies = {
  readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  readonly createTodayWorkoutPlanRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => TodayWorkoutPlanRepository;
  readonly createWorkoutTemplateRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutTemplateRepository;
  readonly createWorkoutSessionRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => WorkoutSessionRepository;
  readonly createExerciseRepository?: (
    database: Extract<
      DatabaseStartupResult,
      { readonly status: 'ready' }
    >['database'],
  ) => ExerciseRepository;
  readonly now?: () => string;
  readonly createId?: (kind: WorkoutSessionIdKind) => string;
};

type TodayPlanEditRepositories = {
  readonly todayWorkoutPlanRepository: TodayWorkoutPlanRepository;
  readonly workoutTemplateRepository: WorkoutTemplateRepository;
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly exerciseRepository: ExerciseRepository;
};

const LOAD_ERROR_MESSAGE =
  '此次训练加载失败。已保存的训练数据不会丢失，请重试。';
const NOT_FOUND_MESSAGE = '没有找到这次今日训练计划。';
const NOT_EDITABLE_MESSAGE = '只有尚未开始的今日训练可以编辑。';
const SAVE_ERROR_MESSAGE = '此次训练保存失败。当前修改仍保留，请重新保存。';
const EXERCISE_ADD_ERROR_MESSAGE = '动作添加失败，请重新选择动作。';
const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS_MIN = 8;
const DEFAULT_TARGET_REPS_MAX = 10;
const DEFAULT_REST_SECONDS = 90;

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function useTodayPlanEdit(
  routeParams: TodayPlanEditRouteParams,
  {
    initializeDatabase = initializeApplicationDatabase,
    createTodayWorkoutPlanRepository = createSqliteTodayWorkoutPlanRepository,
    createWorkoutTemplateRepository = createSqliteWorkoutTemplateRepository,
    createWorkoutSessionRepository = createSqliteWorkoutSessionRepository,
    createExerciseRepository = createSqliteExerciseRepository,
    now = getCurrentTimestamp,
    createId = createDefaultWorkoutSessionId,
  }: UseTodayPlanEditDependencies = {},
): {
  readonly state: TodayPlanEditState;
  readonly controls: TodayPlanEditControls;
} {
  const [state, setState] = useState<TodayPlanEditState>({
    status: 'loading',
  });
  const stateRef = useRef(state);
  const isMountedRef = useRef(false);
  const repositoriesRef = useRef<TodayPlanEditRepositories | null>(null);
  const requestIdRef = useRef(0);
  const selectedExerciseIdRef = useRef<string | null>(null);
  const planId = parsePlanId(routeParams.id);
  const selectedExerciseId = parseSelectedExerciseId(routeParams);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const getRepositories =
    useCallback(async (): Promise<TodayPlanEditRepositories> => {
      if (repositoriesRef.current) {
        return repositoriesRef.current;
      }

      const startupResult = await initializeDatabase();

      if (startupResult.status === 'error') {
        throw new Error('Database startup failed.');
      }

      const repositories: TodayPlanEditRepositories = {
        todayWorkoutPlanRepository: createTodayWorkoutPlanRepository(
          startupResult.database,
        ),
        workoutTemplateRepository: createWorkoutTemplateRepository(
          startupResult.database,
        ),
        workoutSessionRepository: createWorkoutSessionRepository(
          startupResult.database,
        ),
        exerciseRepository: createExerciseRepository(startupResult.database),
      };
      repositoriesRef.current = repositories;

      return repositories;
    }, [
      createExerciseRepository,
      createTodayWorkoutPlanRepository,
      createWorkoutSessionRepository,
      createWorkoutTemplateRepository,
      initializeDatabase,
    ]);

  const load = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ status: 'loading' });

    if (!planId) {
      setState({ status: 'notFound', message: NOT_FOUND_MESSAGE });
      return;
    }

    try {
      const repositories = await getRepositories();
      const result = await loadTodayPlanEditDraft(repositories, planId, {
        now,
        createId,
      });

      if (!isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        return;
      }

      if (result.status !== 'ready') {
        setState({ status: result.status, message: result.message });
        return;
      }

      let draft = result.draft;
      const shouldApplySelectedExercise =
        selectedExerciseId &&
        selectedExerciseIdRef.current !== selectedExerciseId;

      if (shouldApplySelectedExercise) {
        const addResult = await addExerciseToTodayPlanDraft(
          repositories,
          draft.session,
          selectedExerciseId,
          {
            now,
            createId,
          },
        );

        selectedExerciseIdRef.current = selectedExerciseId;

        if (addResult.status === 'added') {
          draft = createTodayPlanEditDraft(
            draft.planId,
            addResult.session,
            draft.title,
          );
        } else if (addResult.status === 'error') {
          setState({
            status: 'error',
            message: EXERCISE_ADD_ERROR_MESSAGE,
          });
          return;
        }
      }

      setState({
        status: 'ready',
        draft,
        isSaving: false,
        fieldErrors: {},
        isSaved: false,
      });
    } catch {
      if (isCurrentRequest(isMountedRef, requestIdRef, requestId)) {
        setState({ status: 'error', message: LOAD_ERROR_MESSAGE });
      }
    }
  }, [createId, getRepositories, now, planId, selectedExerciseId]);

  const updateExerciseConfig = useCallback(
    (
      sessionExerciseId: SessionExerciseId,
      field: 'targetSets' | 'targetReps' | 'restSeconds',
      value: string,
    ): void => {
      setState((current) => {
        if (
          current.status !== 'ready' ||
          current.isSaving ||
          current.draft.session.status !== 'draft'
        ) {
          return current;
        }

        return {
          ...current,
          isSaved: false,
          actionError: undefined,
          draft: {
            ...current.draft,
            exercises: current.draft.exercises.map((exercise) =>
              exercise.id === sessionExerciseId
                ? { ...exercise, [field]: value }
                : exercise,
            ),
          },
        };
      });
    },
    [],
  );

  const createExerciseSelectionHref = useCallback((): Href => {
    const current = stateRef.current;

    if (current.status !== 'ready') {
      return '/exercises';
    }

    return createSessionExerciseSelectionHref({
      returnTo: '/today-plans/[id]/edit',
      returnParams: { id: current.draft.planId },
      alreadySelectedExerciseIds: current.draft.exercises.map(
        (exercise) => exercise.sourceExerciseId,
      ),
    }) as Href;
  }, []);

  const requestRemoveExercise = useCallback(
    (sessionExerciseId: SessionExerciseId): void => {
      setState((current) =>
        current.status === 'ready' && !current.isSaving
          ? { ...current, pendingRemoveExerciseId: sessionExerciseId }
          : current,
      );
    },
    [],
  );

  const cancelRemoveExercise = useCallback((): void => {
    setState((current) =>
      current.status === 'ready'
        ? { ...current, pendingRemoveExerciseId: undefined }
        : current,
    );
  }, []);

  const confirmRemoveExercise = useCallback((): void => {
    setState((current) => {
      if (
        current.status !== 'ready' ||
        current.isSaving ||
        !current.pendingRemoveExerciseId ||
        current.draft.exercises.length <= 1
      ) {
        return current;
      }

      return {
        ...current,
        isSaved: false,
        actionError: undefined,
        pendingRemoveExerciseId: undefined,
        draft: {
          ...current.draft,
          exercises: current.draft.exercises
            .filter(
              (exercise) => exercise.id !== current.pendingRemoveExerciseId,
            )
            .map((exercise, index) => ({
              ...exercise,
              position: index,
            })),
        },
      };
    });
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current;
    const repositories = repositoriesRef.current;

    if (
      current.status !== 'ready' ||
      current.isSaving ||
      current.draft.session.status !== 'draft' ||
      !repositories
    ) {
      return false;
    }

    const validation = validateDraft(current.draft);

    if (!validation.isValid) {
      setState({ ...current, fieldErrors: validation.fieldErrors });
      return false;
    }

    setState({ ...current, isSaving: true, fieldErrors: {} });

    try {
      const nextSession = createSessionFromDraft(current.draft, now());
      await repositories.workoutSessionRepository.update(nextSession);

      if (!isMountedRef.current) {
        return false;
      }

      setState({
        status: 'ready',
        draft: createTodayPlanEditDraft(
          current.draft.planId,
          nextSession,
          current.draft.title,
        ),
        isSaving: false,
        fieldErrors: {},
        isSaved: true,
      });
      return true;
    } catch {
      if (isMountedRef.current) {
        setState({
          ...current,
          isSaving: false,
          actionError: SAVE_ERROR_MESSAGE,
        });
      }
      return false;
    }
  }, [now]);

  useEffect(() => {
    isMountedRef.current = true;
    void load();

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      repositoriesRef.current = null;
    };
  }, [load]);

  return {
    state,
    controls: {
      reload: () => void load(),
      updateExerciseConfig,
      createExerciseSelectionHref,
      requestRemoveExercise,
      cancelRemoveExercise,
      confirmRemoveExercise,
      save,
    },
  };
}

type LoadTodayPlanEditDraftResult =
  | { readonly status: 'ready'; readonly draft: TodayPlanEditDraft }
  | { readonly status: 'notFound'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

async function loadTodayPlanEditDraft(
  repositories: TodayPlanEditRepositories,
  planId: TodayWorkoutPlanId,
  options: {
    readonly now: () => string;
    readonly createId: (kind: WorkoutSessionIdKind) => string;
  },
): Promise<LoadTodayPlanEditDraftResult> {
  const startResult = await startTodayPlan(repositories, planId, options);

  if (startResult.status !== 'ready') {
    return {
      status: startResult.status === 'completed' ? 'error' : 'notFound',
      message:
        startResult.status === 'completed'
          ? NOT_EDITABLE_MESSAGE
          : NOT_FOUND_MESSAGE,
    };
  }

  const plan = await repositories.todayWorkoutPlanRepository.findById(planId);
  const session = await repositories.workoutSessionRepository.findById(
    startResult.sessionId,
  );

  if (!plan || !session) {
    return { status: 'notFound', message: NOT_FOUND_MESSAGE };
  }

  if (session.status !== 'draft') {
    return { status: 'error', message: NOT_EDITABLE_MESSAGE };
  }

  return {
    status: 'ready',
    draft: createTodayPlanEditDraft(plan.id, session, plan.titleSnapshot),
  };
}

async function addExerciseToTodayPlanDraft(
  repositories: Pick<
    TodayPlanEditRepositories,
    'exerciseRepository' | 'workoutSessionRepository'
  >,
  session: WorkoutSession,
  exerciseId: ExerciseId,
  options: {
    readonly now: () => string;
    readonly createId: (kind: WorkoutSessionIdKind) => string;
  },
): Promise<
  | { readonly status: 'added'; readonly session: WorkoutSession }
  | { readonly status: 'duplicate'; readonly session: WorkoutSession }
  | { readonly status: 'error' }
> {
  if (session.status !== 'draft') {
    return { status: 'error' };
  }

  if (
    session.sessionExercises.some(
      (exercise) => exercise.sourceExerciseId === exerciseId,
    )
  ) {
    return { status: 'duplicate', session };
  }

  const exercise = await repositories.exerciseRepository.getById(exerciseId);

  if (!exercise) {
    return { status: 'error' };
  }

  const timestamp = options.now();
  const nextSession: WorkoutSession = {
    ...session,
    sessionExercises: [
      ...session.sessionExercises,
      {
        id: options.createId('sessionExercise') as SessionExerciseId,
        sessionId: session.id,
        sourceExerciseId: exercise.id,
        exerciseNameSnapshot:
          exercise.nameZh || exercise.nameEn || exercise.slug,
        position: session.sessionExercises.length,
        isEnabled: true,
        isSkipped: false,
        isCompleted: false,
        targetSets: DEFAULT_TARGET_SETS,
        targetRepsMin: DEFAULT_TARGET_REPS_MIN,
        targetRepsMax: DEFAULT_TARGET_REPS_MAX,
        currentRestSeconds: DEFAULT_REST_SECONDS,
        sets: [],
      },
    ],
    updatedAt: timestamp,
  };

  const saved = await repositories.workoutSessionRepository.update(nextSession);

  return { status: 'added', session: saved };
}

function createTodayPlanEditDraft(
  planId: TodayWorkoutPlanId,
  session: WorkoutSession,
  title: string,
): TodayPlanEditDraft {
  return {
    planId,
    session,
    title,
    exercises: session.sessionExercises
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((exercise) => ({
        id: exercise.id,
        sourceExerciseId: exercise.sourceExerciseId,
        name: exercise.exerciseNameSnapshot,
        targetSets: String(exercise.targetSets),
        targetReps: String(exercise.targetRepsMax),
        restSeconds: String(exercise.currentRestSeconds),
      })),
  };
}

function createSessionFromDraft(
  draft: TodayPlanEditDraft,
  updatedAt: string,
): WorkoutSession {
  return {
    ...draft.session,
    sessionExercises: draft.exercises.map((exercise, index) => {
      const existing = draft.session.sessionExercises.find(
        (sessionExercise) => sessionExercise.id === exercise.id,
      );

      if (!existing) {
        throw new Error('Missing session exercise.');
      }

      return {
        ...existing,
        position: index,
        targetSets: Number(exercise.targetSets),
        targetRepsMin: Number(exercise.targetReps),
        targetRepsMax: Number(exercise.targetReps),
        currentRestSeconds: Number(exercise.restSeconds),
      };
    }),
    updatedAt,
  };
}

function validateDraft(draft: TodayPlanEditDraft): {
  readonly isValid: boolean;
  readonly fieldErrors: Readonly<Record<string, string>>;
} {
  const fieldErrors: Record<string, string> = {};

  if (draft.exercises.length === 0) {
    fieldErrors.exercises = '至少保留一个训练动作。';
  }

  for (const exercise of draft.exercises) {
    const targetSets = parsePositiveInteger(exercise.targetSets);
    const targetReps = parsePositiveInteger(exercise.targetReps);
    const restSeconds = parseNonNegativeInteger(exercise.restSeconds);

    if (targetSets === null) {
      fieldErrors[`${exercise.id}:targetSets`] = '组数必须是正整数。';
    }

    if (targetReps === null) {
      fieldErrors[`${exercise.id}:targetReps`] = '次数必须是正整数。';
    }

    if (restSeconds === null) {
      fieldErrors[`${exercise.id}:restSeconds`] = '休息时间必须是非负整数。';
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value.trim())) {
    return null;
  }

  return Number(value);
}

function parseNonNegativeInteger(value: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(value.trim())) {
    return null;
  }

  return Number(value);
}

function parsePlanId(
  value: string | readonly string[] | undefined,
): TodayWorkoutPlanId | null {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw && raw.trim().length > 0 ? (raw as TodayWorkoutPlanId) : null;
}

function parseSelectedExerciseId(
  routeParams: TodayPlanEditRouteParams,
): ExerciseId | null {
  const context = firstParamValue(routeParams.selectionContext);
  const selectedExerciseId = firstParamValue(routeParams.selectedExerciseId);

  return context === 'session' && selectedExerciseId
    ? (selectedExerciseId as ExerciseId)
    : null;
}

function firstParamValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}

function createDefaultWorkoutSessionId(kind: WorkoutSessionIdKind): string {
  return `workout-${kind}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isCurrentRequest(
  isMountedRef: { readonly current: boolean },
  requestIdRef: { readonly current: number },
  requestId: number,
): boolean {
  return isMountedRef.current && requestIdRef.current === requestId;
}
