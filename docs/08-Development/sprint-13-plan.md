# Sprint 13 Plan

状态：Completed

## Goal

把产品推进到可交付状态，优先完成 Final Release 的验证、技术债收口和文档一致性确认。

## Planning Principle

- 只做发布硬化，不新增产品功能。
- 保持当前架构、领域模型和数据库结构不变。
- 优先处理已经存在的 warning、验证缺口和发布证据。
- Release 结果必须可审阅、可复核。

## Sprint 13 Scope

### Release Hardening

- 修复或归档既有 lint warning
- 真机回归和关键流程验证
- CI 结果核对
- Tag / Release / Changelog 准备
- 文档最终对齐

### Technical Debt Closeout

- `use-workout-session-screen.ts` hook warnings
- `workout-coach-decision.ts` / `workout-recommendation-preview.ts` 重复导入 warning
- `workout-history-metrics.ts` 未使用变量 warning

## Current Progress

- S13-00 已完成：范围、技术债和验证状态已对齐。
- S13-01 已完成：`use-workout-session-screen.ts` warning 已收口。
- S13-02 已完成：Recommendation 相关 warning 已收口。
- S13-03 已完成：验证结果和 CI 证据链已核对。
- S13-04 已完成：Tag / Release / Changelog 材料已准备。
- S13-05 已完成：Final Release Report 已生成。

## Sprint 13 Non-goals

- 不实现完整 AI Coach。
- 不引入云同步、账号或订阅。
- 不改变 Workout Runtime 主状态机。
- 不新增数据库结构。
- 不继续扩展原型范围。

## Sprint 13 Risks

- 真机与桌面验证结果可能不一致。
- 发布收口容易被误解为功能扩展。
- 技术债修复可能影响既有测试稳定性。

## Execution Order

1. S13-00 Release Readiness and Debt Sync
2. S13-01 Hook Warning Triage
3. S13-02 Recommendation Warning Cleanup
4. S13-03 Release Verification and CI Review
5. S13-04 Tag / Release / Changelog Preparation
6. S13-05 Final Release Review

## Exit Criteria

- Roadmap 已同步。
- Prototype 状态与 Release 说明已同步。
- 任务文件已创建并按顺序排列。
- 既有 warning 已被明确归档或修复。
- 本地与发布验证结果完整。
- Final Release Report 已生成。
