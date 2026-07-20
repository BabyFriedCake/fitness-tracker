# S4-06 — Rest Timer and Session State

## Execution Prompt

执行前必须读取并遵守：

`workflow/prompts/implement-task.md`

同时检查：

- `docs/04-Architecture/domain-model.md`
- `docs/04-Architecture/architecture.md`
- `docs/06-Database/schema.md`
- `docs/06-Database/data-dictionary.md`
- `tasks/sprint-4-workout-flow/S4-01-workout-session-domain.md`
- `tasks/sprint-4-workout-flow/S4-02-workout-session-schema.md`
- `tasks/sprint-4-workout-flow/S4-03-workout-session-repository.md`
- `tasks/sprint-4-workout-flow/S4-04-workout-session-application-flow.md`
- `tasks/sprint-4-workout-flow/S4-05-workout-session-execution-flow.md`

如果实现需要修改 Database Schema 或 Migration，立即执行 Stop Rule。

---

## Summary

补齐 WorkoutSession 当前训练位置聚合字段，并实现可持久化、可恢复的 RestTimer。

本任务负责：

- WorkoutSession 当前动作和当前组位置
- RestTimer Domain Contract
- RestTimer Repository Contract 与 SQLite Adapter
- RestTimer Application Flow
- 时间戳推导的休息剩余时间
- 启动、暂停、恢复、延长、完成、跳过和取消休息

---

## Scope

允许修改：

- WorkoutSession Domain 类型与测试
- RestTimer Domain 类型、状态转换与测试
- WorkoutSession Row Mapper
- WorkoutSession Repository 的当前位置映射
- RestTimer Repository Contract
- SQLite RestTimer Repository / Adapter
- Workout Session Application 层
- 对应导出文件与测试

禁止修改：

- Database Schema
- Migration
- WorkoutSession 生命周期定义
- 已有 WorkoutSet 事实
- UI
- 动画
- 音频播报
- 后台任务调度
- Recovery 页面
- 历史训练编辑流程

---

## Approved Domain Decisions

### 1. WorkoutSession Current Position

WorkoutSession 增加可选字段：

```ts
currentSessionExerciseId?: SessionExerciseId
currentSetNumber?: number
```

规则：

- 两个字段必须同时存在或同时不存在。
- `currentSessionExerciseId` 必须属于当前 Session。
- `currentSetNumber` 必须是正整数。
- 仅允许 Application 在 `in_progress` Session 中修改。
- Completed / Cancelled Session 保留最后位置快照，不主动清空。
- 不创建空 WorkoutSet。

Repository 必须：

- 从 `workout_sessions.current_session_exercise_id` 和 `current_set_number` 恢复。
- save / update 时写入这两个字段。
- Row Mapper 不得丢弃字段。

---

### 2. RestTimer Independent Aggregate

RestTimer 是独立 Aggregate，表示当前 Session 的当前休息状态。

WorkoutSession 不增加 `restTimer` 字段。Application 通过
WorkoutSessionRepository 与 RestTimerRepository 组合两个独立 Aggregate。

数据库 `rest_timer_states.session_id` 已具有唯一约束，因此同一 Session 只保存一个当前 RestTimer 状态。

---

### 3. RestTimer Status

严格使用 Domain Model 已批准状态：

```text
running
paused
completed
skipped
cancelled
```

禁止增加持久化状态：

```text
idle
```

没有 RestTimer 记录时表示：

```text
not_found
```

状态含义：

- `running`：正在休息。
- `paused`：用户暂停休息。
- `completed`：计时自然到期。
- `skipped`：用户主动跳过本次休息。
- `cancelled`：休息因 Session 流程取消或被明确作废。

合法转换：

```text
not_found -> running

completed -> running
skipped -> running
cancelled -> running

running -> paused
paused -> running

running -> completed
paused -> completed

running -> skipped
paused -> skipped

running -> cancelled
paused -> cancelled
```

