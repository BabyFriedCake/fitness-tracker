import type {
  RestTimerRepository,
  RestTimerStatus,
  SessionExercise,
  SessionExerciseId,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import {
  createRepCompletedFeedbackEvent,
  type RepCompletedFeedbackEvent,
} from './workout-feedback-events';
import { getRestTimerState } from './workout-session-rest-timer';
import {
  isValidWorkoutRuntimeSnapshot,
  type WorkoutRuntimeSnapshotRepository,
  type WorkoutRuntimeSnapshotSaveResult,
} from './workout-runtime-snapshot-repository';

const workoutCompanionSetCompletionKeys: unique symbol = Symbol(
  'workoutCompanionSetCompletionKeys',
);

type WorkoutCompanionRuntimeInstance = {
  readonly [workoutCompanionSetCompletionKeys]: Set<string>;
};

export type WorkoutRuntimeStatus = 'running' | 'paused' | 'completed';
export type WorkoutRuntimeDisplayStatus = 'idle' | WorkoutRuntimeStatus;

export type WorkoutCompanionRuntimePhase =
  | 'running'
  | 'paused'
  | 'set_completion_pending'
  | 'resting'
  | 'exercise_completion_pending'
  | 'completed';

export type WorkoutRuntimeProgress = {
  readonly sessionId: WorkoutSessionId;
  readonly currentExerciseIndex: number;
  readonly currentSetIndex: number;
  readonly completedReps: number;
};

export type WorkoutCompanionRuntimeState = {
  readonly phase: WorkoutCompanionRuntimePhase;
  readonly restRemainingSeconds?: number;
  readonly progress: WorkoutRuntimeProgress;
  readonly orderedExercises: readonly SessionExercise[];
  readonly instance: WorkoutCompanionRuntimeInstance;
};

export type WorkoutCompanionSetCompletionRequest = {
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExerciseId;
  readonly actualReps: number;
};

export type WorkoutCompanionRepResult = {
  readonly runtime: WorkoutCompanionRuntimeState;
  readonly event?: RepCompletedFeedbackEvent;
  readonly setCompletionRequest?: WorkoutCompanionSetCompletionRequest;
};

export type WorkoutRuntimeState = {
  readonly sessionId: WorkoutSessionId;
  readonly status: WorkoutRuntimeStatus;
  readonly currentSessionExerciseId?: SessionExerciseId;
  readonly currentSetNumber?: number;
  readonly currentSet?: number;
  readonly currentExercise?: SessionExercise;
  readonly currentExerciseIndex?: number;
  readonly orderedExercises: readonly SessionExercise[];
  readonly completedSetCount: number;
  readonly completedSets: number;
  readonly totalTargetSetCount: number;
  readonly targetSets: number;
  readonly restTimerStatus?: RestTimerStatus;
};

export type WorkoutRuntimeSnapshot = Omit<WorkoutRuntimeState, 'status'> & {
  readonly status: WorkoutRuntimeDisplayStatus;
  readonly updatedAt: string;
};

export type WorkoutRuntimeRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly restTimerRepository: RestTimerRepository;
};

export type LoadWorkoutRuntimeStateResult =
  | { readonly status: 'ready'; readonly runtime: WorkoutRuntimeState }
  | { readonly status: 'not_found' }
  | {
      readonly status: 'not_runtime_session';
      readonly sessionStatus: WorkoutSession['status'];
    };

export type GetWorkoutRuntimeStateResult =
  | { readonly status: 'ready'; readonly runtime: WorkoutRuntimeSnapshot }
  | { readonly status: 'not_found' };

const ALLOWED_WORKOUT_RUNTIME_TRANSITIONS: Readonly<
  Record<WorkoutRuntimeStatus, readonly WorkoutRuntimeStatus[]>
> = {
  running: ['paused', 'completed'],
  paused: ['running', 'completed'],
  completed: [],
};

export class WorkoutRuntimeTransitionError extends Error {
  constructor(
    readonly currentStatus: WorkoutRuntimeStatus,
    readonly nextStatus: WorkoutRuntimeStatus,
  ) {
    super(
      `WorkoutRuntime cannot transition from ${currentStatus} to ${nextStatus}.`,
    );
    this.name = 'WorkoutRuntimeTransitionError';
  }
}

export class WorkoutCompanionRuntimeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkoutCompanionRuntimeUnavailableError';
  }
}

export function createWorkoutCompanionRuntimeState(
  session: Extract<WorkoutSession, { readonly status: 'in_progress' }>,
): WorkoutCompanionRuntimeState {
  const orderedExercises = [...session.sessionExercises].sort(
    (left, right) => left.position - right.position,
  );
  const currentExerciseIndex = findCompanionExerciseIndex(
    orderedExercises,
    session,
  );

  if (currentExerciseIndex === undefined) {
    throw new WorkoutCompanionRuntimeUnavailableError(
      'Workout Companion requires a current SessionExercise.',
    );
  }

  const currentExercise = orderedExercises[currentExerciseIndex];

  return {
    phase: 'running',
    progress: {
      sessionId: session.id,
      currentExerciseIndex,
      currentSetIndex: getSessionExerciseNextSetNumber(currentExercise) - 1,
      completedReps: 0,
    },
    orderedExercises,
    instance: { [workoutCompanionSetCompletionKeys]: new Set<string>() },
  };
}

export function onWorkoutCompanionRepCompleted(
  runtime: WorkoutCompanionRuntimeState,
): WorkoutCompanionRepResult {
  if (runtime.phase !== 'running') {
    return { runtime };
  }

  const exercise = getCompanionCurrentExercise(runtime);
  const completedReps = runtime.progress.completedReps + 1;
  const nextRuntime: WorkoutCompanionRuntimeState = {
    ...runtime,
    progress: { ...runtime.progress, completedReps },
  };
  const event = createRepCompletedFeedbackEvent({
    sessionId: runtime.progress.sessionId,
    exercise,
    repNumber: completedReps,
  });

  if (completedReps < getCompanionTargetReps(exercise)) {
    return { runtime: nextRuntime, event };
  }

  return {
    runtime: { ...nextRuntime, phase: 'set_completion_pending' },
    event,
    setCompletionRequest: {
      sessionId: runtime.progress.sessionId,
      sessionExerciseId: exercise.id,
      actualReps: completedReps,
    },
  };
}

export function beginWorkoutCompanionSetCompletion(
  runtime: WorkoutCompanionRuntimeState,
  request: WorkoutCompanionSetCompletionRequest,
): boolean {
  const pendingKeys = runtime.instance[workoutCompanionSetCompletionKeys];
  const key = createWorkoutCompanionSetCompletionKey(runtime, request);

  if (pendingKeys.has(key)) {
    return false;
  }

  pendingKeys.add(key);
  return true;
}

export function finishWorkoutCompanionSetCompletion(
  runtime: WorkoutCompanionRuntimeState,
  request: WorkoutCompanionSetCompletionRequest,
): void {
  runtime.instance[workoutCompanionSetCompletionKeys].delete(
    createWorkoutCompanionSetCompletionKey(runtime, request),
  );
}

export function pauseWorkoutCompanionRuntime(
  runtime: WorkoutCompanionRuntimeState,
): WorkoutCompanionRuntimeState {
  return runtime.phase === 'running'
    ? { ...runtime, phase: 'paused' }
    : runtime;
}

export function resumeWorkoutCompanionRuntime(
  runtime: WorkoutCompanionRuntimeState,
): WorkoutCompanionRuntimeState {
  return runtime.phase === 'paused'
    ? { ...runtime, phase: 'running' }
    : runtime;
}

export function resumeWorkoutCompanionAfterRest(
  runtime: WorkoutCompanionRuntimeState,
): WorkoutCompanionRuntimeState {
  return runtime.phase === 'resting'
    ? { ...runtime, phase: 'running' }
    : runtime;
}

export async function loadWorkoutRuntimeState(
  repositories: WorkoutRuntimeRepositories,
  sessionId: WorkoutSessionId,
  now: string,
): Promise<LoadWorkoutRuntimeStateResult> {
  const session =
    await repositories.workoutSessionRepository.findById(sessionId);

  if (!session) {
    return { status: 'not_found' };
  }

  if (session.status !== 'in_progress' && session.status !== 'completed') {
    return {
      status: 'not_runtime_session',
      sessionStatus: session.status,
    };
  }

  const restTimer = await getRestTimerState(repositories.restTimerRepository, {
    sessionId,
    now,
  });

  return {
    status: 'ready',
    runtime: createWorkoutRuntimeState(
      session,
      restTimer.status === 'not_found' ? undefined : restTimer.status,
    ),
  };
}

export async function getWorkoutRuntimeState(
  repositories: WorkoutRuntimeRepositories,
  sessionId: WorkoutSessionId,
  now: string,
): Promise<GetWorkoutRuntimeStateResult> {
  const session =
    await repositories.workoutSessionRepository.findById(sessionId);

  if (!session) {
    return { status: 'not_found' };
  }

  const restTimer = await getRestTimerState(repositories.restTimerRepository, {
    sessionId,
    now,
  });

  return {
    status: 'ready',
    runtime: createWorkoutRuntimeSnapshot(
      session,
      restTimer.status === 'not_found' ? undefined : restTimer.status,
    ),
  };
}

export function createWorkoutRuntimeState(
  session: Extract<
    WorkoutSession,
    { readonly status: 'in_progress' | 'completed' }
  >,
  restTimerStatus?: RestTimerStatus,
): WorkoutRuntimeState {
  const orderedExercises = [...session.sessionExercises].sort(
    (left, right) => left.position - right.position,
  );
  const currentExerciseIndex = findCurrentExerciseIndex(
    orderedExercises,
    session,
  );
  const currentExercise =
    currentExerciseIndex === undefined
      ? undefined
      : orderedExercises[currentExerciseIndex];
  const currentSetNumber = currentExercise
    ? Math.max(
        session.currentSetNumber ?? 1,
        getSessionExerciseNextSetNumber(currentExercise),
      )
    : undefined;
  const completedSetCount = countCompletedSets(orderedExercises);
  const totalTargetSetCount = countTargetSets(orderedExercises);

  return {
    sessionId: session.id,
    status: deriveRuntimeStatus(session, restTimerStatus),
    currentSessionExerciseId: currentExercise?.id,
    currentSetNumber,
    currentSet: currentSetNumber,
    currentExercise,
    currentExerciseIndex,
    orderedExercises,
    completedSetCount,
    totalTargetSetCount,
    completedSets: completedSetCount,
    targetSets: totalTargetSetCount,
    restTimerStatus,
  };
}

export function createWorkoutRuntimeSnapshot(
  session: WorkoutSession,
  restTimerStatus?: RestTimerStatus,
): WorkoutRuntimeSnapshot {
  const orderedExercises = [...session.sessionExercises].sort(
    (left, right) => left.position - right.position,
  );
  const currentExerciseIndex = findCurrentExerciseIndex(
    orderedExercises,
    session,
  );
  const currentExercise =
    currentExerciseIndex === undefined
      ? undefined
      : orderedExercises[currentExerciseIndex];
  const currentSetNumber = currentExercise
    ? Math.max(
        session.currentSetNumber ?? 1,
        getSessionExerciseNextSetNumber(currentExercise),
      )
    : undefined;
  const completedSetCount = countCompletedSets(orderedExercises);
  const totalTargetSetCount = countTargetSets(orderedExercises);

  return {
    sessionId: session.id,
    status: deriveRuntimeDisplayStatus(session, restTimerStatus),
    currentSessionExerciseId: currentExercise?.id,
    currentSetNumber,
    currentSet: currentSetNumber,
    currentExercise,
    currentExerciseIndex,
    orderedExercises,
    completedSetCount,
    totalTargetSetCount,
    completedSets: completedSetCount,
    targetSets: totalTargetSetCount,
    restTimerStatus,
    updatedAt: session.updatedAt,
  };
}

export async function saveRuntimeSnapshot(
  repository: WorkoutRuntimeSnapshotRepository,
  runtime: WorkoutRuntimeSnapshot,
): Promise<WorkoutRuntimeSnapshotSaveResult> {
  if (runtime.status === 'running' || runtime.status === 'paused') {
    try {
      return await repository.save(runtime);
    } catch (error) {
      return createSnapshotPersistFailure(error);
    }
  }

  try {
    await repository.clear(runtime.sessionId);
    return { success: true };
  } catch (error) {
    return createSnapshotPersistFailure(error);
  }
}

export async function restoreRuntimeSnapshot(
  repository: WorkoutRuntimeSnapshotRepository,
  session: WorkoutSession,
  restTimerStatus?: RestTimerStatus,
): Promise<WorkoutRuntimeSnapshot | null> {
  if (session.status !== 'in_progress') {
    return null;
  }

  const snapshot = await repository.load(session.id);

  if (
    !isValidWorkoutRuntimeSnapshot(snapshot) ||
    snapshot.sessionId !== session.id
  ) {
    return null;
  }

  const snapshotUpdatedAt = Date.parse(snapshot.updatedAt);
  const sessionUpdatedAt = Date.parse(session.updatedAt);

  if (
    !Number.isFinite(snapshotUpdatedAt) ||
    !Number.isFinite(sessionUpdatedAt) ||
    snapshotUpdatedAt < sessionUpdatedAt
  ) {
    return null;
  }

  const restoredRuntime = createWorkoutRuntimeSnapshot(
    session,
    restTimerStatus,
  );

  return {
    ...restoredRuntime,
    status:
      restTimerStatus === undefined ? snapshot.status : restoredRuntime.status,
    updatedAt: snapshot.updatedAt,
  };
}

export function pauseWorkoutRuntime(
  runtime: WorkoutRuntimeSnapshot,
): WorkoutRuntimeSnapshot {
  if (runtime.status !== 'running') {
    return runtime;
  }

  assertWorkoutRuntimeStatusTransition(runtime.status, 'paused');
  return { ...runtime, status: 'paused' };
}

