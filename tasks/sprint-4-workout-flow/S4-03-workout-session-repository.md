# S4-03 — Workout Session Repository

## Execution Prompt

执行前必须读取：

`workflow/prompts/implement-task.md`

并检查：

- `docs/04-Architecture/domain-model.md`
- `docs/04-Architecture/architecture.md`
- `tasks/sprint-4-workout-flow/S4-01-workout-session-domain.md`
- `tasks/sprint-4-workout-flow/S4-02-workout-session-schema.md`

如果发现规范冲突，停止实现并报告。

---

# Summary

实现 WorkoutSession Repository。

负责：

- Session 持久化读取
- Session 保存
- Session 更新
- Session 查询

不负责：

- Session 创建流程
- Template 转 Session
- UI
- Timer
- Recovery

---

# Scope

允许修改：

- Repository
- Database adapter
- Repository tests

禁止修改：

- Domain Model
- Schema
- Application Use Case
- UI

---

# Domain Rules

必须保持 S4-01：

## Session 状态

```text
draft
in_progress
completed
cancelled
```

---

## 时间字段

Repository 必须支持：

draft:

```text
started_at = null
ended_at = null
```

in_progress:

```text
started_at != null
ended_at = null
```

completed:

```text
started_at != null
ended_at != null
```

cancelled:

```text
started_at 可为空
ended_at != null
```

---

# Repository Contract

需要提供：

## save

保存完整 WorkoutSession。

要求：

- 不改变 Domain 对象。
- 不自动补充业务字段。
- 不自动修改状态。

---

## findById

根据 session id 查询。

要求：

- 返回 Domain 对象。
- 保留 snapshot 数据。
- 保留 SessionExercise 顺序。

---

## update

更新已有 Session。

要求：

- 保持状态合法。
- 不绕过 Schema constraint。
- 不修改历史训练记录。

---

## delete

禁止实现物理删除。

如需要：

返回不支持或保持未实现。

---

# Mapping Rules

必须：

Domain:

```text
WorkoutSession
SessionExercise
WorkoutSet
```

映射到：

```text
workout_sessions
workout_session_exercises
workout_sets
```

---

禁止：

引入：

```text
WorkoutSessionExercise
```

禁止：

```text
targetReps
```

---

# Transaction Requirements

Session 保存涉及：

- workout_sessions
- workout_session_exercises
- workout_sets

必须：

- 使用事务。
- 失败完整回滚。
- 不产生半保存数据。

---

# Testing Requirements

增加测试：

## save

- 保存 draft session
- 保存 completed session
- 保存 exercises 顺序
- 保存 sets 实际数据

## findById

- 正确恢复 snapshot
- 正确恢复 exercises
- 正确恢复 sets

## update

- 更新合法状态
- 非法状态被数据库拒绝

## Transaction

- 中途失败完整回滚

---

# Self Review

完成后检查：

- 是否修改 Schema？
- 是否修改 Domain？
- 是否引入 targetReps？
- 是否绕过 lifecycle constraint？
- 是否实现了 Scope 外功能？

发现问题最多自动修正一轮。

---

# Validation

顺序：

1. 定向 Repository 测试
2. pnpm format:check
3. pnpm lint
4. pnpm typecheck
5. pnpm test
6. git diff --check

禁止：

```bash
git add
git commit
git push
```

---

# Final Report

必须包含：

## Summary

## Files Changed

## Repository Decisions

## Self Review

## Tests

## Validation

## Known Limitations

## Review Status
