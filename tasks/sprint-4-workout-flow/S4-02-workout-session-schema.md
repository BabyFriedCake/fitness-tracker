# S4-02 — Workout Session Schema

## Execution Prompt

Before implementation:

Read and follow:

`workflow/prompts/implement-task.md`

Also verify consistency with:

- `docs/04-Architecture/architecture.md`
- `docs/04-Architecture/domain-model.md`
- `tasks/sprint-4-workout-flow/S4-01-workout-session-domain.md`

If there is a real blocking conflict, stop and report.

---

## Summary

建立 WorkoutSession 持久化 Schema 和 Migration。

本任务负责将 S4-01 已确认的 Domain Model 映射到 SQLite 数据结构。

---

## Background

S4-01 已完成：

- WorkoutSession Domain
- SessionExercise
- WorkoutSet
- 状态流转规则
- Snapshot 原则

S4-02 将这些领域对象持久化。

必须保持：

- Domain 与 Database 分离。
- Database 字段表达 Domain。
- 生命周期不变量必须在 Schema 层得到支持。

---

## Goal

新增数据库表：

- workout_sessions
- workout_session_exercises
- workout_sets

并完成 Migration。

---

## Scope

允许：

- Database Schema
- Migration 文件
- Database 类型定义
- Schema 测试

禁止：

- Repository
- Application Use Case
- UI
- Timer
- Recovery Flow

---

# workout_sessions

字段：

```sql
id

source_template_id nullable

workout_name_snapshot

status

daily_status nullable

notes nullable

started_at nullable

ended_at nullable

created_at

updated_at
```

说明：

- `source_template_id` 必须允许为空。
- `started_at` 必须允许为空。
- `ended_at` 必须允许为空。

原因：

Session 状态决定时间字段约束。

---

## Lifecycle Constraints

Schema 必须支持以下 Domain 不变量：

### draft

```text
status = draft

started_at = NULL

ended_at = NULL
```

---

### in_progress

```text
status = in_progress

started_at IS NOT NULL

ended_at = NULL
```

---

### completed

```text
status = completed

started_at IS NOT NULL

ended_at IS NOT NULL
```

---

### cancelled

```text
status = cancelled

started_at 可为空

ended_at IS NOT NULL
```

---

Migration 和 Schema 测试必须验证：

- draft 可以持久化。
- completed 不允许缺少 started_at 或 ended_at。
- in_progress 不允许缺少 started_at。
- cancelled 可以没有 started_at，但必须存在 ended_at。

---

# workout_session_exercises

字段：

```sql
id

session_id

source_exercise_id

exercise_name_snapshot

position

is_enabled

is_skipped

is_completed

target_sets

target_reps_min

target_reps_max

current_rest_seconds
```

要求：

- 保存动作快照。
- 不依赖当前 Exercise Library。
- session_id 关联 workout_sessions。

---

# workout_sets

字段：

```sql
id

session_exercise_id

set_number

set_type

actual_reps

weight

is_completed

is_extra_set

completed_at
```

禁止：

```text
target_reps
```

WorkoutSet 只保存实际执行结果。

---

# Migration Requirements

必须：

- 新增 Migration。
- 支持已有数据库升级。
- 不修改历史 Migration。
- 不破坏 Sprint 1-3 数据。

---

# Testing Requirements

需要：

- Migration 执行测试。
- Schema 创建测试。
- 字段约束测试。
- 生命周期不变量测试。

---

# Known Limitations

不包含：

- Repository 查询。
- Session 创建。
- Template 转 Session。
- UI。
- 训练执行流程。

---

# Acceptance Criteria

- [ ] 三张 Session 相关表创建完成。
- [ ] Schema 与 S4-01 Domain 一致。
- [ ] sourceTemplateId 支持为空。
- [ ] startedAt / endedAt 可支持全部 Session 状态。
- [ ] 生命周期时间约束明确。
- [ ] WorkoutSet 不包含 targetReps。
- [ ] Migration 可执行。
- [ ] 不影响已有 Sprint 数据。

---

# Human Review Checklist

检查：

- Domain 到 Database 映射正确。
- Snapshot 原则保持。
- WorkoutSet 未混入目标数据。
- started_at / ended_at nullable 设计正确。
- 状态与时间字段不变量一致。
- Migration 安全。
