# S5-07 Workout Companion UI Runtime Binding

## Task Goal

将已完成的 Workout Companion Runtime 与 Workout Session UI 绑定，使已验证的
Companion Event 能够按顺序推进 Runtime，并在页面上展示真实进度。

S5-07 只实现 Event Source 接口绑定，不实现具体识别引擎。

## Read First

1. `docs/04-Architecture/workout-companion-event-contract.md`
2. `docs/04-Architecture/workout-companion-event-source.md`
3. `docs/04-Architecture/workout-companion-runtime-event-architecture.md`
4. `docs/05-Prototype/P004-Workout.md`
5. `docs/05-Prototype/screens/P004-workout-session-state.md`
6. `docs/07-Design-System/workout-ui.md`
7. S5-06 Runtime Engine、Runtime Flow 和测试
8. 当前 Workout Session Hook、Screen 和测试

## Scope

- 在 Application/UI 边界定义并绑定 `WorkoutCompanionEventSource`。
- 验证外部 `RepCompleted` 事件。
- 将合法事件按顺序串行交给现有 Companion Runtime Flow。
- 将 Runtime Instance 的 phase、当前动作、组、Rep 进度和反馈映射到
  Workout Session UI。
- 保留并使用现有当前组实际重量草稿，不使用 Companion Event 填充默认重量。
- 绑定现有暂停、继续、WorkoutSet 持久化、Exercise 完成、
  RestTimer 和 Summary Flow。
- Runtime 替换、Session 变更和页面卸载时取消订阅。
- 使用受控 fake Event Source 增加 Hook/Screen 集成测试。

## Event Contract

```ts
type RepCompleted = {
  sessionId: WorkoutSessionId
  sessionExerciseId: SessionExerciseId
  repNumber: number
  timestamp: number
  source: 'companion_event_source'
}
```

只接受与当前 Runtime Session、SessionExercise 和下一 Rep 序号一致的事件。

## Runtime UI Binding

| Runtime phase | UI behavior |
| --- | --- |
| `running` | 展示当前动作、组、Rep 进度和教练反馈，允许暂停 |
| `paused` | 展示已暂停，允许继续 |
| `set_completion_pending` | 展示“正在确认本组完成”，禁止训练操作 |
| `resting` | 展示休息倒计时和下一组信息 |
| `exercise_completion_pending` | 展示“正在保存训练结果”，禁止训练操作 |
| `completed` | 进入现有 Workout Summary Flow |

## Behavior Requirements

- UI 不提供增加 Rep 或“完成本组”入口。
- UI 不使用 Timer 或假数据推进 Runtime。
- `RepCompleted` 必须通过现有 `onWorkoutCompanionRep()` 进入 Runtime/Application Flow。
- `SetCompleted` 只使用真实持久化 WorkoutSet 生成。
- WorkoutSet 必须使用当前已验证的实际重量；重量无效时不得持久化。
- 暂停和 pending phase 不得推进 Rep。
- 快速连续事件必须串行处理，不得丢失或重复持久化。
- 语音输出失败不得回滚 Runtime 或 WorkoutSet。
- 持久化失败保留可重试状态，不得自动伪造成功。

## Tests

增加定向测试：

- 订阅、Runtime/Session 替换和卸载取消订阅。
- running 状态的合法 Rep 按顺序更新 UI 和语音反馈。
- 无效 session、session exercise、rep number、timestamp 和 source 被拒绝。
- paused 和两个 pending phase 不推进 Rep。
- 达到目标次数时只持久化一个 WorkoutSet。
- 重量草稿的合法值、无效值和错误恢复。
- `resting`、`completed` 和两个 pending phase 的稳定 UI 文案。
- 持久化失败、语音失败和卸载后事件。

## Non-goals

- 不实现 Voice Engine、麦克风或声音识别。
- 不实现 Camera、Pose Detection 或 AI。
- 不修改 Snapshot Validation contract。
- 不修改 Database Schema 或 Migration。
- 不使用 Timer Simulation 实现生产训练。

## Acceptance Criteria

- 训练页面无手动 Rep 或完成组入口。
- 受控 Event Source 的合法事件按顺序推进 Runtime 和 UI。
- 无效事件、暂停和 pending phase 不推进训练。
- 目标 Rep 只生成一个真实 WorkoutSet 和一个 `SetCompleted`。
- 持久化使用当前已验证的实际重量，不填充伪造值。
- Runtime 六个 phase 均有正确 UI 映射。
- 暂停、恢复、休息和总结使用现有 Application Flow。
- Event Source 生命周期正确，卸载后不再更新状态。

## Validation

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

## Git

不执行 `git add`、`git commit` 或 `git push`。
