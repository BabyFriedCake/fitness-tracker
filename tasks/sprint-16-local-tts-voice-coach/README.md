# Sprint 16 - Local TTS Voice Coach

状态：Completed with Warnings

## 执行顺序

- [x] `S16-01-local-chinese-tts-voice-adapter.md`

## 原则

- Voice 只消费现有真实训练反馈事件。
- TTS 失败不能影响 Workout Runtime、RestTimer 或 WorkoutSet 持久化。
- 第一版仅支持训练页前台本地中文播报。

## 已知警告

- 自动化测试已覆盖 adapter、覆盖旧播报、失败降级和训练页绑定。
- iPhone 真机静音模式、切后台和 Release 离线包仍需人工验收。
