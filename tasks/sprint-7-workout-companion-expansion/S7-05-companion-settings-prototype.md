# S7-05 Companion Settings Prototype

状态：Done

## Goal

提供 Workout Companion 当前版本可用的轻量设置入口，限定为本地会话级或
原型级配置，不引入持久化 UserSetting。

## Scope

- 展示当前 Companion 能力：
  - Voice Coach 开关。
  - Input Source：关闭 / Mock。
- 设置只影响当前训练页面会话。
- 未支持能力显示稳定中文说明。

## Non-goals

- 不实现持久化设置。
- 不实现系统权限申请。
- 不实现真实 Voice Engine、Camera、Pose Detection 或 AI。
- 不修改 Database Schema / Migration。

## Acceptance Criteria

- [ ] 用户能看到当前 Companion 输入源状态。
- [ ] 用户能理解 Mock 与真实识别的区别。
- [ ] 设置变化不改历史训练事实。
- [ ] 未支持能力不出现可误导的入口。

## Tests

- 设置面板展示当前状态。
- 切换只影响当前页面会话。
- 未支持能力文案稳定。
