# P003 - Start Workout

Version: v1.0  
Status: Review  
Owner: Product Owner  
Module: Workout Flow  
Priority: P0

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies
- WorkoutTemplate
- TemplateExercise
- WorkoutSession
- SessionExercise
- Recommendation
- 历史 WorkoutSet

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

确认并临时调整今天的训练内容，然后开始真实训练。

## 4. Responsibilities

### 负责
- 创建 draft Session 快照
- 临时添加、删除、禁用、排序动作
- 显示上次表现与建议
- 启动 Session

### 不负责
- 修改原模板
- 记录正式 WorkoutSet
- 自动接受建议

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
P001 添加今日计划 → 选择模板 → 创建或打开 draft Session
→ 调整本次训练 → 开始 → P004
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
Push · 今天训练 · 5动作 · 18组
1 杠铃卧推 4组 · 8–10次 · 90秒
上次80kg×10 建议82.5kg [编辑][禁用]
...
[添加动作]
[开始训练]
```

## 10. Component Inventory

- Session Summary
- Session Exercise Row
- Recommendation Label
- Add Button
- Primary Start Button
- Edit Sheet
- Exit Confirm

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- WorkoutTemplate
- TemplateExercise
- WorkoutSession
- SessionExercise
- Recommendation
- 历史 WorkoutSet

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 无历史显示首次训练
- 所有动作禁用时不可开始
- 有 in_progress Session 时禁止新建
- 无建议时仅展示上次表现

## 13. Interaction Matrix

- 开始→Session 设为 in_progress 并进入 P004
- 添加→P007
- 编辑参数→仅当前 Session
- 禁用/排序/删除→更新快照
- 返回→保留或删除草稿

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
CreatingDraft → Ready / Error → Editing → Starting → P004 / Error
```

## 15. Data Dependency

- WorkoutTemplate
- TemplateExercise
- WorkoutSession
- SessionExercise
- Recommendation
- 历史 WorkoutSet

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

- 模板归档不影响 draft
- 重复创建草稿
- 启动重复点击
- 动作停用但快照存在
- 疲劳/经期只提示不自动调整

## 19. Analytics

- workout_draft_created
- session_exercise_edited
- workout_started
- workout_start_failed
- workout_draft_discarded

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- draft 支持恢复
- 正式 Set 不在此页创建
- 当天调整不修改模板

## 21. Acceptance Criteria

- [ ] 正确创建快照
- [ ] 可临时调整
- [ ] 无动作不可开始
- [ ] 重复点击不产生重复 Session
- [ ] 草稿可恢复

## 22. Future Extension

- 空白训练
- AI 当日调整
- 超级组

## 23. Out of Scope

- 自动修改模板
- 正式训练组记录
