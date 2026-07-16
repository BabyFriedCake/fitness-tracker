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
  type WorkoutTemplate,
  type WorkoutTemplateRepository,
} from '@/domain/workout-template';
import {
  saveWorkoutTemplateCreateDraft,
  validateWorkoutTemplateCreateDraft,
} from '@/features/workout-templates/application/create-workout-template';
import { useWorkoutTemplateCreate } from '@/features/workout-templates/application/use-workout-template-create';
import {
  parseWorkoutTemplateCreateRouteDraft,
  serializeWorkoutTemplateCreateDraftRouteParams,
} from '@/features/workout-templates/application/workout-template-create-route-params';
import {
  WorkoutTemplateCreateContent,
  type WorkoutTemplateCreateContentProps,
} from '@/features/workout-templates/screens/workout-template-create-screen';

describe('saveWorkoutTemplateCreateDraft', () => {
  it('builds a valid active template create input through the repository boundary', async () => {
    const exercise = buildExercise({
      id: 'exercise-barbell-bench-press',
    });
    const create = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
      }),
    );
    const repository = buildWorkoutTemplateRepository({ create });

    await expect(
      saveWorkoutTemplateCreateDraft(
        repository,
        {
          name: ' Push ',
          description: ' Chest day ',
          exercises: [exercise],
        },
        {
          now: () => '2026-07-16T00:00:00.000Z',
          createId: createSequencedIdFactory([
            'template-push',
            'template-exercise-bench',
          ]),
        },
      ),
    ).resolves.toMatchObject({
      status: 'saved',
      template: {
        id: 'template-push',
        name: 'Push',
        description: 'Chest day',
        status: 'active',
      },
    });
    expect(create).toHaveBeenCalledWith({
      id: 'template-push',
      name: 'Push',
      description: 'Chest day',
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z',
      exercises: [
        {
          id: 'template-exercise-bench',
          templateId: 'template-push',
          exerciseId: exercise.id,
          position: 1,
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
          restSeconds: 90,
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        },
      ],
    });
  });

  it('blocks empty names, missing exercises, and duplicate exercises', () => {
    const exercise = buildExercise();

    expect(
      validateWorkoutTemplateCreateDraft({
        name: '   ',
        description: '',
        exercises: [],
      }),
    ).toEqual({
      name: '请输入模板名称。',
      exercises: '至少添加一个动作后才能保存模板。',
    });
    expect(
      validateWorkoutTemplateCreateDraft({
        name: 'Push',
        description: '',
        exercises: [exercise, exercise],
      }),
    ).toEqual({
      exercises: '同一动作不能重复添加。',
    });
  });

  it('maps repository failures to stable retry copy', async () => {
    const repository = buildWorkoutTemplateRepository({
      create: async () => {
        throw new Error('sqlite failed');
      },
    });

    await expect(
      saveWorkoutTemplateCreateDraft(
        repository,
        {
          name: 'Push',
          description: '',
          exercises: [buildExercise()],
        },
        {
          now: () => '2026-07-16T00:00:00.000Z',
          createId: createSequencedIdFactory([
            'template-push',
            'template-exercise-bench',
          ]),
        },
      ),
    ).resolves.toEqual({
      status: 'error',
      message: '训练模板保存失败。当前输入仍保留，请重新保存。',
    });
  });
});

describe('workout template create route params', () => {
  it('restores draft values and appends selected template exercises once', () => {
    expect(
      parseWorkoutTemplateCreateRouteDraft({
        draftName: 'Push',
        draftDescription: 'Chest day',
        selectedIds: 'exercise-bench',
        selectionContext: 'template',
        selectedExerciseId: 'exercise-row',
      }),
    ).toEqual({
      name: 'Push',
      description: 'Chest day',
      selectedExerciseIds: ['exercise-bench', 'exercise-row'],
      duplicateSelectionIgnored: false,
    });

    expect(
      parseWorkoutTemplateCreateRouteDraft({
        selectedIds: 'exercise-bench',
        selectionContext: 'template',
        selectedExerciseId: 'exercise-bench',
      }),
    ).toEqual({
      name: '',
      description: '',
      selectedExerciseIds: ['exercise-bench'],
      duplicateSelectionIgnored: true,
    });
  });

  it('serializes draft return params without empty values', () => {
    expect(
      serializeWorkoutTemplateCreateDraftRouteParams({
        name: 'Push',
        description: '',
        selectedExerciseIds: ['exercise-bench' as Exercise['id']],
      }),
    ).toEqual({
      draftName: 'Push',
      selectedIds: 'exercise-bench',
    });
  });
});

