# Roadmap

版本：v1.1
状态：开发中（Active）
负责人：Product Owner

---

# Project Vision

打造面向健身房力量训练用户的个人训练助手。

目标：

- 记录训练数据
- 辅助完成训练流程
- 提供实时训练反馈
- 帮助用户长期管理训练计划

产品方向：

从「训练记录工具」逐步升级为「训练陪练助手」。

---

# 里程碑 0：项目基础（✅ 已完成）

完成：

- [x] 产品愿景（Vision）
- [x] 项目宪章（Constitution）
- [x] 产品需求文档（PRD）
- [x] 系统架构（Architecture）
- [x] 领域模型（Domain Model）
- [x] 原型（P001--P010）
- [x] 数据库设计（Database Design）
- [x] Design System
- [x] 开发指南（Development Guide）
- [x] AGENTS.md
- [x] Sprint 开发流程

---

# Sprint 1（✅ 已完成）

完成时间：2026-07-15

Tag：sprint-1

## 工程基础 Project Foundation

完成：

- Monorepo 工作区
- Expo 移动端基础
- CI 配置
- 项目规范
- 基础架构

---

# Sprint 2（✅ 已完成）

完成时间：2026-07-16

Tag：sprint-2

Release：Sprint 2：动作库

Exit Review：PASS

## Exercise Domain

完成：

- Exercise Domain Model
- 动作分类
- 器械分类
- 肌群分类
- 动作 Seed 数据
- 动作查询能力

---

# Sprint 3（✅ 已完成）

## 训练模板（Workout Templates）

完成时间：2026-07-16

Tag：final-release

Release：待创建

Exit Review：PASS WITH WARNINGS

完成：

- 训练模板创建
- 模板编辑
- 模板归档
- 动作选择
- 训练计划基础能力

---

# Sprint 4（✅ 已完成）

## Workout Flow

完成训练生命周期闭环：

    Template
        ↓
    Create Session
        ↓
    Today Dashboard
        ↓
    Workout Execution
        ↓
    Rest Timer
        ↓
    Complete / Cancel
        ↓
    Summary
        ↓
    History

完成：

- [x] 今日训练（Today Dashboard）
- [x] 开始训练
- [x] 训练执行
- [x] 休息计时器
- [x] 训练总结
- [x] 恢复训练
- [x] 取消训练处理

### Sprint 4 Exit Review

状态：

- PASS WITH WARNINGS

完成内容：

- 完成 Workout Session 生命周期闭环
- 支持训练执行、恢复、完成、取消
- 支持训练总结 Summary
- 支持 History 历史记录入口
- 保持 UI → Application → Domain → Repository 架构边界

验证：

- 28 suites / 340 tests PASS

---

# Sprint 5（✅ 已完成）

## Workout Companion Runtime

目标：

从"训练记录工具"升级为"训练陪练助手"。

完成：

- [x] Workout Runtime Engine
- [x] Workout Feedback Events
- [x] Workout Voice Feedback Contract
- [x] Workout Runtime UI Integration
- [x] Workout Runtime Persistence
- [x] Workout Companion Runtime Flow
- [x] Workout Companion UI Runtime Binding
- [x] Runtime Recovery Fix
- [x] Sprint 5 Exit Review

完成时间：2026-07-23

Exit Review：PASS WITH WARNINGS

Tag：sprint-5-workout-companion-runtime

Release：Sprint 5 发布：训练运行时与陪练事件架构

## S5-01 Workout Runtime Engine（✅ 已完成）

实现：

- 训练运行状态
- 当前动作管理
- 当前 Set 管理
- Runtime 状态转换
- 当前动作、Set 和 Rep 进度

## S5-02 Workout Feedback Events（✅ 已完成）

实现：

- 次数反馈事件
- Set 完成事件
- Exercise 完成事件
- 事件与真实 WorkoutSet / SessionExercise 事实边界

## S5-03 Workout Voice Feedback（✅ 已完成）

实现：

- 开始训练播报
- 次数播报
- 组完成播报
- 休息提醒
- 语音输出失败不影响训练持久化

## S5-04 Workout Runtime UI Integration（✅ 已完成）

实现：

- Workout Runtime 与现有 Workout Session UI 状态集成
- Runtime 状态作为训练界面状态来源
- 暂停、继续和恢复边界

## S5-05 Workout Runtime Persistence（✅ 已完成）

