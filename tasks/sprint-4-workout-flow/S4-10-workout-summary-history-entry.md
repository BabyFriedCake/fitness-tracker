# S4-10-workout-summary-history-entry.md

## Task Definition

### Task ID

S4-10

### Title

Workout Summary & History Entry

---

## Goal

完善训练结束后的用户闭环入口。

在已有：

- S4-07 Workout Execution
- S4-08 Completion / Recovery Flow
- S4-09 Today Dashboard & Session Entry

基础上，实现训练完成后的总结查看入口，以及历史训练记录展示能力。

本任务只实现最小可用版本（MVP），不扩展统计分析。

---

# Scope

## 1. Completed Session Summary

实现训练完成后的 Summary 页面。

展示：

- 训练名称
- 开始时间
- 结束时间
- 总训练时长
- 完成动作数量
- 完成 Set 数量
- 总训练量

计算规则：

    volume = Σ(weight × actualReps)

仅统计：

    WorkoutSet.isCompleted === true

---

## 2. History Entry

增加历史训练入口。

支持查看：

- 最近完成训练
- 最近取消训练

状态：

- completed
- cancelled

不包含：

- draft
- in_progress

---

## 3. Navigation

完成训练后：

    Workout Session
            |
            v
    Workout Summary

Summary 页面返回：

    Today Dashboard

---

# Non Goals

本任务不实现：

- 图表
- 周/月统计
- AI 分析
- 训练趋势
- 身体数据关联
- 云同步

---

# Architecture Constraints

必须保持：

    UI
     ↓
    Application Hook
     ↓
    Application Use Case
     ↓
    Domain
     ↓
    Repository

禁止：

- Screen 直接访问 Repository
- Screen 直接访问 SQLite
- 修改 Schema
- 修改 Migration
- 修改 Domain Aggregate

---

# Expected Files

可能涉及：

    features/workout-session/
        application/
        screens/
        __tests__/

    app/
        routes/

具体文件由实现阶段决定。

---

# Acceptance Criteria

## Summary

- [ ] completed Session 可以进入 Summary
- [ ] Summary 展示训练基本信息
- [ ] Summary 数据来自 Application Layer
- [ ] 总训练量计算正确

## History

- [ ] Today 可以进入历史训练入口
- [ ] completed/cancelled Session 可以展示
- [ ] draft/in_progress 不进入历史列表

## Architecture

- [ ] UI 不访问 Repository
- [ ] 不修改 Schema/Migration
- [ ] 不破坏 S4-08 recovery flow
- [ ] 不影响 S4-09 Today Dashboard

---

# Tests

需要新增测试覆盖：

- completed summary 数据计算
- cancelled session 不生成 summary
- history 查询过滤状态
- volume 计算
- navigation flow

要求：

    pnpm format:check
    pnpm lint
    pnpm typecheck
    pnpm test
    git diff --check

全部通过。

---

# Execution Prompt

执行前必须阅读：

    workflow/prompts/implement-task.md

按照项目 Workflow 执行。

要求：

1.  先检查现有架构和 S4-07/S4-08/S4-09 实现。
2.  输出 Implementation Plan。
3.  确认不会违反 Architecture Constraints。
4.  执行代码修改。
5.  添加测试。
6.  执行完整验证。
7.  输出 Final Report。

---

# Self Review Checklist

完成后自行检查：

- [ ] 是否绕过 Application Layer？
- [ ] 是否修改数据库结构？
- [ ] 是否破坏恢复训练？
- [ ] 是否重复创建 Session？
- [ ] 是否存在未覆盖状态？
- [ ] 是否存在临时调试代码？

---

# Review Status

Ready for Human Review
