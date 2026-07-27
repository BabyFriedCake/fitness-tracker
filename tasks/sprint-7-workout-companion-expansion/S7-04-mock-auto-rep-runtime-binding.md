# S7-04 Mock Auto Rep Runtime Binding

状态：Done

## Goal

将 Mock Auto Rep Source 作为开发/演示输入源接入 Workout Session 页面，
用于验证“用户不手动点次数”的陪练流程。

## Scope

- 在训练页提供 Mock 自动计数触发入口或开发开关。
- 触发后通过 Event Source 产生 `RepCompleted`。
- Rep 必须经过现有 validation 和 Runtime Flow。
- 达到目标次数后继续使用真实 WorkoutSet 持久化流程。

## Non-goals

- 不实现真实自动识别。
- 不绕过 Runtime。
- 不提供手动完成组入口。
- 不修改 Schema / Migration。

## Acceptance Criteria

- [ ] Mock Rep 触发后 Runtime completedReps 增加。
- [ ] 达到目标后真实持久化 WorkoutSet。
- [ ] paused / resting / pending 状态下 Mock Rep 不推进。
- [ ] 不产生重复 Set。

## Tests

- mock rep 推进 runtime。
- target reps 后持久化 set。
- pending 状态拒绝事件。
- pause/rest 状态拒绝事件。
