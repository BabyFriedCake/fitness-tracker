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

- 动作图片正式资源接入后，今日计划卡片可继续补充真实动作图像

已完成：

- 今日训练计划列表
- 今日计划 completed 后禁用开始
- 训练计划“添加计划”底部弹层
- 本次训练预览/调整页
- 编辑此次训练进入独立 Session 草稿编辑页，可修改组数、目标次数、休息时间并增删动作，不修改原模板
- 今日训练计划与模板选择使用统一选择结果契约

## P005 Rest Timer

缺：

- 系统通知和后台长时间计时增强

已完成：

- Figma 版休息倒计时
- 下一组卡片
- 跳过休息入口
- 跳过休息后下一组 Mock 自动计数恢复

## P006 Summary

缺：

- PR
- 备注
- 训练详情分析

## P007 Exercise Library

缺：

- 正式动作图片资源授权与导入
- 自定义动作完整创建流程

已完成：

- Figma 左侧肌群分类栏
- 右侧器械分类
- 自定义动作入口的稳定禁用/暂不支持提示
- 图片动作卡片布局
- 动作详情图像区域显示离线稳定占位

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
- 开发环境数据重置入口

缺：

- 完整系统设置
- 默认休息和重量步进持久化
- 正式用户数据导出与清除
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
- 训练页本地中文 TTS 播报（前台会话）
- 训练页默认 Mock 自动计数输入源
- 训练页进入后自动启动 draft Session 并自动推进 Rep

缺：

- iOS / Android 真机播报与静音模式验收
- 完整语音状态展示
- 语音识别与真实输入源

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

## Sprint 13 / Final Release 完成后说明

Sprint 13 已完成 Final Release 硬化与发布收口：

- 归档既有技术债
- 核对发布验证
- 完成 Tag / Release / Changelog

当前不再扩展原型范围，后续仅进入发布后稳定性观察与原型对齐。

## Prototype 与 Sprint 关系

Prototype 定义产品体验边界，Sprint 定义工程实现阶段。二者不是一一映射关系。