`completed`、`skipped`、`cancelled` 为终态，不允许恢复或延长。

---

## RestTimer Contract

至少包含：

```ts
id
sessionId
sessionExerciseId
previousSetNumber?
nextSetNumber?
originalDurationSeconds
startedAt?
targetEndAt?
pausedRemainingSeconds?
status
createdAt
updatedAt
```

字段命名应与现有 Domain 命名规范一致。

不得添加 Schema 中不存在且无法稳定映射的持久化字段。

---

## Timer Calculation Rules

禁止每秒写数据库。

### Running

剩余秒数通过以下数据计算：

```text
targetEndAt - now
```

结果最小为 0。

### Paused

剩余秒数使用：

```text
pausedRemainingSeconds
```

### Expired Running Timer

当：

```text
targetEndAt <= now
```

查询必须返回 `completed`。

同时使用 Repository 的原子更新能力将持久化状态同步为 `completed`。

不得依赖 React 组件挂载完成同步。

---

## 1. Set Current Session Position

实现：

```ts
setCurrentSessionPosition();
```

输入：

```ts
sessionId;
sessionExerciseId;
currentSetNumber;
updatedAt;
```

规则：

- 仅允许 `in_progress` Session。
- SessionExercise 必须属于该 Session。
- `currentSetNumber` 必须是正整数。
- 通过 WorkoutSessionRepository.update() 保存完整聚合。
- 不创建或修改 WorkoutSet。

---

## 2. Start Rest Timer

实现：

```ts
startRestTimer();
```

输入至少包含：

```ts
sessionId
sessionExerciseId
durationSeconds
startedAt
previousSetNumber?
nextSetNumber?
```

规则：

- 仅允许 `in_progress` Session。
- SessionExercise 必须属于该 Session。
- `durationSeconds` 必须是非负整数。
- 状态保存为 `running`。
- `targetEndAt = startedAt + durationSeconds`。
- 同时持久化当前动作和下一组位置。
- 不修改 WorkoutSet。

原子要求：

- 同一 Session 已有 `running` 或 `paused` Timer 时，启动必须失败。
- 不允许使用模块变量、内存锁或 UI 防重复。
- 使用 `rest_timer_states.session_id` 唯一约束与单条 SQL / 事务完成。
- 已有终态 Timer 时允许原子替换为新的 `running` Timer。

---

## 3. Pause Rest Timer

实现：

```ts
pauseRestTimer();
```

规则：

- 只允许 `running`。
- 根据 `pausedAt` 计算剩余秒数。
- 剩余秒数最小为 0。
- 保存 `pausedRemainingSeconds`。
- 状态改为 `paused`。

---

## 4. Resume Rest Timer

实现：

```ts
resumeRestTimer();
```

规则：

- 只允许 `paused`。
- 使用暂停剩余秒数生成新的 `targetEndAt`。
- 状态改为 `running`。
- 不重置 `originalDurationSeconds`。

---

## 5. Extend Rest Timer

实现：

```ts
extendRestTimer();
```

规则：

- 只允许 `running` 或 `paused`。
- `additionalSeconds` 必须是正整数。
- running：延长 `targetEndAt`。
- paused：增加 `pausedRemainingSeconds`。
- 不改变 SessionExercise 的 `currentRestSeconds`。
- 不修改 WorkoutSet。

---

## 6. Complete / Skip / Cancel

实现：

```ts
completeRestTimer();
skipRestTimer();
cancelRestTimer();
```

规则：

- 只允许从 `running` 或 `paused` 进入终态。
- complete：自然到期。
- skipped：用户主动跳过。
- cancelled：Session 流程取消或休息被作废。
- 终态不可恢复、暂停或延长。
- 不自动完成 WorkoutSession。

---

## 7. Query and Recovery

实现：

```ts
getRestTimerState();
```

返回结果必须区分：

```text
not_found
running
paused
completed
skipped
cancelled
```

要求：

