# S14-01 Device Smoke Test and Runtime Regression

状态：Completed

## 目标

验证 Final Release 后关键训练路径在 Expo / 真机环境中的可用性，并记录与自动开始、自动计数、休息和完成流程相关的回归风险。

## 范围

- Today 添加训练计划。
- 从 Today 计划开始训练。
- 进入 Workout 后自动开始。
- Mock 自动计数推进 Rep。
- 暂停 / 继续。
- 上一动作 / 下一动作。
- Rest Timer。
- 完成训练并回到 Today / Summary / History。

## 非范围

- 不新增 UI 功能。
- 不修改 Runtime 状态机。
- 不实现真实 Voice Engine。
- 不修改数据库结构。

## 验收标准

- 关键路径回归结果已记录。
- 发现的问题按 P0 / P1 / P2 标记。
- 若无需修复，明确说明可以进入 S14-02。
- 若存在阻塞，停止后续实现并报告。

## 验证命令

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`