实现：

- Runtime Snapshot 持久化与验证
- running / paused 状态恢复
- RestTimer 状态优先级
- 无效 Snapshot 拒绝与恢复边界

## S5-06 Workout Companion Runtime Flow（✅ 已完成）

实现：

- Rep 进度与当前 Exercise / Set 管理
- 目标 Rep 达成后调用真实 WorkoutSet 持久化流程
- SetCompleted / ExerciseCompleted 事实边界
- `set_completion_pending` 和 `exercise_completion_pending`
- Runtime Instance 级 Set completion 并发保护

## S5-07-R0 Workout Companion Specification Alignment（✅ 已完成）

实现：

- Companion Event Contract
- Companion Event Source 生命周期
- `sessionExerciseId` 事件边界
- Runtime 六个 phase 的 UI 行为
- P004 与 Workout UI 规范对齐

## S5-07 Workout Companion UI Runtime Binding（✅ 已完成）

实现：

- 绑定受控 `WorkoutCompanionEventSource`
- 验证并串行处理 `RepCompleted`
- 将 Runtime phase、动作、Set、Rep 和教练反馈映射到 Workout Session UI
- 复用现有暂停、恢复、RestTimer、持久化和 Summary Flow
- 不实现 Voice Engine、Camera、Pose Detection 或 AI

## S5-07-R1 Workout Companion Runtime Recovery Fix（✅ 已完成）

实现：

- resting 阶段真实倒计时展示
- Set、RestTimer、Exercise 和 Session completion pending 失败恢复
- Runtime/Session 替换时的 Event Source 生命周期安全
- pending 状态事件拒绝与可重试持久化

## S5-08 Sprint 5 Exit Review（✅ 已完成）

验证：

- 34 suites / 442 tests PASS

说明：

Sprint 5 完成训练陪练运行时基础能力。

不包含：

- Camera Pose Detection
- AI 自动分析
- 正式 Auto Rep Counter

---

# Sprint 6（✅ 已完成）

## Product Experience Completion

完成时间：2026-07-23

Exit Review：PASS WITH WARNINGS

Tag：待创建

Release：待创建

已完成：

- [x] S6-01 Documentation and Sprint Readiness
- [x] S6-02 Exercise Dataset Contract and Schema
- [x] S6-03 Exercise Dataset Import
- [x] S6-04 Exercise Library and Detail
- [x] S6-05 History and Analytics
- [x] S6-06 Today Experience
- [x] S6-07 Design System Integration
- [x] S6-08 Sprint Exit Review

Sprint 6 未包含：

- AI 模型
- 摄像头识别
- 自动 Rep Counter 正式接入
- 用户自定义动作

Sprint 6 合并后 Human Review 确认存在 Figma 交互偏差。

处理方式：

- 不回改 Sprint 6 完成记录。
- 作为 Sprint 7 前置任务 `S7-00 Figma Product Alignment` 执行。

S7-00 开始前确认：

- Today “训练计划”表示今天添加的计划，不是全部模板列表。
- 今日计划卡片主体进入本次训练预览/调整页。
- 今日计划开始按钮进入训练页；完成后显示“已完成”且不可再次开始。
- Exercise Library 只对齐 Figma 浏览布局，自定义动作留到未来版本。
- History 需要 Figma 月历交互。
- Workout 需要 Figma running / paused / resting 状态对齐。

---

# Sprint 7（✅ 已完成）

## Workout Companion Expansion

完成时间：2026-07-27

Exit Review：PASS WITH WARNINGS

Tag：sprint-7

Release：Sprint 7 发布：训练陪练扩展

目标：

增强训练陪练能力。

已完成：

- [x] S7-00 Figma Product Alignment
- [x] S7-01 Voice Coach Runtime Control
- [x] S7-02 Auto Rep Counter Source Interface

进行中 / 待执行：

- [x] S7-03 Companion Event Source Selection
- [x] S7-04 Mock Auto Rep Runtime Binding
- [x] S7-05 Companion Settings Prototype
- [x] S7-06 Sprint 7 Exit Review

目标：

让用户训练过程中减少手机操作，获得实时反馈。

Sprint 7 范围：

- 保持 Sprint 5 Runtime 状态机和 Snapshot Recovery 兼容。
- 保持 Event Source Architecture。
- 只接入 Mock Auto Rep Source，不实现 Camera、Pose Detection、Voice
  Recognition 或 AI 模型。
