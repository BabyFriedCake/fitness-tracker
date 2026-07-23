# S5-02 Workout Feedback Events

## Goal

建立训练过程事件模型，为后续语音播报、训练反馈、统计扩展提供 Application
层事件入口。

## Execution Prompt

执行前必须阅读：

-   workflow/prompts/implement-task.md

严格按照项目架构执行： UI → Application → Domain → Repository

不要修改： - Schema - Migration - Domain Aggregate - Repository 实现 -
UI

## Scope

新增 Application 层训练反馈事件：

-   RepCompleted
-   SetCompleted
-   ExerciseCompleted

事件来源：

-   SessionExercise
-   WorkoutSet

要求：

-   不修改历史 WorkoutSet 数据
-   不保存额外状态
-   仅生成运行时事件

## Acceptance Criteria

-   完成一次 Rep 时可以生成 RepCompleted
-   完成一个 Set 时可以生成 SetCompleted
-   完成动作时可以生成 ExerciseCompleted
-   无效输入需要明确错误
-   保持事件不可变

## Tests

必须增加：

-   rep feedback 测试
-   set completed 测试
-   exercise completed 测试

执行：

pnpm format:check pnpm lint pnpm typecheck pnpm test git diff --check

## Self Review

确认：

-   没有引入 Voice
-   没有引入 Timer
-   没有修改持久化结构
-   没有越过 Application 边界
