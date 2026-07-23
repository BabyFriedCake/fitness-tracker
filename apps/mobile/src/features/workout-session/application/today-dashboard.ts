import type { Exercise, ExerciseRepository } from '@/domain/exercise';
import type {
  DailyStatusRepository,
  DailyStatusValue,
} from '@/domain/daily-status';
import {
  TodayWorkoutPlanDuplicateTemplateError,
  type TodayWorkoutPlan,
  type TodayWorkoutPlanId,
  type TodayWorkoutPlanRepository,
  type TodayWorkoutPlanStatus,
} from '@/domain/today-workout-plan';
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

export type TodayDashboardPlanItem = {
  readonly id: TodayWorkoutPlanId;
  readonly templateId: WorkoutTemplateId;
  readonly sessionId?: WorkoutSessionId;
  readonly name: string;
  readonly status: TodayWorkoutPlanStatus;
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
  readonly todayPlans: readonly TodayDashboardPlanItem[];
  readonly templates: readonly TodayDashboardTemplateItem[];
  readonly dailyStatus?: DailyStatusValue;
  readonly recentWorkout?: TodayDashboardRecentWorkout;
  readonly weeklySummary?: TodayDashboardWeeklySummary;
  readonly recommendation?: TodayDashboardRecommendation;
};

export type TodayDashboardRecentWorkout = {
  readonly sessionId: WorkoutSessionId;
  readonly workoutName: string;
  readonly endedAt: string;
  readonly completedSetCount: number;
  readonly totalVolume: number;
};

export type TodayDashboardWeeklySummary = {
  readonly completedWorkoutCount: number;
  readonly completedSetCount: number;
  readonly totalVolume: number;
};

export type TodayDashboardRecommendation = {
  readonly title: string;
  readonly message: string;
};

export type LoadTodayDashboardResult =
  | { readonly status: 'ready'; readonly data: TodayDashboardData }
  | { readonly status: 'error'; readonly message: string };

export type TodayDashboardRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly workoutTemplateRepository: WorkoutTemplateRepository;
  readonly todayWorkoutPlanRepository: TodayWorkoutPlanRepository;
  readonly exerciseRepository: ExerciseRepository;
  readonly dailyStatusRepository: DailyStatusRepository;
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

export type AddTodayPlanFromTemplateResult =
  | {
      readonly status: 'added';
      readonly plan: TodayWorkoutPlan;
    }
  | {
      readonly status: 'duplicate_template';
    }
  | {
      readonly status: 'template_not_found';
    };

export type StartTodayPlanResult =
  | {
      readonly status: 'ready';
      readonly sessionId: WorkoutSessionId;
    }
  | {
      readonly status: 'completed';
    }
  | {
      readonly status: 'plan_not_found';
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
  now = new Date(),
): Promise<LoadTodayDashboardResult> {
  try {
    const localDate = toLocalDateKey(now);
    const [recoverableSession, templates, plans] = await Promise.all([
      repositories.workoutSessionRepository.findRecoverableSession(),
      repositories.workoutTemplateRepository.list({
        filters: { statuses: ['active'] },
      }),
      repositories.todayWorkoutPlanRepository.listByDate(localDate),
    ]);
    const supplementalData = await loadTodaySupplementalData(
      repositories,
      localDate,
    );
    const { completedSessions, dailyStatus } = supplementalData;
    const session =
      recoverableSession ??
      (await repositories.workoutSessionRepository.findLatestSession());
    const sortedCompletedSessions = [...completedSessions]
      .filter(
        (
          completedSession,
        ): completedSession is Extract<
          WorkoutSession,
          { readonly status: 'completed' }
        > => completedSession.status === 'completed',
      )
      .sort(
        (first, second) =>
          Date.parse(second.endedAt) - Date.parse(first.endedAt),
      );
    const recentWorkout = sortedCompletedSessions[0]
      ? toTodayDashboardRecentWorkout(sortedCompletedSessions[0])
      : undefined;
    const weeklySummary = createTodayDashboardWeeklySummary(
      sortedCompletedSessions,
      now,
    );

    return {
      status: 'ready',
      data: {
        sessionEntry: session
          ? toTodayDashboardSessionEntry(session)
          : { status: 'none' },
        todayPlans: toTodayDashboardPlanItems(plans, templates),
        templates: templates.map(toTodayDashboardTemplateItem),
        dailyStatus: dailyStatus?.status,
        recentWorkout,
        weeklySummary,
        recommendation: createTodayDashboardRecommendation(
          dailyStatus?.status,
          recentWorkout,
        ),
      },
    };
  } catch {
    return { status: 'error', message: TODAY_DASHBOARD_ERROR_MESSAGE };
  }
}

export function createTodayDashboardWeeklySummary(
  sessions: readonly Extract<
    WorkoutSession,
    { readonly status: 'completed' }
  >[],
  now: Date,
): TodayDashboardWeeklySummary {
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const mondayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - mondayOffset);
  const currentWeekSessions = sessions.filter((session) => {
    const endedAt = Date.parse(session.endedAt);
    return endedAt >= weekStart.getTime() && endedAt <= now.getTime();
  });
  const completedSets = currentWeekSessions.flatMap((session) =>
    session.sessionExercises.flatMap((exercise) =>
      exercise.sets.filter((workoutSet) => workoutSet.isCompleted),
    ),
  );

  return {
    completedWorkoutCount: currentWeekSessions.length,
    completedSetCount: completedSets.length,
    totalVolume: completedSets.reduce(
      (total, workoutSet) => total + workoutSet.weight * workoutSet.actualReps,
      0,
    ),
  };
}

