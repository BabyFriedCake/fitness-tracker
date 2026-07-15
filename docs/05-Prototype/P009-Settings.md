# P009 - Settings

Version: v1.0  
Status: Review  
Owner: Product Owner  
Module: Settings  
Priority: P2

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies
- UserSetting
- System Permission
- App Metadata
- 本地导出服务

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

管理训练默认值、提醒和用户数据。

## 4. Responsibilities

### 负责
- 默认休息和重量步进
- 重量单位
- 通知声音震动
- 导出与清除
- 版本与许可

### 不负责
- 编辑模板
- 修改历史事实
- 云账号
- 健康诊断

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
设置 → 修改偏好自动保存 → 新建内容采用新默认值
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
设置
训练：默认休息90秒 · 步进2.5kg · 单位kg
提醒：通知/声音/震动
数据：导出数据 · 清除全部数据
关于：版本 · 开源许可 · 动作来源
```

## 10. Component Inventory

- Settings Section
- Settings Row
- Switch
- Value Picker
- Export Button
- Destructive Modal
- Permission Status

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- UserSetting
- System Permission
- App Metadata
- 本地导出服务

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- 系统权限关闭显示前往设置
- 未实现功能不显示空入口
- 清除始终高风险确认
- V1仅kg时单位不可切换或隐藏

## 13. Interaction Matrix

- 修改设置→自动保存
- 权限→系统请求或设置
- 导出→生成并分享
- 清除→二次确认并事务删除
- 许可→详情

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Loading → Ready/Error；Ready → Updating/Exporting/ConfirmingClear/Clearing
```

## 15. Data Dependency

- UserSetting
- System Permission
- App Metadata
- 本地导出服务

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

- 系统权限与App设置不一致
- 导出过大
- 清除部分失败必须回滚
- 单位未来切换不改历史
- 许可缺失阻止发布

## 19. Analytics

- settings_viewed
- setting_changed
- data_export_completed
- data_clear_completed
- license_viewed

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 设置自动保存
- 默认值只影响未来数据
- 数据归用户所有
- 清除使用高摩擦确认

## 21. Acceptance Criteria

- [ ] 重启保留
- [ ] 不改已有数据
- [ ] 权限状态准确
- [ ] 导出完整
- [ ] 清除安全事务化
- [ ] 许可可查看

## 22. Future Extension

- lb单位
- 主题
- 云同步
- 自动备份
- 穿戴设置

## 23. Out of Scope

- 社交账号
- 订阅管理
