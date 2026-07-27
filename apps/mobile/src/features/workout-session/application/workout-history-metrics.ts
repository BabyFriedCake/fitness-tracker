import type {
  SessionExercise,
  WorkoutSession,
  WorkoutSessionId,
} from '@/domain/workout-session';

export type WorkoutHistorySetMetric = {
  readonly setNumber: number;
  readonly actualReps: number;
  readonly weight: number;
  readonly volume: number;
  readonly completedAt: string;
};

export type WorkoutHistoryExerciseMetric = {
  readonly sessionExerciseId: SessionExercise['id'];
  readonly exerciseName: string;
  readonly completed: boolean;
  readonly skipped: boolean;
  readonly completedSetCount: number;
  readonly totalVolume: number;
  readonly sets: readonly WorkoutHistorySetMetric[];
};

export type WorkoutHistorySessionMetric = {
  readonly sessionId: WorkoutSessionId;
  readonly workoutName: string;
  readonly status: 'completed' | 'cancelled';
  readonly startedAt?: string;
  readonly endedAt: string;
  readonly durationSeconds?: number;
  readonly includedInFormalStatistics: boolean;
  readonly completedExerciseCount: number;
  readonly completedSetCount: number;
  readonly totalVolume: number;
  readonly exercises: readonly WorkoutHistoryExerciseMetric[];
};

export type WorkoutHistoryOverviewMetric = {
  readonly completedSessionCount: number;
  readonly completedSetCount: number;
  readonly totalDurationSeconds: number;
  readonly totalVolume: number;
  readonly volumeTrend:
    | { readonly status: 'insufficient' }
    | {
        readonly status: 'available';
        readonly direction: 'up' | 'down' | 'stable';
        readonly difference: number;
      };
};

export type WorkoutHistoryPersonalRecord =
  | {
      readonly type: 'session_volume';
      readonly sessionId: WorkoutSessionId;
      readonly workoutName: string;
      readonly volume: number;
      readonly achievedAt: string;
    }
  | {
      readonly type: 'exercise_weight';
      readonly sessionId: WorkoutSessionId;
      readonly exerciseName: string;
      readonly weight: number;
      readonly actualReps: number;
      readonly achievedAt: string;
    }
  | {
      readonly type: 'exercise_set_volume';
      readonly sessionId: WorkoutSessionId;
      readonly exerciseName: string;
      readonly volume: number;
      readonly weight: number;
      readonly actualReps: number;
      readonly achievedAt: string;
    };

export type WorkoutHistoryProgressBaseline = {
  readonly overview: WorkoutHistoryOverviewMetric;
  readonly personalRecords: readonly WorkoutHistoryPersonalRecord[];
};

export function createWorkoutHistorySessionMetric(
  session: WorkoutSession,
): WorkoutHistorySessionMetric | null {
  if (session.status !== 'completed' && session.status !== 'cancelled') {
    return null;
  }

  const exercises = session.sessionExercises.map(toExerciseMetric);
  const completedSetCount = exercises.reduce(
    (total, exercise) => total + exercise.completedSetCount,
    0,
  );
  const totalVolume = exercises.reduce(
    (total, exercise) => total + exercise.totalVolume,
    0,
  );

  return {
    sessionId: session.id,
    workoutName: session.workoutNameSnapshot,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSeconds: calculateDurationSeconds(session),
    includedInFormalStatistics: session.status === 'completed',
    completedExerciseCount: session.sessionExercises.filter(
      (exercise) => exercise.isCompleted,
    ).length,
    completedSetCount,
    totalVolume,
    exercises,
  };
}

export function createWorkoutHistoryOverviewMetric(
  metrics: readonly WorkoutHistorySessionMetric[],
): WorkoutHistoryOverviewMetric {
  const formalMetrics = metrics.filter(
    (metric) => metric.includedInFormalStatistics,
  );
  const totals = formalMetrics.reduce<
    Omit<WorkoutHistoryOverviewMetric, 'volumeTrend'>
  >(
    (overview, metric) => ({
      completedSessionCount: overview.completedSessionCount + 1,
      completedSetCount: overview.completedSetCount + metric.completedSetCount,
      totalDurationSeconds:
        overview.totalDurationSeconds + (metric.durationSeconds ?? 0),
      totalVolume: overview.totalVolume + metric.totalVolume,
    }),
    {
      completedSessionCount: 0,
      completedSetCount: 0,
      totalDurationSeconds: 0,
      totalVolume: 0,
    },
  );
  const [latest, previous] = [...formalMetrics].sort(compareSessionMetrics);
  const difference =
    latest && previous ? latest.totalVolume - previous.totalVolume : undefined;

  return {
    ...totals,
    volumeTrend:
      difference === undefined
        ? { status: 'insufficient' }
        : {
            status: 'available',
            direction:
              difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
            difference,
          },
  };
}

