# P004 - Workout Execution

Version: v1.1
Status: Review
Owner: Product Owner
Module: Workout Flow
Priority: P0

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies

- WorkoutSession
- SessionExercise
- WorkoutSet
- RestTimer
- Recommendation
- UserSetting
- WorkoutCompanionEventSource
- WorkoutCompanionRuntimeState

### Outputs

- 展示 Runtime 状态和训练进度。
- 通过 Application Flow 执行暂停、继续、持久化和完成流程。
- 按 Navigation 进入休息或训练总结。

## 3. Page Goal

让用户跟随 Workout Companion 完成训练，并将每个完成组可靠持久化。

## 4. Responsibilities

### 负责

- 展示当前动作图片、名称、组数和目标次数。
- 展示 Companion Event 驱动的已完成次数。
- 编辑当前组将要持久化的实际重量。
- 展示 Runtime phase 和教练反馈。
- 暂停、继续和恢复 Runtime。
- 在 Runtime 达到目标时通过 Application Flow 立即持久化 WorkoutSet。
- 推进休息、下一组、下一动作或总结。

### 不负责

- 修改模板。
- 识别声音、摄像头画面或姿态。
- 通过点击、计时器或假数据生成 Rep。
- 绕过 Runtime 直接修改训练进度。
- 伪造、默认或推测 WorkoutSet 的实际重量。

## 5. User Story

作为力量训练用户，我希望跟随陪练事件和语音反馈完成训练，
同时确保真实 WorkoutSet 及时保存。

## 6. User Journey

```text
P003 → Workout Session → Companion Event → Runtime Progress
     → Set Persistence → P005 / Next Exercise → P006
```

## 7. Entry & Exit

进入时绑定当前 Runtime Instance 与 Event Source。Runtime 替换、Session 变更或
页面卸载时取消订阅。返回时不得丢失已持久化 WorkoutSet。

## 8. Information Architecture

页面优先级：当前动作、当前组、Rep 进度、Runtime 状态、教练反馈、
训练总进度。

## 9. Wireframe

```text
Push                         动作 1 / 5
[动作图片]
杠铃卧推 · 胸 · 杠铃
第 1 / 4 组
重量 [-2.5] 80.0 kg [+2.5]

8 / 10
训练中
第 8 次，很好，再坚持 2 次

[暂停训练]
已完成 0 / 18 组
```

## 10. Component Inventory

- Session Header
- Exercise Image and Identity
- Set Progress
- Weight Input
- Rep Progress
- Runtime Status
- Coach Feedback
- Pause / Resume Control
- Secondary Session Controls
- Rest Timer State
- Error Banner

所有组件引用 `docs/07-Design-System/`，交互目标至少 44×44 pt。

## 11. Screen Data Dictionary

- WorkoutSession
- SessionExercise
- WorkoutSet
- RestTimer
- Recommendation
- UserSetting
- WorkoutCompanionRuntimeState
- RepCompleted

`RepCompleted.sessionExerciseId` 必须引用当前 SessionExercise，不得使用
Exercise Library ID 代替。

## 12. Visibility Rules

- `running` 展示当前 Rep 和暂停。
- `paused` 展示已暂停和继续。
- `set_completion_pending` 展示“正在确认本组完成”，禁止训练操作。
- `resting` 展示休息倒计时和下一组信息。
- `exercise_completion_pending` 展示“正在保存训练结果”，禁止训练操作。
- `completed` 展示完成结果并进入总结。
- completed/cancelled Session 不得写入新 WorkoutSet。
- 重量草稿无效时显示稳定错误，不得使用默认重量持久化。

## 13. Interaction Matrix

- 合法 `RepCompleted` → Runtime 进度更新。
- 调整重量 → 只更新当前未持久化组的重量草稿。
- 达到目标次数 → `set_completion_pending` → 立即持久化。
- 持久化成功且有下一组 → `resting`。
- 动作目标组全部持久化 → `exercise_completion_pending` → 下一动作或总结。
- 暂停 → 停止接收可推进的 Rep，保存 Snapshot。
- 继续 → 恢复当前动作、组和 Rep 进度。
- 跳过动作 → 保留已完成 WorkoutSet，通过现有 Application Flow 推进。
- 结束训练 → 使用现有保存并结束、继续训练或放弃确认流程。

所有写操作需防止重复持久化。

## 14. State Machine

```text
Loading → running ↔ paused
running → set_completion_pending → resting → running
set_completion_pending → exercise_completion_pending → running / completed
completed → P006
```

## 15. Data Dependency

- WorkoutSession
- SessionExercise
- WorkoutSet
- RestTimer
- WorkoutCompanionEventSource
- Recommendation
- UserSetting

## 16. Source of Truth

- 训练事实：WorkoutSession / SessionExercise / WorkoutSet
- 短期 Rep 进度：Workout Companion Runtime Instance
- 休息状态：RestTimer
- 输入事件：已验证的 WorkoutCompanionEventSource

UI 不得以本地计数替代 Runtime，Runtime 不得以 Rep 进度替代已持久化 WorkoutSet。

## 17. Navigation

本组持久化后根据 Runtime 进入 Rest Timer、下一动作或总结。返回时不得
静默丢失已完成数据。

## 18. Edge Cases

- 无效、过期、重复或不属于当前 SessionExercise 的 Rep 事件。
- Rep 事件在持久化 pending 期间到达。
- 持久化失败后重试。
- 目标 Rep 到达时重量草稿无效，用户修正后重试。
- 连续事件异步处理的顺序。
- 切换后台或系统杀死后恢复。
- Event Source 在页面卸载后继续发送事件。

## 19. Analytics

- workout_execution_viewed
- companion_rep_received
- workout_set_completed
- workout_set_save_failed
- companion_event_rejected

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- Companion Event Source 是 Rep 输入边界。
- UI 只展示 Runtime，不提供手动 Rep 或“完成本组”入口。
- 重量仍是用户可编辑的实际训练草稿，不得由 Companion Event 填充。
- WorkoutSet 仍是真实训练事实，并在每组完成时立即保存。
- 具体识别引擎不属于 UI Runtime Binding。

## 21. Acceptance Criteria

- [ ] 正确展示当前动作、组和 Rep 进度。
- [ ] 合法 Companion Event 按顺序推进 Runtime。
- [ ] 页面不提供手动计数或手动完成组。
- [ ] 持久化使用当前已验证的实际重量，不使用默认或伪造重量。
- [ ] 六个 Runtime phase 都有明确展示和交互限制。
- [ ] 组完成后立即持久化且不重复。
- [ ] 暂停、继续、休息和恢复保留当前进度。
- [ ] Event Source 在 Runtime 替换和卸载时正确取消订阅。
- [ ] 持久化失败可重试。

## 22. Future Extension

- Voice Engine
- Camera Recognition
- Pose Detection
- Wearable Control

## 23. Out of Scope

- 本 Task 内实现声音、摄像头或姿态识别。
- Timer Simulation 推进生产 Runtime。
- 用户点击增加 Rep 或完成本组。
