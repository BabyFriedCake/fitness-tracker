# P006 - Workout Summary

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
- ProgressMetric
- PersonalRecord

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

提供客观的训练反馈并安全完成 Session。

## 4. Responsibilities

### 负责
- 展示时长动作组数容量完成率
- 展示简单 PR
- 保存备注
- 标记 completed
- 返回 Today 或历史

### 不负责
- 复杂 AI 报告
- 修改模板
- 社交分享

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
P004 最后动作 → 总结 → 备注 → 保存完成 → P001/P008
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
训练完成 · Push · 58分钟
5动作 · 18组 · 12,500kg · 92%
今日突破：卧推 +2.5kg
训练备注 [________]
[保存并完成]
[查看详情]
```

## 10. Component Inventory

- Completion Header
- Metrics Grid
- PR Card
- Exercise Breakdown
- Note Input
- Primary Save
- Detail Button
- Error Banner

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- WorkoutSession
- SessionExercise
- WorkoutSet
- ProgressMetric
- PersonalRecord

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 无PR隐藏卡片
- 无有效Set不生成正常完成总结
- 额外组不让完成率超过100%
- 保存中禁用主按钮

## 13. Interaction Matrix

- 输入备注→草稿
- 保存完成→写入end/status/note并P001
- 查看详情→保存后P008
- 返回→未保存确认
- 失败→重试

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Calculating → Ready/Editing → Saving → Completed 或 Error
```

## 15. Data Dependency

- WorkoutSession
- SessionExercise
- WorkoutSet
- ProgressMetric
- PersonalRecord

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

- 保存前崩溃
- 跨午夜
- 提前结束部分完成
- PR计算异常
- 重复点击保存
- 超大容量格式化

## 19. Analytics

- workout_summary_viewed
- workout_note_added
- workout_completed
- workout_complete_save_failed
- personal_record_displayed

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 客观反馈不过度游戏化
- 不显示不可靠卡路里
- 统计可追溯到Set
- 备注为未来分析提供上下文

## 21. Acceptance Criteria

- [ ] 统计正确
- [ ] PR仅来自有效组
- [ ] 备注保存
- [ ] 重复点击幂等
- [ ] 失败可重试
- [ ] Today和History刷新

## 22. Future Extension

- AI总结
- 周报月报
- 分享图片
- RPE

## 23. Out of Scope

- 社区发布
- 排名勋章
- 医疗建议
