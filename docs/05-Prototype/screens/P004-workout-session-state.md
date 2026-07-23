# P004 Workout Session State

## Rep 来源

训练次数来源：

Workout Companion Event。

不是：

- 用户点击
- 计时器
- 假数据

---

## Runtime状态

### running

正常训练中。

### paused

训练暂停。

### resting

组间休息。

### set_completion_pending

达到目标次数，等待持久化确认。

UI显示：

正在确认本组完成。

### exercise_completion_pending

动作完成，等待保存训练结果。

UI显示：

正在保存训练结果。

---

## 用户操作限制

pending 状态下：

- 不产生新的 Rep
- 不允许跳过持久化流程

---

## 数据流

Companion Event Source

↓

RepCompleted

↓

Runtime

↓

WorkoutSet

↓

SetCompleted
