import { z } from 'zod';

export const exerciseStatusSchema = z.enum([
  'draft',
  'review',
  'published',
  'archived',
]);

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1),
  muscleGroup: z.string().trim().min(1),
  equipment: z.string().trim().min(1),
  difficulty: z.string().trim().min(1),
  instruction: z.string().trim().min(1),
  imageUri: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1),
  sourceId: z.string().trim().min(1),
  license: z.string().trim().min(1),
});

export const exercisePatchSchema = exerciseInputSchema.partial();

export type ExerciseStatus = z.infer<typeof exerciseStatusSchema>;
export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
export type PublicExercise = ExerciseInput & {
  id: string;
  version: number;
  status: ExerciseStatus;
  createdAt: string;
  updatedAt: string;
};

const allowedTransitions: Record<ExerciseStatus, readonly ExerciseStatus[]> = {
  draft: ['review'],
  review: ['draft', 'published'],
  published: ['archived'],
  archived: [],
};

export class InvalidExerciseStatusTransitionError extends Error {
  constructor(
    readonly from: ExerciseStatus,
    readonly to: ExerciseStatus,
  ) {
    super(`Exercise status cannot change from ${from} to ${to}.`);
    this.name = 'InvalidExerciseStatusTransitionError';
  }
}

export const transitionExerciseStatus = (
  exercise: PublicExercise,
  status: ExerciseStatus,
  now = new Date().toISOString(),
): PublicExercise => {
  if (!allowedTransitions[exercise.status].includes(status)) {
    throw new InvalidExerciseStatusTransitionError(exercise.status, status);
  }

  return {
    ...exercise,
    status,
    version: exercise.version + 1,
    updatedAt: now,
  };
};

export interface PublicExerciseRepository {
  list(): Promise<PublicExercise[]>;
  get(id: string): Promise<PublicExercise | undefined>;
  create(input: ExerciseInput, now?: string): Promise<PublicExercise>;
  update(id: string, input: Partial<ExerciseInput>, now?: string): Promise<PublicExercise>;
  transition(id: string, status: ExerciseStatus, now?: string): Promise<PublicExercise>;
}

export class InMemoryPublicExerciseRepository implements PublicExerciseRepository {
  private readonly exercises = new Map<string, PublicExercise>();

  async list() {
    return [...this.exercises.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  async get(id: string) {
    return this.exercises.get(id);
  }

  async create(input: ExerciseInput, now = new Date().toISOString()) {
    const id = crypto.randomUUID();
    const exercise: PublicExercise = {
      ...input,
      id,
      version: 1,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.exercises.set(id, exercise);
    return exercise;
  }

  async update(id: string, input: Partial<ExerciseInput>, now = new Date().toISOString()) {
    const current = await this.require(id);
    if (current.status === 'published' || current.status === 'archived') {
      throw new Error('Published or archived exercises cannot be edited directly.');
    }

    const next: PublicExercise = {
      ...current,
      ...input,
      version: current.version + 1,
      updatedAt: now,
    };
    this.exercises.set(id, next);
    return next;
  }

  async transition(id: string, status: ExerciseStatus, now?: string) {
    const next = transitionExerciseStatus(await this.require(id), status, now);
    this.exercises.set(id, next);
    return next;
  }

  private async require(id: string) {
    const exercise = await this.get(id);
    if (!exercise) {
      throw new Error('Exercise not found.');
    }
    return exercise;
  }
}
