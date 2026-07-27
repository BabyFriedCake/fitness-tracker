# S10-03 Personal Record and Trend Baseline

状态：Done

## 目标

建立可解释的 PR 和趋势基线，不做复杂 AI 分析。

## 范围

- 计算基础 PR：
  - 单动作最高重量
  - 单动作最高训练量 Set
  - 单次训练总训练量
- 计算基础趋势：
  - 至少两次 completed Session 才展示趋势
  - 按时间顺序比较训练量变化
- 明确无数据、不足数据、cancelled 数据的显示边界。

## 不做

- 不持久化 PR。
- 不实现 Recommendation。
- 不实现 AI 趋势解释。
- 不做复杂图表库接入。

## 验收标准

- PR 只来自有效完成 Set。
- 数据不足不展示误导性趋势。
- cancelled 和 soft-deleted Set 不影响 PR。
- 结果可被 Summary / History 展示层消费。

## 测试要求

- 覆盖 PR、无 PR、并列 PR、取消记录、软删除 Set、趋势不足数据。

## 完成记录

### 实现

- 在 `workout-history-metrics.ts` 中新增 `WorkoutHistoryProgressBaseline`。
- 新增基础 PR 类型：
  - 单次训练最高总训练量
  - 单动作最高重量
  - 单动作最高 Set 训练量
- 复用既有 volume trend 逻辑作为趋势基线。

### 边界

- PR 只来自 included in formal statistics 的 completed Session。
- cancelled Session 不参与 PR。
- actualReps 为 0 的 Set 不生成动作级 PR。
- 不持久化 PR，不新增 Schema / Migration。
- 不实现 AI 趋势解释。

### 测试

- 覆盖 completed 来源、cancelled 排除和无有效训练量不展示 PR。

### 验证

- `pnpm --filter mobile test -- workout-history-metrics workout-session-completion-recovery workout-session-history --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS
