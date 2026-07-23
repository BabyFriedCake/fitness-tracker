# S5-04-R2 Workout Runtime State Source Fix

## Goal

继续修复 S5-04 Human Review P1。

目标：

Runtime Engine 成为训练运行态展示的唯一来源。

当前 R1 已修复：

-   runtimeStatus 本地推导
-   pause/resume 绕过 Runtime Engine
-   Voice 绕过 Application API

剩余问题：

ScreenData 与 Runtime Engine 同时保存运行态展示数据。

------------------------------------------------------------------------

## Problem

当前存在两套状态来源：

### Runtime Engine

提供：

``` ts
runtime.status
runtime.currentExercise
runtime.currentSet
runtime.completedSets
runtime.targetSets
```

### WorkoutSessionScreenData

仍然保存：

``` ts
currentExerciseIndex
orderedExercises
completedSetCount
totalTargetSetCount
currentExercise
currentSetNumber
```

导致：

Runtime Engine 和 UI 数据可能不一致。

------------------------------------------------------------------------

# Required Changes

## 1. UI 消费 Runtime State

修改：

    workout-session-screen.tsx

禁止：

``` ts
data.currentExercise
data.completedSetCount
data.currentSetNumber
```

改为：

``` ts
state.runtime.currentExercise
state.runtime.currentSet
state.runtime.completedSets
state.runtime.targetSets
```

------------------------------------------------------------------------

## 2. Hook 删除重复 Runtime 推导

修改：

    use-workout-session-screen.ts
    load-workout-session-screen.ts

删除或收缩：

-   currentExercise
-   currentSetNumber
-   completedSetCount
-   totalTargetSetCount

保留：

``` ts
data.session
```

作为 Session 原始数据。

------------------------------------------------------------------------

## 3. 保留 Session 原始记录

允许：

``` ts
data.session
```

用途：

-   历史展示
-   Session 基础信息

禁止：

用于：

-   当前训练进度
-   当前动作
-   当前 Set

------------------------------------------------------------------------

# Architecture Target

最终：

    Screen

     ↓

    Workout Session Hook

     ↓

    Runtime Engine

     ↓

    Runtime State

Session:

    Session Repository

     ↓

    data.session

只负责历史事实。

------------------------------------------------------------------------

# Tests

增加验证：

## Runtime Source

-   UI 当前动作来自 runtime
-   UI 当前 Set 来自 runtime
-   完成数量来自 runtime

## Regression

保持：

-   pause/resume
-   Voice Feedback
-   Recovery
-   History

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

-   [ ] UI 不读取运行态字段 data.currentExercise
-   [ ] UI 不读取 data.completedSetCount
-   [ ] Runtime Engine 是唯一运行态来源
-   [ ] Session 仍保留历史事实
-   [ ] 未修改 Schema
-   [ ] 未修改 Migration
-   [ ] 未修改 Domain Aggregate

------------------------------------------------------------------------

# Completion Criteria

满足：

-   S5-04 Human Review PASS
-   Runtime Engine 单一状态来源
-   不影响 S4-08 Recovery
-   不影响 S4-09 Today Dashboard
-   不影响 S4-10 History
