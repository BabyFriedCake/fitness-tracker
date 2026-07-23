# S5-08 Sprint 5 Exit Review

## Execution Prompt

执行前必须阅读：

1. `tasks/prompts/sprint-exit-review.md`
2. `AGENTS.md`
3. `docs/00-Project/roadmap.md`
4. `docs/04-Architecture/architecture.md`
5. `docs/04-Architecture/domain-model.md`
6. Sprint 5 的 Task Definition、当前实现和测试

## Goal

对 Sprint 5 Workout Assistant 进行整体退出验收，确认 Runtime、
Snapshot Recovery、Feedback Event、Voice Feedback、Companion Runtime Flow、
Event Source 和 UI Runtime Binding 形成一致、可恢复、可测试的训练陪练闭环。

## Review Scope

检查：

- S5-01 Workout Runtime Engine
- S5-02 / S5-02-R1 Workout Feedback Events
- S5-03 Workout Voice Feedback
- S5-04 / S5-04-R1 / S5-04-R2 Runtime UI Integration
- S5-05 / S5-05-R1 / S5-05-R2 / S5-05-R3 Runtime Persistence
- S5-06 / S5-06-R1 / S5-06-R2 Companion Runtime Flow
- S5-07-R0 Specification Alignment
- S5-07 Workout Companion UI Runtime Binding
- S5-07-R1 Runtime Recovery Fix

## Architecture Review

确认：

- Runtime 状态机没有被 UI 或 Event Source 绕过。
- `WorkoutCompanionEventSource` 只输入基础 Rep 事件。
- `SetCompleted` 和 `ExerciseCompleted` 只根据真实持久化事实生成。
- `WorkoutSet` 继续只保存实际数据，不包含 `targetReps`。
- Snapshot 不覆盖有效 RestTimer 状态，无效 Snapshot 不进入 Runtime。
- UI 通过 Application 编排 Runtime、Repository 和语音反馈。
- SQL 仅位于 database 模块。

## Functional Review

验证：

- running / paused / set completion pending / resting /
  exercise completion pending / completed 状态映射。
- 合法 `RepCompleted` 按序推进，无效或过期事件被拒绝。
- 达到目标次数后只持久化一个 WorkoutSet。
- 最后一组进入正确完成流程，不产生额外 Set。
- 持久化失败可重试，语音失败不回滚训练事实。
- RestTimer 倒计时和 Runtime 恢复保持一致。
- Runtime/Session 替换及页面卸载时取消旧订阅。

## Quality Validation

执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

## Repository Hygiene

执行：

```bash
git status --short
git diff --stat
git clean -nd
```

并按 `tasks/prompts/sprint-exit-review.md` 检查重复规范文件、IDE 配置、
调试代码、TODO/FIXME、临时文件、密钥和范围外改动。

## Acceptance Criteria

- Sprint 5 所有实现任务和修正项均纳入 Review。
- Runtime、Event Source、Snapshot、RestTimer 和 WorkoutSet 事实边界一致。
- 本地质量门全部通过，或报告明确的阻塞失败。
- Repository Hygiene 没有未解释的范围外文件。
- 生成 `docs/09-Release/Sprint-5-Exit-Report.md`。
- Roadmap 与验收结果一致。

## Non-goals

- 不修改业务代码。
- 不实现声音识别、Camera、Pose Detection 或 AI。
- 不修改 Schema 或 Migration。
- 不提前实现后续 Sprint。

## Output

使用 `docs/09-Release/Sprint-Exit-Report-Template.md` 生成：

```text
docs/09-Release/Sprint-5-Exit-Report.md
```

报告必须等待 Human Review 后才能提交。

## Git

不执行 `git add`、`git commit`、`git push`、tag 或 release。
