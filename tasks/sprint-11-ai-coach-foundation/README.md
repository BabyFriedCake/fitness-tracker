# Sprint 11 - AI Coach / Recommendation Foundation

状态：Done

## 目标

先建立可解释、可控、可降级的 Recommendation / Coach Decision 基线，
不实现完整 AI Coach。

## 执行顺序

- [x] `S11-00-sprint-readiness-and-ai-scope-sync.md`
- [x] `S11-01-recommendation-contract.md`
- [x] `S11-02-coach-decision-layer.md`
- [x] `S11-03-recommendation-preview-and-explanation.md`
- [x] `S11-04-training-recommendation-entry.md`
- [x] `S11-05-sprint-exit-review.md`

## Sprint 非目标

- 不实现完整 AI Coach。
- 不实现 Camera / Pose Detection。
- 不实现真实 Voice Engine。
- 不做自动改计划。
- 不做云同步、账号或订阅。

## 约束

- Recommendation 不能覆盖用户训练事实。
- Coach Decision Layer 必须可解释。
- 保持 Event Source Architecture。
- 不修改 WorkoutSession 历史事实。
- UI 不直接访问 SQLite。
- 如需新增 Schema / Migration，必须先更新 Database 文档并触发 Stop Rule。
