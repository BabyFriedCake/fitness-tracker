# S11-01 Recommendation Contract

状态：Done

## 目标

定义 Recommendation 的 Application / Domain contract。

## 范围

- 定义 Recommendation 结果类型。
- 定义 Recommendation 触发条件和来源字段。
- 约束 recommendation 只能作为建议，不能写回训练事实。
- 补充单元测试。

## 不做

- 不实现模型推理。
- 不新增数据库表。
- 不实现 UI 展示。
- 不实现自动计划调整。

## 验收标准

- Recommendation contract 可独立消费。
- 建议来源可解释。
- 不覆盖 WorkoutSession / WorkoutSet 事实。
- 失败与空状态明确。

## 测试要求

- 覆盖空建议、失败建议、有效建议、建议来源字段。

## 完成记录

### 实现

- 新增 `workout-recommendation.ts` 作为独立 Recommendation contract。
- Today Dashboard 继续复用该 contract 作为当前页面级 recommendation 来源。
- contract 保留 deterministic、只读、可解释边界。

### 边界

- recommendation 不能写回 WorkoutSession / WorkoutSet 事实。
- 不实现模型推理。
- 不新增数据库表。
- 不实现自动计划调整。

### 测试

- 新增 `workout-recommendation.test.ts`。
- 保持 Today Dashboard recommendation 行为测试通过。

### 验证

- `pnpm --filter mobile test -- workout-recommendation today-dashboard --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS
