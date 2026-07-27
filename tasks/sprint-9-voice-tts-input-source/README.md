# Sprint 9 - Voice / TTS / Input Source Hardening

状态：Done

## 目标

把陪练输入链路从 Mock 能力推进到可替换、可降级、可验证的基础语音能力，
但不实现完整 Voice Engine 或 AI 识别。

## 执行顺序

- [x] `S9-00-sprint-readiness-and-voice-scope-sync.md`
- [x] `S9-01-voice-coach-contract-and-tts-adapter.md`
- [x] `S9-02-input-source-selection-and-fallback.md`
- [x] `S9-03-voice-feedback-runtime-binding.md`
- [x] `S9-04-audio-permission-and-lifecycle-guards.md`
- [x] `S9-05-sprint-exit-review.md`

每个任务必须完成实现、定向测试、Self Review 和 Validation 后才能进入下一项。

## Sprint 非目标

- 完整 AI Coach
- Camera / Pose Detection
- 真实动作识别模型
- 完整训练建议系统
- 云同步或账号系统

## 约束

- 保持 Event Source Architecture
- 不把识别逻辑塞进 Runtime
- 不修改 WorkoutSession 历史事实
- 不绕过 Repository / Domain 边界
- 语音失败必须可降级，不得阻断训练事实持久化
