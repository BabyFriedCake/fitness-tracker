import type {
  RestTimerRepository,
  RestTimerStatus,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';
import type { ExerciseRepository } from '@/domain/exercise';

import { getRestTimerState } from './workout-session-rest-timer';
import {
  createWorkoutRuntimeSnapshot,
  restoreRuntimeSnapshot,
  type WorkoutRuntimeSnapshot,
} from './workout-runtime-engine';
import type { WorkoutRuntimeSnapshotRepository } from './workout-runtime-snapshot-repository';

export type WorkoutSessionTimerDisplayStatus =
  'running' | 'paused' | 'completed';

export type WorkoutSessionScreenData = {
  readonly session: WorkoutSession;
  readonly restTimerStatus?: WorkoutSessionTimerDisplayStatus;
  readonly restRemainingSeconds?: number;
  readonly exerciseImageUriBySessionExerciseId?: Readonly<
    Record<string, string | undefined>
  >;
};

export type WorkoutSessionScreenRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly restTimerRepository: RestTimerRepository;
  readonly workoutRuntimeSnapshotRepository: WorkoutRuntimeSnapshotRepository;
  readonly exerciseRepository?: ExerciseRepository;
};

export type LoadWorkoutSessionScreenResult =
  | {
      readonly status: 'ready';
      readonly data: WorkoutSessionScreenData;
      readonly runtime: WorkoutRuntimeSnapshot;
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
  const persistedRestTimerStatus = isPersistedTimerStatus(restTimer.status)
    ? restTimer.status
    : undefined;
  const restTimerStatus = isDisplayableTimerStatus(restTimer.status)
    ? restTimer.status
    : undefined;
  const runtime = await restoreRuntimeSnapshot(
    repositories.workoutRuntimeSnapshotRepository,
    session,
    persistedRestTimerStatus,
  );
  const nextRuntime =
    runtime ?? createWorkoutRuntimeSnapshot(session, persistedRestTimerStatus);
  const exerciseImageUriBySessionExerciseId = repositories.exerciseRepository
    ? await loadExerciseImageUriBySessionExerciseId(
        repositories.exerciseRepository,
        session,
      )
    : {};

  if (session.status !== 'in_progress') {
    await repositories.workoutRuntimeSnapshotRepository.clear(session.id);
  }

  return {
    status: 'ready',
    data: createWorkoutSessionScreenData(
      session,
      restTimerStatus,
      restTimer.status === 'not_found' ? undefined : restTimer.remainingSeconds,
      exerciseImageUriBySessionExerciseId,
    ),
    runtime: nextRuntime,
  };
}

export function createWorkoutSessionScreenData(
  session: WorkoutSession,
  restTimerStatus?: WorkoutSessionTimerDisplayStatus,
  restRemainingSeconds?: number,
  exerciseImageUriBySessionExerciseId: Readonly<
    Record<string, string | undefined>
  > = {},
): WorkoutSessionScreenData {
  return {
    session,
    restTimerStatus,
    restRemainingSeconds,
    exerciseImageUriBySessionExerciseId,
  };
}

async function loadExerciseImageUriBySessionExerciseId(
  exerciseRepository: ExerciseRepository,
  session: WorkoutSession,
): Promise<Readonly<Record<string, string | undefined>>> {
  const sourceExerciseIds = [
    ...new Set(
      session.sessionExercises.map(
        (sessionExercise) => sessionExercise.sourceExerciseId,
      ),
    ),
  ];

  if (sourceExerciseIds.length === 0) {
    return {};
  }

  const exercises =
    await exerciseRepository.getSelectedByIds(sourceExerciseIds);
  const imageUriByExerciseId = new Map(
    exercises.map((exercise) => [exercise.id, exercise.imageUri] as const),
  );
  const exerciseImageUriBySessionExerciseId: Record<
    string,
    string | undefined
  > = {};

  for (const sessionExercise of session.sessionExercises) {
    exerciseImageUriBySessionExerciseId[sessionExercise.id] =
      imageUriByExerciseId.get(sessionExercise.sourceExerciseId);
  }

  return exerciseImageUriBySessionExerciseId;
}

function isDisplayableTimerStatus(
  status: string,
): status is WorkoutSessionTimerDisplayStatus {
  return status === 'running' || status === 'paused' || status === 'completed';
}

function isPersistedTimerStatus(status: string): status is RestTimerStatus {
  return (
    status === 'running' ||
    status === 'paused' ||
    status === 'completed' ||
    status === 'skipped' ||
    status === 'cancelled'
  );
}
