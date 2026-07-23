# Runtime UI State Map

Runtime 状态与 UI 映射。


| Runtime | UI |
|---|---|
| running | 训练执行页面 |
| paused | 暂停状态页面 |
| set_completion_pending | 正在确认本组完成，禁止训练操作 |
| resting | 休息倒计时页面 |
| exercise_completion_pending | 正在保存动作结果，禁止训练操作 |
| completed | 完成总结页面 |


Runtime 负责状态。

UI 负责展示状态。
