# S7-01 Voice Coach Runtime Control

状态：Done

## Goal

在训练页提供 Voice Coach 状态展示和开关控制，复用现有
`WorkoutFeedbackEvent`、`WorkoutVoiceFeedbackEvent` 和注入式
`WorkoutVoiceFeedbackAdapter`。

## Scope

- 在 Workout Session ready state 中维护本次页面会话的 Voice Coach 开关。
- 训练页展示：
  - 语音教练状态：开启 / 关闭
  - 当前反馈文案
  - 开启 / 关闭按钮
- 开关关闭时不得调用 `voiceAdapter.speak()`。
- 开关开启后继续复用已有 Rep / Set / Exercise / RestTimer 反馈事件。

## Allowed Files

- `apps/mobile/src/features/workout-session/application/use-workout-session-screen.ts`
- `apps/mobile/src/features/workout-session/screens/workout-session-screen.tsx`
- `apps/mobile/src/features/workout-session/__tests__/workout-session-screen.test.tsx`
- 本任务文件
- `tasks/sprint-7-workout-companion-expansion/README.md`

## Non-goals

- 不实现真实 TTS 引擎。
- 不实现麦克风、摄像头、姿态识别或 AI 计数。
- 不新增 `WorkoutFeedbackEvent` 类型。
- 不修改 Snapshot Validation contract。
- 不修改 Database Schema / Migration。
- 不实现持久化 UserSetting；持久化设置属于后续 Settings 任务。

## Acceptance Criteria

- [ ] 训练页展示 Voice Coach 当前开关状态。
- [ ] 用户可以在训练中关闭语音反馈。
- [ ] 关闭后 Rep / Set / RestTimer 反馈不得调用 voice adapter。
- [ ] 用户可以重新开启语音反馈。
- [ ] 开启后继续复用现有反馈事件和消息映射。
- [ ] Runtime 状态机和 WorkoutSet 持久化不受影响。

## Tests

- Voice Coach 开关 UI 展示。
- 点击关闭后状态更新。
- 关闭后 Companion Rep 不调用 `voiceAdapter.speak()`。
- 重新开启后 Companion Rep 恢复调用 `voiceAdapter.speak()`。

## Validation

完成后执行：

- `pnpm test -- workout-session-screen`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`