describe('useWorkoutTemplateCreate', () => {
  it('loads selected exercise details from route draft and creates selection hrefs', async () => {
    const exercise = buildExercise({
      id: 'exercise-barbell-bench-press',
      nameZh: '杠铃卧推',
    });
    const exerciseRepository = buildExerciseRepository({
      getSelectedByIds: jest.fn(async () => [exercise]),
    });

    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          draftDescription: 'Chest day',
          selectedIds: 'exercise-barbell-bench-press',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository(),
          createExerciseRepository: () => exerciseRepository,
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.draft.selectedExercises).toEqual([exercise]);
    });
    expect(result.current.controls.createExerciseSelectionHref()).toEqual({
      pathname: '/exercises',
      params: {
        mode: 'select',
        context: 'template',
        returnTo: '/templates/new',
        returnParams:
          'draftName=Push&draftDescription=Chest+day&selectedIds=exercise-barbell-bench-press',
        selectedIds: 'exercise-barbell-bench-press',
      },
    });
  });

  it('saves once when save is triggered repeatedly while pending', async () => {
    const exercise = buildExercise({
      id: 'exercise-barbell-bench-press',
    });
    const saveRequest =
      createDeferred<ReturnType<typeof createWorkoutTemplate>>();
    const create = jest.fn(() => saveRequest.promise);
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          selectedIds: 'exercise-barbell-bench-press',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository({ create }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: async () => [exercise],
            }),
          now: () => '2026-07-16T00:00:00.000Z',
          createId: createSequencedIdFactory([
            'template-push',
            'template-exercise-bench',
          ]),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.draft.selectedExercises).toHaveLength(1);
    });

    let firstSave: ReturnType<typeof result.current.controls.save>;
    let secondSave: ReturnType<typeof result.current.controls.save>;

    await act(async () => {
      firstSave = result.current.controls.save();
      secondSave = result.current.controls.save();
      await Promise.resolve();
    });

    expect(create).toHaveBeenCalledTimes(1);

    await act(async () => {
      saveRequest.resolve(
        createWorkoutTemplate({
          id: 'template-push',
          name: 'Push',
          status: 'active',
          exercises: [],
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        }),
      );
      await firstSave!;
      await secondSave!;
    });

    await expect(firstSave!).resolves.toMatchObject({ status: 'saved' });
    await expect(secondSave!).resolves.toEqual({
      status: 'error',
      message: '训练模板保存失败。当前输入仍保留，请重新保存。',
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('does not save while newly selected exercises are still loading', async () => {
    const exercisesRequest = createDeferred<readonly Exercise[]>();
    const create = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          selectedIds: 'exercise-barbell-bench-press',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository({ create }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: () => exercisesRequest.promise,
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.draft.selectedExerciseLoadStatus).toBe(
        'loading',
      );
    });

    await act(async () => {
      await expect(result.current.controls.save()).resolves.toEqual({
        status: 'invalid',
        fieldErrors: {
          exercises: '动作信息正在加载，请稍后保存。',
        },
      });
    });

    expect(create).not.toHaveBeenCalled();

    await act(async () => {
      exercisesRequest.resolve([
        buildExercise({ id: 'exercise-barbell-bench-press' }),
      ]);
      await exercisesRequest.promise;
    });
  });

  it('saves all selected exercises after loading completes', async () => {
    const create = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          selectedIds: 'exercise-barbell-bench-press,exercise-row',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository({ create }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: async () => [
                buildExercise({ id: 'exercise-barbell-bench-press' }),
                buildExercise({ id: 'exercise-row' }),
              ],
            }),
          now: () => '2026-07-16T00:00:00.000Z',
          createId: createSequencedIdFactory([
            'template-push',
            'template-exercise-bench',
            'template-exercise-row',
          ]),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.draft.selectedExerciseLoadStatus).toBe(
        'ready',
      );
      expect(result.current.state.draft.selectedExercises).toHaveLength(2);
    });

    await act(async () => {
      await result.current.controls.save();
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-barbell-bench-press',
          }),
          expect.objectContaining({
            exerciseId: 'exercise-row',
          }),
        ],
      }),
    );
  });

  it('saves selected exercises in selected ID order when the repository returns another order', async () => {
    const create = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Pull',
          selectedIds: 'exercise-row,exercise-barbell-bench-press',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository({ create }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: async () => [
                buildExercise({ id: 'exercise-barbell-bench-press' }),
                buildExercise({ id: 'exercise-row' }),
              ],
            }),
          now: () => '2026-07-16T00:00:00.000Z',
          createId: createSequencedIdFactory([
            'template-pull',
            'template-exercise-row',
            'template-exercise-bench',
          ]),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(
        result.current.state.draft.selectedExercises.map(
          (exercise) => exercise.id,
        ),
      ).toEqual(['exercise-row', 'exercise-barbell-bench-press']);
    });

    await act(async () => {
      await result.current.controls.save();
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            exerciseId: 'exercise-row',
            position: 1,
          }),
          expect.objectContaining({
            exerciseId: 'exercise-barbell-bench-press',
            position: 2,
          }),
        ],
      }),
    );
  });

  it('does not save stale selected exercises after a later load failure', async () => {
    let params = {
      draftName: 'Push',
      selectedIds: 'exercise-barbell-bench-press',
    };
    const secondLoad = createDeferred<readonly Exercise[]>();
    const ignoredSecondLoadFailure = secondLoad.promise.catch(() => undefined);
    const getSelectedByIds = jest
      .fn()
      .mockResolvedValueOnce([
        buildExercise({ id: 'exercise-barbell-bench-press' }),
      ])
      .mockReturnValueOnce(secondLoad.promise);
    const create = jest.fn(async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
      }),
    );
    const { result, rerender } = await renderHook(() =>
      useWorkoutTemplateCreate(params, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () =>
          buildWorkoutTemplateRepository({ create }),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getSelectedByIds,
          }),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.draft.selectedExercises).toHaveLength(1);
    });

    params = {
      draftName: 'Push',
      selectedIds: 'exercise-barbell-bench-press,exercise-row',
    };
    await rerender(undefined);

    await waitFor(() => {
      expect(result.current.state.draft.selectedExerciseLoadStatus).toBe(
        'loading',
      );
      expect(result.current.state.draft.selectedExercises).toEqual([]);
    });

    await act(async () => {
      secondLoad.reject(new Error('load failed'));
      await ignoredSecondLoadFailure;
    });

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          selectedExerciseLoadStatus: 'error',
          selectedExercises: [],
        },
        fieldErrors: {
          exercises:
            '动作信息加载失败。当前输入仍保留，请重新打开动作库后再试。',
        },
      });
    });

    await act(async () => {
      await result.current.controls.save();
    });

    expect(create).not.toHaveBeenCalled();
  });

  it('reports missing selected exercise ids explicitly', async () => {
    const create = jest.fn();
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          selectedIds: 'exercise-barbell-bench-press,exercise-missing',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository({ create }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: async () => [
                buildExercise({ id: 'exercise-barbell-bench-press' }),
              ],
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          selectedExerciseLoadStatus: 'error',
        },
        fieldErrors: {
          exercises:
            '找不到已选择的动作：exercise-missing。请重新打开动作库后再试。',
        },
      });
    });

    await act(async () => {
      await result.current.controls.save();
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('clears stale missing-exercise field errors after selected exercises load', async () => {
    let params = {};
    const getSelectedByIds = jest.fn(async () => [
      buildExercise({ id: 'exercise-barbell-bench-press' }),
    ]);
    const { result, rerender } = await renderHook(() =>
      useWorkoutTemplateCreate(params, {
        initializeDatabase: async () => buildStartupResult(),
        createWorkoutTemplateRepository: () => buildWorkoutTemplateRepository(),
        createExerciseRepository: () =>
          buildExerciseRepository({
            getSelectedByIds,
          }),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    await act(async () => {
      await result.current.controls.save();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      fieldErrors: {
        exercises: '至少添加一个动作后才能保存模板。',
      },
    });

    params = {
      selectedIds: 'exercise-barbell-bench-press',
    };
    await rerender(undefined);

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          selectedExerciseLoadStatus: 'ready',
          selectedExercises: [
            expect.objectContaining({
              id: 'exercise-barbell-bench-press',
            }),
          ],
        },
        fieldErrors: {
          exercises: undefined,
        },
      });
    });
  });

  it('retries database initialization while preserving draft route values', async () => {
    const initializeDatabase = jest
      .fn<Promise<DatabaseStartupResult>, []>()
      .mockResolvedValueOnce({
        status: 'error',
        error: {
          code: 'database_open_failed',
          message: 'sqlite failed',
        },
      })
      .mockResolvedValueOnce(buildStartupResult());
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          draftDescription: 'Chest day',
          selectedIds: 'exercise-barbell-bench-press',
        },
        {
          initializeDatabase,
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository(),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: async () => [
                buildExercise({ id: 'exercise-barbell-bench-press' }),
              ],
            }),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'error',
        draft: {
          name: 'Push',
          description: 'Chest day',
          selectedExerciseIds: ['exercise-barbell-bench-press'],
        },
      });
    });

    await act(async () => {
      result.current.controls.reload();
    });

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        draft: {
          name: 'Push',
          description: 'Chest day',
          selectedExerciseLoadStatus: 'ready',
          selectedExercises: [
            expect.objectContaining({
              id: 'exercise-barbell-bench-press',
            }),
          ],
        },
      });
    });
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
  });

  it('keeps draft after save failure and allows retry', async () => {
    const exercise = buildExercise();
    const create = jest
      .fn()
      .mockRejectedValueOnce(new Error('sqlite failed'))
      .mockResolvedValueOnce(
        createWorkoutTemplate({
          id: 'template-push',
          name: 'Push',
          status: 'active',
          exercises: [],
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        }),
      );
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          selectedIds: 'exercise-default',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository({ create }),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: async () => [exercise],
            }),
          now: () => '2026-07-16T00:00:00.000Z',
          createId: createSequencedIdFactory([
            'template-push',
            'template-exercise-bench',
            'template-push-retry',
            'template-exercise-bench-retry',
          ]),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(result.current.state.draft.selectedExercises).toHaveLength(1);
    });

    await act(async () => {
      await result.current.controls.save();
    });
    expect(result.current.state).toMatchObject({
      status: 'ready',
      draft: {
        name: 'Push',
      },
      saveError: '训练模板保存失败。当前输入仍保留，请重新保存。',
    });

    await act(async () => {
      await result.current.controls.save();
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does not require exit confirmation after save succeeds', async () => {
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
          selectedIds: 'exercise-default',
        },
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository(),
          createExerciseRepository: () =>
            buildExerciseRepository({
              getSelectedByIds: async () => [buildExercise()],
            }),
          now: () => '2026-07-16T00:00:00.000Z',
          createId: createSequencedIdFactory([
            'template-push',
            'template-exercise-default',
          ]),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
      expect(result.current.controls.shouldConfirmExit()).toBe(true);
    });

    await act(async () => {
      await result.current.controls.save();
    });

    expect(result.current.controls.shouldConfirmExit()).toBe(false);
  });

  it('requires exit confirmation for a dirty draft while initialization is loading', async () => {
    const initializeDatabase = createDeferred<DatabaseStartupResult>();
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
        },
        {
          initializeDatabase: () => initializeDatabase.promise,
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository(),
          createExerciseRepository: () => buildExerciseRepository(),
        },
      ),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe('loading');
      expect(result.current.controls.shouldConfirmExit()).toBe(true);
    });

    let canExit = true;
    await act(async () => {
      canExit = result.current.controls.requestExit();
    });

    expect(canExit).toBe(false);
    expect(result.current.state).toMatchObject({
      status: 'loading',
      isConfirmingDiscard: true,
    });
  });

  it('requires exit confirmation for a dirty draft after initialization fails', async () => {
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {
          draftName: 'Push',
        },
        {
          initializeDatabase: async () => ({
            status: 'error',
            error: {
              code: 'database_open_failed',
              message: 'sqlite failed',
            },
          }),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository(),
          createExerciseRepository: () => buildExerciseRepository(),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
      expect(result.current.controls.shouldConfirmExit()).toBe(true);
    });

    let canExit = true;
    await act(async () => {
      canExit = result.current.controls.requestExit();
    });

    expect(canExit).toBe(false);
    expect(result.current.state).toMatchObject({
      status: 'error',
      isConfirmingDiscard: true,
    });
  });

  it('shows unsaved exit confirmation only when the draft is dirty', async () => {
    const { result } = await renderHook(() =>
      useWorkoutTemplateCreate(
        {},
        {
          initializeDatabase: async () => buildStartupResult(),
          createWorkoutTemplateRepository: () =>
            buildWorkoutTemplateRepository(),
          createExerciseRepository: () => buildExerciseRepository(),
        },
      ),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });
    let canExit = false;

    await act(async () => {
      canExit = result.current.controls.requestExit();
    });
    expect(canExit).toBe(true);

    await act(async () => {
      result.current.controls.updateName('Push');
    });
    await act(async () => {
      canExit = result.current.controls.requestExit();
    });
    expect(canExit).toBe(false);
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'ready',
        isConfirmingDiscard: true,
      });
    });
  });
});

