/// <reference types="jest" />

import { TOP_LEVEL_ROUTES } from '@/constants/routes';

describe('navigation shell', () => {
  it('defines the four primary top-level routes with Today first', () => {
    expect(TOP_LEVEL_ROUTES.map((route) => route.title)).toEqual([
      '今天',
      '训练',
      '动作库',
      '历史',
    ]);
    expect(TOP_LEVEL_ROUTES[0].href).toBe('/');
    expect(TOP_LEVEL_ROUTES).toHaveLength(4);
  });
});
