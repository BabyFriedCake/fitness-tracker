# S10-02 History Session Detail

状态：Done

## 目标

补齐 History Session Detail，使用户能从历史列表进入一次训练详情，
查看动作、组、重量、次数和训练量。

## 范围

- 历史列表 Session 点击进入详情。
- 详情展示：
  - 训练名称
  - 开始 / 结束时间
  - 总时长
  - 动作列表
  - 每个动作的 Set 明细
  - 总训练量
- 保持只读，不修改历史事实。

## 不做

- 不实现历史纠错。
- 不修改模板。
- 不实现分享图。
- 不新增 Schema / Migration。

## 验收标准

- 从 History 列表可进入详情。
- 详情统计与 History Metrics Contract 一致。
- cancelled Session 可显示为取消记录，但默认不显示正式完成统计。
- 空 Set 或异常数据有稳定提示。

## 测试要求

- 补充 Application 和 Screen 测试。
- 覆盖完成训练、取消训练、无 Set、多个动作多个 Set。

## 完成记录

### 实现

- 复用现有 `/workout-sessions/[id]/summary` 作为历史详情入口，避免新增重复页面。
- `loadWorkoutSessionSummary()` 调整为 terminal history detail：
  - completed Session 可查看详情
  - cancelled Session 可查看详情
  - draft / in_progress 仍不可查看历史详情
- Summary Screen 文案调整为：
  - completed：训练完成
  - cancelled：训练已取消
- History Screen 回调语义从 `onOpenSummary` 调整为 `onOpenDetail`。

### 边界

- 历史详情只读，不修改历史事实。
- cancelled Session 显示已有动作 / Set 明细，但仍不进入正式统计。
- 不新增 Route、Schema 或 Migration。

### 测试

- 覆盖 cancelled Session 详情加载和渲染。
- 覆盖 active Session 仍返回 `not_terminal`。
- 保持 completed Summary 和 History 入口测试通过。

### 验证

- `pnpm --filter mobile test -- workout-session-completion-recovery workout-session-history workout-history-metrics --watchAll=false`: PASS
