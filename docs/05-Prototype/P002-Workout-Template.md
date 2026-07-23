# P002 - Workout Template

Version: v1.0  
Status: Review  
Owner: Product Owner  
Module: Template Flow  
Priority: P0

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies
- WorkoutTemplate
- TemplateExercise
- Exercise
- UserSetting

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

创建和维护可重复使用的训练计划。

## 4. Responsibilities

### 负责
- 模板名称与描述
- 添加、删除、排序动作
- 设置目标组数、次数范围、休息时间
- 保存与归档

### 不负责
- 保存真实重量
- 修改历史 Session
- 用户自建 Exercise
- 编辑 Today 页面中某一次训练的 Session 草稿

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
模板入口 → 填写信息 → P007 添加动作 → 配置参数 → 排序 → 保存
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
创建训练模板
名称 [Push]
描述 [胸肩三头]
1 杠铃卧推 4组 · 8–10次 · 90秒 [编辑][删除]
2 上斜哑铃卧推 ...
[从动作库添加]
[保存模板]
```

## 10. Component Inventory

- Text Input
- Exercise Row
- Drag Handle
- Config Bottom Sheet
- Add Button
- Primary Save Button
- Confirm Modal

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- WorkoutTemplate
- TemplateExercise
- Exercise
- UserSetting

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 至少一个动作才能用于训练
- 编辑已有模板时显示归档
- 重复动作默认阻止
- 已停用动作仅在旧模板中显示

## 13. Interaction Matrix

- 添加动作→P007
- 点击动作→编辑参数
- 拖动→排序
- 删除→确认
- 保存→校验并持久化
- 返回→未保存确认

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
NewEmpty / Editing → Validating → Saving → Saved 或 Error
```

## 15. Data Dependency

- WorkoutTemplate
- TemplateExercise
- Exercise
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

- 名称为空
- 次数范围反转
- 保存时切后台
- 模板有历史引用
- 保存失败保留编辑内容

## 19. Analytics

- template_create_viewed
- template_exercise_added
- template_reordered
- template_saved
- template_archived

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 模板不保存固定重量
- 归档优先于永久删除
- 动作来自标准库
- 模板列表卡片默认进入模板详情；编辑模板必须通过明确编辑入口进入。
- Today 计划卡片进入的是本次训练预览/调整页，不是模板编辑页。

## 21. Acceptance Criteria

- [ ] 可创建编辑归档
- [ ] 可排序和配置动作
- [ ] 修改不影响历史
- [ ] 错误提示明确

## 22. Future Extension

- 模板复制
- 超级组
- AI 计划

## 23. Out of Scope

- 固定星期排程
- 模板分享
- 自建动作
