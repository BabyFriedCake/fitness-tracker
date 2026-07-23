# S6-07 Design System Integration

状态：Completed

## Goal

统一 Sprint 6 页面组件、交互状态和真机可用性。

## Scope

- 复用并统一 Button、List Row、Filter、Empty、Loading、Error。
- 对齐安全区、Dynamic Type、44pt 点击区域和可访问性标签。
- 检查 Exercise、History、Today 的视觉与状态一致性。
- 清除 Expo Demo 视觉残留中实际被页面引用的部分。

## Allowed Files

- `apps/mobile/src/components/`
- Sprint 6 已修改页面的样式与组件
- `docs/07-Design-System/`
- 对应组件测试

## Non-goals

- 不重新设计导航。
- 不修改 Domain、Schema、Migration 或 Runtime。
- 不增加装饰性动画或新依赖。

## Acceptance Criteria

- 页面无嵌套卡片和文本溢出。
- 控件状态和可访问性一致。
- Loading、Empty、Error 不引发布局跳动。
- 深浅色和字体放大下内容可读。

## Tests

- Component rendering
- Accessibility labels and disabled state
- Existing navigation regression
- Desktop/mobile viewport visual inspection where available

## Risks

- 样式调整引入快照或布局回归。
