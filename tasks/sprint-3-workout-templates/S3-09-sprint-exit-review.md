# S3-09：Sprint 3 Exit Review

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/sprint-exit-review.md`

Implementation MUST stop if this prompt cannot be read.

## 目标

审查 Sprint 3 的训练模板增量，判断项目是否可进入 Sprint 4：Workout Flow。

## Scope

审查 Template Domain、Schema/Migration、Repository、模板列表、创建、编辑、动作配置与排序、归档、文档/Roadmap、CI、Repository Hygiene、历史快照原则。

禁止：开发新功能、开始 WorkoutSession、隐藏技术债、降低测试要求。

## 验收标准

- [ ] S3-01 至 S3-08 全部完成或记录未完成项
- [ ] 功能符合 P002
- [ ] 修改模板不影响历史训练原则有测试保护
- [ ] create/update/archive 事务正确
- [ ] 默认列表排除 archived
- [ ] 动作配置与排序正确
- [ ] CI 通过
- [ ] Roadmap 同步
- [ ] 自动生成 `docs/09-Release/Sprint-3-Exit-Report.md`
- [ ] 是否进入 Sprint 4 的结论基于证据

## 报告至少包含

- 完成任务数
- Tests / Test Suites
- Database Migration 数量
- Template CRUD 覆盖
- 事务测试结果
- Architecture Violations
- Repository Hygiene
- Native-device verification 状态
- Remaining Technical Debt
