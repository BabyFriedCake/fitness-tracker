# P004 Workout Session

核心训练陪练页面。

Runtime 状态：

- running
- paused
- set_completion_pending
- resting
- exercise_completion_pending
- completed


显示：

- 当前动作图片
- 动作名称
- 当前组数
- 当前次数 / 目标次数
- 重量
- 动作提示
- 语音反馈状态


功能：

- 自动次数进度更新
- 语音计数提示
- 完成一组
- 组间休息倒计时
- 暂停恢复
- 下一动作切换


次数只由已验证的 Companion Event Source 推进，用户无需手动
记录每次次数。pending 状态下不接受新 Rep。
