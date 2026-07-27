# S7-00-R6 Workout Runtime UI Figma Alignment

状态：Done

## Goal

按 Figma 对齐训练进行页、暂停页和休息页视觉与交互，同时保持 Sprint 5 Runtime、
Snapshot Recovery、Companion Runtime Flow 和 WorkoutSet 事实优先架构不变。

## Scope

- 调整 Workout Session Screen 的 running UI：
  - 动作图片或稳定占位。
  - 当前动作名称。
  - 当前组数。
  - 当前 Rep 进度。
  - 暂停主按钮。
  - 上一动作 / 下一动作按钮。
- 调整 paused UI：
  - 全屏暂停状态。
  - 继续按钮。
  - 结束训练入口。
  - 不保存 pending navigation action。
- 调整 resting UI：
  - 休息倒计时。
  - 下一组卡片。
  - 跳过休息入口。
- 保留现有 Runtime / Application Flow：
  - Rep 只来自 Companion Event Source。
  - SetCompleted / ExerciseCompleted 继续由真实持久化 WorkoutSet 后生成。
  - 上一 / 下一动作只调用现有 Application 控制，不直接修改 WorkoutSet。

## Allowed Files

- `apps/mobile/src/features/workout-session/screens/workout-session-screen.tsx`
- `apps/mobile/src/features/workout-session/__tests__/workout-session-screen.test.tsx`
- 本任务文件
- `tasks/sprint-7-workout-companion-expansion/README.md`

## Non-goals

- 不修改 Domain Model。
- 不修改 Database Schema / Migration。
- 不修改 Repository。
- 不修改 Runtime 状态机。
- 不实现 Camera / Pose Detection。
- 不实现正式 Auto Rep Counter。
- 不实现 TTS 或 AI。
- 不新增手动 Rep 增减入口。

## Acceptance Criteria

- [ ] running 页面展示动作图片、动作名、当前组、Rep 进度、暂停、上一动作、下一动作。
- [ ] paused 页面展示全屏暂停状态，继续后恢复原 Runtime 位置。
- [ ] resting 页面展示 Figma 风格倒计时、下一组卡片和跳过休息入口。
- [ ] pending 状态禁用训练交互并显示稳定文案。
- [ ] 页面不提供手动次数或手动完成组入口。
- [ ] 所有训练事实仍通过 Application Flow 持久化。

## Tests

- running UI 展示当前动作、Rep 进度和三个底部控制。
- paused UI 展示全屏暂停状态，并调用继续。
- resting UI 展示倒计时、下一组卡片和跳过休息。
- 上一 / 下一动作按钮调用现有 `selectExercise`，边界状态禁用。
- pending 状态不展示可用训练控制。

## Validation

完成后执行：

- `pnpm test -- workout-session-screen`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`

不要执行：

- `git add`
- `git commit`
- `git push`
