# S10-05 History Calendar UX Hardening

状态：Done

## 目标

加固 History 月历和日期钻取体验，确保 P008 的日历交互稳定可用。

## 范围

- 月份左右切换。
- 日期点击后只显示对应日期训练。
- 有训练日期显示肌群标签。
- 空日期显示稳定空状态。
- 返回时保持必要的选择状态。

## 不做

- 不实现高级图表。
- 不实现历史纠错。
- 不修改 Schema / Migration。

## 验收标准

- 日历可切换月份。
- 日期可点击。
- 有训练日期显示肌群标签。
- 选中日期训练列表与真实 completed Session 一致。
- cancelled Session 的显示和统计边界明确。

## 测试要求

- 覆盖月切换、日期选择、空日期、肌群标签、cancelled 边界。

## 完成记录

### 结论

- 现有 History 日历已经覆盖月切换、日期点击、空日期状态和肌群标签展示。
- `workout-session-history.test.tsx` 已覆盖：
  - 月历展示
  - 日期点击后显示对应日期训练
  - 无训练日期空状态
  - completed / cancelled 边界

### 说明

- 当前无需新增 Schema / Migration。
- 不新增新的日历页面。
- 不引入复杂图表或额外状态机。

### 验证

- `pnpm --filter mobile test -- workout-session-history --watchAll=false`: PASS
