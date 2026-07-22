# S5-06 Workout Companion Runtime Flow

## 任务编号

`S5-06-workout-companion-runtime-flow.md`

## 任务目标

在 S5-05-R1 已完成的 Runtime Snapshot Validation 基础上，实现 Workout
Companion Runtime Flow。

目标：

- 支持训练过程中的次数进度管理。
- 支持组完成判断。
- 保持 Runtime 与现有 Domain / Application Flow 边界清晰。
- 复用已有 WorkoutFeedbackEvent 体系。

---

# Goal

实现：

- rep progress tracking
- current exercise / set flow tracking
- set completion 判断
- exercise completion 判断触发条件
- Runtime 与 Application Flow 协作接口

---

# Non-Goal

本任务不实现：

- 摄像头识别。
- 姿态检测。
- AI 计数。
- TTS。
- UI 改造。
- Database Schema 修改。
- Snapshot Validation contract 修改。

---

# 重要架构约束

## Domain 事实优先

Runtime 不允许伪造：

- WorkoutSet
- actualReps
- weight
- isExtraSet

Runtime 不负责生成最终 SetCompletedFeedbackEvent。

原因：

SetCompletedFeedbackEvent 必须基于真实完成后的 WorkoutSet。

---

# Runtime 职责

Runtime 只负责：

- 当前训练进度。
- 当前动作索引。
- 当前 Set 索引。
- completedReps。
- 判断是否达到目标次数。

示例：

```ts
interface WorkoutRuntimeProgress {
  sessionId: WorkoutSessionId;

  currentExerciseIndex: number;

  currentSetIndex: number;

  completedReps: number;
}
```

---

# Rep Flow

入口：

```ts
onRepCompleted();
```

流程：

    rep completed

    ↓

    completedReps + 1

    ↓

    检查目标次数

    ↓

    未完成:
    继续 running

    ↓

    完成:
    请求 Application Flow 处理 Set 完成

---

# Set Completion Flow

禁止：

Runtime 直接：

    create WorkoutSet

    ↓

    emit SetCompletedFeedbackEvent

正确流程：

    Runtime

    ↓

    SetComplete Request

    ↓

    Application Flow

    ↓

    Repository 持久化真实 WorkoutSet

    ↓

    生成 SetCompletedFeedbackEvent

---

# Exercise Completion Flow

Exercise 完成必须满足：

- 所有 Set 已真实完成。
- SessionExercise 状态符合现有 Domain 规则。

Runtime 不直接修改：

```ts
SessionExercise.isCompleted;
```

---

# Event 设计

复用已有：

```ts
WorkoutFeedbackEvent;
```

不新增：

```ts
WorkoutCoachEvent;
```

事件来源：

    Runtime
     |
     | Rep progress
     v
    Application Flow
     |
     | persisted result
     v
    WorkoutFeedbackEvent

---

# 异步接口要求

如果现有同步接口无法满足真实持久化流程：

允许：

- 调整为 async result。
- 返回真实 persistence result。

例如：

```ts
await completeCurrentSet();
```

必须等待：

- Repository 成功。
- WorkoutSet 生成。

---

# Snapshot 兼容

保持 S5-05-R1：

不能修改：

- snapshot status contract。
- validation rules。
- repository contract。

---

# 测试要求

## Rep Progress

验证：

- rep 增加。
- 未达到目标次数保持状态。
- 达到目标次数触发完成流程。

## Persistence Boundary

验证：

- SetCompleted 使用真实 WorkoutSet。
- 不存在默认 weight。
- 不存在伪造 actualReps。

## Exercise Flow

验证：

- 完成所有 Set 后进入下一动作。
- 状态正确。

## Pause Resume

验证：

- sessionId 保持。
- exercise index 保持。
- set index 保持。
- completedReps 保持。

---

# 修改范围

允许：

- Workout Runtime Engine
- Runtime State Model
- Application Flow
- Tests

禁止：

- Domain Schema
- Database Migration
- UI
- AI Module

---

# Codex 执行要求

执行前：

1.  阅读现有：
    - WorkoutFeedbackEvent
    - SetCompletedFeedbackEvent
    - ExerciseCompletedFeedbackEvent
    - WorkoutSet
    - SessionExercise
    - Runtime Engine
2.  不绕过 Repository。
3.  不创建假的持久化对象。
4.  完成后执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

最终报告：

- 实现内容
- 修改文件
- Runtime/Application 边界说明
- 测试结果
- Validation
- Self Review
