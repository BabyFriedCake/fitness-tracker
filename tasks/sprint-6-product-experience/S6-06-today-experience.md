# S6-06 Today Experience

状态：Completed

## Goal

完成 P001 的 DailyStatus、最近训练、本周概览和确定性 Recommendation 展示。

## Scope

- 读取和保存当日 DailyStatus。
- 展示最近一次 completed 训练。
- 展示本周训练次数、完成组和总容量。
- 根据既有事实生成非强制、可解释的确定性提示。
- 保持 active Session 恢复入口最高优先级。

## Allowed Files

- Today application/query、screen 和测试
- DailyStatus Repository 的必要最小实现
- P001 与相关 Database 查询文档

## Non-goals

- 不实现 AI Coach。
- Recommendation 不覆盖模板、Session 或 WorkoutSet。
- 不修改 Runtime 或训练创建流程。

## Acceptance Criteria

- DailyStatus 在本地持久化并按日期恢复。
- 进行中训练入口不会被统计或建议阻塞。
- 本周指标可追溯到 WorkoutSet。
- Recommendation 失败不影响开始训练。
- Loading、Empty、Ready、Error 状态完整。

## Tests

- DailyStatus read/write
- Week boundary calculations
- Recent workout mapping
- Recommendation determinism
- Focus refresh and stale request protection

## Risks

- 周起始日和时区定义不一致。
- 建议文案被误解为强制操作。
