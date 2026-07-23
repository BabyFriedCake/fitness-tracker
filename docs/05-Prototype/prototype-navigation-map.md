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

Template List

↓

Template Detail

↓

Start Workout

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
- 添加训练


跳转：

Today

→ Template List

→ Template Detail


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

Start Workout


跳转：

Template Detail

→ Workout Session


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
