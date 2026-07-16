/// <reference types="jest" />

import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react-native';

import type { DatabaseStartupResult } from '@/database/bootstrap';
import type { DatabaseConnection } from '@/database/types';
import {
  createExercise,
  type Exercise,
  type ExerciseId,
  type ExerciseInput,
  type ExerciseRepository,
} from '@/domain/exercise';
import {
  createWorkoutTemplate,
  type TemplateExerciseId,
  type WorkoutTemplate,
  type WorkoutTemplateId,
  type WorkoutTemplateRepository,
} from '@/domain/workout-template';
import {
  saveWorkoutTemplateEditDraft,
  validateWorkoutTemplateEditDraft,
} from '@/features/workout-templates/application/edit-workout-template';
import {
  useWorkoutTemplateEdit,
  type WorkoutTemplateEditScreenControls,
} from '@/features/workout-templates/application/use-workout-template-edit';
import {
  parseWorkoutTemplateEditRouteDraft,
  serializeWorkoutTemplateEditDraftRouteParams,
  type WorkoutTemplateEditRouteParams,
} from '@/features/workout-templates/application/workout-template-edit-route-params';
import { WorkoutTemplateEditContent } from '@/features/workout-templates/screens/workout-template-edit-screen';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('saveWorkoutTemplateEditDraft', () => {
  it('updates template metadata and exercise configuration through the repository boundary', async () => {
    const update = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
        createdAt: '2026-07-16T00:00:00.000Z',
      }),
    );
    const repository = buildRepository({ update });

    await expect(
      saveWorkoutTemplateEditDraft(
        repository,
        {
          templateId: 'template-push' as WorkoutTemplateId,
          name: ' Updated Push ',
          description: ' Chest day ',
          exercises: [
            {
              id: 'template-exercise-bench' as TemplateExerciseId,
              exerciseId: 'exercise-bench' as ExerciseId,
              exercise: buildExercise({ id: 'exercise-bench' }),
              targetSets: '4',
              targetRepsMin: '8',
              targetRepsMax: '10',
              restSeconds: '120',
              createdAt: '2026-07-16T00:10:00.000Z',
            },
          ],
        },
        {
          now: () => '2026-07-16T01:00:00.000Z',
          createTemplateExerciseId: () => 'unused',
        },
      ),
    ).resolves.toMatchObject({
      status: 'saved',
      template: {
        name: 'Updated Push',
      },
    });
    expect(update).toHaveBeenCalledWith({
      id: 'template-push',
      name: 'Updated Push',
      description: 'Chest day',
      updatedAt: '2026-07-16T01:00:00.000Z',
      exercises: [
        {
          id: 'template-exercise-bench',
          templateId: 'template-push',
          exerciseId: 'exercise-bench',
          position: 1,
          targetSets: 4,
          targetRepsMin: 8,
          targetRepsMax: 10,
          restSeconds: 120,
          createdAt: '2026-07-16T00:10:00.000Z',
          updatedAt: '2026-07-16T01:00:00.000Z',
        },
      ],
    });
  });

  it('rejects empty names, empty exercises, duplicates, and invalid numeric config', () => {
    const exercise = buildEditExercise();

    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: '  ',
        description: '',
        exercises: [],
      }),
    ).toEqual({
      name: '请输入模板名称。',
      exercises: '至少保留一个动作后才能保存模板。',
    });
    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: 'Push',
        description: '',
        exercises: [
          exercise,
          {
            ...exercise,
            id: 'template-exercise-dup' as TemplateExerciseId,
          },
        ],
      }),
    ).toEqual({
      exercises: '同一动作不能重复添加。',
    });
    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: 'Push',
        description: '',
        exercises: [
          {
            ...exercise,
            targetRepsMin: '12',
            targetRepsMax: '8',
          },
        ],
      }),
    ).toEqual({
      exerciseConfigs: {
        'exercise-bench': '次数范围不能反转。',
      },
    });
    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: 'Push',
        description: '',
        exercises: [{ ...exercise, targetSets: '3.5' }],
      }),
    ).toEqual({
      exerciseConfigs: {
        'exercise-bench': '目标组数必须大于 0。',
      },
    });
    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: 'Push',
        description: '',
        exercises: [{ ...exercise, targetRepsMin: '8abc' }],
      }),
    ).toEqual({
      exerciseConfigs: {
        'exercise-bench': '最小次数必须大于 0。',
      },
    });
    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: 'Push',
        description: '',
        exercises: [{ ...exercise, targetRepsMax: '-10' }],
      }),
    ).toEqual({
      exerciseConfigs: {
        'exercise-bench': '最大次数必须大于 0。',
      },
    });
    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: 'Push',
        description: '',
        exercises: [{ ...exercise, restSeconds: '' }],
      }),
    ).toEqual({
      exerciseConfigs: {
        'exercise-bench': '休息时间不能为负数。',
      },
    });
    expect(
      validateWorkoutTemplateEditDraft({
        templateId: 'template-push' as WorkoutTemplateId,
        name: 'Push',
        description: '',
        exercises: [{ ...exercise, restSeconds: '0' }],
      }),
    ).toEqual({});
  });
});

