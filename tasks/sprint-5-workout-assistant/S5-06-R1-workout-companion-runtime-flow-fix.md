# S5-06-R1 Workout Companion Runtime Flow Fix

## 任务编号

`S5-06-R1-workout-companion-runtime-flow-fix.md`

## 任务名称

Workout Companion Runtime Flow 修复

---

# 1. 背景

S5-06 已完成：

- Companion Runtime 状态扩展。
- Rep 进度管理。
- Set 持久化边界设计。
- Application Flow 生成真实 WorkoutSet 和 FeedbackEvent。

Human Review 发现两个 P1 问题：

1. 最后一组完成后仍可能恢复到 running，导致继续记录额外 Set。
2. 并发 Rep 可能重复触发 Set 持久化。

本任务只修复 Runtime Flow，不扩展功能范围。

---

# 2. Goal

修复：

- 最后目标组完成后的状态流转。
- Set completion 持久化并发保护。
- 增加对应回归测试。

---

# 3. Non-Goal

不实现：

- UI。
- Figma。
- 摄像头识别。
- AI 计数。
- TTS。
- 新增 Event 类型。
- 修改 Snapshot Validation contract。
- 修改 Schema / Migration。

---

# 4. 问题修复一：最后一组完成状态

当前风险：

```
最后目标组完成

↓

resting

↓

resume

↓

running
```

导致：

- 可以继续增加 Rep。
- 可能生成额外 WorkoutSet。
- 绕过 ExerciseCompleted 流程。

---

## 修复要求

Runtime 必须判断：

- 当前 Set 是否为动作最后一个 Set。

规则：

```
普通 Set 完成：

running

↓

resting


最后 Set 完成：

running

↓

exercise completion flow
```

不得进入：

```
resting -> running
```

继续训练。

---

# 5. 问题修复二：Set Completion 并发保护

当前风险：

多个 Rep 同时达到目标：

```
onRepCompleted()

onRepCompleted()

↓

recordWorkoutSet()

recordWorkoutSet()
```

可能产生：

- 重复 WorkoutSet。
- 重复 SetCompleted。

---

## 修复要求

增加 Runtime 内部保护。

例如：

```
idle

↓

set completion pending

↓

persisting

↓

success

↓

resume runtime

```

在持久化期间：

新的 Set completion 请求必须：

- 被阻止。
- 或合并。

禁止重复调用：

```
recordWorkoutSet()
```

---

# 6. 错误处理

如果持久化失败：

要求：

- 不进入 completed。
- 不推进 exercise index。
- 不产生完成事件。
- Runtime 保持可恢复状态。

---

# 7. 测试要求

## Test 1: Last Set Completion

验证：

```
最后一个 Set 完成

↓

不会进入 resting

↓

进入正确完成流程

↓

ExerciseCompleted 正常生成
```

---

## Test 2: Concurrent Rep Completion

验证：

同时调用：

```
onRepCompleted()

onRepCompleted()
```

结果：

- 只产生一次 Set 持久化。
- 只产生一次 SetCompleted。

---

## Test 3: Persistence Failure

验证：

```
recordWorkoutSet failed

↓

Runtime 状态保持

↓

不会错误进入 completed
```

---

# 8. 修改范围

允许：

- workout-runtime-engine.ts
- workout-companion-runtime-flow.ts
- runtime tests

禁止：

- Snapshot Validation
- Database Schema
- Migration
- UI
- AI Module

---

# 9. Validation

完成后执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

---

# 10. 最终报告

输出：

- 修复内容。
- 修改文件。
- 新增测试。
- Validation 结果。
- Self Review。

Ready for Implementation.
