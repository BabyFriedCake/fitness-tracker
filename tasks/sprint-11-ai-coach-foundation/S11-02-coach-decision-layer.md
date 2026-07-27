# S11-02 Coach Decision Layer

状态：Done

## 目标

建立 Coach Decision Layer，把“要不要给建议”和“给什么建议”分开。

## 范围

- 定义决策输入。
- 定义决策输出。
- 解释为什么给出建议。
- 统一失败降级边界。

## 不做

- 不做完整 AI 推理。
- 不直接修改模板或训练事实。
- 不实现账号 / 云端配置。

## 验收标准

- 决策层结果可解释。
- 决策失败可降级。
- 不绕过 Repository / Domain。

## 测试要求

- 覆盖无输入、可建议、拒绝建议、降级。

## 完成记录

### 实现

- 新增 `workout-coach-decision.ts`。
- 决策层把“是否生成建议”和“建议内容”分离。
- 决策结果包含可读解释与建议理由码。

### 边界

- 不实现完整 AI 推理。
- 不修改 WorkoutSession 历史事实。
- 不新增数据库表。
- 不引入账号、云同步或订阅。

### 测试

- 新增 `workout-coach-decision.test.ts`。
- 覆盖有上下文推荐和无上下文观察状态。

### 验证

- `pnpm --filter mobile test -- workout-coach-decision workout-recommendation today-dashboard --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS
