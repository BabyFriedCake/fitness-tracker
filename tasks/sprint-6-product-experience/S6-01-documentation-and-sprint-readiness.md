# S6-01 文档对齐与 Sprint Readiness

状态：Completed

## Goal

消除 Documentation Final Review 中的冲突，建立 Sprint 6 可执行规格基线。

## Scope

- 统一 P001-P013 编号，移除或明确归档冲突的 `screens/` 旧编号。
- 统一 Exercise Library、Runtime phase 和 Domain 名称。
- 明确 Sprint 6 范围与非目标。
- 将 Sprint 6 涉及的 Prototype 补齐为可验收规格并更新状态。
- 对齐训练页自动完成组规则及 History cancelled 可见性。
- 对齐 Codex Execution Policy 与 Constitution。
- 更新已完成 Sprint 的任务目录状态。

## Allowed Files

- `docs/`
- `tasks/sprint-1-bootstrap/README.md`
- `tasks/sprint-2-exercise-library/README.md`
- `tasks/sprint-3-workout-templates/README.md`
- `tasks/sprint-6-product-experience/`

## Non-goals

- 不修改业务代码。
- 不修改数据库实现或 Migration。
- 不实现 Sprint 6 产品功能。

## Acceptance Criteria

- Prototype 编号只有一套 P001-P013。
- Sprint 6 Scope 在 Roadmap、Sprint Plan、Transition Plan 中一致。
- PRD、Architecture、Domain Model 使用一致术语和 Runtime phase。
- Database 文档明确哪些 Sprint 6 字段需要新 Migration。
- Design System 不再要求手动完成组。
- 已完成 Sprint 不再标记为 Ready。

## Validation

- `pnpm format:check`
- `git diff --check`
- 文档关键词与编号交叉检查

## Risks

- 错误修改历史 Release Report。
- 将未来能力误写为当前已实现。
