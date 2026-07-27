# S7-03 Companion Event Source Selection

状态：Done

## Goal

在 Application 层定义 Workout Companion 输入源选择策略，使训练页可以在
`noop` 与 `mock_auto_rep` 之间选择事件源，同时保持 Runtime 与具体设备解耦。

## Scope

- 定义 Companion Event Source Mode：
  - `off`
  - `mock_auto_rep`
- 增加源选择函数或轻量 Application helper。
- 默认生产路径仍为 `off` / noop。
- 不自动发送 Rep。
- 不把 Mock Source 直接写入 Runtime。

## Non-goals

- 不修改 Database Schema / Migration。
- 不实现 UI Layout。
- 不实现 Camera / Pose Detection / Voice Recognition / AI。
- 不新增 `WorkoutFeedbackEvent`。

## Acceptance Criteria

- [ ] 可以根据 mode 创建 noop 或 mock source。
- [ ] 默认 mode 不产生 Rep。
- [ ] mock mode 复用 `createMockAutoRepCounterSource`。
- [ ] Runtime 仍只接收已验证的 `RepCompleted`。

## Tests

- mode 选择 noop。
- mode 选择 mock。
- 默认 mode 安全不发事件。
- mock source 输出仍可通过 validation。