describe('workout template edit route params', () => {
  it('serializes route draft and merges a newly selected exercise once', () => {
    const serialized = serializeWorkoutTemplateEditDraftRouteParams({
      templateId: 'template-push',
      name: 'Push',
      description: '',
      exercises: [buildEditExercise()],
    });

    expect(serialized.draftDescription).toBe('');
    expect(
      parseWorkoutTemplateEditRouteDraft({
        ...serialized,
        selectionContext: 'template',
        selectedExerciseId: 'exercise-row',
      }),
    ).toMatchObject({
      templateId: 'template-push',
      name: 'Push',
      description: '',
      duplicateSelectionIgnored: false,
      exerciseDraftState: {
        status: 'valid',
        exercises: [
          expect.objectContaining({ exerciseId: 'exercise-bench' }),
          expect.objectContaining({ exerciseId: 'exercise-row' }),
        ],
      },
    });
    expect(
      parseWorkoutTemplateEditRouteDraft({
        ...serialized,
        selectionContext: 'template',
        selectedExerciseId: 'exercise-bench',
      }),
    ).toMatchObject({
      duplicateSelectionIgnored: true,
      exerciseDraftState: {
        status: 'valid',
        exercises: [expect.objectContaining({ exerciseId: 'exercise-bench' })],
      },
    });
  });

  it('preserves valid empty draft exercises and invalid config values', () => {
    expect(
      parseWorkoutTemplateEditRouteDraft({
        id: 'template-push',
        draftExercises: '[]',
      }),
    ).toMatchObject({
      exerciseDraftState: {
        status: 'valid',
        exercises: [],
      },
    });
    expect(
      parseWorkoutTemplateEditRouteDraft({
        id: 'template-push',
        draftName: 'Push Draft',
        draftDescription: 'Chest Draft',
        draftExercises: '[]',
        selectionContext: 'template',
        selectedExerciseId: 'exercise-row',
      }),
    ).toMatchObject({
      name: 'Push Draft',
      description: 'Chest Draft',
      exerciseDraftState: {
        status: 'valid',
        exercises: [expect.objectContaining({ exerciseId: 'exercise-row' })],
      },
    });

    const parsedDraft = parseWorkoutTemplateEditRouteDraft({
      id: 'template-push',
      draftExercises: JSON.stringify([
        {
          exerciseId: 'exercise-bench',
          targetSets: '3.5',
          targetRepsMin: '8abc',
          targetRepsMax: -10,
          restSeconds: '',
        },
      ]),
    });

    expect(parsedDraft).toMatchObject({
      exerciseDraftState: {
        status: 'valid',
        exercises: [
          {
            exerciseId: 'exercise-bench',
            targetSets: '3.5',
            targetRepsMin: '8abc',
            targetRepsMax: '-10',
            restSeconds: '',
          },
        ],
      },
    });

    expect(
      parseWorkoutTemplateEditRouteDraft({
        id: 'template-push',
      }),
    ).toMatchObject({
      exerciseDraftState: {
        status: 'missing',
      },
    });
    expect(
      parseWorkoutTemplateEditRouteDraft({
        id: 'template-push',
        draftExercises: 'not-json',
      }),
    ).toMatchObject({
      exerciseDraftState: {
        status: 'invalid',
      },
    });
  });

  it('treats damaged draft exercises as invalid without partial recovery', () => {
    expect(
      parseWorkoutTemplateEditRouteDraft({
        id: 'template-push',
        draftExercises: JSON.stringify([
          {
            exerciseId: 'exercise-bench',
            targetSets: '3',
            targetRepsMin: '8',
            targetRepsMax: '10',
            restSeconds: '90',
          },
          {
            exerciseId: 'exercise-row',
            targetSets: '3',
            targetRepsMin: '8',
            targetRepsMax: '10',
          },
        ]),
      }),
    ).toMatchObject({
      exerciseDraftState: {
        status: 'invalid',
      },
    });
    expect(
      parseWorkoutTemplateEditRouteDraft({
        id: 'template-push',
        draftExercises: JSON.stringify([
          {
            id: 'template-exercise-bench',
            exerciseId: 'exercise-bench',
            targetSets: '3',
            targetRepsMin: '8',
            targetRepsMax: '10',
            restSeconds: '90',
          },
        ]),
      }),
    ).toMatchObject({
      exerciseDraftState: {
        status: 'invalid',
      },
    });
  });
});

