# S4-04 Workout Session Application Flow

## Task Type

Application Layer Implementation

## Scope

实现 Workout Session Application Flow。

允许修改：

-   Application Use Case
-   Application Service
-   Session Flow Tests
-   相关 Domain Adapter

禁止修改：

-   Database Schema
-   Migration
-   Repository Contract
-   Repository Implementation
-   UI
-   Timer
-   Recovery

------------------------------------------------------------------------

# Background

S4-01 完成 Workout Session Domain Contract。

S4-03 完成 WorkoutSessionRepository：

-   save()
-   findById()
-   update()

本任务负责连接 Domain 与 Repository，提供 Session 生命周期操作。

------------------------------------------------------------------------

# Requirements

## 1. 创建 Session

实现：

-   创建 draft WorkoutSession
-   支持 sourceTemplateId 可选
-   保留训练名称快照
-   初始化 SessionExercise 和 WorkoutSet 数据

禁止：

-   自动开始训练
-   自动完成训练

------------------------------------------------------------------------

## 2. Session 生命周期

支持：

draft

↓

in_progress

↓

completed

支持：

draft / in_progress

↓

cancelled

必须调用 Domain 状态转换方法。

禁止 Application 自行修改 status。

------------------------------------------------------------------------

## 3. 开始训练

startSession():

-   校验当前状态
-   调用 Domain transition
-   保存更新后的 Session

------------------------------------------------------------------------

## 4. 完成训练

completeSession():

-   校验当前状态
-   保持 WorkoutSet 实际数据
-   保存 completed Session

------------------------------------------------------------------------

## 5. 取消训练

cancelSession():

-   支持 draft / in_progress
-   保存 cancelled Session

------------------------------------------------------------------------

# Tests

必须增加：

-   创建 draft Session
-   draft → in_progress
-   in_progress → completed
-   draft → cancelled
-   非法状态转换被阻止
-   Repository 被正确调用
-   不绕过 Domain 状态转换

------------------------------------------------------------------------

# Execution Prompt

执行前必须读取：

workflow/prompts/implement-task.md

要求：

1.  如果发现与 Domain Model、Architecture、Repository Contract 冲突：
    立即 Stop Rule。
2.  不自行修改规范文档。
3.  不扩大 Scope。
4.  实现前先确认现有 Domain 和 Repository API。
5.  完成后执行：

pnpm format:check pnpm lint pnpm typecheck pnpm test git diff --check

6.  不执行：

git add git commit git push

------------------------------------------------------------------------

# Final Report

输出：

-   Summary
-   Files Changed
-   Decisions
-   Self Review
-   Tests
-   Validation
-   Repository Hygiene
-   Known Limitations
-   Review Status
