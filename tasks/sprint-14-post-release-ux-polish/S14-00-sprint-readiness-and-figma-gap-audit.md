# S14-00 Sprint Readiness and Figma Gap Audit

状态：Planned

## 目标

在进入 Sprint 14 实现前，检查 Final Release 后当前产品与 Figma / Prototype 的差距，生成可执行的优先级清单。

## 范围

- 阅读当前 Roadmap、PRD、Prototype、Design System 和实现状态文档。
- 检查当前代码结构和主要页面入口。
- 对照 Figma 链接和 Prototype，审计以下页面：
  - Today
  - Workout Runtime
  - Rest Timer
  - Exercise Library
  - History
  - Settings / Onboarding
- 记录差距，不直接修复业务代码。

## 非范围

- 不修改业务代码。
- 不修改 Database Schema / Migration。
- 不引入动作图片资源。
- 不实现真实 Voice Engine、AI 计数或姿态识别。
- 不创建新产品功能。

## 验收标准

- 生成 Sprint 14 Figma Gap Audit Report。
- 每个差距包含：
  - 对应 Prototype / Figma 页面
  - 当前实现状态
  - 用户影响
  - 风险
  - 建议优先级
  - 是否适合独立任务
- 明确 Sprint 14 下一项可执行任务。
- Roadmap / Prototype Implementation Status 如有必要同步。

## 验证要求

- `git status --short`
- `git diff --check`
- 如未修改代码，不运行完整测试。

## 输出

- Review Report
- Sprint 14 下一步建议
