# S4-08 Workout Completion & Recovery Flow

## Task Goal

完成 Workout Session 从执行阶段到结束阶段的完整闭环。

支持： - 完成训练 - 取消训练 - 训练总结展示 - 恢复训练入口

保证 Session 生命周期、WorkoutSet 数据和当前训练位置的一致性。

## Scope

### Complete Workout Session

实现状态转换：

`in_progress → completed`

要求： - 仅允许 in_progress Session 完成 - 保存 ended_at - 保留已有
SessionExercise、WorkoutSet、训练备注和当前位置

### Cancel Workout Session

实现状态转换：

`in_progress → cancelled`

要求： - 保存取消时间 - 保留已有 WorkoutSet - cancelled 不进入完成统计

### Workout Summary

展示： - 训练名称 - 开始时间 - 结束时间 - 总训练时长 - 完成动作数量 -
完成 Set 数量 - 总训练重量

计算：

`volume = Σ(weight × reps)`

### Recovery Workout Session

支持恢复： - draft - in_progress

恢复： - 当前 Session - 当前动作 - 当前 Set Number - RestTimer 状态

禁止： - 创建新 Session - 丢失 WorkoutSet - 重置训练位置

## Non Goals

不包含： - Today Dashboard - 历史训练列表 - 数据图表 - AI 推荐 - Apple
Watch - 音频播报 - UI 大规模重构

## Architecture Constraints

必须遵守：

`UI → Application → Domain → Repository → Database`

禁止： - UI 直接访问 Repository - UI 直接写 SQLite - 绕过 Domain
修改状态

## Domain Rules

Session 状态：

`draft | in_progress | completed | cancelled`

禁止： - completed → in_progress - cancelled → in_progress

## WorkoutSet Rules

只保存实际训练数据。

禁止新增： - targetReps - targetWeight

## Stop Rules

以下情况必须停止：

1.  Domain 不支持状态转换
2.  Repository 无法保存结束状态
3.  无法恢复 currentSessionExerciseId/currentSetNumber
4.  必须修改 Schema 或 Migration

## Acceptance Criteria

-   in_progress Session 可以完成
-   completed 状态正确保存
-   ended_at 正确保存
-   in_progress Session 可以取消
-   cancelled 状态正确保存
-   WorkoutSet 保留
-   完成训练后可以查看总结
-   未完成 Session 可以恢复
-   当前动作恢复正确
-   当前组恢复正确
-   RestTimer 恢复正确
-   UI 不访问 Repository
-   Domain 不被绕过

## Validation

执行：

``` bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

## Self Review

检查： - 是否新增不必要 Domain 字段 - 是否绕过 Application Layer -
是否影响 S4-07 - 是否保留 WorkoutSet - 是否验证状态机

## Final Report

包含： - Summary - Files Changed - Decisions - Self Review - Tests -
Validation - Acceptance Criteria - Known Limitations - Review Status
