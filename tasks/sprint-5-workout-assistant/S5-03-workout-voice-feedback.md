# S5-03 Workout Voice Feedback

## Goal

接入训练语音反馈能力，将 Runtime Event 转换为用户可听见的训练提示。

## Execution Prompt

执行前必须阅读：

-   workflow/prompts/implement-task.md

严格保持架构：

UI → Application → Runtime Event → Voice Adapter

不要修改：

-   Schema
-   Migration
-   Domain Aggregate

## Scope

新增 Voice Feedback Application 能力。

支持：

RepCompleted:

例如： "第 10 次"

SetCompleted:

例如： "第 1 组完成"

RestTimer:

例如： "休息 90 秒"

要求：

-   Voice 只消费事件
-   不直接读取数据库
-   不绑定 UI 生命周期

## Acceptance Criteria

-   Runtime Event 可以触发对应语音消息
-   可以关闭语音反馈
-   不影响训练流程
-   测试覆盖事件到语音映射

## Non Goals

本任务不实现：

-   后台播放优化
-   锁屏控制
-   音频资源管理
-   AI 教练

## Tests

执行：

pnpm format:check pnpm lint pnpm typecheck pnpm test git diff --check

## Self Review

确认：

-   Voice 与 Runtime 解耦
-   Pause/Resume 后续可以接入
-   没有破坏 S5-01 Runtime Engine
