# S14-02 Today Plan Modal and Interaction Polish

状态：Completed

## 目标

根据 S14-00 审计结论，对 Today 添加计划 Modal 和计划卡片交互做小范围 Figma 对齐。

## 范围

- 添加计划 Modal 视觉与交互。
- 今日计划卡片主体 / 开始按钮分区。
- 已完成计划不可重复开始。
- 保持编辑此次训练进入 Session 草稿编辑页。

## 非范围

- 不修改 WorkoutTemplate。
- 不修改 Database Schema / Migration。
- 不实现删除 / 移除 TodayPlan。
- 不改变历史训练事实。

## 验收标准

- Today 添加计划符合已批准 Prototype / Figma 差距清单。
- 同一模板一天只能添加一次的现有规则保持不变。
- 编辑此次训练仍只修改当前 Session 草稿，不影响模板。
- 添加 / 开始 / 已完成状态均有测试覆盖。

## 验证命令

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`
