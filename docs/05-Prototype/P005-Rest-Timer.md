# P005 - Rest Timer

Version: v1.0  
Status: Review  
Owner: Product Owner  
Module: Workout Flow  
Priority: P0

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies
- RestTimer
- WorkoutSession
- SessionExercise
- UserSetting
- System Permission

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

在前后台都准确计时，并让用户快速延长、暂停或跳过休息。

## 4. Responsibilities

### 负责
- 显示剩余时间
- 后台与重启恢复
- 下一组预览
- 通知提醒
- 暂停继续延长跳过

### 不负责
- 修改模板休息时间
- 记录 WorkoutSet
- 音乐播放

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
P004 完成组 → 自动计时 → 到期或跳过 → P004 下一组
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
跳过休息

休息调整
01:28
距离下一组

下一组
杠铃深蹲 · 第 03 组
85 公斤 · 8-10 次
```

## 10. Component Inventory

- Timer Display
- Next Set Card
- Extend Button
- Pause/Resume
- Skip Button
- Permission Banner

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- RestTimer
- WorkoutSession
- SessionExercise
- UserSetting
- System Permission

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- running 显示暂停
- paused 显示继续
- resting 页面必须独立展示倒计时和下一组卡片
- 顶部提供“跳过休息”入口
- 到期显示00:00
- 权限关闭显示非阻塞提示
- 无下一组不创建 Timer

## 13. Interaction Matrix

- +30秒→延长目标时间
- 暂停→冻结剩余秒数
- 继续→生成新目标时间
- 跳过→P004
- 到期→通知并进入下一组
- 点击通知→恢复

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Creating → Running ↔ Paused；Running → Completed/Skipped；Session取消→Cancelled
```

## 15. Data Dependency

- RestTimer
- WorkoutSession
- SessionExercise
- UserSetting
- System Permission

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

- 后台超过结束时间
- 系统杀死后恢复
- 系统时间变化
- 通知失败
- 到期与跳过并发
- 非法自定义时长
- 异常多个 Timer

## 19. Analytics

- rest_timer_started
- rest_timer_extended
- rest_timer_paused
- rest_timer_skipped
- rest_timer_completed
- rest_notification_opened

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 绝对时间为事实来源
- 通知只是辅助
- +30秒最突出
- 跳过无需确认
- 当前休息修改不影响模板

## 21. Acceptance Criteria

- [ ] 前后台准确
- [ ] 重启可恢复
- [ ] 暂停继续延长跳过有效
- [ ] 无负数
- [ ] 权限关闭不影响核心
- [ ] 并发不会重复推进

## 22. Future Extension

- Live Activity
- 语音倒计时
- 手表提醒
- 动态休息建议

## 23. Out of Scope

- 音乐控制
- 心率自动调整
