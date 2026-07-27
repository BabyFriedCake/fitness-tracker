/// <reference types="jest" />

import type {
  Exercise,
  ExerciseId,
  ExerciseRepository,
} from '@/domain/exercise';
import type {
  TodayWorkoutPlan,
  TodayWorkoutPlanId,
  TodayWorkoutPlanRepository,
} from '@/domain/today-workout-plan';
import {
  createWorkoutTemplate,
  type WorkoutTemplate,
  type WorkoutTemplateId,
  type WorkoutTemplateRepository,
} from '@/domain/workout-template';
import type {
  SessionExercise,
  SessionExerciseId,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';
import {
  loadTodayPlanDetail,
  updateTodayPlanDraftSessionExerciseConfig,
} from '@/features/workout-session/application/use-today-plan-detail';

const PLAN_ID = 'today-plan-lower' as TodayWorkoutPlanId;
const TEMPLATE_ID = 'template-lower' as WorkoutTemplateId;
const SESSION_ID = 'session-lower' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-squat' as SessionExerciseId;
const EXERCISE_ID = 'exercise-squat' as ExerciseId;
const CREATED_AT = '2026-07-23T01:00:00.000Z';

describe('Today Plan Detail', () => {
  it('loads detail without creating or updating a WorkoutSession', async () => {
    const save = jest.fn();
    const update = jest.fn();
    const templateUpdate = jest.fn();
    const result = await loadTodayPlanDetail(
      {
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository(),
        workoutTemplateRepository: buildWorkoutTemplateRepository({
          update: templateUpdate,
        }),
        workoutSessionRepository: buildWorkoutSessionRepository({
          save,
          update,
        }),
        exerciseRepository: buildExerciseRepository(),
      },
      PLAN_ID,
    );

    expect(result.status).toBe('ready');
    expect(save).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(templateUpdate).not.toHaveBeenCalled();
  });

  it('updates only the linked draft WorkoutSession exercise config', async () => {
    const templateUpdate = jest.fn(async () => buildTemplate());
    const update = jest.fn(async (session: WorkoutSession) => session);
    const result = await updateTodayPlanDraftSessionExerciseConfig(
      {
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository({
          findById: async () => buildTodayPlan({ sessionId: SESSION_ID }),
        }),
        workoutSessionRepository: buildWorkoutSessionRepository({
          findById: async () => buildSession('draft'),
          update,
        }),
      },
      PLAN_ID,
      SESSION_EXERCISE_ID,
      {
        targetSets: 5,
        targetRepsMin: 10,
        targetRepsMax: 12,
        restSeconds: 120,
      },
      '2026-07-23T02:00:00.000Z',
    );

    expect(result.status).toBe('updated');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SESSION_ID,
        status: 'draft',
        updatedAt: '2026-07-23T02:00:00.000Z',
        sessionExercises: [
          expect.objectContaining({
            id: SESSION_EXERCISE_ID,
            targetSets: 5,
            targetRepsMin: 10,
            targetRepsMax: 12,
            currentRestSeconds: 120,
          }),
        ],
      }),
    );
    expect(templateUpdate).not.toHaveBeenCalled();
  });

  it('rejects non-draft linked WorkoutSession edits', async () => {
    const update = jest.fn(async (session: WorkoutSession) => session);
    const result = await updateTodayPlanDraftSessionExerciseConfig(
      {
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository({
          findById: async () => buildTodayPlan({ sessionId: SESSION_ID }),
        }),
        workoutSessionRepository: buildWorkoutSessionRepository({
          findById: async () => buildSession('in_progress'),
          update,
        }),
      },
      PLAN_ID,
      SESSION_EXERCISE_ID,
      {
        targetSets: 5,
        targetRepsMin: 10,
        targetRepsMax: 12,
        restSeconds: 120,
      },
      '2026-07-23T02:00:00.000Z',
    );

    expect(result).toEqual({ status: 'not_editable' });
    expect(update).not.toHaveBeenCalled();
  });
});

