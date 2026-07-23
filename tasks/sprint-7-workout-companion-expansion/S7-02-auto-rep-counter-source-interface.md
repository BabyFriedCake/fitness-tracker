# S7-02 Auto Rep Counter Source Interface

状态：Done

## Goal

为未来自动次数识别提供最小输入源接口和 Mock 实现，使后续 Camera / Pose /
Voice 识别都通过现有 `WorkoutCompanionEventSource` 输出 `RepCompleted`
事件，而不是直接修改 Runtime。

## Scope

- 复用现有 `WorkoutCompanionEventSource`。
- 增加受控 Mock Auto Rep Source：
  - 可订阅 / 取消订阅。
  - 可按当前 Session / SessionExercise 生成下一次 Rep 事件。
  - `unsubscribe()` 可重复调用。
  - 未订阅时不派发事件。
- 增加测试覆盖事件 shape、顺序、取消订阅和 runtime validation。

## Allowed Files

- `apps/mobile/src/features/workout-session/application/workout-companion-event-source.ts`
- `apps/mobile/src/features/workout-session/__tests__/workout-companion-event-source.test.ts`
- 本任务文件
- `tasks/sprint-7-workout-companion-expansion/README.md`

## Non-goals

- 不实现 Camera。
- 不实现 Pose Detection。
- 不实现 Voice Recognition。
- 不实现 AI Rep Counter。
- 不修改 Runtime 状态机。
- 不新增 `WorkoutFeedbackEvent`。
- 不修改 Database Schema / Migration。
- 不修改 UI Layout。

## Acceptance Criteria

- [ ] Mock Auto Rep Source 输出现有 `WorkoutCompanionRepCompletedEvent`。
- [ ] 事件 `source` 固定为 `companion_event_source`。
- [ ] 连续触发时 repNumber 按顺序递增。
- [ ] 未订阅或取消订阅后不派发事件。
- [ ] 生成事件可通过现有 validation。
- [ ] 不绕过 Runtime 或 Repository。

## Tests

- Mock source subscribe / unsubscribe。
- emitNextRep 生成合规事件。
- 多次 emit 顺序递增。
- unsubscribe 后不再派发。
- 生成事件可被 `validateWorkoutCompanionRepCompletedEvent` 接受。

## Validation

完成后执行：

- `pnpm test -- workout-companion-event-source`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`
