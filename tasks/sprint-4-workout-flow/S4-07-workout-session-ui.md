# S4-07 Workout Session UI

## Goal

实现 Workout Session 执行界面。

将已有 Application Flow、Execution Flow 和 RestTimer 能力连接到 UI 层。

---

## Prerequisites

执行前读取：

workflow/prompts/implement-task.md

并遵守：

- Domain Boundary
- Repository Boundary
- Application Flow Only
- Self Review

---

# Scope

## Include

### 1. Session 页面入口

实现训练执行页面基础结构：

展示：

- 当前训练名称
- 当前训练状态
- 当前动作列表
- 当前动作位置

---

### 2. 当前动作展示

支持展示：

- 当前 SessionExercise
- 动作名称
- 已完成 Set
- 当前 Set 状态

---

### 3. Set 操作入口

提供 UI 操作：

- 添加完成 Set
- 跳过动作
- 恢复动作
- 完成动作

所有操作必须调用 Application Layer。

禁止直接修改 Domain 状态。

---

### 4. Session 状态展示

展示：

- draft
- in_progress
- completed
- cancelled

根据状态控制 UI 可用性。

---

### 5. RestTimer 展示入口

仅展示已有 Timer 状态：

支持：

- running
- paused
- completed

禁止：

- 创建 Timer
- 修改 Timer
- 实现倒计时逻辑

Timer 操作继续由 Application Flow 负责。

---

# Architecture Rules

必须：

- UI → Application → Domain → Repository

禁止：

- UI → Repository
- UI → SQLite
- UI 修改 Aggregate 内部字段

---

# Out of Scope

禁止实现：

- Timer UI 完整交互
- 音频播报
- 后台任务
- Recovery 页面
- Apple Watch
- 数据统计
- 图表

---

# Acceptance Criteria

## Session UI

- 可以进入训练执行页面
- 可以显示当前 Session
- 可以显示当前动作

## Set 操作

- 完成 Set 后 UI 正确刷新
- 跳过/恢复动作状态正确展示
- 完成动作后状态正确更新

## Boundary

- 无 Repository 调用
- 无 SQLite 调用
- 无 Domain 内部状态直接修改

## Quality

必须通过：

- pnpm format:check
- pnpm lint
- pnpm typecheck
- pnpm test
- git diff --check

---

# Validation Report

执行完成后输出：

- Summary
- Files Changed
- Decisions
- Self Review
- Focused Tests
- Validation
- Repository Hygiene
- Acceptance Criteria
- Known Limitations
- Review Status

---

# Stop Rules

出现以下情况立即停止：

1. 需要修改 Schema/Migration

2. 需要修改 Repository Contract

3. 需要绕过 Application Layer

4. 需要增加 Timer 业务逻辑

5. Domain 不支持当前 UI 需求

等待重新确认。
