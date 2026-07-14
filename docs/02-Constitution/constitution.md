# Project Constitution v2.0

Version: 2.0  
Status: Approved (Draft Baseline)  
Owner: Product Owner  
Last Updated: 2026-07-14

---

# 前言

Fitness Tracker 不只是一个健身 App。

本项目希望建立一套 **AI Native Software Development Workflow**，
使人类开发者与 AI（ChatGPT、Codex、Claude Code、Cursor 等）能够在同一套规则下协作。

本宪法（Constitution）是整个仓库的最高规则。

当任何文档发生冲突时，优先遵循本文件。

---

# Principle 0 — Build It Right

> **Slow is smooth. Smooth is fast.**

宁可把规格设计清楚，再开始开发；
不要为了追求速度，留下以后反复返工的隐患。

规则：

- 规格优先于代码
- 允许早期重构
- 不为了“尽快完成”降低设计质量

---

# Principle 1 — Specification First

任何功能必须遵循：

Vision
→ PRD
→ Prototype
→ Domain Model
→ Database
→ Design System
→ Development Guide
→ Code

禁止直接从想法跳到代码。

---

# Principle 2 — Single Source of Truth

每类信息只能有一个权威来源。

| 信息     | 唯一来源          |
| -------- | ----------------- |
| 产品目标 | Vision            |
| 功能需求 | PRD               |
| 页面行为 | Prototype         |
| 业务对象 | Domain Model      |
| 数据结构 | Database          |
| UI 规范  | Design System     |
| 开发规范 | Development Guide |

不得在多个文档维护同一规则。

---

# Principle 3 — AI Is a Team Member

AI 不只是代码生成器。

AI 应参与：

- 产品讨论
- 架构设计
- 文档维护
- Code Review
- 测试建议
- 重构建议

AI 不得跳过 Specification 直接生成复杂业务代码。

---

# Principle 4 — Refactor Early

发现设计问题时，应尽早重构。

允许推翻：

- Prototype
- Domain Model
- Database Design

前提：

- 改进一致性
- 不破坏已确认的产品目标

---

# Principle 5 — Consistency Over Speed

整个项目必须保持一致。

任何修改都应同步检查：

- PRD
- Prototype
- Domain Model
- Database
- Design System

---

# Principle 6 — Local First

V1 优先保证：

- 无网络可用
- 本地数据可靠
- 每组训练立即保存
- App 崩溃可恢复

云同步属于未来版本。

---

# Principle 7 — Product Before Technology

先讨论：

用户为什么需要。

再讨论：

如何实现。

技术不能主导产品。

---

# Principle 8 — Stable Domain

WorkoutSession、WorkoutSet、WorkoutTemplate、Exercise 等核心领域对象应保持稳定。

数据库和代码可以调整，但领域模型应尽量保持连续性。

---

# Principle 9 — Incremental Delivery

采用 Milestone 与 Sprint 推进。

每个 Sprint 必须：

- 有明确目标
- 可 Review
- 可提交 Git
- 可回滚

---

# Principle 10 — Documentation Is Code

文档属于项目的一部分。

修改产品行为时：

必须同步更新相关文档。

禁止代码与文档长期不一致。

---

# 文档层级

Constitution
↓
Vision
↓
PRD
↓
Prototype
↓
Domain Model
↓
Database
↓
Design System
↓
Development Guide
↓
Implementation

---

# Review Gate

每项重要变更建议经过：

- Product Review
- Architecture Review
- Development Review
- AI Review

---

# Definition of Ready

开始开发前至少具备：

- Vision
- PRD
- Prototype（Approved）
- Domain Model
- Database Design
- Design System

---

# Definition of Done

功能完成意味着：

- 代码完成
- 文档同步
- 测试通过
- Review 完成
- 可演示
- 可继续维护

---

# 项目文化

我们希望建立一个：

- 长期维护
- AI 协作
- 高质量
- 易于重构
- 文档驱动
- 产品优先

的软件工程项目，而不仅仅是一个“能运行”的应用。
