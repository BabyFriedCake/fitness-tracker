# Sprint 12 Plan

状态：Planned

## Goal

把现有产品体验收口到接近可交付状态，优先补齐 Prototype 差距和关键交互偏差，
不引入新的产品方向。

## Planning Principle

- 先收口现有页面和交互，不扩张成新功能。
- 保持 Runtime / Repository / Event Source 边界不变。
- 优先处理用户已经能触达、但体验还不一致的页面。
- 不修改历史训练事实。

## Sprint 12 Scope

### Prototype Alignment

- P001 Today
- P002 Workout Template
- P005 Rest Timer
- P006 Workout Summary
- P007 Exercise Library
- P008 History
- P009 Settings
- P010 Onboarding
- P011 Voice Coach

### Release Readiness Foundations

- 文档一致性检查
- 本地验证收口
- 警告和技术债归档
- 退出条件确认

## Sprint 12 Non-goals

- 不实现完整 AI Coach。
- 不新增云同步、账号或订阅。
- 不改变 Workout Runtime 主状态机。
- 不引入新的数据库结构。
- 不做与原型无关的功能扩展。

## Sprint 12 Risks

- 多页面并行对齐容易引入回归。
- 体验修正容易被误扩成新需求。
- 文档和实现的收口要保持同步。

## Execution Order

1. S12-00 Sprint Readiness and Gap Sync
2. S12-01 Today Plan and Entry Alignment
3. S12-02 Template Detail and Edit Flow Alignment
4. S12-03 Exercise Library Layout Alignment
5. S12-04 History Calendar and Drilldown Alignment
6. S12-05 Workout / Rest / Summary UI Alignment
7. S12-06 Settings and Onboarding Polish
8. S12-07 Sprint Exit Review

## Exit Criteria

- Roadmap 已同步。
- Prototype 状态已同步。
- 任务文件已创建并按顺序排列。
- 关键 Prototype 差距有对应验收。
- 本地 validation 通过。
- Sprint 12 Exit Report 已生成。
