# S4-01 — Workout Session Domain

## Execution Prompt

Before implementation:

Read and follow:

`workflow/prompts/implement-task.md`

Also verify consistency with:

- docs/04-Architecture/architecture.md
- docs/04-Architecture/domain-model.md

If there is a real blocking conflict, stop and report.

---

# Goal

定义 WorkoutSession 领域模型基础。

本任务只处理 Domain Contract。

不实现：

- Database
- Migration
- Repository
- Application
- UI
- Training Flow

---

# Domain Source Rules

领域模型以 `domain-model.md` 为核心参考。

当前 architecture.md 与 domain-model.md 存在历史命名差异：

- architecture.md: WorkoutSessionExercise
- domain-model.md: SessionExercise

该差异属于文档同步问题，不阻塞本 Task。

本 Task 使用：

`SessionExercise`

后续单独同步 architecture.md。

---

# WorkoutSession

字段：

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

- sourceTemplateId 为可选。
- Session 可以来自模板，也支持未来空白训练或 AI 推荐训练。
- workoutNameSnapshot 保存训练名称快照。
- sessionExercises 保存本次训练动作集合。
- dailyStatus 保存训练日状态。
- notes 保存训练备注。

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

字段：

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
```

规则：

- 保存训练执行需要的动作快照。
- 不依赖 Template 后续变化。
- 不保存实际完成数据。

---

# WorkoutSet

字段：

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

- 只保存实际训练事实。
- 不保存 targetReps。
- 目标数据来自 SessionExercise。

---

# Deferred

后续任务处理：

- Repository
- Database Schema
- Migration
- Session 创建流程
- UI
- Timer
- Recovery

---

# Acceptance Criteria

- [ ] sourceTemplateId 支持为空。
- [ ] Session 可以表示非模板来源训练。
- [ ] Session 保存名称快照。
- [ ] Session 包含动作集合、当日状态和训练备注。
- [ ] SessionExercise 命名与 Domain Model 一致。
- [ ] WorkoutSet 只保存实际数据。
- [ ] 不实现其他层。

---

# Human Review Checklist

检查：

- Session 是否支持未来扩展来源。
- Snapshot 是否完整。
- Domain 边界是否清晰。
- 是否避免提前实现后续流程。
