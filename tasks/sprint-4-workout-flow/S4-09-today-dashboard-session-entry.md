# Execution Prompt

你正在执行 S4-09 Today Dashboard & Session Entry。

请严格遵守项目架构：

UI
↓
Application
↓
Domain
↓
Repository
↓
SQLite

## Implementation Requirements

1. 先阅读：

- docs/00-Project/README.md
- docs/00-Project/roadmap.md
- docs/03-PRD/PRD.md
- docs/04-Architecture/*
- docs/05-Prototype/*

2. 检查现有实现：

重点查看：

- workout-session feature
- S4-07 execution flow
- S4-08 completion/recovery flow
- Template Application Layer

3. 实现 Today Dashboard：

要求：

- 新增 Today Dashboard Screen
- 通过 Application 获取 Session 状态
- 不直接访问 Repository
- 不直接访问 SQLite

4. 实现 Session Entry：

支持：

- 无 Session → 创建训练入口
- draft → 恢复入口
- in_progress → 继续训练入口
- completed/cancelled → 结束状态展示

5. 创建 Session 时：

必须：

- 使用现有 Application Use Case
- 保留 source_template_id
- 创建 Session snapshot
- 初始状态保持 domain 定义

禁止：

- 新增数据库字段
- 修改 migration
- 修改 Domain Aggregate
- 修改 Repository Contract（除非阻塞）

6. 测试：

新增或更新测试：

必须覆盖：

- Today Dashboard 状态展示
- draft recovery
- in_progress resume
- completed/cancelled disabled
- Template 创建 Session

7. Self Review：

完成后自行检查：

- 是否绕过 Application Layer
- 是否产生重复 Session
- 是否破坏 S4-08 recovery flow
- 是否修改非任务范围文件

8. 输出：

完成后生成：

S4-09 Final Report

包含：

- Summary
- Files Changed
- Decisions
- Self Review
- Tests
- Validation
- Known Limitations
- Ready for Human Review
