# P008 - History & Progress

Version: v1.0  
Status: Approved
Owner: Product Owner  
Module: History  
Priority: P1

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

展示真实历史和可理解的长期进步。

## 4. Responsibilities

### 负责
- 历史列表详情
- 时间筛选
- 容量完成率趋势PR
- 历史纠错标识

### 不负责
- 社交排名
- AI长报告
- 修改模板
- 身体照片

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
历史列表 → Session详情 → Exercise趋势/PR → 可选纠错
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
历史 [本周][本月][3个月][全部]
本月12次 · 85,000kg · 91%
7月15日 Push · 58分钟 · 18组
7月13日 Pull · 52分钟
动作成长：卧推80kg→100kg
```

## 10. Component Inventory

- Period Filter
- Summary Card
- Session Row
- Exercise Progress Row
- Simple Chart
- Edited Badge
- Empty State

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- WorkoutSession
- SessionExercise
- WorkoutSet
- ProgressMetric
- PersonalRecord

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 无历史显示引导
- cancelled 可作为取消记录显示，但默认排除在正式统计之外
- 软删除Set排除
- 不足两次不画趋势
- 纠错记录显示已修改
- 有氧不计力量容量

## 13. Interaction Matrix

- 切换时间范围→重算
- 点击Session→详情
- 点击Exercise→趋势
- 编辑历史→纠错并标记
- 空状态→P001

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Loading → Empty/List/Error；List → Detail/ExerciseProgress/Editing
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

- 跨时区午夜
- 纠错导致PR下降
- 模板动作改名
- 大量历史性能
- 筛选无数据
- 纠错保存失败

## 19. Analytics

- history_viewed
- history_period_changed
- workout_history_detail_viewed
- exercise_progress_viewed
- history_edit_saved

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 历史默认只读但允许明确纠错
- 简单趋势优先
- 统计从Set重算
- 不做羞辱式连续打卡

## 21. Acceptance Criteria

- [ ] 倒序展示
- [ ] 详情准确
- [ ] 统计口径正确
- [ ] 取消删除数据排除
- [ ] 纠错重算PR
- [ ] 数据不足不误导

## 22. Future Extension

- 周报月报
- 导出筛选
- AI趋势解释
- 身体数据关联

## 23. Out of Scope

- 社交排名
- 医疗结论
