# S9-01 Voice Coach Contract and TTS Adapter

状态：Done

## 目标

定义 Voice Coach 的基础输出契约和 TTS 适配层边界，但不实现完整语音引擎。

## 范围

- Voice Coach 输出状态
- TTS Adapter 接口
- 基础播报事件映射

## 不做

- 不实现真实 Voice Engine
- 不实现 Camera / Pose Detection
- 不把识别逻辑写进 Runtime

## 验收标准

- Voice Coach 输出有明确类型和边界
- TTS 适配器可替换
- 语音失败不影响训练事实持久化

## 测试要求

- Contract tests
- Adapter boundary tests
- Failure fallback tests

## 完成记录

- 现有 `workout-voice-feedback.ts` 已提供稳定的 voice adapter contract。
- 现有测试覆盖消息映射、禁用降级、失败兜底和运行时事件到语音消息的边界。
- 未新增真实 Voice Engine；只是把契约层作为 Sprint 9 的可执行基础。
