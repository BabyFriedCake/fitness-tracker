# S5-07-R0 Workout Companion Specification Alignment

## 任务目标

解除 S5-07 实现前的 Stop Rule 阻塞，建立单一、可实现、可测试的
Workout Companion UI Runtime Binding 规范。

## Scope

- 将 `RepCompleted.exerciseId` 明确为 `sessionExerciseId`。
- 明确 `WorkoutCompanionEventSource` 的订阅、取消、顺序和输入验证边界。
- 将 Runtime 全部 phase 同步到 Architecture 和 Prototype。
- 将 P004 与 Approved Workout UI 统一为 Companion Event 驱动行为。
- 移除重复的 Workout UI Prototype 事实来源。
- 更新 S5-07 Task Definition，明确 Scope、Non-goals 和可测验收标准。

## Non-goals

- 不实现 UI、Hook 或 Runtime Adapter。
- 不实现麦克风、语音识别、摄像头、姿态检测或 AI。
- 不修改 Domain、Database Schema、Migration 或 Snapshot Validation。

## Acceptance Criteria

- `RepCompleted` 只引用当前 `WorkoutSession` 中的 `SessionExerciseId`。
- Event Source contract 可以使用受控 fake 进行 UI/Application 集成测试。
- `running`、`paused`、`set_completion_pending`、`resting`、
  `exercise_completion_pending` 和 `completed` 都有 UI 行为。
- P004 与 Approved Workout UI 不再要求手动计数或手动完成本组。
- WorkoutSet 的实际重量来自已验证的当前组草稿，不由 Companion Event 伪造。
- S5-07 不要求本任务实现具体识别引擎。

## Validation

```bash
pnpm format:check
git diff --check
git status --short
git clean -nd
```

## Git

不执行 `git add`、`git commit` 或 `git push`。
