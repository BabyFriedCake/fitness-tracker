import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('public template API', () => {
  it('creates and publishes a template through the API boundary', async () => {
    const app = buildApp();
    const createdResponse = await app.inject({
      method: 'POST',
      url: '/admin/templates',
      payload: {
        name: '下肢力量',
        description: '基础下肢训练',
        exercises: [
          {
            exerciseId: 'exercise-squat',
            sets: 3,
            targetReps: 8,
            restSeconds: 90,
          },
        ],
      },
    });
    const created = createdResponse.json<{ id: string }>();

    await app.inject({
      method: 'POST',
      url: `/admin/templates/${created.id}/status`,
      payload: { status: 'review' },
    });
    const publishedResponse = await app.inject({
      method: 'POST',
      url: `/admin/templates/${created.id}/status`,
      payload: { status: 'published' },
    });

    expect(publishedResponse.statusCode).toBe(200);
    expect(publishedResponse.json()).toMatchObject({ status: 'published' });
    await app.close();
  });
});
