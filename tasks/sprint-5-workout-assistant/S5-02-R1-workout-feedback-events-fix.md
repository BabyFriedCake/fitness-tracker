# S5-02-R1 Workout Feedback Events Fix

## Goal

修复 S5-02 Human Review 发现的问题：

ExerciseCompleted 事件不能由未完成的 SessionExercise 生成。

## Execution Prompt

执行前必须阅读：

workflow/prompts/implement-task.md

严格遵守：

UI → Application → Domain → Repository

本任务只允许修改：

- workout-feedback-events.ts
- workout-feedback-events.test.ts

禁止修改：

- Schema
- Migration
- Repository
- UI
- Voice
- Timer
- WorkoutSet 历史数据模型

---

## Problem

当前：

createExerciseCompletedFeedbackEvent()

只检查：

- WorkoutSet 是否全部完成

缺少：

SessionExercise.isCompleted 校验。

导致：

未完成动作可能产生：

ExerciseCompleted

---

## Required Fix

新增错误：

InvalidExerciseFeedbackInputError

修改：

createExerciseCompletedFeedbackEvent()

规则：

必须同时满足：

1. exercise.isCompleted === true

2. 所有 required sets 已完成

否则：

throw InvalidExerciseFeedbackInputError

---

## Tests

新增测试：

### Case 1

输入：

SessionExercise:

```ts
{
  isCompleted: true;
}
```
