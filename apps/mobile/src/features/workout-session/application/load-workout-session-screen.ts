import type {
  RestTimerRepository,
  SessionExercise,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { getRestTimerState } from './workout-session-rest-timer';

export type WorkoutSessionTimerDisplayStatus =
  'running' | 'paused' | 'completed';

export type WorkoutSessionScreenData = {
  readonly session: WorkoutSession;
  readonly orderedExercises: readonly SessionExercise[];
  readonly currentExercise?: SessionExercise;
  readonly currentExerciseIndex?: number;
  readonly currentSetNumber?: number;
  readonly completedSetCount: number;
  readonly totalTargetSetCount: number;
  readonly restTimerStatus?: WorkoutSessionTimerDisplayStatus;
};

export type WorkoutSessionScreenRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly restTimerRepository: RestTimerRepository;
};

export type LoadWorkoutSessionScreenResult =
  | {
      readonly status: 'ready';
      readonly data: WorkoutSessionScreenData;
    }
  | {
      readonly status: 'not_found';
    };

export async function loadWorkoutSessionScreen(
  repositories: WorkoutSessionScreenRepositories,
  sessionId: WorkoutSessionId,
  now: string,
): Promise<LoadWorkoutSessionScreenResult> {
  const session =
    await repositories.workoutSessionRepository.findById(sessionId);

  if (!session) {
    return { status: 'not_found' };
  }

  const restTimer = await getRestTimerState(repositories.restTimerRepository, {
    sessionId,
    now,
  });
  const restTimerStatus = isDisplayableTimerStatus(restTimer.status)
    ? restTimer.status
    : undefined;

  return {
    status: 'ready',
    data: createWorkoutSessionScreenData(session, restTimerStatus),
  };
}

export function createWorkoutSessionScreenData(
  session: WorkoutSession,
  restTimerStatus?: WorkoutSessionTimerDisplayStatus,
): WorkoutSessionScreenData {
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
  const completedSetCount = orderedExercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.filter((workoutSet) => workoutSet.isCompleted).length,
    0,
  );
  const totalTargetSetCount = orderedExercises.reduce(
    (total, exercise) => total + exercise.targetSets,
    0,
  );

  return {
    session,
    orderedExercises,
    currentExercise,
    currentExerciseIndex,
    currentSetNumber: currentExercise
      ? Math.max(
          session.currentSetNumber ?? 1,
          getSessionExerciseNextSetNumber(currentExercise),
        )
      : undefined,
    completedSetCount,
    totalTargetSetCount,
    restTimerStatus,
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

export function getSessionExerciseNextSetNumber(
  exercise: SessionExercise,
): number {
  return (
    Math.max(0, ...exercise.sets.map((workoutSet) => workoutSet.setNumber)) + 1
  );
}

function isDisplayableTimerStatus(
  status: string,
): status is WorkoutSessionTimerDisplayStatus {
  return status === 'running' || status === 'paused' || status === 'completed';
}
