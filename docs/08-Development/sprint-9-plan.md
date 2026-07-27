# Sprint 9 Plan

状态：Done

## Goal

把 Workout Companion 的输入源链路从 Mock/基础绑定推进到可替换、可降级、
可验证的 Voice / TTS / Input Source 基线。

## Planning Principle

- 不改 WorkoutSession / Runtime 主状态机
- 不把识别逻辑塞进 Runtime
- 不引入完整 AI Coach
- 仍保持 Event Source Architecture
- 允许先做接口、适配器和设置边界，再做真实能力接入

## Sprint 9 Scope

### P011 Voice Coach

- 语音状态与反馈展示
- Voice Coach 会话开关与基础设置联动
- 语音反馈失败降级

### Voice / TTS Input Source

- Voice/TTS 输入源契约
- Mock 与真实输入源切换
- 事件串行和恢复边界

### Permissions / Lifecycle

- 音频权限
- 前后台切换
- 失败兜底

## Sprint 9 Risks

- 容易把接口层做成实际识别实现
- 权限与平台差异可能导致状态机复杂化
- 如果设置与输入源切换没有统一契约，后续很容易重复分叉

## Exit Criteria

- roadmap 已同步
- prototype implementation status 已同步
- 任务文件已创建并按顺序排列
- Sprint 9 结束时必须输出 Exit Report

## Completion

- Exit Review：PASS WITH WARNINGS
- Exit Report：`docs/09-Release/Sprint-9-Exit-Report.md`
- 已完成任务：6 / 6
