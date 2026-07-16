# S3-08：训练模板归档

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

实现模板归档流程，隐藏不再使用的模板，同时保留历史兼容性。

## 必读

- `AGENTS.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/04-Architecture/domain-model.md`
- `docs/06-Database/`
- S3-01 至 S3-07 输出

## Scope

实现归档入口、破坏性确认、Repository archive、列表刷新、archived detail 行为、测试。

禁止：永久删除、删除历史 Session、自动迁移历史、模板恢复（契约未定义时）、云端删除。

## 关键规则

- 归档后默认列表隐藏
- 历史 Session 快照仍可读取
- 归档失败不改变 UI 事实
- 重复归档幂等
- 确认文案说明不会删除历史训练

## 验收标准

- [ ] 可归档 active template
- [ ] 默认列表不显示 archived
- [ ] 历史数据不受影响
- [ ] 重复归档安全
- [ ] 失败可重试
- [ ] 有明确二次确认
- [ ] 未实现永久删除
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`feat: 实现训练模板归档`
