# S3-07：动作配置与排序

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

完善模板中的动作配置，并支持稳定的动作顺序调整。

## 必读

- `AGENTS.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/07-Design-System/`
- S3-01 至 S3-06 输出

## Scope

实现目标组数、次数最小/最大值、休息秒数、动作顺序调整、UI 与持久化同步、输入校验、测试。

V1 可使用上移/下移按钮；仅在依赖兼容性明确时引入拖拽库。

禁止：超级组、热身组、固定重量、RPE/RIR、星期排程、无必要第三方依赖。

## 关键规则

- 组数 > 0
- 次数范围合法
- 休息时间 >= 0
- position 连续且无重复
- 排序失败不产生部分更新
- 大字体与触控区域合规

## 验收标准

- [ ] 可配置组数、次数范围、休息时间
- [ ] 非法输入被阻止
- [ ] 动作顺序可调整
- [ ] 保存后顺序稳定
- [ ] Repository 事务一致
- [ ] 不保存真实重量
- [ ] 不引入未批准复杂依赖
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`feat: 增加模板动作配置与排序`
