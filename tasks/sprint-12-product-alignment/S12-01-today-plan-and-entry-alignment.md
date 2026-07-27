# S12-01 Today Plan and Entry Alignment

状态：Done

## 目标

收口 Today 页面中的训练计划入口与卡片交互，让页面更接近原型。

## 范围

- 今日计划模块入口和卡片交互。
- 开始按钮与完成态展示。
- 计划与模板分流。

## 验收标准

- Today 的训练计划入口行为稳定。
- 计划卡片与模板卡片语义清晰。
- 完成态不可误触发训练。

## 完成记录

### 结论

Today 的计划入口与详情分流已具备稳定行为，现有实现覆盖：

- Today Dashboard 的训练计划卡片与添加计划入口
- 今日计划卡片主体进入本次训练详情页
- 今日计划开始按钮进入训练页
- 已完成计划的开始按钮禁用
- 今日计划详情页仅编辑本次训练草稿，不修改模板事实

### 测试

- `pnpm --filter mobile test -- today-dashboard today-plan-detail --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS

