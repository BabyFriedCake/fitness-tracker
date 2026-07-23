# S5-06-R2 Workout Companion Runtime Guard Singleton Fix

## 任务编号

`S5-06-R2-workout-companion-runtime-guard-singleton-fix.md`

## 任务目标

修复 S5-06 Human Review 发现的 P1 问题：

Set completion guard 当前可以被单次调用 options 注入替换，导致并发保护可被绕过。

本任务目标：

1. 将 Set completion guard 生命周期绑定到 Workout Companion Runtime Instance。
2. 禁止 per-call guard 绕过 Runtime 内部并发保护。
3. 增加对应并发回归测试。

---

# Human Review Finding

## P1: Set completion guard 不是 Runtime Flow 内部唯一实例

当前风险：

```
onWorkoutCompanionRep()

↓

options.setCompletionGuard

↓

tryBegin()
```

每次调用可以提供新的 guard。

可能导致：

```
Call A
guard A
成功


Call B
guard B
成功
```

最终：

```
recordWorkoutSet()
recordWorkoutSet()

SetCompleted
SetCompleted
```

---

# 修复要求

## Guard 生命周期

Set completion guard 必须属于：

```
Workout Companion Runtime Instance
```

而不是：

```
单次 API 调用
```

要求：

Runtime 创建时初始化：

```
createWorkoutCompanionRuntime()

        |
        |
        v

setCompletionGuard
```

所有：

```
onRepCompleted()
```

必须共享同一个 Runtime guard。

---

# API 约束

禁止：

```
onWorkoutCompanionRep(
  runtime,
  {
    setCompletionGuard
  }
)
```

通过调用参数替换 guard。

---

# 行为要求

保持已有行为：

## 最后一组完成

```
last set complete

↓

exercise_completion_pending
```

不可恢复继续产生额外 Set。

---

## 持久化失败

保持：

```
persist failed

↓

release guard

↓

allow retry
```

---

# 测试要求

## Test 1: Shared Runtime Guard

验证：

两个并发调用：

```
onRepCompleted()
onRepCompleted()
```

共享 Runtime instance。

结果：

只能：

```
one recordWorkoutSet()
one SetCompleted
```

---

## Test 2: Different Guard Injection

验证：

两个调用尝试使用不同 guard。

结果：

Runtime 内部 guard 生效。

只能：

```
one recordWorkoutSet()
```

---

# 修改范围

允许：

- workout-companion-runtime-flow.ts
- workout-companion-runtime-flow.test.ts
- Runtime factory / constructor

禁止：

- Snapshot Validation
- Schema
- Migration
- UI
- AI

---

# Validation

执行：

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

Ready for Human Review。