export function resumeWorkoutRuntime(
  runtime: WorkoutRuntimeSnapshot,
): WorkoutRuntimeSnapshot {
  if (runtime.status !== 'paused') {
    return runtime;
  }

  assertWorkoutRuntimeStatusTransition(runtime.status, 'running');
  return { ...runtime, status: 'running' };
}

export function canTransitionWorkoutRuntimeStatus(
  currentStatus: WorkoutRuntimeStatus,
  nextStatus: WorkoutRuntimeStatus,
): boolean {
  return ALLOWED_WORKOUT_RUNTIME_TRANSITIONS[currentStatus].includes(
    nextStatus,
  );
}

export function assertWorkoutRuntimeStatusTransition(
  currentStatus: WorkoutRuntimeStatus,
  nextStatus: WorkoutRuntimeStatus,
): void {
  if (!canTransitionWorkoutRuntimeStatus(currentStatus, nextStatus)) {
    throw new WorkoutRuntimeTransitionError(currentStatus, nextStatus);
  }
}

function deriveRuntimeStatus(
  session: Extract<
    WorkoutSession,
    { readonly status: 'in_progress' | 'completed' }
  >,
  restTimerStatus?: RestTimerStatus,
): WorkoutRuntimeStatus {
  if (session.status === 'completed') {
    return 'completed';
  }

  return restTimerStatus === 'paused' ? 'paused' : 'running';
}

function deriveRuntimeDisplayStatus(
  session: WorkoutSession,
  restTimerStatus?: RestTimerStatus,
): WorkoutRuntimeDisplayStatus {
  switch (session.status) {
    case 'draft':
      return 'idle';
    case 'in_progress':
      return restTimerStatus === 'paused' ? 'paused' : 'running';
    case 'completed':
    case 'cancelled':
      return 'completed';
  }
}

function createSnapshotPersistFailure(
  error: unknown,
): WorkoutRuntimeSnapshotSaveResult {
  return {
    success: false,
    reason: 'snapshot_persist_failed',
    error: error instanceof Error ? error : new Error(String(error)),
  };
}

function findCurrentExerciseIndex(
  exercises: readonly SessionExercise[],
  session: WorkoutSession,
): number | undefined {
  if (exercises.length === 0) {
    return undefined;
  }

  if (session.currentSessionExerciseId) {
    const index = exercises.findIndex(
      (exercise) => exercise.id === session.currentSessionExerciseId,
    );

    if (index >= 0) {
      return index;
    }
  }

  return 0;
}

function findCompanionExerciseIndex(
  exercises: readonly SessionExercise[],
  session: WorkoutSession,
): number | undefined {
  if (session.currentSessionExerciseId) {
    const currentIndex = exercises.findIndex(
      (exercise) =>
        exercise.id === session.currentSessionExerciseId &&
        isExecutableCompanionExercise(exercise),
    );

    if (currentIndex >= 0) {
      return currentIndex;
    }
  }

  const firstExecutableIndex = exercises.findIndex(
    isExecutableCompanionExercise,
  );

  return firstExecutableIndex >= 0 ? firstExecutableIndex : undefined;
}

function getCompanionCurrentExercise(
  runtime: WorkoutCompanionRuntimeState,
): SessionExercise {
  const exercise =
    runtime.orderedExercises[runtime.progress.currentExerciseIndex];

  if (!exercise || exercise.sessionId !== runtime.progress.sessionId) {
    throw new WorkoutCompanionRuntimeUnavailableError(
      'Workout Companion current SessionExercise is unavailable.',
    );
  }

  return exercise;
}

function getCompanionTargetReps(exercise: SessionExercise): number {
  return exercise.targetRepsMin === exercise.targetRepsMax
    ? exercise.targetRepsMax
    : exercise.targetRepsMin;
}

function createWorkoutCompanionSetCompletionKey(
  runtime: WorkoutCompanionRuntimeState,
  request: WorkoutCompanionSetCompletionRequest,
): string {
  return [
    request.sessionId,
    request.sessionExerciseId,
    runtime.progress.currentSetIndex,
  ].join(':');
}

function isExecutableCompanionExercise(exercise: SessionExercise): boolean {
  return exercise.isEnabled && !exercise.isSkipped && !exercise.isCompleted;
}

export function getSessionExerciseNextSetNumber(
  exercise: SessionExercise,
): number {
  return (
    Math.max(0, ...exercise.sets.map((workoutSet) => workoutSet.setNumber)) + 1
  );
}

function countCompletedSets(exercises: readonly SessionExercise[]): number {
  return exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.filter((workoutSet) => workoutSet.isCompleted).length,
    0,
  );
}

function countTargetSets(exercises: readonly SessionExercise[]): number {
  return exercises.reduce((total, exercise) => total + exercise.targetSets, 0);
}
