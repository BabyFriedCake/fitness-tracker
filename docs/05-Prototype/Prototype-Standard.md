
# Prototype Standard v1.0

Status: Approved

## Prototype 的定位

Prototype 不只是页面说明，而是产品规格书（Product Specification）。

它应同时服务于：

- 产品经理
- UI 设计师
- React Native 开发
- QA 测试
- AI（Codex / Claude Code / Cursor）

---

## 每个页面统一结构

1. Metadata
2. Page Goal
3. User Story
4. Entry & Exit
5. Wireframe（ASCII）
6. Layout
7. Components（引用 Design System）
8. Interactions
9. State Machine
10. Data Dependency（引用 Domain Model）
11. Source of Truth
12. Navigation
13. Edge Cases
14. Analytics
15. Design Decisions
16. Acceptance Criteria
17. Future Extension
18. Out of Scope（V1）

---

## 编写原则

- 描述用户体验，不描述 React Native 实现。
- 描述领域对象，不描述 SQLite 表结构。
- 每个页面只有一个正式版本。
- 设计决策必须记录原因，避免 AI 擅自“优化”。
- 所有组件必须引用 Design System。
- 所有数据必须能映射到 Domain Model。

---

## Review 流程

每个 Prototype 页面必须经过：

- Product Review
- Architecture Review
- Development Review
- AI Review

全部通过后，状态更新为：

Approved
