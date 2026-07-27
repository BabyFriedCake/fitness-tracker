# Sprint 10 - History and Analytics Enhancement

状态：Planned

## 目标

把历史页从基础记录入口升级为可回顾、可理解训练进步的 History /
Analytics 体验。

## 执行顺序

- [x] `S10-00-sprint-readiness-and-history-scope-sync.md`
- [x] `S10-01-history-metrics-contract.md`
- [x] `S10-02-history-session-detail.md`
- [x] `S10-03-personal-record-and-trend-baseline.md`
- [x] `S10-04-summary-history-metric-alignment.md`
- [x] `S10-05-history-calendar-ux-hardening.md`
- [x] `S10-06-sprint-exit-review.md`

## Sprint 非目标

- 不实现完整 AI Coach。
- 不实现 Recommendation 自动调整计划。
- 不实现社交排名、周报分享图或医疗结论。
- 不修改 Workout Runtime 主状态机。
- 不直接改写历史 WorkoutSet 事实。

## 约束

- 所有统计必须从 `WorkoutSet` 和 `WorkoutSession` 事实派生。
- cancelled Session 默认排除正式统计。
- 软删除 Set 必须排除统计。
- UI 不直接访问 SQLite。
- SQL 继续留在 database / repository 模块。
- 如需新增持久化结构，必须先更新 Database 文档并触发 Stop Rule。
