# Sprint 7 - Workout Companion Expansion

状态：Planned

## 目标

在不破坏 Sprint 5 Runtime、Sprint 6 已合并能力和本地优先架构的前提下，
继续增强 Workout Companion 训练体验。

## 执行顺序

- [x] `S7-00-R0-today-plan-domain-and-schema.md`
- [x] `S7-00-R1-today-plan-ui-binding.md`
- [x] `S7-00-R2-today-plan-detail-entry.md`
- [x] `S7-00-R3-today-plan-session-edit.md`
- [x] `S7-00-R4-exercise-library-figma-alignment.md`
- [x] `S7-00-R5-history-calendar-figma-alignment.md`
- [x] `S7-00-R6-workout-runtime-ui-figma-alignment.md`
- [ ] `S7-00-figma-product-alignment.md`

后续 Voice Coach、Rep Event、Auto Rep Counter 接口和 Companion Settings
任务必须在 `S7-00-R0` 和 `S7-00` 完成后再细化。

## Sprint 7 前置约束

- 保持 Workout Runtime 状态机兼容。
- 保持 Event Source Architecture。
- 不实现用户自定义动作。
- 不实现 Camera / Pose Detection。
- 不实现完整 AI Coach。
- 不绕过 Application / Domain / Repository 边界。

## Post Sprint 6 Alignment

Sprint 6 已合并到 `main`。

Figma 交互偏差作为 Sprint 7 前置任务处理，而不是回改 Sprint 6 完成记录。

`S7-00` 执行前必须先完成 `S7-00-R0`，因为 Today 训练计划需要正式
Domain 和 Database 支持。
