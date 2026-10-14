import { describe, expect, it } from 'vitest';
import {
  InvalidExerciseStatusTransitionError,
  InMemoryPublicExerciseRepository,
  transitionExerciseStatus,
  type ExerciseInput,
} from './exercises.js';

const input: ExerciseInput = {
  name: '杠铃深蹲',
  muscleGroup: '腿',
  equipment: '杠铃',
  difficulty: '中级',
  instruction: '保持背部稳定。',
  imageUri: 'assets/images/exercises/0001.gif',
  source: 'exercises-dataset',
  sourceId: '0001',
  license: 'MIT',
};

describe('public Exercise content', () => {
  it('supports draft to review to published lifecycle', async () => {
    const repository = new InMemoryPublicExerciseRepository();
    const created = await repository.create(input, '2026-08-05T00:00:00.000Z');
    const review = await repository.transition(created.id, 'review');
    const published = await repository.transition(created.id, 'published');

    expect(review.status).toBe('review');
    expect(published.status).toBe('published');
    expect(published.version).toBe(3);
  });

  it('rejects illegal published to draft transition', async () => {
    const repository = new InMemoryPublicExerciseRepository();
    const created = await repository.create(input);
    const published = transitionExerciseStatus(
      transitionExerciseStatus(created, 'review'),
      'published',
    );

    expect(() => transitionExerciseStatus(published, 'draft')).toThrow(
      InvalidExerciseStatusTransitionError,
    );
  });
});
