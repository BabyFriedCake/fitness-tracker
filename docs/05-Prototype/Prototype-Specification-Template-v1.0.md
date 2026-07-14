
# Prototype Specification Template v1.0

Status: Approved Baseline

> 本模板适用于 Fitness Tracker 所有 Prototype 页面（P001～P010）。

---

# 1. Metadata

| 字段 | 内容 |
|------|------|
| Page ID | PXXX |
| Name | 页面名称 |
| Version | v1.0 |
| Status | Draft / Review / Approved |
| Owner | Product Owner |
| Last Updated | YYYY-MM-DD |

Related Documents：

- PRD
- Architecture
- Domain Model
- Database（如涉及）
- Design System

---

# 2. Page Goal（页面目标）

回答三个问题：

- 为什么存在这个页面？
- 用户来到这里要完成什么？
- 页面不负责什么？

---

# 3. Responsibilities（职责）

### 负责

- ...
- ...

### 不负责

- ...
- ...

---

# 4. User Story

作为……

我希望……

从而……

---

# 5. User Journey

进入页面之前 →

当前页面 →

离开页面之后

---

# 6. Entry & Exit

## Entry

- 从哪里进入

## Exit

- 跳转到哪里

---

# 7. Information Architecture

页面信息层级（树状结构）

示例：

Page
├── Hero
├── Content
└── Footer

---

# 8. Wireframe（ASCII）

使用 ASCII 描述页面布局。

要求：

- 不关注视觉
- 关注信息层级
- 能表达组件关系

---

# 9. Component Inventory

列出页面所有组件。

| ID | Component | 来源（Design System） |
|----|-----------|----------------------|
| C001 | Hero Card | Card |
| C002 | Primary Button | Button |

---

# 10. Interaction Matrix

所有交互必须编号。

| ID | Trigger | Action | Result |
|----|---------|--------|--------|
| BTN-001 | Tap | ... | ... |

---

# 11. State Machine

描述页面状态：

Loading
↓

Empty
↓

Normal
↓

Completed
↓

Error

说明各状态的进入条件和退出条件。

---

# 12. Data Dependency

只引用 Domain Model。

例如：

- WorkoutSession
- WorkoutTemplate
- WorkoutSet

禁止描述数据库字段。

---

# 13. Source of Truth

| 页面信息 | 来源 |
|-----------|------|
| 当前训练 | WorkoutSession |

---

# 14. Navigation

描述页面跳转关系。

---

# 15. Edge Cases

至少覆盖：

- 首次使用
- 空数据
- 重复点击
- App 切后台
- App 恢复
- 数据异常

---

# 16. Analytics

定义需要埋点的事件。

例如：

- ScreenViewed
- ButtonClicked
- WorkoutStarted

---

# 17. Design Decisions

说明为什么这样设计。

记录重要产品决策，避免后续误改。

---

# 18. Acceptance Criteria

使用 Checklist：

- [ ] 功能完整
- [ ] 页面状态完整
- [ ] 边界情况覆盖
- [ ] 可直接开发
- [ ] 可直接测试

---

# 19. Out of Scope（V1 不实现）

列出未来版本功能。

---

# Prototype 编写原则

1. Prototype 描述产品行为，不描述代码实现。
2. Prototype 引用 Domain Model，不描述数据库设计。
3. 一个页面只有一个正式文件。
4. 修改页面时更新原文件，不创建 v2/final 副本。
5. 每个按钮、状态、跳转都必须可测试。
6. 与 PRD、Domain Model、Design System 保持一致。
7. Review 通过后，状态更新为 Approved。