function buildTodayWorkoutPlanRepository(
  overrides: Partial<TodayWorkoutPlanRepository> = {},
): TodayWorkoutPlanRepository {
  return {
    listByDate: async () => [],
    findById: async () => buildTodayPlan(),
    findByDateAndTemplate: async () => null,
    addFromTemplate: async () => buildTodayPlan(),
    attachSession: async (_planId, sessionId) =>
      buildTodayPlan({ sessionId, status: 'draft' }),
    syncStatusFromSession: async (_planId, status) =>
      buildTodayPlan({ status }),
    ...overrides,
  };
}

function buildWorkoutSessionRepository(
  overrides: Partial<WorkoutSessionRepository> = {},
): WorkoutSessionRepository {
  return {
    save: async (session) => session,
    findById: async () => null,
    findActiveSession: async () => null,
    findLatestSession: async () => null,
    listByStatuses: async () => [],
    findRecoverableSession: async () => null,
    startIfNoActiveSession: async () => ({ status: 'started' }),
    update: async (session) => session,
    ...overrides,
  };
}

function buildWorkoutTemplateRepository(
  overrides: Partial<WorkoutTemplateRepository> = {},
): WorkoutTemplateRepository {
  return {
    list: async () => [],
    getById: async () => buildTemplate(),
    create: async () => buildTemplate(),
    update: async () => buildTemplate(),
    archive: async () => buildTemplate({ status: 'archived' }),
    ...overrides,
  };
}

function buildExerciseRepository(): ExerciseRepository {
  return {
    list: async () => [buildExercise()],
    getById: async () => buildExercise(),
    search: async () => [buildExercise()],
    listByFilters: async () => [buildExercise()],
    getSelectedByIds: async () => [buildExercise()],
  };
}

function buildTodayPlan(
  overrides: Partial<TodayWorkoutPlan> = {},
): TodayWorkoutPlan {
  return {
    id: PLAN_ID,
    localDate: '2026-07-23',
    sourceTemplateId: TEMPLATE_ID,
    titleSnapshot: '下肢力量训练',
    position: 1,
    status: 'planned',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function buildTemplate(
  overrides: Partial<WorkoutTemplate> = {},
): WorkoutTemplate {
  return createWorkoutTemplate({
    id: TEMPLATE_ID,
    name: '下肢力量训练',
    status: overrides.status ?? 'active',
    exercises: [
      {
        id: 'template-exercise-squat',
        templateId: TEMPLATE_ID,
        exerciseId: EXERCISE_ID,
        position: 1,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        restSeconds: 90,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      },
    ],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    archivedAt:
      overrides.status === 'archived' ? '2026-07-23T02:00:00.000Z' : null,
  });
}

function buildExercise(): Exercise {
  return {
    id: EXERCISE_ID,
    slug: 'barbell-squat',
    nameZh: '杠铃深蹲',
    nameEn: 'Barbell Squat',
    type: 'strength',
    primaryMuscleGroup: 'legs',
    secondaryMuscleGroups: [],
    equipment: 'barbell',
    status: 'active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function buildSession(status: WorkoutSession['status']): WorkoutSession {
  const base = {
    id: SESSION_ID,
    sourceTemplateId: TEMPLATE_ID,
    workoutNameSnapshot: '下肢力量训练',
    sessionExercises: [buildSessionExercise()],
    currentSessionExerciseId: SESSION_EXERCISE_ID,
    currentSetNumber: 1,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };

  switch (status) {
    case 'draft':
      return { ...base, status };
    case 'in_progress':
      return { ...base, status, startedAt: CREATED_AT };
    case 'completed':
      return {
        ...base,
        status,
        startedAt: CREATED_AT,
        endedAt: '2026-07-23T02:00:00.000Z',
      };
    case 'cancelled':
      return {
        ...base,
        status,
        endedAt: '2026-07-23T02:00:00.000Z',
      };
  }
}

function buildSessionExercise(): SessionExercise {
  return {
    id: SESSION_EXERCISE_ID,
    sessionId: SESSION_ID,
    sourceExerciseId: EXERCISE_ID,
    exerciseNameSnapshot: '杠铃深蹲',
    position: 1,
    isEnabled: true,
    isSkipped: false,
    isCompleted: false,
    targetSets: 4,
    targetRepsMin: 8,
    targetRepsMax: 10,
    currentRestSeconds: 90,
    sets: [],
  };
}
