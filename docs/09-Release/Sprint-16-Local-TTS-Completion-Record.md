# Sprint 16 Local TTS Completion Record

状态：PASS WITH WARNINGS
完成时间：2026-08-03

## 已完成

- 使用 `expo-speech` 实现设备本地中文 `zh-CN` TTS。
- 训练页注入真实 Voice Feedback Adapter。
- 计数、组完成、动作完成和休息反馈复用现有事件链路。
- Mock 自动计数保持每 2 秒一次。
- 新播报会停止旧播报，避免语音队列堆积。
- 语音关闭、平台不支持和播报失败均不影响 Runtime、RestTimer 或 WorkoutSet 持久化。
- 休息结束提示“动作名称，3，2，1，开始”只属于语音反馈，不创建训练事实。

## 验证

- TTS adapter 单元测试通过。
- 训练页 Voice Coach 绑定和失败降级测试通过。
- 完整 `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test` 和 `git diff --check` 已通过。

## 未完成的发布验证

- iPhone Release 包的真机播报验收。
- iOS 静音模式下的系统限制确认。
- 切后台、返回前台和长时间训练流程验收。

这些是设备验证限制，不代表 TTS 代码或训练持久化失败。

## 非目标

- 不实现语音识别、麦克风、Camera、Pose Detection 或 AI 计数。
- 不实现后台播放、锁屏控制或通知播报。
