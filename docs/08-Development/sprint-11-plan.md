# Sprint 11 Plan

状态：Completed

## Goal

把 AI Coach 从“概念”推进到“可解释、可控、可降级”的基础层，
先建立 Recommendation Interface 和 Coach Decision Layer，不实现完整 AI。

## Planning Principle

- Recommendation 只能建议，不能覆盖用户事实。
- Coach Decision Layer 必须能解释建议来源和触发条件。
- 不引入完整模型推理，不把识别逻辑塞进 Runtime。
- 保持 Event Source Architecture 和现有 Voice/TTS 契约。
- 不修改 WorkoutSession 历史事实。

## Sprint 11 Scope

### P013 AI Coach

- Recommendation Interface
- Coach Decision Layer
- 建议预览
- 建议解释入口
- 训练建议入口
- 失败降级和空状态

## Sprint 11 Non-goals

- 不实现完整 AI Coach。
- 不实现 Camera / Pose Detection。
- 不实现真实 Voice Engine。
- 不做自动改计划。
- 不做账号、云同步或订阅。
- 不修改 Workout Runtime 主状态机。

## Sprint 11 Risks

- 建议接口和事实接口容易混淆。
- 如果解释层没有清晰边界，容易把推荐写成隐藏自动化。
- 过早引入模型或远程能力会破坏 local-first 原则。

## Execution Order

1. S11-00 Sprint Readiness and AI Scope Sync（Done）
2. S11-01 Recommendation Contract（Done）
3. S11-02 Coach Decision Layer（Done）
4. S11-03 Recommendation Preview and Explanation（Done）
5. S11-04 Training Recommendation Entry（Done）
6. S11-05 Sprint Exit Review（Done）

## Exit Criteria

- Roadmap 已同步。
- Prototype 状态已同步。
- 任务文件已创建并按顺序排列。
- Recommendation / Coach Decision 边界清晰。
- 本地 validation 通过。
- Sprint 11 Exit Report 已生成。
