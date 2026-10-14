import { describe, expect, it } from 'vitest';
import {
  InMemoryPublicTemplateRepository,
  InvalidTemplateStatusTransitionError,
  transitionTemplateStatus,
} from './templates.js';

const input = {
  name: '下肢力量',
  description: '基础下肢训练',
  exercises: [
    {
      exerciseId: 'exercise-squat',
      sets: 3,
      targetReps: 8,
      restSeconds: 90,
      weightKg: 40,
    },
  ],
};

describe('public WorkoutTemplate content', () => {
  it('publishes a versioned template without changing its snapshot identity', async () => {
    const repository = new InMemoryPublicTemplateRepository();
    const created = await repository.create(input, '2026-08-05T00:00:00.000Z');
    const review = await repository.transition(created.id, 'review');
    const published = await repository.transition(created.id, 'published');

    expect(published).toMatchObject({
      id: created.id,
      status: 'published',
      version: 3,
      exercises: input.exercises,
    });
    expect(review.version).toBe(2);
  });

  it('rejects editing a published template', async () => {
    const repository = new InMemoryPublicTemplateRepository();
    const created = await repository.create(input);
    const published = transitionTemplateStatus(
      transitionTemplateStatus(created, 'review'),
      'published',
    );
    await repository.transition(created.id, 'review');
    await repository.transition(created.id, 'published');

    expect(() => transitionTemplateStatus(published, 'draft')).toThrow(
      InvalidTemplateStatusTransitionError,
    );
    await expect(
      repository.update(created.id, { name: '被禁止修改' }),
    ).rejects.toThrow('cannot be edited directly');
  });
});
