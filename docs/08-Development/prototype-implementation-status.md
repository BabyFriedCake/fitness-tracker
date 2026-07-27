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

已完成：

- 月历基础交互
- 月份切换
- 日期点击后显示对应日期训练
- 有训练日期显示肌群标签
- completed / cancelled 的基础展示边界
- 基础训练量趋势
- History Metrics Contract
- Session Detail 的动作 / Set 明细
- PR 基线
- Summary 与 History 统计口径统一

缺：

- 历史纠错标识和重算边界
## P009 Settings

已完成：

- 会话级 Companion Settings 入口

缺：

- 完整系统设置
- 默认休息和重量步进持久化
- 数据导出与清除
- 版本、许可和动作来源

## P010 Onboarding

已完成：

- 首次启动引导 gate
- 可跳过的基础引导流程
- 空白模板 / 示例模板创建入口
- onboarding 状态使用 `user_settings` 持久化

缺：

- 权限说明与按需请求
- 示例模板预览确认
- 更完整的首次训练入口分流

## P011 Voice Coach

已完成：

- 语音反馈事件
- 训练页语音开关
- 语音反馈失败降级

缺：

- 真实 Voice Engine
- 完整语音状态展示
- 输入源切换和生命周期管理

---

# Not Started

- AI Coach

---

# Sprint 11 完成后说明

1. 保持 WorkoutSession 与 Runtime Domain 不变；继续避免把识别逻辑写进 Runtime。
2. 保持 Event Source Architecture 和现有 Voice/TTS 契约。
3. 不绕过 Repository / Domain 修改历史训练事实。
4. Recommendation / Coach Decision Layer 已完成基础收口，但完整 AI Coach 仍属后续规划。

## Sprint 11 目标摘要

Sprint 11 已把 AI / Recommendation 相关能力收敛为可解释、可控的前置层：

- Recommendation Interface 已建立
- Coach Decision Layer 已建立
- 建议预览和展示入口已建立
- “建议”不会覆盖用户事实

当前不把完整 AI Coach 作为已实现能力。

## Sprint 12 完成后说明

Sprint 12 已聚焦并收口：

- P001 Today 的计划与入口对齐
- P002 模板详情 / 编辑分流收口
- P005 Rest Timer 视觉与交互收口
- P006 Summary 信息补齐
- P007 Exercise Library 布局对齐
- P008 History 日历与钻取收口
- P009 Settings 和 P010 Onboarding 的基础体验完善

目标不是增加新产品方向，而是把现有原型差距收口到更稳定的可交付状态。

## Sprint 13 发布前说明

Sprint 13 只聚焦 Final Release 硬化：

- 归档既有技术债
- 核对发布验证
- 准备 Tag / Release / Changelog

不再扩展原型范围。


## Prototype 与 Sprint 关系

Prototype 定义产品体验边界，Sprint 定义工程实现阶段。二者不是一一映射关系。