describe('useWorkoutTemplateEdit', () => {
  it('loads an active template, updates fields, and saves the edited draft', async () => {
    const update = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
        createdAt: '2026-07-16T00:00:00.000Z',
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplate(),
              update,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async () => buildExercise({ id: 'exercise-bench' }),
            }),
          now: () => '2026-07-16T01:00:00.000Z',
          createTemplateExerciseId: () => 'template-exercise-new',
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.updateName('Updated Push');
      result.current.controls.updateExerciseConfig(
        'exercise-bench' as ExerciseId,
        'targetSets',
        '5',
      );
    });
    expect(result.current.controls.shouldConfirmExit()).toBe(true);

    await act(async () => {
      await result.current.controls.save();
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Push',
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-bench',
            targetSets: 5,
          }),
        ],
      }),
    );
    expect(result.current.controls.shouldConfirmExit()).toBe(false);
  });

  it('preserves a route draft, adds selected exercise details, and saves in order', async () => {
    const update = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
        createdAt: '2026-07-16T00:00:00.000Z',
      }),
    );
    const routeParams = {
      ...serializeWorkoutTemplateEditDraftRouteParams({
        templateId: 'template-push',
        name: 'Push Draft',
        description: '',
        exercises: [buildEditExercise()],
      }),
      selectionContext: 'template',
      selectedExerciseId: 'exercise-row',
    };
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(routeParams, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () =>
          buildRepository({
            getById: async () => buildTemplate(),
            update,
          }),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getById: async (id) =>
              id === 'exercise-row'
                ? buildExercise({ id: 'exercise-row', nameZh: '坐姿划船' })
                : buildExercise({ id: 'exercise-bench' }),
          }),
        now: () => '2026-07-16T01:00:00.000Z',
        createTemplateExerciseId: () => 'template-exercise-row',
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          name: 'Push Draft',
          exercises: [
            expect.objectContaining({ exerciseId: 'exercise-bench' }),
            expect.objectContaining({ exerciseId: 'exercise-row' }),
          ],
        },
      });
    });
    expect(result.current.controls.shouldConfirmExit()).toBe(true);

    await act(async () => {
      await result.current.controls.save();
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-bench',
            position: 1,
          }),
          expect.objectContaining({
            id: 'template-exercise-row',
            exerciseId: 'exercise-row',
            position: 2,
          }),
        ],
      }),
    );
  });

  it('reorders exercises and saves stable consecutive positions', async () => {
    const update = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
        createdAt: '2026-07-16T00:00:00.000Z',
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplateWithTwoExercises(),
              update,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async (id) =>
                id === 'exercise-row'
                  ? buildExercise({ id: 'exercise-row', nameZh: '坐姿划船' })
                  : buildExercise({ id: 'exercise-bench' }),
            }),
          now: () => '2026-07-16T01:00:00.000Z',
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          exercises: [
            expect.objectContaining({ exerciseId: 'exercise-bench' }),
            expect.objectContaining({ exerciseId: 'exercise-row' }),
          ],
        },
      });
    });

    await act(async () => {
      result.current.controls.moveExerciseUp('exercise-row' as ExerciseId);
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      draft: {
        exercises: [
          expect.objectContaining({ exerciseId: 'exercise-row' }),
          expect.objectContaining({ exerciseId: 'exercise-bench' }),
        ],
      },
    });

    await act(async () => {
      await result.current.controls.save();
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-row',
            position: 1,
          }),
          expect.objectContaining({
            exerciseId: 'exercise-bench',
            position: 2,
          }),
        ],
      }),
    );
  });

  it('keeps a valid empty exercise draft across selection return without restoring database exercises', async () => {
    const routeParams = {
      id: 'template-push',
      draftName: 'Empty Push',
      draftDescription: 'No exercises yet',
      draftExercises: '[]',
      selectionContext: 'template',
      selectedExerciseId: 'exercise-row',
    };
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(routeParams, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () =>
          buildRepository({
            getById: async () => buildTemplate(),
          }),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getById: async () =>
              buildExercise({ id: 'exercise-row', nameZh: '坐姿划船' }),
          }),
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          name: 'Empty Push',
          description: 'No exercises yet',
          exercises: [expect.objectContaining({ exerciseId: 'exercise-row' })],
        },
      });
    });
  });

  it('keeps an explicitly cleared description across exercise selection return', async () => {
    const routeParams = {
      ...serializeWorkoutTemplateEditDraftRouteParams({
        templateId: 'template-push',
        name: 'Push',
        description: '',
        exercises: [buildEditExercise()],
      }),
      selectionContext: 'template',
      selectedExerciseId: 'exercise-row',
    };
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(routeParams, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () =>
          buildRepository({
            getById: async () => buildTemplate(),
          }),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getById: async (id) =>
              id === 'exercise-row'
                ? buildExercise({ id: 'exercise-row', nameZh: '坐姿划船' })
                : buildExercise({ id: 'exercise-bench' }),
          }),
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          description: '',
          exercises: [
            expect.objectContaining({ exerciseId: 'exercise-bench' }),
            expect.objectContaining({ exerciseId: 'exercise-row' }),
          ],
        },
      });
    });
  });

  it('blocks saving when route exercise draft params are invalid', async () => {
    const update = jest.fn();
    const routeParams = {
      id: 'template-push',
      draftExercises: JSON.stringify([
        {
          id: 'template-exercise-bench',
          exerciseId: 'exercise-bench',
          targetSets: '3',
          targetRepsMin: '8',
          targetRepsMax: '10',
          restSeconds: '90',
        },
      ]),
    };
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(routeParams, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () =>
          buildRepository({
            getById: async () => buildTemplate(),
            update,
          }),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getById: async () => buildExercise({ id: 'exercise-bench' }),
          }),
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          exerciseLoadStatus: 'error',
        },
        fieldErrors: {
          exercises: '动作草稿参数无效，请重新打开动作库后再试。',
        },
      });
    });

    let saveResult: Awaited<ReturnType<typeof result.current.controls.save>>;

    await act(async () => {
      saveResult = await result.current.controls.save();
    });

    expect(saveResult!).toEqual({
      status: 'invalid',
      fieldErrors: {
        exercises: '动作草稿参数无效，请重新打开动作库后再试。',
      },
    });
    expect(update).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      status: 'ready',
      fieldErrors: {
        exercises: '动作草稿参数无效，请重新打开动作库后再试。',
      },
    });
  });

  it('rejects hook edits while save is pending', async () => {
    const updateRequest = createDeferred<WorkoutTemplate>();
    const update = jest.fn(() => updateRequest.promise);
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplateWithTwoExercises(),
              update,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async (id) =>
                id === 'exercise-row'
                  ? buildExercise({ id: 'exercise-row', nameZh: '坐姿划船' })
                  : buildExercise({ id: 'exercise-bench' }),
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    let savePromise: ReturnType<typeof result.current.controls.save>;

    await act(async () => {
      savePromise = result.current.controls.save();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        isSaving: true,
      });
    });

    await act(async () => {
      result.current.controls.updateName('Lost Name');
      result.current.controls.updateDescription('Lost Description');
      result.current.controls.updateExerciseConfig(
        'exercise-bench' as ExerciseId,
        'targetSets',
        '9',
      );
      result.current.controls.moveExerciseUp('exercise-row' as ExerciseId);
      result.current.controls.requestRemoveExercise(
        'exercise-bench' as ExerciseId,
      );
    });

    expect(result.current.state).toMatchObject({
      status: 'ready',
      draft: {
        name: 'Push',
        description: 'Chest',
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-bench',
            targetSets: '3',
          }),
          expect.objectContaining({ exerciseId: 'exercise-row' }),
        ],
      },
    });
    expect('pendingRemoveExerciseId' in result.current.state).toBe(false);

    await act(async () => {
      updateRequest.resolve(buildTemplate());
      await savePromise!;
    });
  });

  it('does not mark a newer draft saved when an older pending save succeeds', async () => {
    let routeParams: WorkoutTemplateEditRouteParams = {
      id: 'template-push',
    };
    const updateRequest = createDeferred<WorkoutTemplate>();
    const { result, rerender } = await renderHook(() =>
      useWorkoutTemplateEdit(routeParams, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () =>
          buildRepository({
            getById: async () => buildTemplate(),
            update: () => updateRequest.promise,
          }),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getById: async () => buildExercise({ id: 'exercise-bench' }),
          }),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.updateName('Submitted A');
    });
    await act(async () => {
      void result.current.controls.save();
    });

    routeParams = {
      ...serializeWorkoutTemplateEditDraftRouteParams({
        templateId: 'template-push',
        name: 'Current B',
        description: 'Chest',
        exercises: [buildEditExercise()],
      }),
    };
    await rerender(undefined);

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          name: 'Current B',
        },
      });
    });

    await act(async () => {
      updateRequest.resolve(buildTemplate());
      await updateRequest.promise;
    });

    expect(result.current.state).toMatchObject({
      status: 'ready',
      isSaved: false,
      draft: {
        name: 'Current B',
      },
    });
    expect(result.current.controls.shouldConfirmExit()).toBe(true);
  });

  it('keeps invalid config values after route return and reports them on save', async () => {
    const routeParams = {
      id: 'template-push',
      draftName: 'Invalid Push',
      draftExercises: JSON.stringify([
        {
          id: 'template-exercise-bench',
          exerciseId: 'exercise-bench',
          targetSets: '3.5',
          targetRepsMin: '8abc',
          targetRepsMax: '10',
          restSeconds: '90',
          createdAt: '2026-07-16T00:10:00.000Z',
        },
      ]),
    };
    const update = jest.fn();
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(routeParams, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () =>
          buildRepository({
            getById: async () => buildTemplate(),
            update,
          }),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getById: async () => buildExercise({ id: 'exercise-bench' }),
          }),
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          exercises: [expect.objectContaining({ targetSets: '3.5' })],
        },
      });
    });

    await act(async () => {
      await result.current.controls.save();
    });

    expect(update).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      status: 'ready',
      fieldErrors: {
        exerciseConfigs: {
          'exercise-bench': '目标组数必须大于 0。',
        },
      },
    });
  });

  it('keeps archived templates read-only and prevents save', async () => {
    const update = jest.fn();
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () =>
                createWorkoutTemplate({
                  id: 'template-push',
                  name: 'Archived Push',
                  status: 'archived',
                  archivedAt: '2026-07-16T02:00:00.000Z',
                  exercises: [
                    {
                      id: 'template-exercise-bench',
                      templateId: 'template-push',
                      exerciseId: 'exercise-bench',
                      position: 1,
                      targetSets: 3,
                      targetRepsMin: 8,
                      targetRepsMax: 10,
                      restSeconds: 90,
                      createdAt: '2026-07-16T00:00:00.000Z',
                      updatedAt: '2026-07-16T00:00:00.000Z',
                    },
                    {
                      id: 'template-exercise-row',
                      templateId: 'template-push',
                      exerciseId: 'exercise-row',
                      position: 2,
                      targetSets: 4,
                      targetRepsMin: 10,
                      targetRepsMax: 12,
                      restSeconds: 120,
                      createdAt: '2026-07-16T00:00:00.000Z',
                      updatedAt: '2026-07-16T00:00:00.000Z',
                    },
                  ],
                  createdAt: '2026-07-16T00:00:00.000Z',
                  updatedAt: '2026-07-16T02:00:00.000Z',
                }),
              update,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async (id) =>
                id === 'exercise-row'
                  ? buildExercise({ id: 'exercise-row', nameZh: '坐姿划船' })
                  : buildExercise({ id: 'exercise-bench' }),
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        templateStatus: 'archived',
      });
    });

    await act(async () => {
      result.current.controls.updateName('Should not change');
      result.current.controls.updateDescription('Should not change');
      result.current.controls.updateExerciseConfig(
        'exercise-bench' as ExerciseId,
        'targetSets',
        '9',
      );
      result.current.controls.moveExerciseDown('exercise-bench' as ExerciseId);
      result.current.controls.requestRemoveExercise(
        'exercise-bench' as ExerciseId,
      );
      result.current.controls.confirmRemoveExercise();
      await result.current.controls.save();
    });

    expect(update).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      status: 'ready',
      draft: {
        name: 'Archived Push',
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-bench',
            targetSets: '3',
          }),
          expect.objectContaining({ exerciseId: 'exercise-row' }),
        ],
      },
    });
    expect('pendingRemoveExerciseId' in result.current.state).toBe(false);
    expect(result.current.controls.shouldConfirmExit()).toBe(false);
    expect(result.current.controls.createExerciseSelectionHref()).toBe(
      '/exercises',
    );
  });

  it('archives an active template after confirmation and marks the flow complete', async () => {
    const archive = jest.fn(async (id, archivedAt) =>
      buildArchivedTemplate(id, archivedAt),
    );
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplate(),
              archive,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async () => buildExercise({ id: 'exercise-bench' }),
            }),
          now: () => '2026-07-16T02:00:00.000Z',
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.requestArchive();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isConfirmingArchive: true,
    });

    await act(async () => {
      await result.current.controls.confirmArchive();
    });

    expect(archive).toHaveBeenCalledWith(
      'template-push',
      '2026-07-16T02:00:00.000Z',
    );
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        templateStatus: 'archived',
        isArchiveComplete: true,
        isConfirmingArchive: false,
        isArchiving: false,
      });
    });
  });

  it('does not archive unless archive confirmation is currently open', async () => {
    const archive = jest.fn(async (id, archivedAt) =>
      buildArchivedTemplate(id, archivedAt),
    );
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplate(),
              archive,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async () => buildExercise({ id: 'exercise-bench' }),
            }),
          now: () => '2026-07-16T02:00:00.000Z',
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      await result.current.controls.confirmArchive();
    });
    expect(archive).not.toHaveBeenCalled();

    await act(async () => {
      result.current.controls.requestArchive();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isConfirmingArchive: true,
    });

    await act(async () => {
      result.current.controls.cancelArchive();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isConfirmingArchive: false,
    });

    await act(async () => {
      await result.current.controls.confirmArchive();
    });

    expect(archive).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      status: 'ready',
      templateStatus: 'active',
      isConfirmingArchive: false,
      isArchiveComplete: false,
    });
  });

  it('freezes draft edits while archive confirmation is open and resumes after cancel', async () => {
    const update = jest.fn();
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplateWithTwoExercises(),
              update,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async (id) =>
                id === 'exercise-row'
                  ? buildExercise({ id: 'exercise-row', nameZh: '坐姿划船' })
                  : buildExercise({ id: 'exercise-bench' }),
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.requestArchive();
    });
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        isConfirmingArchive: true,
      });
    });

    await act(async () => {
      result.current.controls.updateName('Should not change');
      result.current.controls.updateDescription('Should not change');
      result.current.controls.updateExerciseConfig(
        'exercise-bench' as ExerciseId,
        'targetSets',
        '9',
      );
      result.current.controls.moveExerciseUp('exercise-row' as ExerciseId);
      result.current.controls.requestRemoveExercise(
        'exercise-bench' as ExerciseId,
      );
      result.current.controls.confirmRemoveExercise();
      await result.current.controls.save();
    });

    expect(update).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isConfirmingArchive: true,
      draft: {
        name: 'Push',
        description: 'Chest',
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-bench',
            targetSets: '3',
          }),
          expect.objectContaining({ exerciseId: 'exercise-row' }),
        ],
      },
    });
    expect('pendingRemoveExerciseId' in result.current.state).toBe(false);

    await act(async () => {
      result.current.controls.cancelArchive();
      result.current.controls.updateName('Editable Again');
    });

    expect(result.current.state).toMatchObject({
      status: 'ready',
      isConfirmingArchive: false,
      draft: {
        name: 'Editable Again',
      },
    });
  });

  it('keeps archive confirmation open while archive is pending', async () => {
    const archiveRequest = createDeferred<WorkoutTemplate>();
    const archive = jest.fn(() => archiveRequest.promise);
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplate(),
              archive,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async () => buildExercise({ id: 'exercise-bench' }),
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.requestArchive();
    });
    let archivePromise: ReturnType<
      typeof result.current.controls.confirmArchive
    >;

    await act(async () => {
      archivePromise = result.current.controls.confirmArchive();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        isArchiving: true,
        isConfirmingArchive: true,
      });
    });

    await act(async () => {
      result.current.controls.cancelArchive();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isArchiving: true,
      isConfirmingArchive: true,
    });

    await act(async () => {
      archiveRequest.resolve(
        buildArchivedTemplate(
          'template-push' as WorkoutTemplateId,
          '2026-07-16T02:00:00.000Z',
        ),
      );
      await archivePromise!;
    });
  });

  it('keeps active UI state and allows retry when archive fails', async () => {
    const archive = jest
      .fn()
      .mockRejectedValueOnce(new Error('sqlite failed'))
      .mockImplementationOnce(async (id, archivedAt) =>
        buildArchivedTemplate(id, archivedAt),
      );
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplate(),
              archive,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async () => buildExercise({ id: 'exercise-bench' }),
            }),
          now: () => '2026-07-16T02:00:00.000Z',
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.requestArchive();
    });
    await act(async () => {
      await result.current.controls.confirmArchive();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      templateStatus: 'active',
      archiveError: '训练模板归档失败。当前模板仍保留，请重新归档。',
      isArchiveComplete: false,
    });

    await act(async () => {
      result.current.controls.requestArchive();
    });
    await act(async () => {
      await result.current.controls.confirmArchive();
    });

    await waitFor(() => {
      expect(archive).toHaveBeenCalledTimes(2);
      expect(result.current.state).toMatchObject({
        status: 'ready',
        templateStatus: 'archived',
        archiveError: undefined,
        isArchiveComplete: true,
      });
    });
  });

  it('keeps draft after save failure and allows retry', async () => {
    const update = jest
      .fn()
      .mockRejectedValueOnce(new Error('sqlite failed'))
      .mockImplementationOnce(async (input) =>
        createWorkoutTemplate({
          ...input,
          status: 'active',
          createdAt: '2026-07-16T00:00:00.000Z',
        }),
      );
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplate(),
              update,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async () => buildExercise({ id: 'exercise-bench' }),
            }),
          now: () => '2026-07-16T01:00:00.000Z',
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.updateName('Retry Push');
      await result.current.controls.save();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      draft: {
        name: 'Retry Push',
      },
      saveError: '训练模板保存失败。当前修改仍保留，请重新保存。',
    });

    await act(async () => {
      await result.current.controls.save();
    });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('blocks exit confirmation while saving and restores dirty exit after save failure', async () => {
    const updateRequest = createDeferred<WorkoutTemplate>();
    const update = jest.fn(() => updateRequest.promise);
    const { result } = await renderHook(() =>
      useWorkoutTemplateEdit(
        {
          id: 'template-push',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildRepository({
              getById: async () => buildTemplate(),
              update,
            }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getById: async () => buildExercise({ id: 'exercise-bench' }),
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      result.current.controls.updateName('Dirty Push');
    });

    let savePromise: ReturnType<typeof result.current.controls.save>;

    await act(async () => {
      savePromise = result.current.controls.save();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        isSaving: true,
      });
    });

    expect(result.current.controls.shouldConfirmExit()).toBe(true);
    expect(result.current.controls.requestExit()).toBe(false);
    await act(async () => {
      result.current.controls.confirmExit();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isConfirmingDiscard: false,
      isExitAuthorized: false,
    });

    await act(async () => {
      updateRequest.reject(new Error('sqlite failed'));
      await savePromise!;
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isSaving: false,
      isExitAuthorized: false,
    });

    await act(async () => {
      result.current.controls.requestExit();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      isConfirmingDiscard: true,
    });
  });
});

