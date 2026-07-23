# S6-05 History 与 Analytics

状态：Completed

## Goal

完成 P008 的训练历史详情、日历和确定性统计。

## Scope

- 月历与有训练日期标记。
- completed Session 列表与 Session 详情。
- 展示动作、WorkoutSet、重量、次数、总容量和时长。
- 时间范围统计和简单趋势。
- cancelled Session 与正式统计按批准规则分离。

## Allowed Files

- WorkoutSession History application/query
- History screens、routes、view models
- Repository Contract 的最小查询扩展及 SQLite 实现
- 对应测试
- P008 与必要 Database 查询文档

## Non-goals

- 不修改 WorkoutSet 历史事实。
- 不实现 AI 分析、社交排行或云同步。
- 不持久化可由事实重新计算的统计。

## Acceptance Criteria

- 日历日期与本地时区一致。
- Session 详情数据来自真实 WorkoutSet。
- 容量计算使用重量乘实际次数。
- cancelled 默认不进入正式统计。
- 大列表使用虚拟化列表且具备完整状态。

## Tests

- Calendar grouping
- Volume and duration calculations
- Status filtering
- History detail rendering
- Empty/error/reload lifecycle

## Risks

- 时区边界导致日期归组错误。
- 全量历史聚合性能。
