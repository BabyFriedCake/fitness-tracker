# Prototype Implementation Status

Related document:

For product prototype overview,
see:

Prototype-Status.md

本文档作为 Codex 开发基线。

---

# 项目结构关系

Prototype:

- 定义页面
- 定义用户体验
- 定义交互目标

Sprint:

- 定义工程交付阶段
- 定义实现范围

关系：

Prototype → Use Case → Domain → Repository → UI

不是 Sprint 一一对应 Prototype。

---

# Sprint 完成状态

## Completed

### Sprint 1

工程基础

### Sprint 2

Exercise Domain

### Sprint 3

Workout Template

### Sprint 4

Workout Flow

### Sprint 5

Workout Companion Runtime

Sprint 5 已完成：

- Workout Runtime Engine
- Companion Event Source Contract
- Runtime UI Binding
- Snapshot Persistence
- Recovery Flow
- Runtime Event Architecture

验证：

- 34 suites
- 442 tests PASS

---

# Partial

## P001 Today

缺：

- DailyStatus 展示
- 最近训练
- 本周概览
- Recommendation 展示

## P005 Rest Timer

缺：

- 完整暂停流程
- 延长时间
- 跳过休息

## P006 Summary

缺：

- PR
- 备注
- 训练详情分析

## P007 Exercise Library

缺：

- 真实动作数据
- 图片资源
- 动作详情

## P008 History

缺：

- 日历视图
- 趋势统计
- 训练分析

---

# Not Started

- Settings
- Onboarding
- Voice Coach 产品能力
- AI Coach

---

# Sprint 6 开始前要求

1. 保持现有 Domain 不变。
2. 保持 Runtime 边界。
3. 不绕过 Event Contract 修改训练状态。
4. 优先完成已有 Prototype 与代码实现差距。

# Next Sprint Focus

Sprint 6:

Priority:

1. P007 Exercise Library
2. P012 Exercise Detail
3. P008 History
4. P001 Today Experience

Avoid:

- 修改 Workout Runtime
- 修改 Event Contract
- 修改 Session 数据模型


## Prototype 与 Sprint 关系

Prototype 定义产品体验边界，Sprint 定义工程实现阶段。二者不是一一映射关系。
