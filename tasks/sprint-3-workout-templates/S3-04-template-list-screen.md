# S3-04：训练模板列表页面

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

将训练模板占位页替换为真实模板列表页面。

## 必读

- `AGENTS.md`
- `docs/05-Prototype/P002-Workout-Template.md`
- `docs/07-Design-System/`
- `docs/08-Development/architecture-rules.md`
- S3-01 至 S3-03 输出

## Scope

实现 Loading、Empty、Normal、Error、Template Row/Card、新建入口、详情/编辑入口、Application use case/hook、测试。

禁止：Screen 中 SQL、创建表单、编辑、归档、开始训练、mock data。

## 最小信息

- 模板名称
- 动作数量
- 总目标组数
- 预计时长（已有规则时）
- 状态

## 验收标准

- [ ] 模板 Tab 展示 active templates
- [ ] 四类状态覆盖
- [ ] 空状态可进入创建模板
- [ ] 点击模板进入编辑入口
- [ ] Route thin
- [ ] 无 SQL 进入 React
- [ ] 不使用假数据
- [ ] Accessibility label 完整
- [ ] format、lint、typecheck、tests 全部通过

## 建议提交

`feat: 实现训练模板列表`
