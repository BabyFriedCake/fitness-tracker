import { z } from 'zod';

export const templateStatusSchema = z.enum([
  'draft',
  'review',
  'published',
  'archived',
]);

const templateExerciseSchema = z.object({
  exerciseId: z.string().trim().min(1),
  sets: z.number().int().positive(),
  targetReps: z.number().int().positive(),
  restSeconds: z.number().int().nonnegative(),
  weightKg: z.number().nonnegative().optional(),
});

export const templateInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim(),
  exercises: z.array(templateExerciseSchema).min(1),
});

export type TemplateStatus = z.infer<typeof templateStatusSchema>;
export type TemplateInput = z.infer<typeof templateInputSchema>;
export type PublicTemplate = TemplateInput & {
  id: string;
  version: number;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export class InvalidTemplateStatusTransitionError extends Error {
  constructor(
    readonly from: TemplateStatus,
    readonly to: TemplateStatus,
  ) {
    super(`Template status cannot change from ${from} to ${to}.`);
    this.name = 'InvalidTemplateStatusTransitionError';
  }
}

const transitions: Record<TemplateStatus, readonly TemplateStatus[]> = {
  draft: ['review'],
  review: ['draft', 'published'],
  published: ['archived'],
  archived: [],
};

export const transitionTemplateStatus = (
  template: PublicTemplate,
  status: TemplateStatus,
  now = new Date().toISOString(),
): PublicTemplate => {
  if (!transitions[template.status].includes(status)) {
    throw new InvalidTemplateStatusTransitionError(template.status, status);
  }

  return {
    ...template,
    status,
    version: template.version + 1,
    updatedAt: now,
  };
};

export interface PublicTemplateRepository {
  list(): Promise<PublicTemplate[]>;
  get(id: string): Promise<PublicTemplate | undefined>;
  create(input: TemplateInput, now?: string): Promise<PublicTemplate>;
  update(id: string, input: Partial<TemplateInput>, now?: string): Promise<PublicTemplate>;
  transition(id: string, status: TemplateStatus, now?: string): Promise<PublicTemplate>;
}

export class InMemoryPublicTemplateRepository implements PublicTemplateRepository {
  private readonly templates = new Map<string, PublicTemplate>();

  async list() {
    return [...this.templates.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  async get(id: string) {
    return this.templates.get(id);
  }

  async create(input: TemplateInput, now = new Date().toISOString()) {
    const id = crypto.randomUUID();
    const template: PublicTemplate = {
      ...input,
      id,
      version: 1,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(id, template);
    return template;
  }

  async update(id: string, input: Partial<TemplateInput>, now = new Date().toISOString()) {
    const current = await this.require(id);
    if (current.status === 'published' || current.status === 'archived') {
      throw new Error('Published or archived templates cannot be edited directly.');
    }

    const next: PublicTemplate = {
      ...current,
      ...input,
      version: current.version + 1,
      updatedAt: now,
    };
    this.templates.set(id, next);
    return next;
  }

  async transition(id: string, status: TemplateStatus, now?: string) {
    const next = transitionTemplateStatus(await this.require(id), status, now);
    this.templates.set(id, next);
    return next;
  }

  private async require(id: string) {
    const template = await this.get(id);
    if (!template) {
      throw new Error('Template not found.');
    }
    return template;
  }
}
