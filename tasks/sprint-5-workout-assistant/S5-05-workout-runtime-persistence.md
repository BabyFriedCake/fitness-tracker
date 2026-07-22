# S5-05 Workout Runtime Persistence

## Goal

为 Workout Runtime Engine 增加运行状态持久化能力。

目标：

训练过程中：

-   切后台
-   页面重新进入
-   App 恢复

可以恢复当前训练状态。

本任务不引入新的训练业务规则。

------------------------------------------------------------------------

# Scope

只修改 Runtime Persistence Application 能力。

禁止：

-   修改 Schema
-   修改 Migration
-   修改 Domain Aggregate
-   修改 Exercise Domain

------------------------------------------------------------------------

# Current Problem

当前 Runtime Engine 可以管理：

-   running
-   paused
-   completed

以及：

-   currentExercise
-   currentSet
-   completedSets
-   targetSets

但是状态只存在内存。

App 重启后无法恢复。

------------------------------------------------------------------------

# Required Changes

## 1. 新增 Runtime Snapshot Model

新增：

``` ts
WorkoutRuntimeSnapshot
```

包含：

``` ts
sessionId

status

currentExercise

currentSet

completedSets

targetSets

restTimerStatus

updatedAt
```

------------------------------------------------------------------------

## 2. 新增 Snapshot Repository Interface

位置：

application/repository boundary

提供：

``` ts
save(snapshot)

load(sessionId)

clear(sessionId)
```

------------------------------------------------------------------------

## 3. Runtime Engine 集成

Runtime Engine 增加：

``` ts
saveRuntimeSnapshot()

restoreRuntimeSnapshot()
```

要求：

-   状态变化后更新 snapshot
-   恢复时重新生成 runtime state

------------------------------------------------------------------------

## 4. 恢复规则

允许恢复：

``` text
running
paused
```

禁止恢复：

``` text
draft
cancelled
```

completed：

只读取历史结果。

------------------------------------------------------------------------

## 5. UI 不直接访问 Repository

保持：

``` text
UI

↓

Application Hook

↓

Runtime Engine

↓

Repository
```

------------------------------------------------------------------------

# Tests

新增测试：

## Save

-   running 状态保存成功
-   paused 状态保存成功

## Restore

-   snapshot 可以恢复当前动作
-   snapshot 可以恢复当前 Set
-   snapshot 可以恢复 rest timer

## Invalid

-   draft 不恢复
-   cancelled 不恢复

------------------------------------------------------------------------

# Validation

执行：

``` bash
pnpm format:check

pnpm lint

pnpm typecheck

pnpm test

git diff --check
```

------------------------------------------------------------------------

# Self Review

检查：

-   [ ] Runtime Engine 仍是唯一状态来源
-   [ ] UI 不读取 Snapshot Repository
-   [ ] 未修改 Schema
-   [ ] 未修改 Migration
-   [ ] 未修改 Domain Model
-   [ ] 不影响 History / Recovery

------------------------------------------------------------------------

# Completion Criteria

满足：

-   Human Review PASS
-   Runtime 状态可恢复
-   为后台运行和锁屏恢复提供基础
