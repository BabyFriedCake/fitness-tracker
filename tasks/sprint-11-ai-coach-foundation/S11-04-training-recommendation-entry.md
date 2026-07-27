# S11-04 Training Recommendation Entry

状态：Done

## 目标

提供训练建议入口，但不把推荐变成自动改计划或自动执行。

## 范围

- Today 或 Summary 中的建议入口。
- 只读推荐跳转。
- 空建议和失败状态。

## 不做

- 不自动改模板。
- 不自动开训练。
- 不实现完整 AI Coach。

## 验收标准

- 用户可以看到建议入口。
- 入口行为可测试。
- 建议不会覆盖事实。

## 测试要求

- 覆盖入口可见、无建议隐藏、失败降级。

## 完成记录

### 实现

- 新增 `workout-recommendation-entry.ts`。
- Today Dashboard recommendation 现在作为明确的入口对象，带有 `entryLabel` 和 `entryState`。
- 入口仍是只读，不自动写回训练事实。

### 边界

- 不自动改计划。
- 不自动执行训练。
- 不实现完整 AI Coach。
- 不修改数据库结构。

### 测试

- 新增 `workout-recommendation-entry.test.ts`。
- Today Dashboard recommendation fixture 已同步新入口字段。

### 验证

- `pnpm --filter mobile test -- workout-recommendation-entry workout-recommendation-preview workout-coach-decision workout-recommendation today-dashboard --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS
