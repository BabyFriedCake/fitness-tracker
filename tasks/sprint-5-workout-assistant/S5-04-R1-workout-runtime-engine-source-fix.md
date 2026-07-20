# S5-04-R1 Workout Runtime Engine Source Fix

## Goal

修复 S5-04 Human Review 发现的 Runtime 集成问题。

目标：

让 Workout Runtime Engine 成为训练运行状态的唯一来源。

修复：

-   UI Hook 自己计算 runtime 状态
-   pause/resume 只修改页面状态
-   Voice 绕过 Application Voice Feedback

------------------------------------------------------------------------

# Blocking Issues

## P1 Runtime 状态源问题

当前问题：

页面通过：

    session.status
    restTimerStatus

自行推导：

    runtimeStatus

导致 Runtime Engine 不是唯一状态来源。

要求改为：

    UI

    ↓

    Application Hook

    ↓

    Workout Runtime Engine

    ↓

    Repository

禁止：

-   Screen 自己计算 runtime 状态
-   Hook 自己复制 Runtime Engine 逻辑

------------------------------------------------------------------------

# P1 Pause / Resume Flow

当前：

    pauseWorkout()

    ↓

    setState(runtimeStatus)

修改为：

    UI Button

    ↓

    Application Hook

    ↓

    Workout Runtime Engine.pause()

    ↓

    Runtime State

    ↓

    UI Refresh

resume:

    Workout Runtime Engine.resume()

要求：

-   保留当前动作
-   保留当前 Set
-   不修改 WorkoutSet 历史事实

------------------------------------------------------------------------

# Runtime API Requirement

Runtime Engine 需要提供读取能力：

例如：

``` ts
getRuntimeState()
```

返回：

``` ts
{
  status:
    | "idle"
    | "running"
    | "paused"
    | "completed",

  currentExercise,

  currentSet,

  completedSets,

  targetSets
}
```

UI 只消费该结果。

------------------------------------------------------------------------

# Voice Integration Fix

当前：

    recordSet()

    ↓

    生成 message

    ↓

    直接调用 speakWorkoutVoiceMessages()

修改：

    Runtime Feedback Event

    ↓

    WorkoutVoiceFeedback Application

    ↓

    WorkoutVoiceFeedbackAdapter

必须复用：

S5-03 已存在 Application API。

禁止：

-   Screen 直接调用 adapter
-   Screen 直接生成 voice message

------------------------------------------------------------------------

# Files Expected

根据当前项目结构调整：

可能修改：

    apps/mobile/src/features/workout-session/application/
        use-workout-session-screen.ts

    apps/mobile/src/features/workout-session/screens/
        workout-session-screen.tsx

    apps/mobile/src/features/workout-session/application/
        workout-runtime-engine.ts

增加或调整测试：

    apps/mobile/src/features/workout-session/__tests__/

------------------------------------------------------------------------

# Tests

必须覆盖：

## Runtime Source

-   UI 状态来自 Runtime Engine
-   不从 Session 状态推导

## Pause

-   running -\> paused
-   当前动作保持

## Resume

-   paused -\> running
-   当前 Set 保持

## Voice

-   Runtime Event 可以进入 Voice Application
-   adapter failure 不影响训练流程

------------------------------------------------------------------------

# Self Review

检查：

-   [ ] Runtime Engine 是唯一状态来源
-   [ ] UI 不计算 runtimeStatus
-   [ ] pause/resume 不直接修改 React state
-   [ ] Voice 不绕过 Application 层
-   [ ] 未修改 Schema
-   [ ] 未修改 Migration
-   [ ] 未修改 Domain Aggregate

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

# Completion Criteria

满足：

-   Human Review P1 问题修复
-   Runtime Engine 成为唯一状态来源
-   Pause / Resume 使用 Runtime Engine
-   Voice Feedback 使用 Application API
-   不破坏 S4-08 Recovery
-   不破坏 S4-09 Today Dashboard
-   不破坏 S4-10 History
