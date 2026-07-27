# S10-00 Sprint Readiness and History Scope Sync

状态：Done

## 目标

确认 Sprint 10 的 History / Analytics 范围、现有实现差距和统计口径边界。

## 范围

- 阅读 P008 History、P006 Summary、Architecture、Domain Model 和当前 History 实现。
- 对齐 roadmap、Prototype 状态和 Sprint 10 任务顺序。
- 确认是否需要 Database 变更；如需要，先 Stop Rule。

## 不做

- 不实现 UI。
- 不实现 Repository。
- 不新增 Schema / Migration。
- 不实现 AI Coach 或 Recommendation。

## 验收标准

- Sprint 10 任务顺序清晰。
- P008 / P006 的当前完成状态有明确记录。
- 当前技术债和风险有记录。
- 若发现规格冲突，停止后续实现并报告。

## 测试要求

- 本任务为规划任务，不要求运行完整测试。
- 至少执行 `git diff --check`。

## 完成记录

### 读取范围

- `docs/02-Constitution/constitution.md`
- `docs/03-PRD/PRD.md`
- `docs/04-Architecture/architecture.md`
- `docs/04-Architecture/domain-model.md`
- `docs/05-Prototype/P008-History.md`
- `docs/05-Prototype/P006-Workout-Summary.md`
- 当前 History Application / Screen / Tests

### 当前已具备能力

- History 已能读取 completed / cancelled Session。
- History 已有月历、月份切换、日期点击和空日期状态。
- 有训练日期已能显示肌群标签。
- completed Session 已进入正式统计；cancelled 默认排除正式统计。
- 已有基础训练量趋势，但仍是页面级基础能力，不是完整 Analytics contract。

### 主要缺口

- History Metrics Contract 仍未抽成稳定统计边界。
- History Session Detail 仍不足以展示完整动作 / Set 明细。
- PR 与趋势仍缺明确 Domain / Application 口径。
- Summary 与 History 的统计口径仍需统一验证。
- 历史纠错涉及写历史事实，不能混入 Sprint 10 基础统计任务。

### Stop Rule 结论

当前 Sprint 10 可以继续。

本阶段不需要修改 Schema / Migration。现有 `WorkoutSession`、
`SessionExercise` 和 `WorkoutSet` 足以支持只读统计、详情和基础趋势。

如果后续任务需要持久化 `PersonalRecord`、`ProgressMetric` 或历史纠错状态，
必须先停止实现并更新 Database 文档与迁移任务。

### 验证

- `git diff --check`: PASS
