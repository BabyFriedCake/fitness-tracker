# Prototype Navigation Map

## Purpose

定义 Workout Companion Prototype 页面关系和用户流程。

用于：

- Figma Prototype 连线
- 前端 Route 设计
- QA 流程验证


# Main Flow

Today

↓

Add Plan Modal

↓

Today Workout Draft Preview

↓

Workout Session


# Workout Session States

Running

↓

Paused

↓

Running


Running

↓

Resting

↓

Running


Running

↓

Completed


# Page Navigation


## Today

入口：

- 当前训练 Session
- 今日训练计划
- 添加计划


跳转：

Today

→ Add Plan Modal

→ Today Workout Draft Preview

→ Workout Session


## Template List

功能：

- 查看模板
- 创建模板
- 编辑模板
- 删除模板


跳转：

Template List

→ Template Detail

→ Template Edit


## Template Detail

显示：

- 训练名称
- 动作列表
- 组数
- 次数
- 休息时间


操作：

- 编辑模板
- 从模板开始训练（非 Today 计划入口时）


跳转：

Template Detail

→ Workout Session


## Today Workout Draft Preview

显示：

- 本次训练名称
- SessionExercise 列表
- 本次训练目标组数、次数、休息

操作：

- 编辑此次训练
- 开始训练

边界：

- 修改本次训练只影响 WorkoutSession draft。
- 不修改 WorkoutTemplate。


## Workout Session

状态：

- running
- paused
- resting
- completed


## History

显示：

- 日期
- 模板
- 时长
- 完成情况
