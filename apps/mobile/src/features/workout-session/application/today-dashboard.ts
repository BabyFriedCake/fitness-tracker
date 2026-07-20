import type { Exercise, ExerciseRepository } from '@/domain/exercise';
import {
  assertWorkoutTemplateCanStart,
  type WorkoutTemplate,
  type WorkoutTemplateId,
  type WorkoutTemplateRepository,
} from '@/domain/workout-template';
import type {
  DraftWorkoutSession,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import {
  createSession,
  type CreateWorkoutSessionInput,
  type WorkoutSessionIdKind,
} from './workout-session-flow';

export type TodayDashboardTemplateItem = {
  readonly id: WorkoutTemplateId;
  readonly name: string;
  readonly exerciseCount: number;
  readonly totalTargetSets: number;
};

export type TodayDashboardSessionEntry =
  | { readonly status: 'none' }
  | {
      readonly status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
      readonly sessionId: WorkoutSessionId;
      readonly workoutName: string;
      readonly completedSetCount: number;
      readonly totalTargetSetCount: number;
    };

export type TodayDashboardData = {
  readonly sessionEntry: TodayDashboardSessionEntry;
  readonly templates: readonly TodayDashboardTemplateItem[];
};

export type LoadTodayDashboardResult =
  | { readonly status: 'ready'; readonly data: TodayDashboardData }
  | { readonly status: 'error'; readonly message: string };

export type TodayDashboardRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly workoutTemplateRepository: WorkoutTemplateRepository;
  readonly exerciseRepository: ExerciseRepository;
};

export type CreateWorkoutSessionFromTemplateResult =
  | {
      readonly status: 'created';
      readonly session: DraftWorkoutSession;
    }
  | {
      readonly status: 'existing_session';
      readonly sessionId: WorkoutSessionId;
      readonly sessionStatus: 'draft' | 'in_progress';
    }
  | {
      readonly status: 'template_not_found';
    };

export class WorkoutSessionTemplateSnapshotError extends Error {
  constructor(readonly templateId: WorkoutTemplateId) {
    super(
      `WorkoutTemplate cannot create a complete WorkoutSession snapshot: ${templateId}.`,
    );
    this.name = 'WorkoutSessionTemplateSnapshotError';
  }
}

const TODAY_DASHBOARD_ERROR_MESSAGE =
  '今日训练加载失败。已保存的训练数据不会丢失，请重试。';

export async function loadTodayDashboard(
  repositories: TodayDashboardRepositories,
): Promise<LoadTodayDashboardResult> {
  try {
    const [recoverableSession, templates] = await Promise.all([
      repositories.workoutSessionRepository.findRecoverableSession(),
      repositories.workoutTemplateRepository.list({
        filters: { statuses: ['active'] },
      }),
    ]);
    const session =
      recoverableSession ??
      (await repositories.workoutSessionRepository.findLatestSession());

    return {
      status: 'ready',
      data: {
        sessionEntry: session
          ? toTodayDashboardSessionEntry(session)
          : { status: 'none' },
        templates: templates.map(toTodayDashboardTemplateItem),
      },
    };
  } catch {
    return { status: 'error', message: TODAY_DASHBOARD_ERROR_MESSAGE };
  }
}

export async function createWorkoutSessionFromTemplate(
  repositories: TodayDashboardRepositories,
  templateId: WorkoutTemplateId,
  options: {
    readonly now: () => string;
    readonly createId: (kind: WorkoutSessionIdKind) => string;
  },
): Promise<CreateWorkoutSessionFromTemplateResult> {
  const existingSession =
    await repositories.workoutSessionRepository.findRecoverableSession();

  if (
    existingSession?.status === 'draft' ||
    existingSession?.status === 'in_progress'
  ) {
    return {
      status: 'existing_session',
      sessionId: existingSession.id,
      sessionStatus: existingSession.status,
    };
  }

  const template =
    await repositories.workoutTemplateRepository.getById(templateId);

  if (!template) {
    return { status: 'template_not_found' };
  }

  assertWorkoutTemplateCanStart(template);

  const input = await toCreateWorkoutSessionInput(
    repositories.exerciseRepository,
    template,
  );
  const session = await createSession(
    repositories.workoutSessionRepository,
    input,
    options,
  );

  return { status: 'created', session };
}

async function toCreateWorkoutSessionInput(
  exerciseRepository: ExerciseRepository,
  template: WorkoutTemplate,
): Promise<CreateWorkoutSessionInput> {
  const exercises = await Promise.all(
    template.exercises.map(async (templateExercise) => {
      const exercise = await exerciseRepository.getById(
        templateExercise.exerciseId,
      );

      if (!exercise) {
        throw new WorkoutSessionTemplateSnapshotError(template.id);
      }

      return {
        sourceExerciseId: exercise.id,
        exerciseNameSnapshot: getExerciseSnapshotName(exercise),
        position: templateExercise.position,
        targetSets: templateExercise.targetSets,
        targetRepsMin: templateExercise.targetReps.min,
        targetRepsMax: templateExercise.targetReps.max,
        currentRestSeconds: templateExercise.restSeconds,
      };
    }),
  );

  return {
    sourceTemplateId: template.id,
    workoutNameSnapshot: template.name,
    exercises,
  };
}

function getExerciseSnapshotName(exercise: Exercise): string {
  return exercise.nameZh || exercise.nameEn || exercise.slug;
}

function toTodayDashboardTemplateItem(
  template: WorkoutTemplate,
): TodayDashboardTemplateItem {
  return {
    id: template.id,
    name: template.name,
    exerciseCount: template.exercises.length,
    totalTargetSets: template.exercises.reduce(
      (total, exercise) => total + exercise.targetSets,
      0,
    ),
  };
}

function toTodayDashboardSessionEntry(
  session: WorkoutSession,
): TodayDashboardSessionEntry {
  const completedSetCount = session.sessionExercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.filter((workoutSet) => workoutSet.isCompleted).length,
    0,
  );
  const totalTargetSetCount = session.sessionExercises.reduce(
    (total, exercise) => total + exercise.targetSets,
    0,
  );

  return {
    status: session.status,
    sessionId: session.id,
    workoutName: session.workoutNameSnapshot,
    completedSetCount,
    totalTargetSetCount,
  };
}
