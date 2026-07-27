# Final Release Tag / Release / Changelog

版本：Final
状态：Completed

## 目的

为 Final Release 准备可审阅的发布材料，统一 tag 命名、release 说明和变更摘要。

## Tag 命名

- 建议 tag：`final-release`
- 命名依据：
  - 现有 Sprint tag 使用短小、稳定的语义化名称。
  - Final Release 不再属于单个 Sprint，因此不沿用 `sprint-13` 作为对外发布名。
  - `final-release` 可以直接表达发布阶段，便于检索和文档引用。

## Release 标题

- 标题：Final Release
- 说明：Fitness Tracker 的第一个正式交付版本。

## Changelog 摘要

### 已完成

- Workout Template 创建、编辑、归档
- Exercise Library 浏览、搜索、筛选、详情
- Workout Session 生命周期、恢复、完成、取消
- Workout Companion Runtime、反馈事件、语音反馈接口
- Today、History、Summary、Settings、Onboarding 的基础体验
- Recommendation / Coach Decision Foundation
- Release 前技术债收口与验证核对

### 已知限制

- 真实 Voice Engine 尚未实现
- Camera / Pose Detection 尚未实现
- 完整 AI Coach 尚未实现
- 部分原型仍保留基础体验边界
- Final Release 仍依赖真机验证和后续交付收口

### 发布风险

- 真机与桌面验证结果可能不完全一致
- 仍需确认 GitHub-hosted CI 的最终运行结果
- 发布材料需要与 Roadmap、Prototype 状态一致

### 当前状态

- 本地 tag `final-release` 已创建。
- GitHub 发布仍待执行。

## 发布说明

1. `final-release` tag 已创建。
2. 继续执行 GitHub release，使用本文件作为说明基础。
3. release 说明中保留 warnings，不伪装成无风险发布。