- Voice Coach 仅提供运行页开关和现有反馈事件输出控制。
- Companion Settings 当前只做本地会话/原型级设置，不引入账号、云同步或订阅。

Sprint 7 退出条件：

- Workout 页面可在 Figma 对齐后的 UI 中选择 Mock 输入源。
- Mock 输入源产生的 RepCompleted 通过现有 validation 和 Runtime Flow。
- 用户可以关闭语音教练，关闭后不调用 voice adapter。
- 所有训练事实仍通过 Application → Domain → Repository → Database。
- 完整 validation 通过，并生成 Sprint 7 Exit Review。

Sprint 7 完成后 Human Review 确认仍有非阻塞 warning：

- `use-workout-session-screen.ts` 保留 5 条 hook dependency warning。
- GitHub-hosted CI 未在本次收口中重新验证。

处理方式：

- 不回改 Sprint 7 完成记录。
- 作为后续 Sprint 或独立技术债处理。

---

# Sprint 8（✅ 已完成）

## Product Experience Completion

完成时间：2026-07-27

Exit Review：PASS WITH WARNINGS

Tag：待创建

Release：待创建

目标：

把当前已完成的训练主干补成可稳定使用的产品体验，优先收口
Today、模板详情/编辑分流、动作库、历史、总结、Settings 和 Onboarding。

用户价值：

- 更接近真实可用的训练 App
- 减少“功能存在但体验不完整”的摩擦
- 为后续 Voice / AI 打好一致的产品界面基础

涉及范围：

- P001 Today 的计划与入口体验
- P002 训练模板详情与编辑分流
- P005 Rest Timer 的视觉与交互收口
- P006 Workout Summary 的总结信息补齐
- P007 Exercise Library 的 Figma 对齐
- P008 History 的日历与日期钻取
- P009 Settings 的基础设置体验
- P010 Onboarding 的首次引导基础流程

完成：

- [x] S8-00 Sprint Readiness and Prototype Sync
- [x] S8-01 Today Plan Experience
- [x] S8-02 Template Detail and Edit Flow
- [x] S8-03 Exercise Library Figma Alignment
- [x] S8-04 History Calendar and Drilldown
- [x] S8-05 Workout / Rest / Summary Alignment
- [x] S8-06 Settings and Onboarding Baseline
- [x] S8-07 Sprint Exit Review

Warnings：

- `use-workout-session-screen.ts` 仍保留 5 条既有 hook dependency warning。
- GitHub-hosted CI 未在本地 Exit Review 中验证。
- Settings 仍是基础能力，不包含完整数据导出、清除和许可页。
- Onboarding 已有基础流程，但权限说明、示例预览确认和首次训练分流仍需后续增强。

Sprint 8 非目标：

- 不实现完整 AI Coach
- 不实现真实 Voice Engine
- 不实现 Camera / Pose Detection
- 不新增云账号或订阅

## Sprint 9（✅ 已完成）

## Voice / TTS / Input Source Hardening

完成时间：2026-07-27

Exit Review：PASS WITH WARNINGS

Tag：待创建

Release：待创建

目标：

把陪练从模拟输入推进到真实输入源能力，但仍保持 Event Source Architecture。

完成：

- [x] S9-00 Sprint Readiness and Voice Scope Sync
- [x] S9-01 Voice Coach Contract and TTS Adapter
- [x] S9-02 Input Source Selection and Fallback
- [x] S9-03 Voice Feedback Runtime Binding
- [x] S9-04 Audio Permission and Lifecycle Guards
- [x] S9-05 Sprint Exit Review

Warnings：

- `use-workout-session-screen.ts` 仍保留 5 条既有 hook dependency warning。
- GitHub-hosted CI 未在本地 Exit Review 中验证。
- 真实 Voice Engine 未实现。
- 原生设备语音和长流程 smoke test 未执行。

Sprint 9 非目标：

- 不实现 Camera / Pose Detection
- 不实现真实动作识别模型
- 不实现完整 AI Coach
- 不新增云同步或账号系统

## Sprint 10（✅ 已完成）

## History and Analytics Enhancement

完成时间：2026-07-27

Exit Review：PASS WITH WARNINGS

Tag：待创建

Release：待创建

目标：

把历史从记录页升级成训练回顾页。

完成：

