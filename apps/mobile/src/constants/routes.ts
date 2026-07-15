export type TopLevelRouteKey =
  'today' | 'templates' | 'exercises' | 'history' | 'settings';

export type TopLevelRoute = {
  readonly key: TopLevelRouteKey;
  readonly name: 'index' | 'templates' | 'exercises' | 'history' | 'settings';
  readonly href: '/' | '/templates' | '/exercises' | '/history' | '/settings';
  readonly title: string;
  readonly note: string;
};

export const TOP_LEVEL_ROUTES = [
  {
    key: 'today',
    name: 'index',
    href: '/',
    title: '今天',
    note: '导航占位页，后续任务实现今日训练入口。',
  },
  {
    key: 'templates',
    name: 'templates',
    href: '/templates',
    title: '训练',
    note: '导航占位页，后续任务实现训练模板入口。',
  },
  {
    key: 'exercises',
    name: 'exercises',
    href: '/exercises',
    title: '动作库',
    note: '导航占位页，后续任务实现动作浏览与选择。',
  },
  {
    key: 'history',
    name: 'history',
    href: '/history',
    title: '历史',
    note: '导航占位页，后续任务实现训练历史。',
  },
  {
    key: 'settings',
    name: 'settings',
    href: '/settings',
    title: '设置',
    note: '导航占位页，后续任务实现偏好与数据管理。',
  },
] as const satisfies readonly TopLevelRoute[];

export function getTopLevelRoute(key: TopLevelRouteKey): TopLevelRoute {
  return (
    TOP_LEVEL_ROUTES.find((route) => route.key === key) ?? TOP_LEVEL_ROUTES[0]
  );
}
