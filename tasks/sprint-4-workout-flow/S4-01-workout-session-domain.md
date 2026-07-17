# S4-01 — Workout Session Domain

## Execution Prompt

Before implementation:

Read and follow:

`workflow/prompts/implement-task.md`

Also verify consistency with:

- `docs/04-Architecture/architecture.md`
- `docs/04-Architecture/domain-model.md`

If a real blocking conflict exists, stop and report.

---

# Goal

建立 WorkoutSession 训练领域模型，为 Sprint 4 训练执行流程提供基础。

本任务只定义 Domain Contract。

不实现：

- Database
- Migration
- Repository
- Application Use Case
- UI
- Timer
- Recovery Flow

---

# Domain Principles

WorkoutSession 表示一次真实发生的训练。

它不是 WorkoutTemplate 的复制品，而是训练事实快照。

必须保持：

- Template 后续修改不影响历史 Session。
- Session 支持未来不同来源。
- WorkoutSet 只记录实际执行结果。

---

# WorkoutSession

```ts
WorkoutSession

id

sourceTemplateId?

workoutNameSnapshot

status

sessionExercises

dailyStatus

notes

startedAt

endedAt

createdAt

updatedAt
```

说明：

- `sourceTemplateId` 可为空。
- Session 可以来自：
  - WorkoutTemplate
  - 空白训练
  - 未来 AI 推荐计划
- `workoutNameSnapshot` 保存训练名称快照。
- `sessionExercises` 保存本次训练动作集合。

---

# WorkoutSessionStatus

状态：

```text
draft
in_progress
completed
cancelled
```

状态转换：

允许：

```text
draft -> in_progress
in_progress -> completed

draft -> cancelled
in_progress -> cancelled
```

禁止：

```text
completed -> in_progress

completed -> cancelled

cancelled -> in_progress
```

---

# SessionExercise

表示训练开始时保存的动作快照。

```ts
SessionExercise

id

sessionId

sourceExerciseId

exerciseNameSnapshot

position

isEnabled

isSkipped

isCompleted

targetSets

targetRepsMin

targetRepsMax

currentRestSeconds

sets
```

其中：

```ts
sets: WorkoutSet[]
```

说明：

- SessionExercise 保存动作计划快照。
- sets 保存该动作实际完成的训练组。
- Template 或 Exercise Library 后续变化不能影响历史 Session。

---

# WorkoutSet

表示一次实际完成的训练组。

```ts
WorkoutSet

id

sessionExerciseId

setNumber

setType

actualReps

weight

isCompleted

isExtraSet

completedAt
```

规则：

- WorkoutSet 只保存实际训练结果。
- 不保存目标数据。

禁止：

```text
targetReps
targetWeight
plannedSets
```

---

# Session Lifecycle Invariants

## draft

```text
startedAt = null

endedAt = null
```

## in_progress

```text
startedAt != null

endedAt = null
```

## completed

```text
startedAt != null

endedAt != null
```

## cancelled

```text
startedAt 可以为空

endedAt != null
```

---

# Acceptance Criteria

- [ ] WorkoutSession 支持非模板来源。
- [ ] Session 保存训练名称快照。
- [ ] Session 包含动作集合。
- [ ] SessionExercise 包含 WorkoutSet 集合。
- [ ] WorkoutSet 只保存实际数据。
- [ ] 状态流转符合 Domain 规则。
- [ ] 不引入 Database、Repository 或 UI。

---

# Testing Requirements

需要覆盖：

- Session 状态转换。
- 非法状态转换。
- SessionExercise 与 WorkoutSet 聚合关系。
- Snapshot 数据不可变规则。

---

# Human Review Checklist

检查：

- Repository 可以通过 WorkoutSession 恢复完整训练数据。
- Domain 与 Schema 保持一致。
- 没有引入 target 数据到 WorkoutSet。
- 没有提前实现其他层。
