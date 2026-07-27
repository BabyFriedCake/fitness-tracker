# S11-00 Sprint Readiness and AI Scope Sync

状态：Done

## 目标

确认 Sprint 11 的 Recommendation / Coach Decision 范围和已批准边界。

## 范围

- 阅读 P013 AI Coach、PRD、Architecture、Domain Model 和当前 Recommendation 相关实现。
- 对齐 roadmap、Prototype 状态和 Sprint 11 任务顺序。
- 确认是否需要 Database 变更；如需要，先 Stop Rule。

## 不做

- 不实现完整 AI。
- 不实现 UI。
- 不实现 Camera / Pose Detection。
- 不新增 Schema / Migration。

## 验收标准

- Sprint 11 任务顺序清晰。
- P013 的当前状态有明确记录。
- AI / Recommendation 的技术债和风险有记录。
- 若发现规格冲突，停止后续实现并报告。

## 测试要求

- 本任务为规划任务，不要求完整测试。
- 至少执行 `git diff --check`。

## 完成记录

### 读取范围

- `docs/02-Constitution/constitution.md`
- `docs/03-PRD/PRD.md`
- `docs/04-Architecture/architecture.md`
- `docs/04-Architecture/domain-model.md`
- `docs/05-Prototype/P013-AI-Coach.md`
- 当前 `today-dashboard.ts` 和相关测试

### 当前已具备能力

- Today Dashboard 已有基础 `recommendation` 文案。
- 该 recommendation 仅基于 `dailyStatus` / `recentWorkout` 生成。
- 当前没有独立的 Recommendation / Coach Decision 模块。
- P013 仍停留在规划中。

### 主要缺口

- 还没有 Recommendation contract。
- 还没有 Coach Decision Layer。
- 还没有建议解释或推荐入口的完整边界。
- 现有 recommendation 仍属于 Today 页面提示，不等于 AI Coach 基线。

### Stop Rule 结论

当前 Sprint 11 可以继续，不需要改 Schema / Migration。

如果后续要把 Recommendation 持久化、接入模型结果缓存或新增训练建议记录，
必须先更新 Database 文档并触发 Stop Rule。

### 验证

- `git diff --check`: PASS
