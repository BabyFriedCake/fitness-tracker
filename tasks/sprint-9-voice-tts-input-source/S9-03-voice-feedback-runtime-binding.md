# S9-03 Voice Feedback Runtime Binding

状态：Done

## 目标

将 Voice Coach 输出与现有 Workout Runtime 反馈事件做稳定绑定，但不改变训练事实边界。

## 范围

- 训练开始播报
- 次数 / 组完成播报
- Rest 相关播报
- 训练完成播报

## 不做

- 不直接生成 WorkoutSet
- 不绕过 Companion Event Architecture
- 不修改 Workout Runtime 主状态机

## 验收标准

- 语音反馈只消费真实事件
- 反馈失败不回滚训练事实
- 绑定层可独立关闭

## 测试要求

- Runtime binding tests
- Failure isolation tests
- Event ordering tests

## 完成记录

- 训练页已把真实 Workout Runtime feedback 绑定到 voice adapter。
- voice feedback 只消费真实事件，失败不会回滚训练事实。
- 现有测试已覆盖语音开启/关闭、失败隔离、事件顺序和重新绑定。
