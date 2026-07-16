# S3-03：训练模板 SQLite Repository

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

实现 SQLite-backed WorkoutTemplateRepository，包括模板、动作配置与事务写入。

## 必读

- `AGENTS.md`
- `docs/04-Architecture/domain-model.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/06-Database/`
- `docs/08-Development/architecture-rules.md`
- S3-01、S3-02 输出

## Scope

实现：SQLite Repository、Row mapper、列表、详情、新建/更新事务、动作配置写入、归档、临时 SQLite 测试。

禁止：UI、Route、全局状态、WorkoutSession、自动生成计划、永久删除历史引用模板。

## 关键规则

- 新建模板与 TemplateExercise 事务化
- 更新模板不得修改历史 Session
- 归档模板默认从列表隐藏
- archived 查询行为明确
- SQL 仅存在于 database 模块
- Row mapper 验证异常行
- 复用 S3-01 Repository interface

## 验收标准

- [ ] 完整实现 S3-01 contract
- [ ] create/update/archive 事务测试通过
- [ ] 默认排除 archived
- [ ] detail 可按明确参数读取 archived
- [ ] 动作顺序读写一致
- [ ] 失败事务无半成品
- [ ] SQL 未泄漏
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`feat: 实现训练模板 Repository`
