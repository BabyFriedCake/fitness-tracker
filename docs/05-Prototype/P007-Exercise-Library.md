# P007 - Exercise Library

Version: v1.0  
Status: Approved
Owner: Product Owner  
Module: Exercise Domain  
Priority: P0

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database（如涉及）、Design System。

## 2. Screen Contract

### Inputs / Dependencies
- Exercise
- 当前 TemplateExercise 或 SessionExercise 用于已添加判断

### Outputs
- 执行本页面定义的用户操作
- 按 Navigation 进入目标页面
- 只修改职责范围内的领域对象

## 3. Page Goal

快速找到标准动作并添加到模板或 Session。

## 4. Responsibilities

### 负责
- 搜索筛选
- 动作列表浏览
- 选择动作返回上下文
- 显示来源与许可
- 跳转到动作详情页面

### 详情职责边界

P007 不负责完整动作详情内容。

动作详情由 P012 Exercise Detail 负责：

- 动作说明
- 图片/媒体
- 动作步骤
- 注意事项

P007 只提供入口和摘要信息。

### 不负责
- 用户创建标准动作
- 当前版本不提供自定义添加动作入口
- 课程视频
- 动作识别

## 5. User Story

作为力量训练用户，我希望通过本页面完成核心任务，从而减少操作成本并确保训练数据可靠。

## 6. User Journey

```text
P002/P003/P004 → 搜索筛选 → 选择 → 返回来源；或动作库Tab浏览
```

## 7. Entry & Exit

入口和出口必须遵循第 17 节 Navigation，并在返回时保留已持久化数据和必要草稿。

## 8. Information Architecture

页面信息顺序以核心任务为先，辅助信息不得抢占 Primary Action。

## 9. Wireframe

```text
动作库
[搜索动作]                                      [+]
左侧肌群分类：胸 / 上胸 / 中下胸 / 背 / 腿 / 肩 / 手臂 / 核心
右侧器械筛选：置顶 / 杠铃 / 哑铃 / 壶铃 / 绳索 / 器械 / 自重

胸部动作
[图片] 杠铃卧推 · 胸大肌 · 杠铃 [讲解]
[图片] 暂停卧推 · 胸大肌 · 杠铃 [讲解]
```

## 10. Component Inventory

- Search Input
- Left Muscle Category Rail
- Equipment Filter Chips
- Exercise Image Card
- Add Button
- Detail Entry
- Empty State
- Source Label

所有组件引用 `docs/07-Design-System/`，关键点击区域至少 44×44 pt。

## 11. Screen Data Dictionary

- Exercise
- 当前 TemplateExercise 或 SessionExercise 用于已添加判断

页面只读取必要信息；派生信息必须能追溯到领域事实。

## 12. Visibility Rules

- browse 模式不直接添加
- 选择模式显示添加
- 顶部搜索右侧可显示加号，但当前版本点击后进入“暂不支持自定义动作”的稳定提示或禁用状态；
  不得创建本地自定义 Exercise。
- 左侧肌群分类改变主过滤条件
- 右侧器械分类与肌群分类组合筛选
- 结果优先展示动作图片；无图片使用稳定占位
- 停用动作不用于新选择
- 无图片使用占位
- 已添加动作禁用重复添加

## 13. Interaction Matrix

- 输入搜索→本地过滤
- 部位/器械组合筛选
- 查看→详情
- 添加→返回所选 Exercise
- 顶部加号→当前版本不创建动作，显示暂不支持提示
- 清除筛选
- 取消返回

所有写操作需防止重复点击和重复持久化。

## 14. State Machine

```text
Loading → Ready/Filtering/NoResults/Selecting 或 Error
```

## 15. Data Dependency

- Exercise
- 当前 TemplateExercise 或 SessionExercise 用于已添加判断

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

- 中文英文同义词
- 重复ID导入校验
- 许可不允许图片
- 大量结果性能
- 来源页面被系统回收

## 19. Analytics

- exercise_library_viewed
- exercise_searched
- exercise_filter_applied
- exercise_selected
- exercise_no_results

Analytics 不得未经明确隐私方案上传完整训练明细。

## 20. Design Decisions

- 稳定ID保证统计一致
- V1不自建动作
- 组合筛选
- 许可可追溯
- 浏览与选择复用页面
- Figma 中的“创建新动作”属于后续版本入口，当前实现不得越过 Domain Model 创建自定义 Exercise。

## 21. Acceptance Criteria

- [ ] 中英文搜索
- [ ] 组合筛选正确
- [ ] 左侧肌群分类与右侧器械筛选符合 Figma 布局
- [ ] 动作卡片展示图片或占位
- [ ] 添加上下文正确
- [ ] 不重复添加
- [ ] 停用不影响历史
- [ ] 许可可查

## 22. Future Extension

- 收藏
- 最近使用
- 替代动作
- 用户自定义
- 动画视频

## 23. Out of Scope

- 社区动作上传
- 摄像头分析
