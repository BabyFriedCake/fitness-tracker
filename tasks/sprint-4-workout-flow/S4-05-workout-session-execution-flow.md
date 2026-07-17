# S4-05 — Workout Session Execution Flow

## Execution Prompt

执行前必须读取并遵守：

`workflow/prompts/implement-task.md`

同时检查：

- `docs/04-Architecture/domain-model.md`
- `tasks/sprint-4-workout-flow/S4-01-workout-session-domain.md`
- `tasks/sprint-4-workout-flow/S4-03-workout-session-repository.md`
- `tasks/sprint-4-workout-flow/S4-04-workout-session-application-flow.md`

如果发现 Domain、Repository 或任务范围冲突，立即执行 Stop Rule，不得自行扩展设计。

---

## Summary

实现进行中 WorkoutSession 的训练执行 Application Flow。

本任务负责：

- 记录已完成 WorkoutSet
- 追加额外组
- 跳过动作
- 恢复被跳过动作
- 标记动作完成
- 保持 WorkoutSession 聚合持久化一致

---

## Scope

允许修改：

- Workout Session Application 层
- 必要的 Application 输入类型与错误类型
- 对应 Application 测试
- Repository 测试，仅在验证既有追加行为时允许补充

禁止修改：

- Domain Model
- Database Schema
- Migration
- Repository Contract
- Repository 主体实现
- UI
- Timer
- Recovery
- 历史训练编辑流程

---

## Preconditions

所有执行操作只允许作用于：

```text
status = in_progress
```

以下状态必须拒绝：

```text
draft
completed
cancelled
```

Session 不存在时返回明确的 Application Error。

SessionExercise 不存在或不属于当前 Session 时返回明确的 Application Error。

---

## 1. Record Workout Set

实现：

```ts
recordWorkoutSet()
```

输入至少包含：

```ts
sessionId
sessionExerciseId
actualReps
weight
completedAt
```

由 Application 生成：

```ts
WorkoutSetId
setNumber
setType
isCompleted
isExtraSet
```

规则：

- `setNumber` 为该动作现有 sets 最大 setNumber + 1。
- `setType` 在 V1 固定为 `normal`。
- `isCompleted` 固定为 `true`。
- `isExtraSet` 在 `setNumber > targetSets` 时为 `true`。
- 只追加新的 WorkoutSet。
- 不允许修改或删除已有 WorkoutSet。
- 不写入 `targetReps`、`targetWeight` 等目标数据。
- 保存后返回更新后的 `InProgressWorkoutSession`。

输入校验：

- `actualReps` 必须是非负整数。
- `weight` 必须是非负有限数值。
- `completedAt` 不得早于 Session 的 `startedAt`。
- 生成的 WorkoutSetId 不得为空。

---

## 2. Add Extra Set

额外组不需要单独复制 WorkoutSet 事实。

继续调用：

```ts
recordWorkoutSet()
```

当新增 setNumber 超过 `targetSets` 时，自动标记：

```ts
isExtraSet = true
```

禁止预先创建空 WorkoutSet。

---

## 3. Skip Exercise

实现：

```ts
skipSessionExercise()
```

规则：

- 只允许 `in_progress` Session。
- 将目标 SessionExercise 的 `isSkipped` 设置为 `true`。
- `isCompleted` 设置为 `false`。
- 保留已有 WorkoutSet。
- 不删除历史数据。
- 保存更新后的完整 Session 聚合。

---

## 4. Resume Skipped Exercise

实现：

```ts
resumeSessionExercise()
```

规则：

- 只允许 `in_progress` Session。
- 将 `isSkipped` 设置为 `false`。
- 不修改已有 WorkoutSet。
- 不自动标记完成。

---

## 5. Complete Exercise

实现：

```ts
completeSessionExercise()
```

规则：

- 只允许 `in_progress` Session。
- 将 `isCompleted` 设置为 `true`。
- 将 `isSkipped` 设置为 `false`。
- 不自动创建 WorkoutSet。
- 不要求必须达到 targetSets；用户可以提前结束动作。
- 保留全部实际 WorkoutSet。

---

## Persistence Rules

所有操作必须：

1. 使用 `WorkoutSessionRepository.findById()` 读取完整聚合。
2. 在 Application 层生成新的不可变聚合对象。
3. 使用 `WorkoutSessionRepository.update()` 持久化。
4. 不绕过现有 Repository 的历史 WorkoutSet 保护。
5. 不直接执行 SQL。

---

## Error Handling

至少提供明确错误：

- Session 不存在
- Session 状态不是 `in_progress`
- SessionExercise 不存在
- 输入数据无效
- 生成 ID 无效

不得把以上错误统一映射为普通 `Error`。

---

## Testing Requirements

必须覆盖：

### recordWorkoutSet

- 向目标动作追加第一组
- setNumber 连续递增
- 超过 targetSets 后标记为额外组
- 保留已有 WorkoutSet
- 不包含 targetReps
- actualReps 非法时拒绝且不调用 update
- weight 非法时拒绝且不调用 update
- completedAt 早于 startedAt 时拒绝
- 非 in_progress Session 被拒绝
- SessionExercise 不存在时被拒绝

### exercise state

- 跳过动作
- 取消跳过
- 标记动作完成
- 已有 WorkoutSet 始终保留
- Repository update 收到完整新聚合

---

## Self Review

完成定向测试后执行一轮 Self Review。

检查：

- 是否修改已有 WorkoutSet
- 是否生成空 WorkoutSet
- 是否引入目标数据到 WorkoutSet
- 是否直接写 SQL
- 是否越界实现 UI、Timer 或 Recovery
- 是否允许 terminal Session 修改

发现问题最多自动修正一轮。

---

## Validation

先运行 S4-05 定向测试。

定向测试通过后只运行一次：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

禁止执行：

```bash
git add
git commit
git push
```

---

## Acceptance Criteria

- [ ] 进行中 Session 可以追加实际 WorkoutSet。
- [ ] setNumber 正确递增。
- [ ] 额外组标记正确。
- [ ] 已有 WorkoutSet 不被修改或删除。
- [ ] 动作可以跳过、恢复和完成。
- [ ] 所有操作只允许作用于 in_progress Session。
- [ ] 不修改 Domain、Schema、Migration 或 Repository Contract。
- [ ] 定向测试与完整 Validation 全部通过。

---

## Final Report

不超过 50 行，必须包含：

- Summary
- Files Changed
- Decisions
- Self Review
- Focused Tests
- Validation
- Repository Hygiene
- Known Limitations
- Review Status
