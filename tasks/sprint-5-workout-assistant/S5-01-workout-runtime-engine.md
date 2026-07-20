# S5-01 Workout Runtime Engine

## Execution Prompt

执行前必须阅读：

workflow/prompts/implement-task.md

## Goal

建立 Workout Runtime Engine，负责训练过程中的运行状态管理。

## Scope

实现：
- running
- paused
- completed

管理：
- 当前动作
- 当前 Set
- 当前训练运行状态

## Constraints

保持：

UI
↓
Application
↓
Domain
↓
Repository

禁止修改 Schema/Migration，除非触发 Stop Rule。

## Tests

覆盖状态转换和运行状态恢复。

## Final Report

输出 S5-01 Final Report。
