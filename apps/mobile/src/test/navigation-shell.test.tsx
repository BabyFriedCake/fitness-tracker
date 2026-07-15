/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { TOP_LEVEL_ROUTES, getTopLevelRoute } from '@/constants/routes';

describe('navigation shell', () => {
  it('defines the five V1 top-level routes with Today first', () => {
    expect(TOP_LEVEL_ROUTES.map((route) => route.title)).toEqual([
      '今天',
      '训练',
      '动作库',
      '历史',
      '设置',
    ]);
    expect(TOP_LEVEL_ROUTES[0].href).toBe('/');
  });

  it('renders Chinese placeholder copy for a top-level route', async () => {
    const { getByText } = await render(
      <PlaceholderScreen route={getTopLevelRoute('settings')} />,
    );

    expect(getByText('设置')).toBeTruthy();
    expect(getByText('导航占位页，后续任务实现偏好与数据管理。')).toBeTruthy();
  });
});