describe('WorkoutTemplateEditContent', () => {
  it('renders editable fields, config inputs, remove confirmation, and save action', async () => {
    const save = jest.fn(async () => ({
      status: 'saved' as const,
      template: buildTemplate(),
    }));
    const requestRemoveExercise = jest.fn();
    const onAddExercise = jest.fn();
    const href = {
      pathname: '/exercises',
      params: {
        mode: 'select',
        context: 'template',
        returnTo: '/templates/[id]',
      },
    } as const;
    const { getByLabelText, getByText } = await render(
      <WorkoutTemplateEditContent
        state={buildReadyState()}
        controls={buildControls({
          createExerciseSelectionHref: () => href,
          requestRemoveExercise,
          save,
        })}
        onAddExercise={onAddExercise}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByLabelText('训练模板名称').props.value).toBe('Push');
    expect(getByText(/杠铃卧推/)).toBeTruthy();

    await fireEvent.changeText(getByLabelText('训练模板名称'), 'Updated Push');
    await fireEvent.changeText(getByLabelText('修改杠铃卧推目标组数'), '5');
    await fireEvent.press(getByLabelText('从动作库添加动作'));
    await fireEvent.press(getByLabelText('移除动作杠铃卧推'));
    await fireEvent.press(getByLabelText('保存训练模板'));

    expect(onAddExercise).toHaveBeenCalledWith(href);
    expect(requestRemoveExercise).toHaveBeenCalledWith('exercise-bench');
    expect(save).toHaveBeenCalled();
  });

  it('shows delete confirmation without deleting the source exercise directly', async () => {
    const confirmRemoveExercise = jest.fn();
    const { getByLabelText, getByText } = await render(
      <WorkoutTemplateEditContent
        state={buildReadyState({
          pendingRemoveExerciseId: 'exercise-bench' as ExerciseId,
        })}
        controls={buildControls({ confirmRemoveExercise })}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByText('移除模板动作？')).toBeTruthy();
    expect(
      getByText('只会从当前模板移除，不会删除动作库中的标准动作。'),
    ).toBeTruthy();

    await fireEvent.press(getByLabelText('确认移除模板动作'));

    expect(confirmRemoveExercise).toHaveBeenCalled();
  });

  it('shows archive confirmation and explains historical data is retained', async () => {
    const confirmArchive = jest.fn(async () => undefined);
    const { getAllByText, getByLabelText, getByText } = await render(
      <WorkoutTemplateEditContent
        state={buildReadyState({
          isConfirmingArchive: true,
        })}
        controls={buildControls({ confirmArchive })}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByText('归档训练模板？')).toBeTruthy();
    expect(getAllByText(/历史训练记录不会被删除/)).toHaveLength(2);

    await fireEvent.press(getByLabelText('确认归档训练模板'));
    expect(confirmArchive).toHaveBeenCalledTimes(1);
  });

  it('warns that unsaved draft changes are not saved before archiving', async () => {
    const { getByText } = await render(
      <WorkoutTemplateEditContent
        state={buildReadyState({
          isConfirmingArchive: true,
        })}
        controls={buildControls({
          shouldConfirmExit: jest.fn(() => true),
        })}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(
      getByText(
        '当前未保存修改不会保存。归档后默认列表将不再显示该模板，历史训练记录不会被删除。',
      ),
    ).toBeTruthy();
  });

  it('renders reorder controls and disables impossible moves', async () => {
    const moveExerciseUp = jest.fn();
    const moveExerciseDown = jest.fn();
    const { getByLabelText } = await render(
      <WorkoutTemplateEditContent
        state={buildReadyState({
          draft: {
            ...buildReadyState().draft,
            exercises: [
              buildEditExercise(),
              buildEditExercise({
                id: 'template-exercise-row' as TemplateExerciseId,
                exerciseId: 'exercise-row' as ExerciseId,
                exercise: buildExercise({
                  id: 'exercise-row',
                  nameZh: '坐姿划船',
                }),
              }),
            ],
          },
        })}
        controls={buildControls({ moveExerciseUp, moveExerciseDown })}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByLabelText('上移动作杠铃卧推').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
    expect(getByLabelText('下移动作坐姿划船').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );

    await fireEvent.press(getByLabelText('下移动作杠铃卧推'));
    await fireEvent.press(getByLabelText('上移动作坐姿划船'));

    expect(moveExerciseDown).toHaveBeenCalledWith('exercise-bench');
    expect(moveExerciseUp).toHaveBeenCalledWith('exercise-row');
  });

  it('shows archived templates as read-only', async () => {
    const { getByText, getByLabelText } = await render(
      <WorkoutTemplateEditContent
        state={buildReadyState({
          templateStatus: 'archived',
        })}
        controls={buildControls()}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByText('已归档模板不能编辑')).toBeTruthy();
    expect(getByLabelText('已归档模板不能保存')).toBeTruthy();
    expect(() => getByLabelText('归档训练模板')).toThrow();
  });

  it('disables all edit controls while saving or archiving', async () => {
    const { getByLabelText } = await render(
      <WorkoutTemplateEditContent
        state={buildReadyState({
          isSaving: true,
        })}
        controls={buildControls()}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByLabelText('训练模板名称').props.editable).toBe(false);
    expect(getByLabelText('训练模板描述').props.editable).toBe(false);
    expect(getByLabelText('修改杠铃卧推目标组数').props.editable).toBe(false);
    expect(getByLabelText('从动作库添加动作').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
    expect(getByLabelText('移除动作杠铃卧推').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
    expect(getByLabelText('上移动作杠铃卧推').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
    expect(getByLabelText('下移动作杠铃卧推').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
    expect(getByLabelText('退出编辑训练模板').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );

    const archivingState = buildReadyState({
      isArchiving: true,
    });
    const { getByLabelText: getArchivingLabel } = await render(
      <WorkoutTemplateEditContent
        state={archivingState}
        controls={buildControls()}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getArchivingLabel('归档训练模板').props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(
      getArchivingLabel('正在归档训练模板').props.accessibilityState,
    ).toEqual({
      disabled: true,
    });

    const confirmingState = buildReadyState({
      isConfirmingArchive: true,
    });
    const { getByLabelText: getConfirmingLabel } = await render(
      <WorkoutTemplateEditContent
        state={confirmingState}
        controls={buildControls()}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onCancelExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getConfirmingLabel('训练模板名称').props.editable).toBe(false);
    expect(getConfirmingLabel('归档训练模板').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
    expect(getConfirmingLabel('保存训练模板').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
  });
});

function buildStartupResult(): Extract<
  DatabaseStartupResult,
  { readonly status: 'ready' }
> {
  return {
    status: 'ready',
    database: buildDatabaseConnection(),
    schemaVersion: 2,
  };
}

function buildDatabaseConnection(): DatabaseConnection {
  return {
    execAsync: async () => undefined,
    runAsync: async () => ({}),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
  };
}

function buildTemplate(): WorkoutTemplate {
  return createWorkoutTemplate({
    id: 'template-push',
    name: 'Push',
    description: 'Chest',
    status: 'active',
    exercises: [
      {
        id: 'template-exercise-bench',
        templateId: 'template-push',
        exerciseId: 'exercise-bench',
        position: 1,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 10,
        restSeconds: 90,
        createdAt: '2026-07-16T00:10:00.000Z',
        updatedAt: '2026-07-16T00:10:00.000Z',
      },
    ],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:10:00.000Z',
  });
}

function buildArchivedTemplate(
  id: WorkoutTemplateId,
  archivedAt: string,
): WorkoutTemplate {
  return createWorkoutTemplate({
    id,
    name: 'Push',
    description: 'Chest',
    status: 'archived',
    exercises: [
      {
        id: 'template-exercise-bench',
        templateId: id,
        exerciseId: 'exercise-bench',
        position: 1,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 10,
        restSeconds: 90,
        createdAt: '2026-07-16T00:10:00.000Z',
        updatedAt: '2026-07-16T00:10:00.000Z',
      },
    ],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: archivedAt,
    archivedAt,
  });
}

function buildTemplateWithTwoExercises(): WorkoutTemplate {
  return createWorkoutTemplate({
    ...buildTemplate(),
    exercises: [
      {
        id: 'template-exercise-bench',
        templateId: 'template-push',
        exerciseId: 'exercise-bench',
        position: 1,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 10,
        restSeconds: 90,
        createdAt: '2026-07-16T00:10:00.000Z',
        updatedAt: '2026-07-16T00:10:00.000Z',
      },
      {
        id: 'template-exercise-row',
        templateId: 'template-push',
        exerciseId: 'exercise-row',
        position: 2,
        targetSets: 4,
        targetRepsMin: 10,
        targetRepsMax: 12,
        restSeconds: 120,
        createdAt: '2026-07-16T00:20:00.000Z',
        updatedAt: '2026-07-16T00:20:00.000Z',
      },
    ],
  });
}

function buildEditExercise(
  overrides: Partial<ReturnType<typeof buildEditExerciseBase>> = {},
) {
  return {
    ...buildEditExerciseBase(),
    ...overrides,
  };
}

function buildEditExerciseBase() {
  return {
    id: 'template-exercise-bench' as TemplateExerciseId,
    exerciseId: 'exercise-bench' as ExerciseId,
    exercise: buildExercise({ id: 'exercise-bench' }),
    targetSets: '3',
    targetRepsMin: '8',
    targetRepsMax: '10',
    restSeconds: '90',
    createdAt: '2026-07-16T00:10:00.000Z',
  };
}

function buildExercise(overrides: Partial<ExerciseInput> = {}): Exercise {
  return createExercise({
    id: 'exercise-bench',
    slug: 'exercise-bench',
    nameZh: '杠铃卧推',
    nameEn: 'Barbell Bench Press',
    type: 'strength',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: [],
    equipment: 'barbell',
    description: null,
    imageUri: null,
    sourceName: 'Exercise Library Test',
    sourceReference: 'test',
    status: 'active',
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides,
  });
}

function buildRepository(
  overrides: Partial<WorkoutTemplateRepository> = {},
): WorkoutTemplateRepository {
  return {
    list: async () => [],
    getById: async () => buildTemplate(),
    create: async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
      }),
    update: async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
        createdAt: '2026-07-16T00:00:00.000Z',
      }),
    archive: async (id, archivedAt) =>
      createWorkoutTemplate({
        id,
        name: 'Archived',
        status: 'archived',
        exercises: [],
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: archivedAt,
        archivedAt,
      }),
    ...overrides,
  };
}

function buildExerciseRepository(
  overrides: Partial<ExerciseRepository> = {},
): ExerciseRepository {
  return {
    list: async () => [],
    getById: async () => null,
    search: async () => [],
    listByFilters: async () => [],
    getSelectedByIds: async () => [],
    ...overrides,
  };
}

function buildReadyState(
  overrides: Partial<
    Extract<
      Parameters<typeof WorkoutTemplateEditContent>[0]['state'],
      { status: 'ready' }
    >
  > = {},
): Extract<
  Parameters<typeof WorkoutTemplateEditContent>[0]['state'],
  { status: 'ready' }
> {
  return {
    status: 'ready',
    templateStatus: 'active',
    draft: {
      templateId: 'template-push' as WorkoutTemplateId,
      name: 'Push',
      description: 'Chest',
      exerciseLoadStatus: 'ready',
      exercises: [buildEditExercise()],
    },
    fieldErrors: {},
    isSaving: false,
    isArchiving: false,
    isConfirmingArchive: false,
    isArchiveComplete: false,
    isConfirmingDiscard: false,
    isExitAuthorized: false,
    isSaved: false,
    ...overrides,
  };
}

function buildControls(
  overrides: Partial<WorkoutTemplateEditScreenControls> = {},
): WorkoutTemplateEditScreenControls {
  return {
    updateName: jest.fn(),
    updateDescription: jest.fn(),
    updateExerciseConfig: jest.fn(),
    moveExerciseUp: jest.fn(),
    moveExerciseDown: jest.fn(),
    requestRemoveExercise: jest.fn(),
    cancelRemoveExercise: jest.fn(),
    confirmRemoveExercise: jest.fn(),
    requestArchive: jest.fn(),
    cancelArchive: jest.fn(),
    confirmArchive: jest.fn(async () => undefined),
    createExerciseSelectionHref: jest.fn(() => '/exercises' as never),
    save: jest.fn(async () => ({
      status: 'invalid' as const,
      fieldErrors: {},
    })),
    reload: jest.fn(),
    shouldConfirmExit: jest.fn(() => false),
    requestExit: jest.fn(() => true),
    cancelExit: jest.fn(),
    confirmExit: jest.fn(),
    ...overrides,
  };
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}