- [x] S10-00 Sprint Readiness and History Scope Sync
- [x] S10-01 History Metrics Contract
- [x] S10-02 History Session Detail
- [x] S10-03 Personal Record and Trend Baseline
- [x] S10-04 Summary and History Metric Alignment
- [x] S10-05 History Calendar UX Hardening
- [x] S10-06 Sprint Exit Review

非目标：

- 不实现完整 AI Coach
- 不实现 Recommendation 自动改计划
- 不修改 Workout Runtime 主状态机
- 不修改 WorkoutSet 历史事实

风险：

- 查询口径不一致
- 性能和统计一致性

Warnings：

- `use-workout-session-screen.ts` 仍保留 5 条既有 hook dependency warning。
- GitHub-hosted CI 未在本地 Exit Review 中验证。
- 历史纠错仍未实现。
- 原生设备长流程 smoke test 未执行。

## Sprint 11（✅ 已完成）

## AI Coach / Recommendation Foundation

完成时间：2026-07-27

Exit Review：PASS WITH WARNINGS

Tag：待创建

Release：待创建

目标：

先落 Recommendation 和 Coach Decision Layer，不急着上完整 AI。

完成：

- [x] S11-00 Sprint Readiness and AI Scope Sync
- [x] S11-01 Recommendation Contract
- [x] S11-02 Coach Decision Layer
- [x] S11-03 Recommendation Preview and Explanation
- [x] S11-04 Training Recommendation Entry
- [x] S11-05 Sprint Exit Review

风险：

- 过早自动化会和产品原则冲突
- “建议”与“事实”边界必须非常清楚

Warnings：

- GitHub-hosted CI 未在本地 Exit Review 中验证。
- P013 AI Coach 仍然只是 foundation，不包含完整 AI 推理或自动化改计划。

## Sprint 12（✅ 已完成）

## Product Alignment and Release Hardening

完成时间：2026-07-27

Exit Review：PASS WITH WARNINGS

Tag：待创建

Release：待创建

目标：

把现有原型差距和关键交互偏差收口到更接近可交付的状态。

完成：

- [x] S12-00 Sprint Readiness and Gap Sync
- [x] S12-01 Today Plan and Entry Alignment
- [x] S12-02 Template Detail and Edit Flow Alignment
- [x] S12-03 Exercise Library Layout Alignment
- [x] S12-04 History Calendar and Drilldown Alignment
- [x] S12-05 Workout / Rest / Summary UI Alignment
- [x] S12-06 Settings and Onboarding Polish
- [x] S12-07 Sprint Exit Review

风险：

- 多页面并行对齐容易引入回归
- 体验修正容易被误扩成新需求
- 文档和实现收口要保持同步

Warnings：

- Sprint 12 本地质量门通过，但存在既有技术债与后续 Release 验证需求。
- 最终 Release 仍需真机回归与交付收口。

## Sprint 13（✅ 已完成）

## Release Hardening

目标：

把当前产品推进到 Final Release 所需的验证、技术债收口和交付材料准备。

完成时间：2026-07-27

Exit Review：PASS WITH WARNINGS

Tag：待创建

Release：待创建

完成：

- [x] S13-00 Release Readiness and Debt Sync
- [x] S13-01 Hook Warning Triage
- [x] S13-02 Recommendation Warning Cleanup
- [x] S13-03 Release Verification and CI Review
- [x] S13-04 Tag / Release / Changelog Preparation
- [x] S13-05 Final Release Review

风险：

- 真机验证与桌面验证可能不一致
- 发布收口容易被误扩成新功能
- 技术债修复可能影响既有测试稳定性

Warnings：

- 最终 Release 仍依赖真机回归与发布证据链。
- GitHub-hosted CI 仍需后续实证确认。

## Final Release（📦）

## Release Readiness

目标：

把产品从“功能完成”推进到“可交付”。

内容：

- 真机回归
- CI 复核
- 性能与崩溃边界检查
- 文档最终对齐
- Tag / Release / Changelog

风险：

- 不是功能风险，而是交付风险

当前状态：

- 发布材料已准备。
- 本地/远端 tag：`final-release`
- 正式对外发布动作待执行。

---

# Long Term Vision

最终目标：

成为力量训练用户的个人 AI 健身助手。

核心能力：

    训练计划
        ↓
    实时陪练
        ↓
    训练记录
        ↓
    数据分析
        ↓
    个性化建议
