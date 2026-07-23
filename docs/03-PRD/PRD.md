# Fitness Tracker Product Requirement Document

版本：2.0

状态：Active

# 1. 产品定位

Fitness Tracker 从训练记录工具升级为 AI Fitness Coach（AI 健身陪练）。

目标：

帮助用户完成训练计划管理、动作学习、实时训练陪伴、自动训练记录以及长期训练分析。

产品参考方向：

- Keep：训练陪练体验
- 训记：动作库和训练记录体验

# 2. 核心用户流程

    选择训练模板

    ↓

    开始 Workout Session

    ↓

    Workout Companion 陪练

    ↓

    记录训练过程

    ↓

    生成 History

    ↓

    优化下一次训练

# 3. 当前已有能力

## Workout Template

支持：

- 创建模板
- 添加动作
- 设置组数
- 设置目标次数
- 设置休息时间

## Exercise Library

支持：

- 动作列表
- 搜索
- 分类
- 筛选
- 动作详情

## Workout Runtime

作为训练核心状态机。

支持：

- running
- paused
- set_completion_pending
- resting
- exercise_completion_pending
- completed

## History

记录：

- 日期
- 模板
- 动作
- 完成情况
- 训练数据

# 当前版本边界

已完成：

- Workout Runtime
- Companion Event Contract
- Companion Event Source Interface

未实现：

- Camera Pose Detection
- Voice Engine
- AI 推理模型
- 自动动作识别

当前阶段只建设架构接口。

# 4. AI Fitness Coach 规划

## Voice Coach

目标：

提供类似 Keep 的实时语音陪练。

包括：

- 开始训练提示
- 次数反馈
- 组完成提示
- 休息提醒
- 训练总结

## Auto Rep Counter

目标：

自动识别动作次数。

数据流：

    Camera / Pose / Voice

    ↓

    RepCompleted Event

    ↓

    Workout Runtime

    ↓

    更新训练状态

    ↓

    Voice Feedback

原则：

识别模块不能直接修改 Runtime。

## AI Coach

未来能力：

- 训练建议
- 重量调整
- 计划优化
- 个性化反馈

# 5. 产品原则

## Runtime First

所有训练状态必须由 Runtime 管理。

UI 不直接修改训练状态。

## Event Driven

模块通过事件连接。

核心事件：

- WorkoutStarted
- RepCompleted
- SetCompleted
- RestStarted
- WorkoutCompleted
- VoiceFeedbackRequested

## Incremental Development

基于 Sprint 5 Runtime 架构扩展。

不推翻已有 Domain。


---

# Workout Runtime 状态模型补充

## WorkoutSession 状态

WorkoutSession 表示一次真实训练生命周期。

状态：

- draft
- in_progress
- completed
- cancelled

## WorkoutRuntime 状态

WorkoutRuntime 表示训练过程中的当前阶段，不代表 Session 生命周期。

状态：

- running
- paused
- resting
- completed
- set_completion_pending
- exercise_completion_pending

规则：

- Session 状态用于历史记录和业务生命周期。
- Runtime 状态用于训练过程 UI 和事件流。
- cancelled 属于 Session 生命周期，不属于 Runtime phase。
