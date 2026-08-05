# Sprint 14 Workout Pause and Rest Visual Polish

状态：PASS  
日期：2026-07-28

## Scope

本次只调整 Workout running / paused / resting 的 UI 信息层级和稳定占位展示，不修改 Runtime 状态机、WorkoutSet 历史事实、Database Schema 或 Migration。

## Changes

- Paused 全屏状态补充当前动作上下文卡片。
- Paused 页面明确显示“暂停期间不会推进次数。”，与现有 Runtime 行为保持一致。
- Rest Timer 下一组缩略图补充稳定可访问标签，作为动作图片资源进入前的占位策略。
- Running / Resting / Paused 原有控制行为保持不变：
  - 暂停 / 继续。
  - 上一动作 / 下一动作。
  - 跳过休息。
  - Rest Timer 到期后恢复原训练位置。

## Tests

新增 / 更新覆盖：

- Paused 页面显示当前动作上下文。
- Paused 页面显示暂停期间不推进次数的稳定提示。
- Rest Timer 页面显示下一组动作示意图占位。
- 现有 Runtime hook 测试继续覆盖暂停 / 恢复 / 休息恢复位置。

## Validation

- `pnpm --filter mobile test -- workout-session-screen.test.tsx --watchAll=false`：PASS
- `pnpm format:check`：PASS
- `pnpm lint`：PASS
- `pnpm typecheck`：PASS
- `pnpm test`：PASS
- `git diff --check`：PASS

完整测试结果：

- Test Suites: 50 passed, 50 total
- Tests: 519 passed, 519 total

## Acceptance Criteria

- running / paused / resting 三类状态符合当前 Design System：PASS
- 暂停期间不推进 Rep：PASS
- Rest Timer 到期或跳过后恢复原训练位置：PASS
- 现有 Runtime 测试继续通过，并补充 UI 回归测试：PASS

## Known Limitation

动作图片仍使用稳定占位展示。真实动作图片资源授权、导入策略和包体积评估留给 S14-04。

## Next Task

可以进入：

`tasks/sprint-14-post-release-ux-polish/S14-04-exercise-media-asset-strategy.md`
