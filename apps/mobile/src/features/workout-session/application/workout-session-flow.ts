import type { ExerciseId } from '@/domain/exercise';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import {
  assertWorkoutSessionStatusTransition,
  cancelWorkoutSession,
  completeWorkoutSession,
  startWorkoutSession,
  type CancelledWorkoutSession,
  type CompletedWorkoutSession,
  type DraftWorkoutSession,
  type InProgressWorkoutSession,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionDailyStatus,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
} from '@/domain/workout-session';

export type CreateWorkoutSessionExerciseInput = {
  readonly sourceExerciseId: ExerciseId;
  readonly exerciseNameSnapshot: string;
  readonly position: number;
  readonly targetSets: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly currentRestSeconds: number;
};

export type CreateWorkoutSessionInput = {
  readonly sourceTemplateId?: WorkoutTemplateId;
  readonly workoutNameSnapshot: string;
  readonly exercises: readonly CreateWorkoutSessionExerciseInput[];
  readonly dailyStatus?: WorkoutSessionDailyStatus;
  readonly notes?: string;
};

export type WorkoutSessionIdKind = 'session' | 'sessionExercise';

export type CreateWorkoutSessionOptions = {
  readonly now: () => string;
  readonly createId: (kind: WorkoutSessionIdKind) => string;
};

export class InvalidWorkoutSessionCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWorkoutSessionCreationError';
  }
}

export class WorkoutSessionApplicationNotFoundError extends Error {
  constructor(readonly sessionId: WorkoutSessionId) {
    super(`WorkoutSession not found: ${sessionId}.`);
    this.name = 'WorkoutSessionApplicationNotFoundError';
  }
}

export class ActiveWorkoutSessionExistsError extends Error {
  constructor(readonly activeSessionId: WorkoutSessionId) {
    super(`An active WorkoutSession already exists: ${activeSessionId}.`);
    this.name = 'ActiveWorkoutSessionExistsError';
  }
}

export async function createSession(
  repository: WorkoutSessionRepository,
  input: CreateWorkoutSessionInput,
  options: CreateWorkoutSessionOptions,
): Promise<DraftWorkoutSession> {
  assertValidCreateWorkoutSessionInput(input);

  const sessionId = requireGeneratedId(
    options.createId('session'),
    'session',
  ) as WorkoutSessionId;
  const timestamp = options.now();
  const sessionExercises = input.exercises.map((exercise): SessionExercise => ({
    id: requireGeneratedId(
      options.createId('sessionExercise'),
      'sessionExercise',
    ) as SessionExerciseId,
    sessionId,
    sourceExerciseId: exercise.sourceExerciseId,
    exerciseNameSnapshot: exercise.exerciseNameSnapshot,
    position: exercise.position,
    isEnabled: true,
    isSkipped: false,
    isCompleted: false,
    targetSets: exercise.targetSets,
    targetRepsMin: exercise.targetRepsMin,
    targetRepsMax: exercise.targetRepsMax,
    currentRestSeconds: exercise.currentRestSeconds,
    sets: [],
  }));
  const session: DraftWorkoutSession = {
    id: sessionId,
    sourceTemplateId: input.sourceTemplateId,
    workoutNameSnapshot: input.workoutNameSnapshot,
    status: 'draft',
    sessionExercises,
    dailyStatus: input.dailyStatus,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await repository.save(session);

  return session;
}

export async function startSession(
  repository: WorkoutSessionRepository,
  sessionId: WorkoutSessionId,
  startedAt: string,
): Promise<InProgressWorkoutSession> {
  const session = await requireWorkoutSession(repository, sessionId);

  if (session.status !== 'draft') {
    rejectInvalidTransition(session, 'in_progress');
  }

  const startedSession = startWorkoutSession(session, startedAt);
  const persistenceResult = await repository.startIfNoActiveSession(
    startedSession,
    session.updatedAt,
  );

  if (persistenceResult.status === 'active_session_exists') {
    throw new ActiveWorkoutSessionExistsError(
      persistenceResult.activeSessionId,
    );
  }

  return startedSession;
}

export async function completeSession(
  repository: WorkoutSessionRepository,
  sessionId: WorkoutSessionId,
  endedAt: string,
): Promise<CompletedWorkoutSession> {
  const session = await requireWorkoutSession(repository, sessionId);

  if (session.status !== 'in_progress') {
    rejectInvalidTransition(session, 'completed');
  }

  const completedSession = completeWorkoutSession(session, endedAt);
  await repository.update(completedSession);

  return completedSession;
}

export async function cancelSession(
  repository: WorkoutSessionRepository,
  sessionId: WorkoutSessionId,
  endedAt: string,
): Promise<CancelledWorkoutSession> {
  const session = await requireWorkoutSession(repository, sessionId);

  if (session.status !== 'draft' && session.status !== 'in_progress') {
    rejectInvalidTransition(session, 'cancelled');
  }

  const cancelledSession = cancelWorkoutSession(session, endedAt);
  await repository.update(cancelledSession);

  return cancelledSession;
}

async function requireWorkoutSession(
  repository: WorkoutSessionRepository,
  sessionId: WorkoutSessionId,
): Promise<WorkoutSession> {
  const session = await repository.findById(sessionId);

  if (!session) {
    throw new WorkoutSessionApplicationNotFoundError(sessionId);
  }

  return session;
}

function rejectInvalidTransition(
  session: WorkoutSession,
  nextStatus: WorkoutSession['status'],
): never {
  assertWorkoutSessionStatusTransition(session.status, nextStatus);
  throw new Error('Expected the Domain transition validation to reject.');
}

function assertValidCreateWorkoutSessionInput(
  input: CreateWorkoutSessionInput,
): void {
  if (!input.workoutNameSnapshot.trim()) {
    throw new InvalidWorkoutSessionCreationError(
      'WorkoutSession name snapshot is required.',
    );
  }

  if (input.exercises.length === 0) {
    throw new InvalidWorkoutSessionCreationError(
      'WorkoutSession requires at least one exercise.',
    );
  }

  input.exercises.forEach((exercise, index) => {
    if (!exercise.exerciseNameSnapshot.trim()) {
      throw new InvalidWorkoutSessionCreationError(
        `SessionExercise at position ${exercise.position} requires a name snapshot.`,
      );
    }

    if (exercise.position !== index + 1) {
      throw new InvalidWorkoutSessionCreationError(
        'SessionExercise positions must be contiguous and match input order.',
      );
    }

    if (!isPositiveInteger(exercise.targetSets)) {
      throw new InvalidWorkoutSessionCreationError(
        'SessionExercise targetSets must be a positive integer.',
      );
    }

    if (
      !isPositiveInteger(exercise.targetRepsMin) ||
      !isPositiveInteger(exercise.targetRepsMax) ||
      exercise.targetRepsMin > exercise.targetRepsMax
    ) {
      throw new InvalidWorkoutSessionCreationError(
        'SessionExercise target reps must be a valid positive range.',
      );
    }

    if (!isNonNegativeInteger(exercise.currentRestSeconds)) {
      throw new InvalidWorkoutSessionCreationError(
        'SessionExercise rest seconds must be a non-negative integer.',
      );
    }
  });
}

function requireGeneratedId(value: string, kind: WorkoutSessionIdKind): string {
  if (!value.trim()) {
    throw new InvalidWorkoutSessionCreationError(
      `Generated ${kind} ID must not be empty.`,
    );
  }

  return value;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
