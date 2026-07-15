# P004 - Workout Execution

Version: v1.0  
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
- Recommendation
- RestTimer
- UserSetting

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

让用户在 5 秒内完成一组记录，并可靠推进训练。

## 4. Responsibilities

### 负责
- 展示当前动作和组
- 默认带入重量次数
- 编辑和完成当前组
- 即时保存
- 跳过动作、额外组、恢复状态
- 推进休息或总结

### 不负责
- 修改模板
- 复杂历史分析
- 自动替用户完成

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
P003 → 当前组 → 完成本组 → P005 → 下一组/动作 → P006
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
Push [更多]  动作1/5 · 0/18组
杠铃卧推 · 胸 · 杠铃 · 第1/4组
重量 [-2.5] 80.0kg [+2.5]
次数 [-1] 10 [+1]
上次80kg×10
建议82.5kg×8–10
[完成本组]
[跳过动作] [添加额外组]
```

## 10. Component Inventory

- Session Header
- Progress Indicator
- Exercise Identity
- Weight Stepper
- Reps Stepper
- Recommendation Card
- Complete Set Button
- Secondary Controls
- End Modal
- Error Banner

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- WorkoutSession
- SessionExercise
- WorkoutSet
- Recommendation
- RestTimer
- UserSetting

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 无历史隐藏上次表现
- 无建议隐藏建议区
- 保存错误显示持久提示
- completed/cancelled Session 禁止写入
- 额外组显示标记

## 13. Interaction Matrix

- 调整数值→只改草稿
- 完成本组→校验并即时保存
- 有下一组→P005
- 最后组/动作→下一动作或P006
- 保存退出→P001
- 放弃→cancelled
- 添加动作→P007

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Loading → Ready/Editing → Saving → SaveError 或 P005/NextExercise/P006；可 SaveExit/Cancel
```

## 15. Data Dependency

- WorkoutSession
- SessionExercise
- WorkoutSet
- Recommendation
- RestTimer
- UserSetting

## 16. Source of Truth

- 计划数据：WorkoutTemplate / TemplateExercise
- 真实训练：WorkoutSession / SessionExercise / WorkoutSet
- 临时计时：RestTimer
- 派生结果：ProgressMetric / PersonalRecord / Recommendation
- 用户偏好：DailyStatus / UserSetting

页面按实际涉及对象取用，不以 UI 本地状态替代持久事实。

## 17. Navigation

所有跳转由第 13 节交互定义；返回时不得静默丢失已完成训练数据。

## 18. Edge Cases

- 重复点击完成组必须幂等
- 保存时崩溃不得重复
- 0次与0重量校验
- 切后台恢复 current position
- 重复组号阻止
- 键盘不得遮挡主按钮

## 19. Analytics

- workout_execution_viewed
- weight_adjusted
- reps_adjusted
- workout_set_completed
- workout_set_save_failed
- exercise_skipped
- extra_set_added

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 完成本组是唯一 Primary
- 输入草稿与已完成 Set 分离
- 每组立即保存
- 建议可解释且不自动应用
- 结束训练入口避免误触

## 21. Acceptance Criteria

- [ ] 正确展示当前动作组
- [ ] 可快速修改
- [ ] 完成后即时保存且不重复
- [ ] 自动进入休息
- [ ] 可恢复
- [ ] 失败可重试
- [ ] 单手和大字体可用

## 22. Future Extension

- 热身组
- 递减组
- RPE/RIR
- 语音播报
- 可穿戴控制

## 23. Out of Scope

- 摄像头识别
- 自动计数
- 音乐控制
