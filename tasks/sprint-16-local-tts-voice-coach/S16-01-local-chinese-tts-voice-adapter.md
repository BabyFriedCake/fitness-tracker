# S16-01 Local Chinese TTS Voice Adapter

状态：In Progress

## Goal

将现有 `WorkoutVoiceFeedbackAdapter` 接入设备本地中文 TTS，使训练页能够播报真实
训练反馈，而不改变 Workout Runtime、WorkoutSet 或 Companion Event Source 的职责。

## Read First

1. `AGENTS.md`
2. `workflow/prompts/implement-task.md`
3. `workflow/prompts/self-review.md`
4. `docs/03-PRD/PRD.md`
5. `docs/04-Architecture/architecture.md`
6. `docs/05-Prototype/P004-Workout.md`
7. `docs/05-Prototype/P011-Voice-Coach.md`
8. `docs/07-Design-System/workout-ui.md`
9. `apps/mobile/src/features/workout-session/application/workout-voice-feedback.ts`
10. `apps/mobile/src/features/workout-session/application/use-workout-session-screen.ts`

## Scope

- 使用与 Expo SDK 兼容的 `expo-speech`。
- 在 infrastructure / service 边界实现 `WorkoutVoiceFeedbackAdapter`。
- 默认使用 `zh-CN` 系统语音。
- 将真实 adapter 注入训练页既有 `useWorkoutSessionScreen` 依赖。
- 对训练次数、组完成、动作完成和休息开始等已有反馈事件进行本地播报。
- 在新反馈到来时停止或覆盖旧播报，避免高频计数形成过期队列。
- 语音关闭、平台不支持、播放失败均保持现有降级语义。
- 更新 P011、Roadmap 与任务状态。

## Non-goals

- 不修改 Workout Runtime 状态机。
- 不修改 Domain、Schema、Migration、Repository 或 WorkoutSet。
- 不实现语音识别、麦克风、Camera、Pose Detection 或 AI 计数。
- 不实现后台播放、锁屏控制、通知播报或音频录制。
- 不新增语音设置持久化；继续使用现有会话级 Voice Coach 开关。

## Acceptance Criteria

- 真机训练页使用本地中文 TTS 播报已有的真实训练反馈。
- TTS adapter 不直接创建或修改 WorkoutSet、SessionExercise、RestTimer 或 Runtime 状态。
- 新反馈不会无限堆积语音队列。
- 关闭 Voice Coach 后不得调用原生播报。
- 语音失败不回滚训练事实，也不显示原始平台错误。
- iOS 静音模式导致系统不出声时，训练仍可完成；该限制在文档中明确记录。

## Tests

- TTS adapter 中文语言、覆盖策略和失败映射测试。
- 训练页默认注入真实 adapter 的绑定测试。
- Voice Coach 关闭时不调用 adapter 的回归测试。
- 既有训练持久化和语音失败隔离测试继续通过。

## Validation

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```
