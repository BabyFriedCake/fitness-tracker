# Sprint-4 Exit Review

## Task Definition

### Task ID

Sprint-4-Exit-Review

### Goal

对 Sprint 4（Workout Flow）进行整体验收。

确认 Sprint 4 已完成训练生命周期闭环，并评估：

- 功能完成度
- 架构稳定性
- 测试覆盖
- 已知风险
- 是否可以进入 Sprint 5

## Review Scope

检查 Sprint 4 已完成任务：

- S4-07 Workout Execution
- S4-08 Completion / Recovery Flow
- S4-09 Today Dashboard & Session Entry
- S4-10 Workout Summary & History Entry

## Functional Review

确认完整流程：

Template ↓ Create Session ↓ Today Dashboard ↓ Start / Resume ↓ Workout
Execution ↓ Rest Timer ↓ Complete / Cancel ↓ Summary ↓ History

检查：

- Session 状态是否正确转换
- Recovery 是否可继续训练
- Complete / Cancel 是否正确结束流程

## Session State Review

确认状态机：

draft\
↓\
in_progress\
↓\
completed

draft / in_progress\
↓\
cancelled

检查：

- 是否存在非法状态转换
- 是否重复创建 Session
- 是否丢失 WorkoutSet

## Architecture Review

确认：

UI ↓ Application Hook ↓ Application Use Case ↓ Domain ↓ Repository

检查：

- Screen 是否直接访问 Repository
- Screen 是否直接访问 SQLite
- Application Layer 是否完整
- Repository Contract 是否稳定

## Data Integrity Review

检查：

- WorkoutSet 数据保存
- Session 当前状态
- currentSessionExerciseId
- currentSetNumber
- RestTimer 状态
- endedAt
- Summary 统计数据

确认：

- 未引入 target 数据污染
- 未修改 Schema/Migration

## Testing Review

验证：

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

## Execution Prompt

执行前必须阅读：

```text
workflow/prompts/implement-task.md
```

执行要求：

1.  阅读 Sprint 4 所有 Task Final Report：

    - S4-07
    - S4-08
    - S4-09
    - S4-10

2.  阅读对应 Human Review Report。

3.  检查当前代码状态。

4.  输出 Sprint 4 Exit Review。

5.  生成：

```text
docs/09-Release/Sprint-4-Exit-Report.md
```

6.  明确：

- Sprint 是否完成
- 是否 Ready for Sprint 5
- Remaining Risks

## Self Review Checklist

- [ ] 所有 Sprint 4 Task 已 Review
- [ ] 所有 Blocking Issue 已关闭
- [ ] 架构约束未被破坏
- [ ] 测试全部通过
- [ ] 已知风险已记录
- [ ] Exit Report 已生成

## Expected Output

生成：

```text
Sprint-4-Exit-Report.md
```

状态：

```text
Ready for Sprint 5 Review
```
