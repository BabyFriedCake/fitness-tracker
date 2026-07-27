# S10-04 Summary and History Metric Alignment

状态：Done

## 目标

统一 Workout Summary 与 History 的统计口径，避免同一训练在不同页面显示不同结果。

## 范围

- Summary 页面复用或对齐 History Metrics Contract。
- 确认训练完成后的 History 刷新和详情入口。
- 备注显示与保存边界复核。

## 不做

- 不重新设计 Summary 页面。
- 不改 WorkoutSession 生命周期。
- 不修改 WorkoutSet 持久化流程。

## 验收标准

- Summary 展示的动作数、Set 数、训练量、时长与 History Detail 一致。
- PR 卡片只在可靠数据存在时展示。
- 完成训练后进入 History 能看到一致结果。
- 重复点击不产生重复写入。

## 测试要求

- 补充 Summary / History 一致性测试。
- 覆盖 completed Session 和部分完成 Session。

## 完成记录

### 实现

- `createWorkoutSessionSummary()` 改为复用 `WorkoutHistorySessionMetric`。
- Summary 和 History Detail 的动作、Set、训练量、时长口径统一。
- History 入口复用 terminal detail，不再维护另一套统计逻辑。

### 边界

- completed Session 和 cancelled Session 都可查看只读详情。
- draft / in_progress 仍不可查看历史详情。
- 不修改 WorkoutSession 生命周期。
- 不修改 WorkoutSet 持久化流程。

### 测试

- 新增 Summary 与 History Metrics 一致性测试。
- 保留 completed / cancelled detail 测试。

### 验证

- `pnpm --filter mobile test -- workout-session-completion-recovery workout-history-metrics workout-session-history --watchAll=false`: PASS
