# S5-05-R3 Workout Runtime Snapshot Recovery Final Fix

## 任务编号

`S5-05-R3-workout-runtime-snapshot-recovery-final-fix.md`

## 任务目标

修复 S5-05 Human Review 第二轮发现的问题。

本任务目标：

1. 完整保留合法 RestTimer 恢复状态。
2. 增加 Snapshot Validation 测试隔离。
3. 完成 S5-05 Human Review 要求。

---

# Findings

## P1: Recovery 集成丢失部分合法 RestTimer 状态

当前问题：

恢复入口只传递：

```
running
paused
completed
```

缺少：

```
skipped
cancelled
```

导致：

```
RestTimer skipped/cancelled

↓

undefined

↓

Snapshot status 重新覆盖 Runtime
```

---

# 修复要求

## RestTimer 状态完整传递

恢复流程必须：

```
RestTimer state

↓

restoreRuntimeSnapshot()

↓

Runtime state resolve
```

不得过滤合法状态。

支持：

```
running
paused
skipped
cancelled
completed
```

---

## 状态优先级

恢复时：

```
Valid RestTimer state
        >
Snapshot status
```

如果存在合法 RestTimer 状态：

Snapshot status 不得覆盖。

---

# P2: Snapshot Validation 测试隔离

当前问题：

一个测试 Snapshot 同时包含：

- 缺少 current exercise
- 重复 WorkoutSet ID

导致：

无法明确验证单一约束。

---

# 测试调整

拆分为独立测试。


## Test A: Missing Current Exercise

输入：

```
Snapshot without current exercise
```

期望：

```
restore rejected
```

验证：

current exercise constraint。


---

## Test B: Duplicate WorkoutSet ID

输入：

```
Snapshot with duplicated WorkoutSet IDs
```

期望：

```
restore rejected
```

验证：

set identity constraint。


---

# 修改范围

允许：

- load-workout-session-screen.ts
- workout-runtime-engine.ts
- snapshot restore logic
- snapshot tests
- recovery tests


禁止：

- Schema
- Migration
- S5-06 Companion Runtime Flow
- UI
- AI


---

# Validation

完成后执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

---

# 最终报告

输出：

- 修复内容
- 修改文件
- 测试结果
- Validation
- Self Review

目标：

Ready for Human Review。
