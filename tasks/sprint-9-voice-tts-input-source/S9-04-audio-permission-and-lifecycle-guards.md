# S9-04 Audio Permission and Lifecycle Guards

状态：Done

## 目标

处理音频权限、前后台切换和输入源生命周期边界，避免把平台细节写进 Runtime。

## 范围

- 音频权限提示
- 前后台切换恢复
- 页面卸载清理

## 不做

- 不实现完整后台播放方案
- 不改训练历史事实
- 不引入平台特定魔法逻辑

## 验收标准

- 权限状态可感知
- 生命周期切换不会泄漏事件订阅
- 失败时有稳定降级

## 测试要求

- Permission state tests
- Lifecycle cleanup tests
- Re-entry tests

## 完成记录

- 训练页已具备 AppState 回前台刷新和 Event Source 解绑/重绑的生命周期守卫。
- 设置页已显示音频权限 baseline，明确当前版本不请求系统权限。
- 当前版本保持语音失败降级，不阻断训练主流程。
