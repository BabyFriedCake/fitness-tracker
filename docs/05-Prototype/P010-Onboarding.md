# P010 - Onboarding

Version: v1.0  
Status: Review  
Owner: Product Owner  
Module: Onboarding  
Priority: P1

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies
- UserSetting
- WorkoutTemplate
- TemplateExercise
- Exercise
- System Permission

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

快速帮助新用户创建第一个模板并开始训练。

## 4. Responsibilities

### 负责
- 说明核心价值
- 可选训练方向
- 创建自定义或示例模板
- 解释通知用途
- 完成首次设置

### 不负责
- 冗长教程
- 强制问卷
- AI自动计划
- 强制注册权限

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
首次启动 → 欢迎 → 可选目标 → 模板设置 → 完成 → P001/P003
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
欢迎使用 Fitness Tracker
记录真实训练，看见长期进步
[开始设置]
创建第一个训练模板
[从空白创建] [使用示例]
准备好了
[开始第一次训练] [稍后]
```

## 10. Component Inventory

- Welcome Content
- Primary Continue
- Goal Choice
- Template Choice
- Permission Info
- Skip Button
- Step Indicator

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- UserSetting
- WorkoutTemplate
- TemplateExercise
- Exercise
- System Permission

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 目标可跳过
- 通知仅解释且按需请求
- 已有模板可直接完成
- 示例必须确认后写入
- 完成前应有模板或明确进入空状态

## 13. Interaction Matrix

- 开始设置→下一步
- 跳过目标
- 自定义→P002
- 示例→预览确认创建
- 开始训练→P003
- 稍后→P001

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Welcome → OptionalGoal → TemplateSetup → Completed；TemplateSetup 可往返 P002
```

## 15. Data Dependency

- UserSetting
- WorkoutTemplate
- TemplateExercise
- Exercise
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

- 中途退出继续
- 示例动作缺失
- 模板创建事务失败
- 已有模板但标记丢失
- 拒绝通知
- 清除数据后重新进入

## 19. Analytics

- onboarding_started
- onboarding_goal_skipped
- onboarding_custom_template_selected
- onboarding_example_template_selected
- onboarding_completed
- first_workout_started

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 不做教程轮播
- 非必要步骤可跳过
- 权限按需请求
- 示例由用户确认
- 聚焦第一次真实训练

## 21. Acceptance Criteria

- [ ] 首次进入
- [ ] 可跳过
- [ ] 可创建两类模板
- [ ] 完成后不重复
- [ ] 拒绝权限不阻塞
- [ ] 中途可继续
- [ ] 示例失败无半成品

## 22. Future Extension

- 经验水平推荐
- AI计划
- 设备导入
- 动作教学

## 23. Out of Scope

- 强制注册
- 付费墙
- 医疗评估
