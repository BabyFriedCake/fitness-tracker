# P001 - Today Dashboard

Version: v1.0  
Status: Approved
Owner: Product Owner  
Module: Workout Flow  
Priority: P0

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies
- WorkoutTemplate
- WorkoutSession
- Recommendation
- DailyStatus
- WorkoutSet 派生统计

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

帮助用户在最短时间内开始或恢复今天的训练。

## 4. Responsibilities

### 负责
- 恢复进行中的 WorkoutSession
- 管理今天展示的训练计划入口
- 从训练模板中添加今天计划执行的训练
- 从今天训练计划创建或恢复 WorkoutSession
- 记录 DailyStatus
- 展示建议模板、最近训练与本周概览

### 不负责
- 编辑模板或动作
- 创建自定义动作
- 完整数据分析
- 自动调整训练计划

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
打开 App → 检查进行中 Session → 添加今日训练计划
→ 选择模板 → 今日计划列表 → 预览/调整本次训练 → 开始训练 → P004
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
今天
[继续训练：Push 6/18组]（条件显示）
今日状态 [正常][疲劳][经期][不适]
训练计划                         [添加计划]
Push · 5动作 · 18组              [开始]
Legs · 4动作 · 13组              [已完成]
今日挑战：卧推 82.5kg × 8–10
最近训练 / 本周概览
```

## 10. Component Inventory

- Resume Card
- Status Chip Group
- Workout Hero Card
- Today Plan Section
- Add Plan Modal
- Plan Card
- Primary Button
- Recommendation Card
- Recent Workout Row
- Weekly Summary

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- WorkoutTemplate
- WorkoutSession
- Today Plan 派生视图
- Recommendation
- DailyStatus
- WorkoutSet 派生统计

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 有 in_progress Session 时优先显示继续训练
- 训练计划模块只显示今天已添加的计划
- 添加计划从 active WorkoutTemplate 列表中选择
- 已完成的今日计划显示“已完成”，不可再次从该卡片开始训练
- 未开始的今日计划右侧显示“开始”
- 点击今日计划卡片主体进入本次训练预览/调整页，不修改原模板
- 无模板时显示创建模板空状态
- 无历史时隐藏最近训练与挑战
- 推荐失败不影响开始训练

## 13. Interaction Matrix

- 继续训练→恢复 P004/P005
- 添加计划→打开模板选择 Modal
- 模板选择确认→将模板加入今天训练计划
- 点击今日计划卡片主体→进入本次训练预览/调整页
- 今日计划卡片开始按钮→创建或恢复该计划的 WorkoutSession 并进入 P004
- 已完成今日计划开始按钮→禁用，不创建新 Session
- 选择今日状态→立即保存
- 最近训练→P008
- 创建模板→P002

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Loading → EmptyTemplate / Normal / ResumeAvailable / Error
```

Today Plan 子状态：

```text
NoPlan → AddPlanOpen → PlanReady
PlanReady → SessionDraft / InProgress / Completed
```

## 15. Data Dependency

- WorkoutTemplate
- WorkoutSession
- 当日计划视图
- Recommendation
- DailyStatus
- WorkoutSet 派生统计

## 16. Source of Truth

- 计划数据：WorkoutTemplate / TemplateExercise
- 真实训练：WorkoutSession / SessionExercise / WorkoutSet
- 今日计划状态优先从当日 WorkoutSession 与完成事实派生；
  如后续引入独立 TodayPlan 持久化对象，必须同步 Domain Model 与 Database。
- 临时计时：RestTimer
- 派生结果：ProgressMetric / PersonalRecord / Recommendation
- 用户偏好：DailyStatus / UserSetting

页面按实际涉及对象取用，不以 UI 本地状态替代持久事实。

## 17. Navigation

所有跳转由第 13 节交互定义；返回时不得静默丢失已完成训练数据。

## 18. Edge Cases

- 多个进行中 Session 时只恢复最近一个并提示异常
- 模板归档不影响进行中 Session
- 模板加入今日计划后，后续模板修改不得静默改写已创建的 Session 草稿
- 今日计划完成后保持可查看，不允许从同一卡片重复开始
- 同一模板是否允许当天重复加入必须由后续实现任务明确；
  默认先阻止重复添加同一 active 模板
- 统计读取失败仍允许训练
- 通知打开时恢复 Timer

## 19. Analytics

- today_viewed
- resume_workout_clicked
- start_workout_clicked
- daily_status_changed
- recent_workout_opened

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- Resume 优先于新建训练
- “训练计划”表示今天准备执行的计划列表，不等同于全部训练模板列表
- 点击计划卡片编辑的是本次训练 Session 草稿，不修改 WorkoutTemplate
- 已完成状态由 WorkoutSession completed 与本地日期归属决定
- 统计不阻碍训练入口
- 建议永远不是强制操作

## 21. Acceptance Criteria

- [ ] 无模板时有清晰入口
- [ ] 可从训练模板选择并添加今日训练计划
- [ ] 今日训练计划卡片主体进入本次训练预览/调整页
- [ ] 今日训练计划开始按钮进入训练页
- [ ] 完成后的今日计划显示已完成且不可重复开始
- [ ] 两次点击内进入新训练
- [ ] 一次点击恢复训练
- [ ] 状态和统计刷新正确
- [ ] 深浅色与字体放大可用

## 22. Future Extension

- Live Activity
- 智能恢复建议

## 23. Out of Scope

- 社区
- 排行榜
- 课程推荐
