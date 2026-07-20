import type {
  RestTimerRepository,
  RestTimerStatus,
  SessionExercise,
  SessionExerciseId,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { getRestTimerState } from './workout-session-rest-timer';

export type WorkoutRuntimeStatus = 'running' | 'paused' | 'completed';
export type WorkoutRuntimeDisplayStatus = 'idle' | WorkoutRuntimeStatus;

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