export function createWorkoutHistoryProgressBaseline(
  metrics: readonly WorkoutHistorySessionMetric[],
): WorkoutHistoryProgressBaseline {
  return {
    overview: createWorkoutHistoryOverviewMetric(metrics),
    personalRecords: createWorkoutHistoryPersonalRecords(metrics),
  };
}

function toExerciseMetric(
  exercise: SessionExercise,
): WorkoutHistoryExerciseMetric {
  const sets = exercise.sets
    .filter((workoutSet) => workoutSet.isCompleted)
    .map((workoutSet) => ({
      setNumber: workoutSet.setNumber,
      actualReps: workoutSet.actualReps,
      weight: workoutSet.weight,
      volume: workoutSet.weight * workoutSet.actualReps,
      completedAt: workoutSet.completedAt,
    }));

  return {
    sessionExerciseId: exercise.id,
    exerciseName: exercise.exerciseNameSnapshot,
    completed: exercise.isCompleted,
    skipped: exercise.isSkipped,
    completedSetCount: sets.length,
    totalVolume: sets.reduce(
      (total, workoutSet) => total + workoutSet.volume,
      0,
    ),
    sets,
  };
}

function calculateDurationSeconds(
  session: Extract<
    WorkoutSession,
    { readonly status: 'completed' | 'cancelled' }
  >,
): number | undefined {
  if (!session.startedAt) {
    return undefined;
  }

  const startedAt = Date.parse(session.startedAt);
  const endedAt = Date.parse(session.endedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
    return undefined;
  }

  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

function compareSessionMetrics(
  first: WorkoutHistorySessionMetric,
  second: WorkoutHistorySessionMetric,
): number {
  const endedAtDifference =
    Date.parse(second.endedAt) - Date.parse(first.endedAt);

  if (endedAtDifference !== 0) {
    return endedAtDifference;
  }

  return first.sessionId.localeCompare(second.sessionId);
}

function createWorkoutHistoryPersonalRecords(
  metrics: readonly WorkoutHistorySessionMetric[],
): readonly WorkoutHistoryPersonalRecord[] {
  const formalMetrics = metrics.filter(
    (metric) => metric.includedInFormalStatistics,
  );
  const sessionVolumeRecord =
    formalMetrics.reduce<WorkoutHistoryPersonalRecord | null>(
      (record, metric) => {
        if (metric.totalVolume <= 0) {
          return record;
        }

        if (
          record?.type === 'session_volume' &&
          record.volume >= metric.totalVolume
        ) {
          return record;
        }

        return {
          type: 'session_volume',
          sessionId: metric.sessionId,
          workoutName: metric.workoutName,
          volume: metric.totalVolume,
          achievedAt: metric.endedAt,
        };
      },
      null,
    );
  const exerciseWeightRecord = createExerciseRecord(formalMetrics, 'weight');
  const exerciseSetVolumeRecord = createExerciseRecord(
    formalMetrics,
    'set_volume',
  );

  return [
    sessionVolumeRecord,
    exerciseWeightRecord,
    exerciseSetVolumeRecord,
  ].filter((record): record is WorkoutHistoryPersonalRecord => record !== null);
}

function createExerciseRecord(
  metrics: readonly WorkoutHistorySessionMetric[],
  type: 'weight' | 'set_volume',
): WorkoutHistoryPersonalRecord | null {
  let record: WorkoutHistoryPersonalRecord | null = null;

  for (const metric of metrics) {
    for (const exercise of metric.exercises) {
      for (const workoutSet of exercise.sets) {
        if (workoutSet.actualReps <= 0) {
          continue;
        }

        if (type === 'weight') {
          if (
            record?.type === 'exercise_weight' &&
            record.weight >= workoutSet.weight
          ) {
            continue;
          }

          record = {
            type: 'exercise_weight',
            sessionId: metric.sessionId,
            exerciseName: exercise.exerciseName,
            weight: workoutSet.weight,
            actualReps: workoutSet.actualReps,
            achievedAt: workoutSet.completedAt,
          };
        } else {
          if (
            record?.type === 'exercise_set_volume' &&
            record.volume >= workoutSet.volume
          ) {
            continue;
          }

          record = {
            type: 'exercise_set_volume',
            sessionId: metric.sessionId,
            exerciseName: exercise.exerciseName,
            volume: workoutSet.volume,
            weight: workoutSet.weight,
            actualReps: workoutSet.actualReps,
            achievedAt: workoutSet.completedAt,
          };
        }
      }
    }
  }

  return record;
}
