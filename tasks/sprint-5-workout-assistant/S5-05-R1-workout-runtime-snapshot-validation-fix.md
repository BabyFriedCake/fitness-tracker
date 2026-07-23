# S5-05-R1 Workout Runtime Snapshot Validation Fix

## Goal

修复 S5-05 Human Review 问题：

1.  Snapshot 保存失败不可静默成功。
2.  SQLite Snapshot Repository 验证真实持久化。
3.  Snapshot 恢复前执行完整性校验。

## Snapshot Save Failure Contract

保存成功：

``` ts
{ success: true }
```

保存失败：

``` ts
{
  success: false,
  reason: "snapshot_persist_failed",
  error: Error
}
```

要求： - repository.save 失败必须返回失败结果 - 不允许 catch
后静默成功 - 不覆盖旧 snapshot

## SQLite Persistence Test

必须使用真实 SQLite Storage。

禁止只使用 Map。

测试流程：

1.  创建 SQLite repository
2.  save snapshot
3.  dispose repository
4.  创建新的 repository
5.  load snapshot
6.  compare

覆盖：

-   running
-   paused
-   sessionId
-   status
-   updatedAt
-   currentExercise
-   currentSet
-   orderedExercises
-   restTimerStatus

## Snapshot Validation

新增：

``` ts
isValidWorkoutRuntimeSnapshot()
```

校验：

-   sessionId
-   status
-   updatedAt
-   orderedExercises
-   currentExercise
-   currentSet

status 允许：

-   running
-   paused

非法数据返回 false/null，不进入 Runtime Engine。

## Restore Flow

load snapshot 后：

1.  validate
2.  invalid 返回 failure
3.  valid 才恢复 runtime

## Tests

必须新增：

-   save failure test
-   SQLite reopen persistence test
-   validation invalid data test

## Acceptance Criteria

-   snapshot save failure 不静默成功
-   SQLite 有真实 reopen 测试
-   invalid snapshot 不恢复
-   running 可恢复
-   paused 可恢复
-   不修改 Domain / Schema / Migration

## Validation

执行：

``` bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

定向：

``` bash
pnpm --filter mobile test -- --runInBand src/features/workout-session/__tests__
```

## Final Report

生成：

S5-05-R1 Final Report
