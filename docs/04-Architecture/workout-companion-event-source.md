# Workout Companion Event Source

## 目标

定义陪练事件输入接口。

S5-07只绑定接口，不实现识别能力。


## Interface

```ts
interface WorkoutCompanionEventSource {
  subscribe(
    callback: (event: RepCompleted) => void
  ): void

  unsubscribe(): void

}
```

## Lifecycle

- 每个 Workout Companion Runtime Instance 最多绑定一个 Event Source。
- UI/Application Adapter 在 Runtime 就绪后订阅。
- Runtime 替换、Session 变更或页面卸载时必须取消订阅。
- `unsubscribe()` 必须可重复执行。
- Event Source 按产生顺序交付事件。Adapter 必须串行处理异步 Runtime 结果，
  不得让旧事件覆盖新状态。
- `paused`、`set_completion_pending`、`resting`、
  `exercise_completion_pending` 和 `completed` 状态下的 Rep 事件不得推进进度。

## Validation Boundary

Event Source 是外部输入边界。UI/Application Adapter 在将事件交给 Runtime 前，
必须按 `workout-companion-event-contract.md` 验证完整事件。


## 实现方向

具体实现方向：

Companion Event Source

├── Voice Engine

├── Camera Recognition

└── Pose AI


当前阶段：

Runtime 只通过 UI/Application Adapter 依赖该接口。S5-07 使用受控 fake
验证绑定，不提供生产识别引擎。


## Scope

S5-07不实现：

- 麦克风识别
- 摄像头识别
- 姿态模型
- AI推理
