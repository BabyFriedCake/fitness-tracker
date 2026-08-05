# S14-03 Workout Pause and Rest Visual Polish

状态：Completed

## 目标

根据 S14-00 审计结论，收敛 Workout 暂停页、休息页和运行控制的 Figma 视觉差距。

## 范围

- Workout running 控制区视觉细节。
- Paused 全屏状态。
- Rest Timer 页面视觉与下一组信息。
- 训练页动作图片 / 稳定占位展示。

## 非范围

- 不修改 Workout Runtime 状态机。
- 不修改 WorkoutSet 历史事实。
- 不新增真实 AI / Voice Engine。
- 不修改 Database Schema / Migration。

## 验收标准

- running / paused / resting 三类状态符合 Design System。
- 暂停期间不推进 Rep。
- Rest Timer 到期或跳过后恢复原训练位置。
- 现有 Runtime 测试继续通过，并补充必要 UI 回归测试。

## 验证命令

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`
