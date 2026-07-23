# S7-00-R0 Today Plan Domain and Schema

状态：Completed

## Goal

为 Figma 中 Today 页面“训练计划”建立正式领域与持久化模型，
解除 `S7-00 Figma Product Alignment` 的 Stop Rule 阻塞。

## Background

`S7-00 Figma Product Alignment` 需要实现：

- Today 页面展示今天已添加的训练计划。
- “添加计划”从训练模板列表中选择。
- 计划卡片可处于未开始、进行中、已完成状态。
- 完成后的计划显示“已完成”，不可再次从该卡片开始。
- 卡片主体进入本次训练预览/调整页。

现有模型只有：

- `WorkoutTemplate`：长期模板。
- `WorkoutSession draft`：一次真实训练草稿。
- `WorkoutSession in_progress/completed/cancelled`：真实训练生命周期。

现有 `createWorkoutSessionFromTemplate()` 会阻止已有 recoverable
`draft/in_progress` 时再次创建新 Session。

因此，现有模型无法可靠表达“今天添加但尚未开始的多个计划”。

## Product Decisions

Human Review 已确认以下决策：

1. Today 页面只有一个“训练计划”模块。
2. “训练计划”模块下可以添加多个训练模板卡片。
3. 同一个 active WorkoutTemplate 一天只能添加一次。
4. TodayPlan 是“今天选择了某个训练模板”的计划入口，不是历史训练事实。
5. TodayPlan 可以关联一个 `WorkoutSession`：
   - 未开始：`sessionId` 为空。
   - 已创建草稿：关联 `draft WorkoutSession`。
   - 进行中：关联 `in_progress WorkoutSession`。
   - 已完成：关联 `completed WorkoutSession`。
6. TodayPlan 展示状态必须以关联 `WorkoutSession` 为事实来源：
   - 无 `sessionId`：未开始。
   - 关联 `draft/in_progress`：可进入或继续训练。
   - 关联 `completed`：显示“已完成”，不可再次开始。
   - 关联 `cancelled`：显示取消状态，当前版本不进入正式统计。
7. 点击 TodayPlan 卡片主体进入本次训练预览/调整页。
8. 点击 TodayPlan 开始按钮：
   - 未创建 Session 时，从模板创建 `WorkoutSession draft` 并进入训练。
   - 已有 draft/in_progress 时，恢复或继续该 Session。
   - completed 时禁用。
9. 删除 / 移除 TodayPlan 当前版本不做。
10. TodayPlan 不修改 WorkoutTemplate。
11. 修改本次训练只修改 `WorkoutSession / SessionExercise`。

## Proposed Domain Model

新增领域对象：

```text
TodayWorkoutPlan
```

核心属性：

- `id`
- `localDate`
- `sourceTemplateId`
- `sessionId?`
- `titleSnapshot`
- `position`
- `status`
- `createdAt`
- `updatedAt`

状态：

```text
planned
draft
in_progress
completed
cancelled
```

状态来源规则：

- `planned`：已添加计划，但尚未创建 WorkoutSession。
- `draft`：已关联 draft WorkoutSession。
- `in_progress`：已关联 in_progress WorkoutSession。
- `completed`：已关联 completed WorkoutSession。
- `cancelled`：已关联 cancelled WorkoutSession，或后续明确取消计划。

`TodayWorkoutPlan.status` 只用于查询和缓存。展示与业务判断必须优先读取关联
`WorkoutSession.status`，避免状态漂移。

## Database Requirements

新增表：

```text
today_workout_plans
```

建议字段：

- `id TEXT PRIMARY KEY`
- `local_date TEXT NOT NULL`
- `source_template_id TEXT NOT NULL`
- `session_id TEXT`
- `title_snapshot TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `status TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

建议约束：

- `status IN ('planned', 'draft', 'in_progress', 'completed', 'cancelled')`
- `local_date` 非空，格式由 Application 层保证为 `YYYY-MM-DD`
- `position >= 1`
- `UNIQUE(local_date, source_template_id)` 用于阻止同模板当天重复添加
- `UNIQUE(session_id)`，允许 `NULL`
- `FOREIGN KEY(source_template_id) REFERENCES workout_templates(id)`
- `FOREIGN KEY(session_id) REFERENCES workout_sessions(id)`

必须新增 Migration。

不得修改历史 Migration。

## Repository Contract

新增 Repository：

```text
TodayWorkoutPlanRepository
```

最小能力：

- `listByDate(localDate)`
- `addFromTemplate(input)`
- `attachSession(planId, sessionId)`
- `syncStatusFromSession(planId, sessionStatus)`

可选能力：

- `findById(planId)`
- `findByDateAndTemplate(localDate, templateId)`

## Application Flow

### Add Plan

```text
Today → 添加计划 → 选择 WorkoutTemplate
→ TodayWorkoutPlanRepository.addFromTemplate()
→ Today 刷新计划列表
```

规则：

- 只允许 active WorkoutTemplate。
- 同日期同模板重复添加返回明确业务错误。
- 保存 `titleSnapshot`，避免模板改名影响当天计划显示。

### Start Plan

```text
TodayPlan planned
→ 从 sourceTemplate 创建 WorkoutSession draft
→ attachSession()
→ start / continue existing WorkoutSession
→ Workout Session 页面
```

规则：

- `completed` 计划不可 start。
- `draft/in_progress` 计划直接恢复关联 Session。
- 创建 Session 不得绕过现有 `WorkoutSession` Domain / Repository。
- 同一时间仍最多允许一个 `in_progress WorkoutSession`。

### Status Sync

```text
WorkoutSession draft / in_progress / completed / cancelled
→ Today 页面加载或关键操作后读取关联 Session
→ 修正 TodayPlan 展示状态
```

规则：

- WorkoutSession 是训练状态事实来源。
- TodayPlan 状态同步失败不得影响 WorkoutSession 事实。
- Today 页面加载时应能从关联 Session 修正展示状态。

## Allowed Files

- `docs/04-Architecture/domain-model.md`
- `docs/06-Database/`
- `apps/mobile/src/domain/`
- `apps/mobile/src/database/schema/`
- `apps/mobile/src/database/migrations/`
- `apps/mobile/src/database/repositories/`
- 对应测试

## Non-goals

- 不实现 Today UI。
- 不实现 Figma visual alignment。
- 不实现删除 TodayPlan。
- 不实现周期计划。
- 不实现用户自定义动作。
- 不修改 WorkoutSet 历史事实。
- 不修改 Sprint 5 Runtime Snapshot Validation。

## Acceptance Criteria

- [ ] Domain Model 明确 TodayWorkoutPlan 职责和边界。
- [ ] Database 文档包含表结构、约束和数据字典。
- [ ] 新增 Migration，且不修改历史 Migration。
- [ ] Repository 支持按日期列出计划。
- [ ] Repository 支持从模板添加计划并阻止同日重复模板。
- [ ] Repository 支持关联 WorkoutSession。
- [ ] 状态同步不会改写 WorkoutSession 事实。
- [ ] Migration 测试覆盖 fresh install 和 upgrade。
- [ ] Repository 测试覆盖重复添加、关联 Session、日期查询。

## Tests

- Domain validation tests.
- Migration tests.
- SQLite repository tests.
- Duplicate same-date template guard.
- Different date same template allowed.
- Session attachment uniqueness.
- Status sync from linked WorkoutSession.

## Validation

完成后执行：

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `git diff --check`

不要执行：

- `git add`
- `git commit`
- `git push`
