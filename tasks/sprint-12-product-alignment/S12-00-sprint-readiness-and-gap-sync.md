# S12-00 Sprint Readiness and Gap Sync

状态：Done

## 目标

对齐 Sprint 12 的原型缺口、代码现状和文档边界，确认本 Sprint 只做体验收口。

## 范围

- 复核 roadmap、Prototype 状态和 Sprint 11 退出结果。
- 确认 P001-P011 当前差距。
- 确认本 Sprint 不引入新领域。

## 验收标准

- Sprint 12 范围明确。
- 原型缺口可追踪。
- 相关文档入口已建立。

## 完成记录

### 结论

Sprint 12 以“原型对齐 + Release 收口”为唯一目标，不新增产品方向。

### 当前优先级

1. P001 Today：计划与入口交互
2. P002 Workout Template：详情 / 编辑分流
3. P007 Exercise Library：布局与筛选
4. P008 History：日历与钻取
5. P005 / P006：Workout / Rest / Summary 视觉收口
6. P009 / P010：Settings / Onboarding 基础体验

### 当前技术债

- `use-workout-session-screen.ts` 仍有既有 hook warning。
- `workout-coach-decision.ts`、`workout-recommendation-preview.ts` 存在重复导入 warning。
- `workout-history-metrics.ts` 存在未使用变量 warning。

### 架构风险

- 多页面并行对齐容易引入回归。
- 原型修正容易被误扩成新功能。
- “建议”与“事实”的边界需要继续保持清晰。

### 文档状态

- roadmap 已补 Sprint 12。
- Prototype 状态文档已补 Sprint 12 方向。
- Development 索引已补 Sprint 12。

### 测试状态

- 本地质量门可运行。
- 当前已有 Sprint 11 相关测试通过。
- 仍需在 Sprint 12 实施后跑完整 validation。
