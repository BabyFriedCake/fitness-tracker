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

- Figma 版“添加计划”Modal
- 今日训练计划列表
- 今日计划 completed 后禁用开始
- 本次训练预览/调整页

## P005 Rest Timer

缺：

- Figma 版休息页
- 下一组卡片
- 跳过休息入口视觉对齐

## P006 Summary

缺：

- PR
- 备注
- 训练详情分析

## P007 Exercise Library

缺：

- Figma 左侧肌群分类栏
- 右侧器械分类
- 图片动作卡片布局
- 自定义动作入口的稳定禁用/暂不支持提示

## P008 History

缺：

- Figma 月历交互
- 日期点击后显示对应日期训练
- 日期肌群标签

---

# Not Started

- Settings
- Onboarding
- Voice Coach 产品能力
- AI Coach

---

# Sprint 7 开始前要求

1. 保持 WorkoutSession 与 Runtime Domain 不变；Exercise Domain 只增加获批的数据集字段。
2. 保持 Runtime 边界。
3. 不绕过 Event Contract 修改训练状态。
4. 优先完成已有 Prototype 与代码实现差距。

# Next Sprint Focus

Sprint 7:

Priority:

1. S7-00 Figma Product Alignment
2. P001 Today Plan
3. P007 Exercise Library visual alignment
4. P008 History calendar interaction
5. P004/P005 Workout/Pause/Rest UI alignment

Avoid:

- 修改 Workout Runtime
- 修改 Event Contract
- 修改 Session 数据模型
- 用户自定义动作


## Prototype 与 Sprint 关系

Prototype 定义产品体验边界，Sprint 定义工程实现阶段。二者不是一一映射关系。
