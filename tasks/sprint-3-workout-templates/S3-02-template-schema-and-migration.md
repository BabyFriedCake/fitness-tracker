# S3-02：训练模板数据库结构与 Migration

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

根据已批准的数据库文档，实现 WorkoutTemplate 与 TemplateExercise 的 schema、migration 与迁移测试。

## 必读

- `AGENTS.md`
- `docs/04-Architecture/domain-model.md`
- `docs/06-Database/database-design.md`
- `docs/06-Database/schema.md`
- `docs/06-Database/data-dictionary.md`
- `docs/06-Database/migrations.md`
- `docs/08-Development/architecture-rules.md`
- S3-01 输出

## Scope

允许：编号 Migration、相关表/索引/约束、Migration runner 接入、Migration 测试、必要文档同步。

禁止：Repository、UI、模板业务流程、WorkoutSession schema、超级组 schema、云同步字段。

## 要求

- Migration 可重复执行
- 失败时事务回滚
- 外键开启并验证
- position/order 约束明确
- 归档使用状态字段
- TemplateExercise 引用稳定 Exercise ID
- schema 与 data dictionary 同步

## 验收标准

- [ ] Fresh Database 可迁移到最新版本
- [ ] 重复执行安全
- [ ] 失败 Migration 不记录成功
- [ ] 外键与索引正确
- [ ] 归档字段可查询
- [ ] 动作顺序稳定保存
- [ ] 文档与实现一致
- [ ] Repository 尚未实现
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`db: 增加训练模板数据库结构与迁移`
