# S5-05-R2 Workout Runtime Snapshot Validation Review Fix v2

## 任务编号

`S5-05-R2-workout-runtime-snapshot-validation-review-fix-v2.md`

## 任务目标

修复 S5-05 Human Review 发现的问题。

本任务仅处理：

1. Snapshot 恢复状态优先级。
2. Snapshot Validation 完整领域约束。
3. 对应回归测试。

不扩展 Companion Runtime 功能。

---

# Human Review Findings

## P1: Snapshot 状态可能覆盖 RestTimer 状态

当前风险：

```
RestTimer restore

↓

Snapshot status restore

↓

Snapshot 覆盖 Runtime 状态
```

可能导致：

```
RestTimer = paused

Snapshot status = running

最终 Runtime = running
```

造成恢复状态不一致。

---

## 修复要求

明确恢复优先级：

```
Restore Snapshot

↓

Validate Snapshot

↓

Resolve RestTimer state

↓

Create Runtime state
```

规则：

- 有效 RestTimer 状态优先。
- Snapshot status 不得覆盖有效 RestTimer 状态。
- running / paused 恢复结果必须一致。

---

# P2: Snapshot Validation 领域约束

## Position 规则（重要）

当前 Domain、Repository、Database 使用：

```
SessionExercise.position = 1-based
```

因此保持：

```
position > 0

position <= orderedExercises.length
```

禁止转换为 0-based。

如果 Runtime 内部存在：

```
currentExerciseIndex
```

该字段与：

```
SessionExercise.position
```

分离处理。

---

## Set Configuration Validation

必须验证：

```
targetSets > 0

targetRepsMin > 0

targetRepsMax >= targetRepsMin
```

---

## Identifier Validation

验证：

- sessionId 非空。
- sessionExerciseId 非空。
- WorkoutSet.sessionExerciseId 属于当前 SessionExercise。

---

## Relationship Validation

验证：

- exercise position 与 SessionExercise 一致。
- set 数量与真实数据一致。

---

# 测试要求

## Test 1: RestTimer / Snapshot 冲突恢复

验证：

```
RestTimer paused

Snapshot running

↓

Runtime paused
```

---

## Test 2: Invalid Snapshot rejection

拒绝：

- 空 ID。
- position <= 0。
- position > orderedExercises.length。
- targetSets = 0。
- targetRepsMin = 0。
- targetRepsMax < targetRepsMin。
- Session 不匹配。

---

## Test 3: Valid Snapshot restore

验证：

有效 Snapshot：

- running。
- paused。

均正常恢复。

---

# 修改范围

允许：

- Snapshot Repository。
- Runtime restore logic。
- Snapshot tests。
- Recovery tests。

禁止：

- Companion Runtime Flow。
- UI。
- AI。
- Schema。
- Migration。

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

- 修复内容。
- 修改文件。
- 测试结果。
- Validation。
- Self Review。

Ready for Human Review。
