# Sprint 14 Today Plan Modal and Interaction Polish

状态：PASS  
日期：2026-07-28

## Scope

本次只调整 Today 添加计划 Modal 与今日计划卡片交互，不修改 WorkoutTemplate、Database Schema、Migration 或历史训练事实。

## Changes

- 添加计划 Modal 从“点选立即添加”调整为“先多选模板，再点击更新训练计划”。
- 已添加到今日计划的模板在 Modal 中保持禁用，避免同一模板同日重复添加。
- Modal 支持关闭时清空本地选择状态。
- 今日计划卡片主体仍进入 Today Plan 详情 / 编辑当前训练草稿。
- 今日计划卡片右侧按钮仍负责开始 / 继续训练；已完成计划保持不可重复开始。

## Tests

新增 / 更新覆盖：

- 选择多个模板后统一更新今日训练计划。
- 已添加模板在添加计划 Modal 中不可重复选择。
- 今日计划卡片主体点击不创建 Session。
- 今日计划开始按钮创建并进入训练。
- 已完成计划保持禁用。

## Validation

- `pnpm --filter mobile test -- today-dashboard.test.tsx --watchAll=false`：PASS
- `pnpm format:check`：PASS
- `pnpm lint`：PASS
- `pnpm typecheck`：PASS
- `pnpm test`：PASS
- `git diff --check`：PASS

完整测试结果：

- Test Suites: 50 passed, 50 total
- Tests: 519 passed, 519 total

## Acceptance Criteria

- Today 添加计划符合 S14-00 差距清单中的 Modal 交互方向：PASS
- 同一模板一天只能添加一次的现有规则保持不变：PASS
- 编辑此次训练仍只修改当前 Session 草稿，不影响模板：PASS
- 添加 / 开始 / 已完成状态均有测试覆盖：PASS

## Next Task

可以进入：

`tasks/sprint-14-post-release-ux-polish/S14-03-workout-pause-and-rest-visual-polish.md`
