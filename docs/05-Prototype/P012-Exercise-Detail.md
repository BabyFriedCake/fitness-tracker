# P012 - Exercise Detail

Version: v1.0
Status: Approved
Owner: Product Owner
Module: Exercise Domain
Priority: P0

## 1. Metadata

Related Documents: PRD、Architecture、Domain Model、Database、Design System。

## 2. Screen Contract

### Inputs / Dependencies

- ExerciseId
- Exercise Repository
- 当前动作库上下文

### Outputs

- 返回 P007 或调用来源
- 在选择模式下返回所选 ExerciseId

## 3. Page Goal

让用户在离线状态下理解动作目标、器械、步骤和数据来源。

## 4. Responsibilities

### 负责

- 展示动作名称、肌群、器械和训练类型
- 展示动作说明和有序步骤
- 展示可合法分发的图片或稳定占位
- 展示来源、许可证和必要归属信息
- 保留动作选择上下文

### 不负责

- 修改标准动作
- 播放未获许可的媒体
- 动作识别、姿态分析或 AI 建议
- 修改 TemplateExercise、SessionExercise 或 WorkoutSet

## 5. User Story

作为力量训练用户，我希望查看动作的完整说明和来源，从而确认动作是否适合
当前训练。

## 6. User Journey

```text
P007 → Exercise Detail → 返回 P007
P002/P003/P004 选择上下文 → P007 → Exercise Detail → 选择或返回
```

## 7. Entry & Exit

页面由稳定 ExerciseId 打开。返回时必须保留搜索、筛选和选择草稿。

## 8. Information Architecture

顺序为：名称与媒体、训练部位与器械、动作步骤、来源与许可证。

## 9. Wireframe

```text
动作名称
[本地图片或占位]
胸 · 杠铃 · 力量
动作说明
1. ...
2. ...
来源 / License / Attribution
```

## 10. Component Inventory

- Exercise Media
- Exercise Metadata
- Instruction Steps
- Source Attribution
- Loading / Error / Missing State

## 11. Screen Data Dictionary

- Exercise
- ExerciseSource
- ExerciseInstruction

## 12. Visibility Rules

- 无图片时显示稳定占位，不在运行时访问 GitHub。
- 无中文步骤时可显示已导入的英文步骤并明确语言。
- 来源、许可证或归属存在时必须完整展示。
- inactive 动作可供历史查看，但不得在新选择流程中添加。

## 13. Interaction Matrix

- 返回 → 恢复调用页上下文
- 选择 → 返回稳定 ExerciseId
- 加载失败 → 显示稳定错误和重新加载

## 14. State Machine

```text
Loading → Ready / Missing / Error
Error → Reloading → Ready / Missing / Error
```

## 15. Data Dependency

只通过 Exercise Repository 读取本地 SQLite 数据。

## 16. Source of Truth

Exercise Domain 是动作字段事实；Database 保存导入后的本地数据；页面不根据
媒体路径推断动作属性。

## 17. Navigation

使用 `/exercises/[id]`，Route 只负责参数和 Navigation。

## 18. Edge Cases

- ExerciseId 无效或不存在
- 图片文件缺失
- 说明只有一种语言
- 来源要求展示 Attribution
- 动作已停用

## 19. Analytics

不在 Sprint 6 引入远程 Analytics。

## 20. Design Decisions

- 数据集只在构建或开发导入阶段读取。
- 不复制未获得再分发许可的第三方媒体。
- 详情页面显示真实导入字段，不生成缺失说明。

## 21. Acceptance Criteria

- [ ] 页面完全离线可用。
- [ ] 正确展示动作属性和有序步骤。
- [ ] 来源、许可证和归属信息可查。
- [ ] 无媒体、无中文说明和 inactive 状态有明确表现。
- [ ] 返回后搜索、筛选和选择上下文不丢失。
- [ ] Loading、Missing、Ready、Error 状态可测试。

## 22. Future Extension

- 经授权的动画或视频
- 用户收藏
- 替代动作

## 23. Out of Scope

- 运行时 GitHub 请求
- Camera、Pose Detection、AI Coach
- 用户编辑标准动作