async function loadTodaySupplementalData(
  repositories: TodayDashboardRepositories,
  localDate: string,
): Promise<{
  readonly completedSessions: readonly WorkoutSession[];
  readonly dailyStatus: Awaited<
    ReturnType<DailyStatusRepository['findByLocalDate']>
  >;
}> {
  try {
    const [completedSessions, dailyStatus] = await Promise.all([
      repositories.workoutSessionRepository.listByStatuses(['completed']),
      repositories.dailyStatusRepository.findByLocalDate(localDate),
    ]);

    return { completedSessions, dailyStatus };
  } catch {
    return { completedSessions: [], dailyStatus: null };
  }
}

export function createTodayDashboardRecommendation(
  dailyStatus: DailyStatusValue | undefined,
  recentWorkout: TodayDashboardRecentWorkout | undefined,
): TodayDashboardRecommendation | undefined {
  if (dailyStatus === 'unwell') {
    return {
      title: '根据今日状态调整',
      message: '你记录了身体不适。可以休息或降低训练强度，由你决定是否训练。',
    };
  }

  if (dailyStatus === 'fatigued' || dailyStatus === 'menstrual') {
    return {
      title: '保留余量',
      message:
        dailyStatus === 'fatigued'
          ? '你记录了疲劳。可以减少组数或重量，不会自动修改训练计划。'
          : '你记录了经期状态。可按体感调整，系统不会限制训练。',
    };
  }

  if (recentWorkout) {
    return {
      title: '延续训练节奏',
      message: `最近完成了“${recentWorkout.workoutName}”，今天可从已有模板中自主选择。`,
    };
  }

  return undefined;
}

export async function createWorkoutSessionFromTemplate(
  repositories: Omit<TodayDashboardRepositories, 'dailyStatusRepository'>,
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

export async function addTodayPlanFromTemplate(
  repositories: Pick<
    TodayDashboardRepositories,
    'todayWorkoutPlanRepository' | 'workoutTemplateRepository'
  >,
  templateId: WorkoutTemplateId,
  options: {
    readonly localDate: string;
    readonly now: () => string;
    readonly createId: () => string;
    readonly position: number;
  },
): Promise<AddTodayPlanFromTemplateResult> {
  const template =
    await repositories.workoutTemplateRepository.getById(templateId);

  if (!template || template.status !== 'active') {
    return { status: 'template_not_found' };
  }

  try {
    const plan = await repositories.todayWorkoutPlanRepository.addFromTemplate({
      id: options.createId(),
      localDate: options.localDate,
      sourceTemplateId: template.id,
      titleSnapshot: template.name,
      position: options.position,
      createdAt: options.now(),
      updatedAt: options.now(),
    });

    return { status: 'added', plan };
  } catch (error) {
    if (error instanceof TodayWorkoutPlanDuplicateTemplateError) {
      return { status: 'duplicate_template' };
    }

    throw error;
  }
}

export async function startTodayPlan(
  repositories: Omit<TodayDashboardRepositories, 'dailyStatusRepository'>,
  planId: TodayWorkoutPlanId,
  options: {
    readonly now: () => string;
    readonly createId: (kind: WorkoutSessionIdKind) => string;
  },
): Promise<StartTodayPlanResult> {
  const plan = await repositories.todayWorkoutPlanRepository.findById(planId);

  if (!plan) {
    return { status: 'plan_not_found' };
  }

  if (plan.sessionId) {
    const session = await repositories.workoutSessionRepository.findById(
      plan.sessionId,
    );

    if (session?.status === 'completed') {
      await repositories.todayWorkoutPlanRepository.syncStatusFromSession(
        plan.id,
        'completed',
        options.now(),
      );
      return { status: 'completed' };
    }

    if (session?.status === 'draft' || session?.status === 'in_progress') {
      await repositories.todayWorkoutPlanRepository.syncStatusFromSession(
        plan.id,
        session.status,
        options.now(),
      );
      return { status: 'ready', sessionId: session.id };
    }
  }

  const template = await repositories.workoutTemplateRepository.getById(
    plan.sourceTemplateId,
  );

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
  await repositories.todayWorkoutPlanRepository.attachSession(
    plan.id,
    session.id,
    options.now(),
  );

  return { status: 'ready', sessionId: session.id };
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

function toTodayDashboardPlanItems(
  plans: readonly TodayWorkoutPlan[],
  templates: readonly WorkoutTemplate[],
): readonly TodayDashboardPlanItem[] {
  const templateById = new Map(
    templates.map((template) => [template.id, template]),
  );

  return plans.map((plan) => {
    const template = templateById.get(plan.sourceTemplateId);

    return {
      id: plan.id,
      templateId: plan.sourceTemplateId,
      sessionId: plan.sessionId,
      name: plan.titleSnapshot,
      status: plan.status,
      exerciseCount: template?.exercises.length ?? 0,
      totalTargetSets:
        template?.exercises.reduce(
          (total, exercise) => total + exercise.targetSets,
          0,
        ) ?? 0,
    };
  });
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

function toTodayDashboardRecentWorkout(
  session: Extract<WorkoutSession, { readonly status: 'completed' }>,
): TodayDashboardRecentWorkout {
  const completedSets = session.sessionExercises.flatMap((exercise) =>
    exercise.sets.filter((workoutSet) => workoutSet.isCompleted),
  );

  return {
    sessionId: session.id,
    workoutName: session.workoutNameSnapshot,
    endedAt: session.endedAt,
    completedSetCount: completedSets.length,
    totalVolume: completedSets.reduce(
      (total, workoutSet) => total + workoutSet.weight * workoutSet.actualReps,
      0,
    ),
  };
}

export function toLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
