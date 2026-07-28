# Sprint 14 Figma Gap Audit Report

状态：READY WITH WARNINGS  
日期：2026-07-28

## Review Scope

本次审计只检查 Final Release 后当前实现与 Prototype / Figma 视觉参考之间的差距，不修改业务代码。

已检查：

- `docs/05-Prototype/figma-links.md`
- `docs/05-Prototype/Prototype-Status.md`
- `docs/08-Development/prototype-implementation-status.md`
- `docs/08-Development/sprint-14-plan.md`
- Today Dashboard / Today Plan Detail / Today Plan Edit
- Workout Session Runtime / Pause / Rest
- Workout Template List / Detail
- Exercise Library
- Workout History

## Overall Finding

Sprint 7 到 Final Release 后，主要产品链路已经成立：

- Today 可以添加多个今日训练计划。
- 同一模板同日去重由 Today Plan 能力承载。
- 今日训练计划卡片可以进入独立详情 / 编辑，不会修改原模板。
- 开始训练会进入 Workout Session。
- 完成后的计划卡片显示为已完成且不可再次开始。
- Workout Runtime 已具备暂停、继续、上一动作、下一动作和休息状态。
- Exercise Library 已具备左侧肌群、上方器械筛选、双列动作卡片和离线占位图。
- History 已具备月份切换、日期选择、当天肌群标签和日期下钻列表。

当前差距主要集中在视觉精修、真机验证、媒体资源授权和部分后续能力边界，不是数据库或核心架构阻塞。

## Gap List

| ID | Prototype / Figma Page | Current Implementation | User Impact | Risk | Priority | Independent Task |
| --- | --- | --- | --- | --- | --- | --- |
| G-01 | P001 Today / 添加计划 Modal | 已有 `TodayPlanPickerModal` 和 `+ 添加计划` 入口，但仍需真机确认底部弹层高度、遮罩、选中态和 Figma 视觉一致性。 | 用户能完成添加，但视觉可能不像原型。 | 低；不应改 TodayPlan 领域规则。 | P1 | Yes, S14-02 |
| G-02 | P001 Today / 训练计划卡片 | 当前卡片已支持点击进入 Today Plan、右侧开始/继续/已完成状态；需要真机确认触控区域与 Figma 卡片密度。 | 轻微影响可感知完成度。 | 低；交互已具备。 | P1 | Yes, S14-02 |
| G-03 | P004 Workout / 进行训练页 | 已有动作名、组数、次数、暂停、上一动作、下一动作、语音反馈；仍需对齐 Figma 的全屏暗色构图、动作图片展示比例和底部控制间距。 | 陪练体验视觉质感不足。 | 中；不能破坏 Runtime 状态机。 | P1 | Yes, S14-03 |
| G-04 | P005 Rest Timer / 休息页 | 已有 `RestingWorkoutState`、倒计时、跳过休息、下一组卡片；下一组缩略图目前使用文字占位，不是动作图片。 | 休息页信息完整，但视觉不够接近 Figma。 | 中；不能改变 RestTimer 持久化事实。 | P1 | Yes, S14-03 |
| G-05 | P007 Exercise Library / 动作库 | 左侧肌群和上方器械筛选已实现；自定义动作入口当前显示“暂不支持”；动作图片使用离线占位图。 | 浏览体验可用，但真实动作识别度不足。 | 中；图片资源授权和包体积需要决策。 | P2 | Yes, S14-04 |
| G-06 | P007 Exercise Detail / 动作详情 | 详情页存在，但需要与 Figma 讲解图片、说明排版和属性展示做视觉复核。 | 影响学习动作的清晰度。 | 中；不能运行时依赖 GitHub。 | P2 | Yes, S14-04 |
| G-07 | P008 History / 历史日历 | 月份切换、日期点击、肌群标签、当天训练列表已实现；剩余是 Figma 视觉密度和历史修正标记。 | 核心历史查询可用，精细统计可信度待增强。 | 中；修正记录涉及历史事实边界。 | P2 | Sprint 15+ |
| G-08 | P009 Settings | Companion Settings 已有，完整系统设置、默认休息/重量步进、导出/清除数据、版本/许可页未完整实现。 | 用户可配置项不足。 | 中；清除数据和导出需要严格保护。 | P2 | Sprint 15+ |
| G-09 | P010 Onboarding | 已有基础 Onboarding gate；权限解释、样例模板预览确认和首次训练入口仍不完整。 | 新用户上手仍偏硬。 | 低到中；不应引入账户或云。 | P2 | Sprint 15+ |
| G-10 | P011 Voice Coach | Mock auto rep 与事件源链路已完成；真实 Voice Engine / TTS 状态页未实现。 | 当前可模拟免点击训练，但不是真实语音陪练。 | 高；需平台权限、降级策略和测试边界。 | P3 | Sprint 15+ |

## Architecture Notes

- 未发现需要修改 Schema / Migration 才能继续 S14-00 到 S14-04 的阻塞问题。
- Today Plan、Workout Session、RestTimer、Runtime Snapshot 的职责边界仍清晰。
- 当前 Workout UI 调整必须保持 Event Source Architecture：UI 不应直接伪造 `WorkoutSet` 或绕过 Application Flow。
- Exercise Library 图片方案不能运行时读取 GitHub，也不能引入授权不明的第三方素材。

## Documentation Notes

- `docs/08-Development/prototype-implementation-status.md` 中 P007 仍写有“左侧肌群分类、右侧器械分类缺失”，但当前代码已经实现该结构。后续应在 S14-04 或 Sprint Exit 中同步该状态。
- P005 的 Rest Timer 文档仍可保留为视觉差距，因为当前实现有功能但图片和视觉布局尚未完全对齐 Figma。

## Recommended Next Task

下一步建议执行：

`tasks/sprint-14-post-release-ux-polish/S14-01-device-smoke-test-and-runtime-regression.md`

原因：

- 先确认 Final Release 后核心训练链路在 Expo / 真机环境稳定。
- 避免在视觉精修前把已有 Runtime / Today Plan 行为改坏。
- S14-02 和 S14-03 的 UI 修正应以 S14-01 回归结果为基线。

## Acceptance Criteria Result

- Figma Gap Audit Report 已生成：PASS
- 每个差距包含 Prototype / Figma、当前状态、用户影响、风险、优先级和独立任务适配性：PASS
- 明确下一项可执行 Sprint 14 任务：PASS
- 未修改业务代码：PASS
