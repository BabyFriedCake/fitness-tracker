# S11-03 Recommendation Preview and Explanation

状态：Done

## 目标

提供建议预览和解释入口，帮助用户理解系统为什么给出某条建议。

## 范围

- 建议预览展示。
- 建议解释文案。
- 只读推荐入口。

## 不做

- 不自动应用建议。
- 不改训练事实。
- 不实现复杂卡片动画或模型可视化。

## 验收标准

- 预览可见。
- 解释可读。
- 建议与事实边界清晰。

## 测试要求

- 覆盖建议存在、无建议、失败降级。

## 完成记录

### 实现

- 新增 `workout-recommendation-preview.ts`。
- `TodayDashboard` 使用 preview contract 作为 recommendation 数据来源。
- preview 保留 `explanation` 字段，便于后续解释入口复用。

### 边界

- 不实现自动应用建议。
- 不修改 WorkoutSession 历史事实。
- 不新增数据库表。
- 不实现完整 AI 推理。

### 测试

- 新增 `workout-recommendation-preview.test.ts`。
- 保持 Today Dashboard recommendation 展示测试通过。

### 验证

- `pnpm --filter mobile test -- workout-recommendation-preview workout-recommendation today-dashboard --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS
