# S10-01 History Metrics Contract

状态：Done

## 目标

建立 History 统计口径的 Application / Domain contract，避免 Summary、
History 和未来 Analytics 各自临时计算。

## 范围

- 定义历史统计结果类型。
- 从真实 `WorkoutSet` 派生：
  - 总训练量
  - 完成 Set 数
  - 完成动作数
  - 训练时长
  - 每个动作训练量
  - completed / cancelled 的统计边界
- 补充单元测试。

## 不做

- 不新增数据库表。
- 不修改 WorkoutSet 历史事实。
- 不实现复杂图表。
- 不实现 PR 持久化。
- 不实现 AI 解释。

## 验收标准

- 统计只来自持久事实。
- cancelled Session 默认不进入正式统计。
- 软删除 Set 排除。
- 有氧或缺失重量的数据不误导力量训练量。
- Summary 和 History 后续可复用同一口径。

## 测试要求

- 覆盖 completed、cancelled、soft-deleted set、空历史、混合动作。
- 运行定向 history metrics 测试。

## 完成记录

### 实现

- 新增 `workout-history-metrics.ts`。
- 定义 History Session / Exercise / Set / Overview metrics contract。
- History 列表统计改用 metrics contract。

### 边界

- draft / in_progress Session 不进入 History metrics。
- completed Session 进入正式统计。
- cancelled Session 可作为记录显示，但不进入正式统计。
- 未完成 Set 不进入训练量和完成 Set 统计。
- 当前 Domain 层不暴露 soft-deleted Set；软删除仍由 Repository 映射边界过滤。

### 测试

- 新增 `workout-history-metrics.test.ts`。
- 覆盖 completed、cancelled、draft、in_progress、未完成 Set、趋势。

### 验证

- `pnpm --filter mobile test -- workout-history-metrics workout-session-history --watchAll=false`: PASS
