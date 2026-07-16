# S3-05：创建训练模板

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

实现创建训练模板的完整流程，包括名称、描述、添加动作与基础校验。

## 必读

- `AGENTS.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/05-Prototype/P007-Exercise-Library.md`
- `docs/07-Design-System/`
- S3-01 至 S3-04 输出

## Scope

实现创建 Route/Screen、名称与描述、Exercise Library selection mode、新模板草稿、保存校验、成功返回、未保存确认、测试。

禁止：编辑已有模板、拖动排序、归档、WorkoutSession、AI 自动模板、超级组。

## 关键规则

- 至少一个动作才能保存
- 同一动作不可重复添加
- 使用稳定 ExerciseId
- 表单错误不丢草稿
- 重复点击保存不得产生重复模板
- 保存失败保留输入

## 验收标准

- [ ] 可创建包含动作的模板
- [ ] 空名称、无动作、非法参数被阻止
- [ ] 动作不可重复加入
- [ ] 保存写入 Repository
- [ ] 重复点击幂等
- [ ] 未保存退出确认
- [ ] 错误可重试且不丢内容
- [ ] Route thin，无 SQL
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`feat: 实现创建训练模板`
