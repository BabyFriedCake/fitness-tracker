# S7-00 Figma Product Alignment

状态：Ready

## Goal

根据 Sprint 6 Human Review 后确认的 Figma 交互，作为 Sprint 7 开始前置任务修正产品体验实现偏差。

本任务用于对齐：

- Today 训练计划
- 本次训练预览/调整
- Exercise Library Figma 布局
- History Calendar
- Workout / Pause / Rest UI

## Background

Sprint 6 已合并到 `main`。Human Review 确认当前实现与 Figma 存在差异，
因此该修正不回写 Sprint 6 完成状态，而作为 Sprint 7 前置任务执行：

1. Today 的“训练计划”应展示今天添加的训练模板，而不是全部模板。
2. “添加计划”应从训练模板列表中选择并加入今天计划。
3. 今日计划卡片主体应进入本次训练预览/调整页。
4. 今日计划卡片右侧开始按钮进入训练页。
5. 完成后的今日计划显示“已完成”，且不可再次从该卡片开始。
6. 动作库布局应为左侧肌群分类、右侧器械分类和图片卡片列表。
7. History 应提供可点击月历、月份切换和日期训练列表。
8. Workout 页面应补齐暂停、上一动作、下一动作、暂停页和休息页视觉状态。

## Scope

### Today Plan

- 在 Today 页面显示今天已添加的训练计划。
- “训练计划”标题旁显示“添加计划”按钮。
- 点击“添加计划”打开模板选择 Modal。
- 从 active WorkoutTemplate 中选择模板加入今日计划。
- 默认阻止同一 active 模板当天重复加入。
- 今日计划状态从当日 WorkoutSession 派生：
  - 未开始：可开始
  - draft / in_progress：可继续或进入本次训练
  - completed：显示“已完成”，不可再次开始
- 点击卡片主体进入本次训练预览/调整页。
- 点击卡片右侧开始按钮进入 Workout Session 页面。

### 本次训练预览/调整

- 预览页展示由模板复制出来的 WorkoutSession draft。
- 编辑本次训练只修改 SessionExercise，不修改 WorkoutTemplate。
- 可调整本次训练动作配置。
- 可开始训练。
- 不实现模板编辑。
- 不修改历史 WorkoutSet。

### Exercise Library

- 按 Figma 改为：
  - 顶部搜索
  - 搜索右侧加号入口
  - 左侧肌群分类栏
  - 右侧器械筛选
  - 图片动作卡片网格
- 当前版本不实现自定义动作。
- 加号入口只能显示“当前版本暂不支持自定义动作”或禁用状态。
- 不新增用户自定义 Exercise Domain / Schema / Repository。
- 动作图片使用本地数据集图片 URI 或稳定占位。

### History Calendar

- 默认显示当前月份。
- 左右按钮切换月份。
- 日期可点击。
- 日期格显示当天训练肌群标签。
- 下方列表显示选中日期 completed Sessions。
- 无训练日期显示空状态。
- 统计必须从 WorkoutSet 事实派生。

### Workout / Pause / Rest UI

- running 页面展示：
  - 动作图片
  - 当前动作
  - 当前组
  - 当前 Rep 进度
  - 暂停
  - 上一动作
  - 下一动作
- paused 页面展示全屏暂停状态和继续按钮。
- resting 页面展示休息倒计时、下一组卡片和跳过休息入口。
- 上一/下一动作不得删除或修改已有 WorkoutSet。
- 暂停期间不得推进 Rep。

## Allowed Files

- `apps/mobile/src/features/workout-session/`
- `apps/mobile/src/features/exercise-library/`
- `apps/mobile/src/features/workout-templates/`
- `apps/mobile/app/`
- 对应测试
- 相关 Prototype / Design System 文档

如实现 Today Plan 需要新增持久化对象，必须触发 Stop Rule，并先更新：

- `docs/04-Architecture/domain-model.md`
- `docs/06-Database/`
- 对应 Migration

## Non-goals

- 不实现用户自定义动作。
- 不实现 Camera / Pose Detection。
- 不实现正式 Auto Rep Counter。
- 不修改 Sprint 5 Snapshot Validation contract。
- 不绕过 Runtime / Application Flow。
- 不通过 UI 直接访问 SQLite。
- 不改写历史 WorkoutSet。

## Acceptance Criteria

- [ ] Today 可从模板选择并添加今日计划。
- [ ] 今日计划卡片主体进入本次训练预览/调整页。
- [ ] 今日计划开始按钮进入训练页。
- [ ] 完成后的今日计划显示“已完成”且不可点击开始。
- [ ] 本次训练预览/调整不修改 WorkoutTemplate。
- [ ] Exercise Library 符合 Figma 分类与图片卡片布局。
- [ ] 自定义动作入口不创建数据，并有稳定提示。
- [ ] History 月历可切换月份、点击日期并显示当天训练。
- [ ] 日期格显示当天训练肌群。
- [ ] Workout running / paused / resting 状态符合 Figma 视觉和交互。
- [ ] 所有训练事实仍通过 Application → Domain → Repository → Database。

## Tests

- Today plan add modal and duplicate prevention.
- Today plan start / completed disabled regression.
- Session draft preview does not update WorkoutTemplate.
- Exercise Library muscle rail + equipment filter.
- Exercise image fallback.
- Custom exercise entry disabled / unsupported prompt.
- History month navigation and date selection.
- Calendar muscle labels from completed Session facts.
- Workout pause / resume UI.
- Previous / next exercise guards.
- Resting UI and skip rest action.

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
