# Sprint 8 Plan

状态：Done

## Goal

把已完成的训练主干补成可稳定使用的产品体验，优先收口 Today、模板详情/编辑分流、
动作库、历史、Workout/Rest/Summary 视觉，以及 Settings / Onboarding 的基础体验。

## Planning Principle

- 不改 WorkoutSession / Runtime 主干架构
- 不引入完整 AI Coach
- 不实现真实 Voice Engine
- 不创建用户自定义动作
- 以 Prototype 差距和现有 Exit Report 的 warning 为任务来源

## Sprint 8 Scope

### P001 Today

- 今日计划入口
- 计划卡片开始/完成态
- 预览 / 调整页分流

### P002 Workout Template

- 模板详情页
- 从详情页进入编辑
- 列表到详情的导航统一

### P005 / P006 Workout Experience

- Workout 页面按钮与信息密度收口
- Rest 页面与 Summary 视觉对齐

### P007 Exercise Library

- Figma 视觉对齐
- 左肌群 / 右器械筛选布局
- 图片卡片布局

### P008 History

- 月历
- 日期切换
- 肌群标签

### P009 Settings / P010 Onboarding

- 基础设置体验
- 首次进入引导基础流程

## Sprint 8 Risks

- 页面体验调整容易扩散为架构重构
- 任务范围较广，必须通过 task plan 严格切分
- 任何影响训练事实的数据改写都要触发 Stop Rule

## Exit Criteria

- roadmap 已同步
- prototype implementation status 已同步
- 任务文件已创建并按顺序排列
- Sprint 8 结束时必须输出 Exit Report

## Completion

- Exit Review：PASS WITH WARNINGS
- Exit Report：`docs/09-Release/Sprint-8-Exit-Report.md`
- 已完成任务：8 / 8