- 返回 Domain RestTimer。
- running 状态根据 `now` 计算剩余秒数。
- paused 状态返回固定剩余秒数。
- 到期时原子同步 completed。
- App 重启后可以恢复当前动作、当前组和休息状态。

---

## Repository Responsibilities

WorkoutSessionRepository：

- 保存与恢复当前动作和当前组位置。
- 不负责 RestTimer 状态转换。

RestTimerRepository 至少提供：

```ts
findBySessionId();
startIfNoActiveTimer();
update();
completeIfExpired();
```

允许根据现有代码风格调整方法名，但职责必须保持一致。

SQLite Adapter：

- SQL 仅存在 Database 层。
- 多步骤写入使用事务。
- 并发启动只能一个成功。
- 不修改 Schema 或 Migration。

---

## Error Handling

至少提供明确错误：

- WorkoutSession 不存在
- WorkoutSession 状态不是 `in_progress`
- SessionExercise 不存在或归属错误
- currentSetNumber 非法
- RestTimer 不存在
- 已存在 active RestTimer
- RestTimer 状态转换非法
- durationSeconds 非法
- additionalSeconds 非法
- 时间戳无效
- 生成 RestTimer ID 无效

不得统一抛出普通 `Error`。

---

## Testing Requirements

### Current Position

- 保存并恢复当前动作和组号
- 两个字段同时存在或同时为空
- 非法组号被拒绝
- SessionExercise 归属错误被拒绝
- 非 `in_progress` Session 被拒绝
- 不创建或修改 WorkoutSet

### RestTimer Domain

- 状态仅包含 running / paused / completed / skipped / cancelled
- 不存在 idle 状态
- 合法转换矩阵
- 非法转换被拒绝

### RestTimer Persistence

- 启动 running Timer
- 保存并恢复全部字段
- 同一 Session 不能并发启动两个 active Timer
- 终态 Timer 可以被下一次 running Timer 替换
- 不修改 Schema / Migration

### Timer Lifecycle

- running -> paused
- paused -> running
- running / paused 延长
- running -> completed
- running / paused -> skipped
- running / paused -> cancelled
- 终态不可恢复或延长

### Recovery

- running 根据 targetEndAt 恢复剩余时间
- 过期 running 自动同步 completed
- paused 恢复固定剩余时间
- 不每秒写数据库
- App 重启后恢复当前位置和 Timer

---

## Self Review

完成定向测试后执行一轮 Self Review。

检查：

- 是否错误增加 idle 状态
- 是否遗漏 skipped 状态
- 是否使用模块变量或内存锁
- 是否每秒写数据库
- 是否丢弃 currentSessionExerciseId / currentSetNumber
- 是否修改已有 WorkoutSet
- 是否修改 Schema / Migration
- 是否越界实现 UI、音频、后台调度或 Recovery 页面

发现问题最多自动修正一轮。

---

## Validation

先运行 S4-06 定向测试。

定向测试通过后只运行一次：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

禁止执行：

```bash
git add
git commit
git push
```

---

## Acceptance Criteria

- [ ] WorkoutSession 可以持久化恢复当前动作和当前组。
- [ ] RestTimer 使用 running / paused / completed / skipped / cancelled。
- [ ] 不持久化 idle；无记录表示 not_found。
- [ ] 支持启动、暂停、恢复、延长、完成、跳过和取消。
- [ ] 剩余时间由时间戳推导，不每秒写库。
- [ ] 应用重启后可以恢复位置和计时状态。
- [ ] 同一 Session 最多一个 active Timer。
- [ ] 不修改已有 WorkoutSet。
- [ ] 不修改 Schema 或 Migration。
- [ ] 定向测试与完整 Validation 全部通过。

---

## Final Report

不超过 50 行，必须包含：

- Summary
- Files Changed
- Decisions
- Self Review
- Focused Tests
- Validation
- Repository Hygiene
- Known Limitations
- Review Status
