# Sprint 14 Plan

状态：Completed

## Goal

Final Release 后先完成体验回归、Figma 差距审计和小范围 UX 收敛，为后续功能 Sprint 建立可靠输入。

## Planning Principle

- 先审计，再实现。
- 每个修正必须对应 Prototype / Figma / Roadmap 中的明确差距。
- 保持 Workout Runtime、Event Source Architecture 和本地优先架构稳定。
- 不引入未授权第三方媒体资源。
- 不把视觉优化扩大成数据库、AI 或云能力改造。

## Sprint 14 Scope

### Review and Gap Audit

- Expo / 真机关键路径回归。
- 对照 Figma 和 Prototype 检查 Today、Workout、Exercise Library、History。
- 输出可执行差距清单和优先级。

### UX Polish

- Today 添加计划 Modal 和交互细节。
- Workout 暂停页、休息页和动作切换视觉细节。
- 动作库图片资源方案和当前占位图策略复核。

### Planning

- Sprint 15+ 功能路线更新。
- AI Coach、Recommendation、Analytics 的前置接口和风险整理。

## Current Progress

- S14-00 已完成：Sprint Readiness and Figma Gap Audit。
- S14-01 已完成：Device Smoke Test and Runtime Regression。
- S14-02 已完成：Today Plan Modal and Interaction Polish。
- S14-03 已完成：Workout Pause and Rest Visual Polish。
- S14-04 已完成：Exercise Media Asset Strategy。
- S14-05 已完成：Sprint Exit Review。

## Sprint 14 Non-goals

- 不修改 Database Schema / Migration。
- 不重写 Workout Runtime 状态机。
- 不实现真实 Voice Engine、姿态识别或 AI 计数。
- 不实现云同步、账号、订阅或分析 SDK。
- 不使用未确认授权的第三方动作图片。

## Sprint 14 Risks

- Figma 差距可能被误解为一次性全量重做。
- 真机表现可能与桌面测试不同。
- 图片资源方案若没有授权证据，不应进入正式导入数据。
- Today / Workout 的交互调整可能影响已完成训练事实保护。

## Execution Order

1. S14-00 Sprint Readiness and Figma Gap Audit
2. S14-01 Device Smoke Test and Runtime Regression
3. S14-02 Today Plan Modal and Interaction Polish
4. S14-03 Workout Pause and Rest Visual Polish
5. S14-04 Exercise Media Asset Strategy
6. S14-05 Sprint Exit Review

## Exit Criteria

- Figma 差距清单已生成并排序。
- 真机 / Expo 回归结果已记录。
- 已完成的 UX 修正均有测试或明确验证证据。
- Prototype Implementation Status 已同步。
- Sprint 15 输入范围清晰。
