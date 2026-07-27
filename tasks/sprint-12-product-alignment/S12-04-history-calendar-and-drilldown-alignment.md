# S12-04 History Calendar and Drilldown Alignment

状态：Done

## 目标

收口历史页面的日历交互和日期钻取体验。

## 范围

- 月份切换。
- 日期点击。
- 日期训练标签。
- 历史详情入口。

## 验收标准

- 日历可交互。
- 日期与训练记录联动清楚。
- 不改动历史数据语义。

## 完成记录

### 结论

历史页已具备与原型一致的核心交互：

- 默认显示当前月份日历
- 左右按钮切换月份
- 点击日期更新下方训练列表
- 当天完成训练在日历格显示肌群标签
- 历史详情入口保留

### 测试

- `pnpm --filter mobile test -- workout-session-history --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS

