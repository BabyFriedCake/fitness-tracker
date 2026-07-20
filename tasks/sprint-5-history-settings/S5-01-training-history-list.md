# S5-01 Training History List

## Execution Prompt

执行前必须阅读：

workflow/prompts/implement-task.md

严格按照项目 Workflow 执行。

## Goal

完善训练历史列表能力。

## Scope

实现： - 历史训练列表 - 日期分组 - 训练名称 - 状态 - 训练时长 - 总训练量

支持： - completed - cancelled

不展示： - draft - in_progress

## Architecture Constraints

保持：

UI ↓ Application ↓ Domain ↓ Repository

禁止修改 Schema / Migration。

## Tests

覆盖： - 历史列表查询 - 状态过滤 - 排序 - 数据展示

## Final Report

输出 S5-01 Final Report。
