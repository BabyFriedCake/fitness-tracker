# S4-03-R1 Workout Session Active Query

## Task Type

Repository Contract Revision

## Scope

补充 WorkoutSessionRepository 的 Active Session 查询能力，为 S4-04
startSession() 提供业务一致性基础。

允许修改：

-   Domain Repository Contract
-   SQLite Repository Implementation
-   Repository Tests
-   Repository Export

禁止修改：

-   Application Flow
-   UI
-   Timer
-   Recovery
-   Schema / Migration
-   Session 生命周期规则

------------------------------------------------------------------------

# Background

S4-04 Application Flow 需要实现：

-   启动训练 Session
-   保证 V1 同时最多存在一个 `in_progress` WorkoutSession

当前 Repository 仅提供：

-   save()
-   findById()
-   update()

Application 无法判断是否已有正在进行中的 Session。

------------------------------------------------------------------------

# Requirements

## 1. Repository Contract

新增：

``` ts
findActiveSession(): Promise<WorkoutSession | null>
```

语义：

-   查询当前唯一 `status === 'in_progress'` 的 Session
-   不存在返回 null
-   不自动修改 Session 状态
-   不创建 Session

------------------------------------------------------------------------

## 2. SQLite Implementation

实现：

-   查询 `workout_sessions`
-   条件：

``` sql
status = 'in_progress'
```

要求：

-   返回完整 WorkoutSession Aggregate
-   包含：
    -   SessionExercise\[\]
    -   WorkoutSet\[\]
-   使用现有 Row Mapper
-   保持 Domain 状态约束

------------------------------------------------------------------------

## 3. Tests

新增覆盖：

-   存在 active Session 时返回 Session
-   不存在 active Session 返回 null
-   completed Session 不被返回
-   cancelled Session 不被返回
-   返回结果包含 exercises 和 sets

------------------------------------------------------------------------

# Decisions

-   不新增数据库字段
-   不修改 Migration
-   不增加数据库唯一约束
-   Active Session 业务规则由 Application 层控制
-   Repository 只提供查询能力

------------------------------------------------------------------------

# Validation

执行：

1.  定向 Repository 测试

2.  通过后执行：

``` bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

------------------------------------------------------------------------

# Repository Hygiene

禁止：

``` bash
git add
git commit
git push
```

------------------------------------------------------------------------

# Final Report

不超过 40 行。

包含：

-   Summary
-   Files Changed
-   Decisions
-   Self Review
-   Tests
-   Validation
-   Known Limitations
-   Review Status
