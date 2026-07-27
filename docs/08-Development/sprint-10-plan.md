# Sprint 10 Plan

状态：Planned

## Goal

把 History 从“能查看完成记录”升级为“能理解训练进步”的回顾体验。

Sprint 10 只围绕 P008 History 和 P006 Summary 的统计口径补强，不改
WorkoutSession / Runtime 主状态机，不引入 AI Coach。

## Planning Principle

- `WorkoutSet` 是统计事实来源。
- completed Session 进入正式统计；cancelled 默认只作为记录显示，不进入正式统计。
- 软删除 Set 排除统计。
- 统计、PR 和趋势必须可追溯到 `WorkoutSet`、`SessionExercise`、`WorkoutSession`。
- 不修改历史事实；如需纠错，只通过明确的历史纠错任务处理。
- 不新增 AI 解释、云同步、社交排名或医疗结论。

## Sprint 10 Scope

### P008 History

- 月历和日期钻取的口径复核
- 日期训练列表的信息层级
- 当日肌群标签与 completed Session 快照一致
- History Detail / Session Detail 的训练拆解
- 训练量、完成 Set、完成动作、训练时长等统计统一
- 简单趋势和 PR 基线

### P006 Summary

- Summary 与 History 的统计口径一致
- PR 仅来自有效 Set
- 备注和详情入口的状态边界复核

## Sprint 10 Non-goals

- 不实现完整 AI Coach
- 不实现 Recommendation 自动改计划
- 不实现 Camera / Pose Detection
- 不实现真实 Voice Engine
- 不修改 Runtime Snapshot contract
- 不修改 WorkoutSet 历史事实
- 不新增云账号、订阅或社交功能

## Sprint 10 Risks

- 统计口径容易在 Summary、History、Today 三处重复分叉。
- PR 如果没有明确 Domain 边界，容易被 UI 临时计算污染。
- 大量历史数据可能带来加载性能问题，需要先做应用层聚合边界。
- “纠错”涉及写历史事实，必须单独任务控制 Scope。

## Execution Order

1. S10-00 Sprint Readiness and History Scope Sync（Done）
2. S10-01 History Metrics Contract（Done）
3. S10-02 History Session Detail（Done）
4. S10-03 Personal Record and Trend Baseline（Done）
5. S10-04 Summary and History Metric Alignment（Done）
6. S10-05 History Calendar UX Hardening（Done）
7. S10-06 Sprint Exit Review（Done）

## Exit Criteria

- Roadmap 已同步。
- Prototype implementation status 已同步。
- P008 Acceptance Criteria 已明确标记完成/部分完成/后续。
- Summary 与 History 统计口径一致。
- 本地 validation 通过。
- Sprint 10 Exit Report 已生成。
