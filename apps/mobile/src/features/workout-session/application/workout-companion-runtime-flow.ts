import type {
  InProgressWorkoutSession,
  SessionExercise,
  WorkoutSessionRepository,
  WorkoutSet,
} from '@/domain/workout-session';

import {
  completeSessionExercise,
  recordWorkoutSet,
} from './workout-session-execution';
import {
  createExerciseCompletedFeedbackEvent,
  createSetCompletedFeedbackEvent,
  type ExerciseCompletedFeedbackEvent,
  type RepCompletedFeedbackEvent,
  type SetCompletedFeedbackEvent,
} from './workout-feedback-events';
import {
  beginWorkoutCompanionSetCompletion,
  finishWorkoutCompanionSetCompletion,
  getSessionExerciseNextSetNumber,
  onWorkoutCompanionRepCompleted,
  type WorkoutCompanionRuntimeState,
} from './workout-runtime-engine';

export type WorkoutCompanionRepFlowOptions = {
  readonly weight: number;
  readonly completedAt: string;
  readonly createWorkoutSetId: () => string;
};

export type WorkoutCompanionRepFlowResult =
  | {
      readonly status: 'ignored';
      readonly runtime: WorkoutCompanionRuntimeState;
      readonly events: readonly [];
    }
  | {
      readonly status: 'rep_completed';
      readonly runtime: WorkoutCompanionRuntimeState;
      readonly events: readonly [RepCompletedFeedbackEvent];
    }
  | {
      readonly status: 'set_completed';
      readonly runtime: WorkoutCompanionRuntimeState;
      readonly session: InProgressWorkoutSession;
      readonly workoutSet: WorkoutSet;
      readonly events: readonly [
        RepCompletedFeedbackEvent,
        SetCompletedFeedbackEvent,
      ];
      readonly exerciseCompletionRequired: boolean;
    };

export type WorkoutCompanionExerciseFlowResult = {
  readonly runtime: WorkoutCompanionRuntimeState;
  readonly session: InProgressWorkoutSession;
  readonly event: ExerciseCompletedFeedbackEvent;
};

export class PersistedWorkoutSetNotFoundError extends Error {
  constructor(readonly workoutSetId: string) {
    super(`Persisted WorkoutSet was not returned: ${workoutSetId}.`);
    this.name = 'PersistedWorkoutSetNotFoundError';
  }
}

export class WorkoutCompanionExerciseNotReadyError extends Error {
  constructor(readonly sessionExerciseId: SessionExercise['id']) {
    super(
      `SessionExercise has not persisted all target sets: ${sessionExerciseId}.`,
    );
    this.name = 'WorkoutCompanionExerciseNotReadyError';
  }
}

export async function onWorkoutCompanionRep(
  repository: WorkoutSessionRepository,
  runtime: WorkoutCompanionRuntimeState,
  options: WorkoutCompanionRepFlowOptions,
): Promise<WorkoutCompanionRepFlowResult> {
  const repResult = onWorkoutCompanionRepCompleted(runtime);

  if (!repResult.event) {
    return { status: 'ignored', runtime: repResult.runtime, events: [] };
  }

  if (!repResult.setCompletionRequest) {
    return {
      status: 'rep_completed',
      runtime: repResult.runtime,
      events: [repResult.event],
    };
  }

  const completionRequest = repResult.setCompletionRequest;

  if (
    !beginWorkoutCompanionSetCompletion(repResult.runtime, completionRequest)
  ) {
    return { status: 'ignored', runtime: repResult.runtime, events: [] };
  }

  try {
    const workoutSetId = options.createWorkoutSetId();
    const session = await recordWorkoutSet(
      repository,
      {
        ...completionRequest,
        weight: options.weight,
        completedAt: options.completedAt,
      },
      { createWorkoutSetId: () => workoutSetId },
    );
    const exercise = findSessionExercise(
      session,
      completionRequest.sessionExerciseId,
    );
    const workoutSet = exercise.sets.find(
      (candidate) => candidate.id === workoutSetId,
    );

    if (!workoutSet) {
      throw new PersistedWorkoutSetNotFoundError(workoutSetId);
    }

    return {
      status: 'set_completed',
      runtime: advanceAfterPersistedSet(repResult.runtime, exercise),
      session,
      workoutSet,
      events: [
        repResult.event,
        createSetCompletedFeedbackEvent({
          sessionId: session.id,
          exercise,
          workoutSet,
        }),
      ],
      exerciseCompletionRequired: hasCompletedTargetSets(exercise),
    };
  } finally {
    finishWorkoutCompanionSetCompletion(repResult.runtime, completionRequest);
  }
}