describe('WorkoutTemplateCreateContent', () => {
  it('renders fields, selected exercises, add action, and save action', async () => {
    const save = jest.fn(async () => ({
      status: 'saved' as const,
      template: buildTemplate(),
    }));
    const onAddExercise = jest.fn();
    const href = {
      pathname: '/exercises',
      params: {
        mode: 'select',
        context: 'template',
        returnTo: '/templates/new',
      },
    } as const;
    const { getByText, getByLabelText } = await render(
      <WorkoutTemplateCreateContent
        state={buildReadyState({
          draft: {
            name: 'Push',
            description: 'Chest day',
            selectedExerciseIds: ['exercise-barbell-bench-press' as ExerciseId],
            selectedExerciseLoadStatus: 'ready',
            selectedExercises: [
              buildExercise({
                id: 'exercise-barbell-bench-press',
                nameZh: '杠铃卧推',
                primaryMuscleGroup: 'chest',
                equipment: 'barbell',
              }),
            ],
          },
        })}
        controls={buildCreateControls({
          createExerciseSelectionHref: () => href,
          save,
        })}
        onAddExercise={onAddExercise}
        onExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByLabelText('训练模板名称')).toBeTruthy();
    expect(getByLabelText('训练模板描述')).toBeTruthy();
    expect(getByText('杠铃卧推')).toBeTruthy();
    expect(getByText('胸 · 杠铃 · 3 组 · 8–10 次 · 90 秒')).toBeTruthy();

    await fireEvent.press(getByLabelText('从动作库添加动作'));
    await fireEvent.press(getByLabelText('保存训练模板'));

    expect(onAddExercise).toHaveBeenCalledWith(href);
    expect(save).toHaveBeenCalled();
  });

  it('confirms before leaving a dirty draft', async () => {
    const onExit = jest.fn();
    const { getByText, getByLabelText, queryByText } = await render(
      <WorkoutTemplateCreateContent
        state={buildReadyState({
          isConfirmingDiscard: true,
          draft: {
            name: 'Push',
            description: '',
            selectedExerciseIds: [],
            selectedExerciseLoadStatus: 'ready',
            selectedExercises: [],
          },
        })}
        controls={buildCreateControls()}
        onAddExercise={jest.fn()}
        onExit={onExit}
        onConfirmExit={onExit}
      />,
    );

    expect(getByText('放弃创建模板？')).toBeTruthy();

    await fireEvent.press(getByLabelText('继续编辑训练模板'));
    await fireEvent.press(getByLabelText('放弃创建训练模板'));

    expect(queryByText('放弃创建模板？')).toBeTruthy();
    expect(onExit).toHaveBeenCalled();
  });

  it('renders discard confirmation while loading or initialization error is shown', async () => {
    const controls = buildCreateControls();
    const { getByLabelText, rerender } = await render(
      <WorkoutTemplateCreateContent
        state={{
          status: 'loading',
          draft: {
            name: 'Push',
            description: '',
            selectedExerciseIds: [],
            selectedExerciseLoadStatus: 'ready',
            selectedExercises: [],
          },
          isConfirmingDiscard: true,
          isExitAuthorized: false,
          isSaved: false,
        }}
        controls={controls}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByLabelText('放弃创建训练模板')).toBeTruthy();

    rerender(
      <WorkoutTemplateCreateContent
        state={{
          status: 'error',
          draft: {
            name: 'Push',
            description: '',
            selectedExerciseIds: [],
            selectedExerciseLoadStatus: 'ready',
            selectedExercises: [],
          },
          message: '训练模板保存失败。当前输入仍保留，请重新保存。',
          isConfirmingDiscard: true,
          isExitAuthorized: false,
          isSaved: false,
        }}
        controls={controls}
        onAddExercise={jest.fn()}
        onExit={jest.fn()}
        onConfirmExit={jest.fn()}
      />,
    );

    expect(getByLabelText('放弃创建训练模板')).toBeTruthy();
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

function buildExercise(overrides: Partial<ExerciseInput> = {}): Exercise {
  return createExercise({
    id: 'exercise-default',
    slug: 'exercise-default',
    nameZh: '默认动作',
    nameEn: 'Default Exercise',
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

function buildWorkoutTemplateRepository(
  overrides: Partial<WorkoutTemplateRepository> = {},
): WorkoutTemplateRepository {
  return {
    list: async () => [],
    getById: async () => null,
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
    Extract<WorkoutTemplateCreateContentProps['state'], { status: 'ready' }>
  > = {},
): Extract<WorkoutTemplateCreateContentProps['state'], { status: 'ready' }> {
  return {
    status: 'ready',
    draft: {
      name: '',
      description: '',
      selectedExerciseIds: [],
      selectedExercises: [],
      selectedExerciseLoadStatus: 'ready',
    },
    fieldErrors: {},
    isSaving: false,
    isConfirmingDiscard: false,
    isExitAuthorized: false,
    isSaved: false,
    ...overrides,
  };
}

function buildCreateControls(
  overrides: Partial<WorkoutTemplateCreateContentProps['controls']> = {},
): WorkoutTemplateCreateContentProps['controls'] {
  return {
    updateName: jest.fn(),
    updateDescription: jest.fn(),
    createExerciseSelectionHref: jest.fn(
      () =>
        ({
          pathname: '/exercises',
          params: {
            mode: 'select',
            context: 'template',
            returnTo: '/templates/new',
          },
        }) as const,
    ),
    save: jest.fn(async () => ({
      status: 'invalid' as const,
      fieldErrors: {},
    })),
    reload: jest.fn(),
    shouldConfirmExit: jest.fn(() => false),
    requestExit: jest.fn(() => false),
    cancelExit: jest.fn(),
    confirmExit: jest.fn(),
    ...overrides,
  };
}

function createSequencedIdFactory(
  ids: readonly string[],
): (kind: 'template' | 'templateExercise') => string {
  let index = 0;

  return () => ids[index++] ?? `generated-${index}`;
}

function buildTemplate(): WorkoutTemplate {
  return createWorkoutTemplate({
    id: 'template-push',
    name: 'Push',
    status: 'active',
    exercises: [],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  });
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
