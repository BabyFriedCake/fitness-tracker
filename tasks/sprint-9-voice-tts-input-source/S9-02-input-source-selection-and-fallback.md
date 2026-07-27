# S9-02 Input Source Selection and Fallback

状态：Done

## 目标

把现有 Mock 输入源和未来真实输入源做成可切换结构，并定义失败降级策略。

## 范围

- 输入源选择
- 输入源切换
- 失效时回退

## 不做

- 不实现真实识别模型
- 不实现后台音频播放
- 不新增 AI 推理

## 验收标准

- 可切换当前输入源
- 切换后恢复原有输入边界
- 输入源失败不会阻断训练主流程

## 测试要求

- Selection flow tests
- Fallback tests
- Recovery tests

## 完成记录

- 现有 `selectWorkoutCompanionEventSource()` 已支持 `off` 与 `mock_auto_rep` 切换。
- 缺少 mock 选择输入时会稳定回退到 noop，不会阻断训练主流程。
- 现有测试已覆盖 off/noop、mock source 选择、缺输入 fallback 和恢复边界。