export async function completeWorkoutCompanionExercise(
  repository: WorkoutSessionRepository,
  runtime: WorkoutCompanionRuntimeState,
  now: string,
): Promise<WorkoutCompanionExerciseFlowResult> {
  const exercise = getCurrentExercise(runtime);

  if (
    runtime.phase !== 'exercise_completion_pending' ||
    !hasCompletedTargetSets(exercise)
  ) {
    throw new WorkoutCompanionExerciseNotReadyError(exercise.id);
  }

  const session = await completeSessionExercise(
    repository,
    {
      sessionId: runtime.progress.sessionId,
      sessionExerciseId: exercise.id,
    },
    { now: () => now },
  );
  const completedExercise = findSessionExercise(session, exercise.id);

  return {
    runtime: advanceAfterCompletedExercise(runtime, session),
    session,
    event: createExerciseCompletedFeedbackEvent({
      sessionId: session.id,
      exercise: completedExercise,
    }),
  };
}

function advanceAfterPersistedSet(
  runtime: WorkoutCompanionRuntimeState,
  exercise: SessionExercise,
): WorkoutCompanionRuntimeState {
  const exerciseCompletionRequired = hasCompletedTargetSets(exercise);

  return {
    ...runtime,
    phase: exerciseCompletionRequired
      ? 'exercise_completion_pending'
      : 'resting',
    orderedExercises: runtime.orderedExercises.map((candidate) =>
      candidate.id === exercise.id ? exercise : candidate,
    ),
    progress: {
      ...runtime.progress,
      currentSetIndex: exerciseCompletionRequired
        ? runtime.progress.currentSetIndex
        : runtime.progress.currentSetIndex + 1,
      completedReps: 0,
    },
  };
}

function advanceAfterCompletedExercise(
  runtime: WorkoutCompanionRuntimeState,
  session: InProgressWorkoutSession,
): WorkoutCompanionRuntimeState {
  const orderedExercises = [...session.sessionExercises].sort(
    (left, right) => left.position - right.position,
  );
  const nextExerciseIndex = orderedExercises.findIndex(
    (exercise, index) =>
      index > runtime.progress.currentExerciseIndex &&
      exercise.isEnabled &&
      !exercise.isSkipped &&
      !exercise.isCompleted,
  );

  if (nextExerciseIndex < 0) {
    return {
      ...runtime,
      phase: 'completed',
      orderedExercises,
      progress: { ...runtime.progress, completedReps: 0 },
    };
  }

  const nextExercise = orderedExercises[nextExerciseIndex];

  return {
    phase: 'running',
    orderedExercises,
    instance: runtime.instance,
    progress: {
      sessionId: session.id,
      currentExerciseIndex: nextExerciseIndex,
      currentSetIndex: getSessionExerciseNextSetNumber(nextExercise) - 1,
      completedReps: 0,
    },
  };
}

function getCurrentExercise(
  runtime: WorkoutCompanionRuntimeState,
): SessionExercise {
  const exercise =
    runtime.orderedExercises[runtime.progress.currentExerciseIndex];

  if (!exercise) {
    throw new Error('Workout Companion current exercise is unavailable.');
  }

  return exercise;
}

function findSessionExercise(
  session: InProgressWorkoutSession,
  exerciseId: SessionExercise['id'],
): SessionExercise {
  const exercise = session.sessionExercises.find(
    (candidate) => candidate.id === exerciseId,
  );

  if (!exercise) {
    throw new Error(`SessionExercise was not returned: ${exerciseId}.`);
  }

  return exercise;
}

function hasCompletedTargetSets(exercise: SessionExercise): boolean {
  return (
    exercise.sets.filter((workoutSet) => workoutSet.isCompleted).length >=
    exercise.targetSets
  );
}
