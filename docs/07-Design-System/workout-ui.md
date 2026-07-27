# Fitness Tracker Workout UI

Version: v1.1
Status: Approved
Last Updated: 2026-07-22

## 1. Goal

定义 Workout Companion 训练执行和休息计时交互。

训练中优先级：

1. 当前动作
2. 当前组
3. 实际重量
4. Rep 进度
5. Runtime 状态
6. 教练反馈
7. 休息状态
8. 训练总进度

## 2. Workout Execution

```text
进行中的训练
训练名称
[当前动作图片]
胸 · 杠铃
杠铃卧推

第 1 / 4 组 · 80.0 kg · 目标 8-10 次
8 / 10

训练中
第 8 次，很好，再坚持 2 次

[上一动作] [暂停] [下一动作]
已完成 0 / 18 组
```

## 3. Rep Progress

- Rep 只来自已验证的 Workout Companion Event Source。
- UI 只展示 Runtime `completedReps`，不在本地增加次数。
- 页面不提供 Rep 增减、计时模拟或“完成本组”按钮。
- 达到目标次数后，Runtime 自动进入持久化流程。

## 4. Weight Input

- 重量是当前未持久化组的实际数据草稿。
- 可使用数字输入或步进控件调整，交互目标至少 44×44 pt。
- 持久化必须使用当前已验证重量，不得由 Companion Event 生成默认值。
- 重量无效时不得写入 WorkoutSet，并必须提供可恢复错误。

## 5. Runtime Status

| Runtime phase | UI | Interaction |
| --- | --- | --- |
| `running` | 训练中、Rep 进度、教练反馈 | 可暂停 |
| `paused` | 全屏暂停状态 | 可继续、可结束训练 |
| `set_completion_pending` | 正在确认本组完成 | 禁止训练操作 |
| `resting` | 休息倒计时和下一组信息 | 可执行休息控制 |
| `exercise_completion_pending` | 正在保存训练结果 | 禁止训练操作 |
| `completed` | 完成结果 | 进入总结 |

状态不得只通过颜色表达。pending 状态必须有稳定文案，且不得通过
本地乐观状态跳过持久化。

## 6. Coach Feedback

- 计数反馈与已接受的 `RepCompleted` 顺序一致。
- `SetCompleted` 只在真实 WorkoutSet 持久化后提示。
- `ExerciseCompleted` 只在真实 SessionExercise 完成后提示。
- 语音失败不得回滚或阻断已完成的持久化。

## 7. Session Controls

- 暂停和继续是训练页主要控制。
- running 状态底部主控为：上一动作、暂停/继续、下一动作。
- 上一/下一动作不可通过本地状态直接改写 WorkoutSet。
- 跳过动作使用次要入口，并保留已完成 WorkoutSet。
- 结束训练不得与训练主控制靠得过近，并保留现有二次确认流程。

## 8. Rest Timer

```text
跳过休息

休息调整
01:25
距离下一组

下一组
杠铃卧推 · 第 2 组

```

- 倒计时是休息状态的视觉中心。
- 休息使用持久化的绝对时间，不通过每秒写库恢复。
- 返回 App 时直接展示当前真实状态。
- 已完成 WorkoutSet 不得因休息操作改变。

## 9. Background Feedback

```text
休息结束
可以开始下一组杠铃卧推
```

通知只是辅助，不是 Runtime 状态来源。

## 10. Accessibility and Accidental Input

- 关键点击区域至少 44×44 pt。
- 暂停和继续按钮高度至少 52 pt。
- 支持 Dynamic Type，文字不遮挡 Rep 进度。
- 不使用滑动、双击或长按作为唯一关键操作。
- pending 期间的交互控件明确禁用。
