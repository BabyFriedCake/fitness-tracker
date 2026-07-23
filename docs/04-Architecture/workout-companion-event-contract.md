# Workout Companion Event Contract

## 目标

定义 Workout Companion 陪练模式下训练事件的输入和流转。

训练次数不能由 UI 点击产生。

## RepCompleted

Rep 发生时，WorkoutSet 尚未创建。

因此 RepCompleted 不包含 setId。

```ts
type RepCompleted = {
  sessionId: string
  sessionExerciseId: string

  repNumber: number

  timestamp: number

  source:
    | "companion_event_source"
}
```

`sessionExerciseId` 必须引用当前 `WorkoutSession` 聚合中的
`SessionExercise.id`，不是动作库中的 `Exercise.id`。

Runtime 边界必须校验：

- `sessionId` 与当前 Runtime Session 一致。
- `sessionExerciseId` 与当前 Runtime Exercise 一致。
- `repNumber` 是正整数，并且是当前 `completedReps + 1`。
- `timestamp` 是有限的 Unix 毫秒时间戳。
- `source` 是 `companion_event_source`。

无效、过期或不属于当前 Runtime 位置的事件不得推进进度。

## Event Flow

Companion Event Source

↓

RepCompleted

↓

Workout Runtime

↓

达到目标次数

↓

创建 WorkoutSet

↓

SetCompleted

↓

ExerciseCompleted


## Runtime职责

Runtime负责：

- 接收 RepCompleted
- 累积训练进度
- 判断目标次数
- 触发持久化流程

Runtime不负责：

- 声音识别
- 动作识别
- 生成虚假的Rep


## UI限制

UI只能展示状态。

禁止：

- 点击增加次数
- Timer模拟次数
- 手动完成本组推进流程
