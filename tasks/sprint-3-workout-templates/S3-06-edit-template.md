# S3-06：编辑训练模板

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

实现已有训练模板的读取、编辑、保存和未保存修改保护。

## 必读

- `AGENTS.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/04-Architecture/domain-model.md`
- S3-01 至 S3-05 输出

## Scope

实现编辑 Route/Screen、加载模板、修改名称/描述、添加/删除动作、修改基础参数、保存、失败处理、未保存确认、测试。

禁止：历史 Session 修改、归档、拖动排序、WorkoutSession、推荐算法。

## 关键规则

- 修改模板不得影响历史训练
- 删除动作只从模板移除
- 保存事务化
- 重复点击不得重复写入
- archived 模板编辑行为明确

## 验收标准

- [ ] 可加载并编辑已有模板
- [ ] 修改正确持久化
- [ ] 历史数据不受影响
- [ ] 删除动作不删除 Exercise
- [ ] 保存失败可重试
- [ ] 未保存退出确认
- [ ] 归档模板行为明确
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`feat: 实现编辑训练模板`
