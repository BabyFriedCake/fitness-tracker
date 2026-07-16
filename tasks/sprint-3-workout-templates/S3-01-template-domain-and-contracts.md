# S3-01：训练模板领域模型与契约

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

实现训练模板相关领域模型、值对象、查询类型与 Repository 契约，不实现数据库、UI 或持久化。

## 必读

- `AGENTS.md`
- `docs/04-Architecture/domain-model.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/06-Database/schema.md`
- `docs/06-Database/data-dictionary.md`
- `docs/08-Development/architecture-rules.md`
- `docs/08-Development/testing-strategy.md`

## Scope

允许：WorkoutTemplate、TemplateExercise、类型安全 ID、状态、组数/次数/休息值对象、Repository interface、Query/Filter、Domain validation、纯测试。

禁止：SQL、Migration、SQLite Repository、React、Expo、Router、UI、WorkoutSession、真实重量、超级组。

## 领域规则

- 模板名称不能为空
- 模板至少包含一个有效动作才能用于训练
- 动作顺序稳定且可重排
- 目标组数大于 0
- 次数范围不能反转
- 休息时间不能为负数
- 归档模板仍可被历史 Session 引用
- 修改模板不影响历史快照
- 模板不保存真实训练重量

## 验收标准

- [ ] 命名与 Domain Model、Prototype 一致
- [ ] ID 类型安全
- [ ] 领域对象不可变
- [ ] Repository 支持 list、detail、create、update、archive
- [ ] 验证规则有明确错误类型
- [ ] 单元测试覆盖有效与无效输入
- [ ] Domain 不依赖 React、Expo、SQLite、Router
- [ ] 未提前实现数据库或 UI
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`feat: 定义训练模板领域模型与契约`
