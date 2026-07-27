# Sprint 8 - Product Experience Completion

状态：Done

## 目标

在不破坏 Sprint 5 Runtime、Sprint 6 数据集能力和 Sprint 7 陪练绑定的前提下，
补齐当前产品体验与 Prototype 的主要差距。

## 执行顺序

- [x] `S8-00-sprint-readiness-and-prototype-sync.md`
- [x] `S8-01-today-plan-experience.md`
- [x] `S8-02-template-detail-and-edit-flow.md`
- [x] `S8-03-exercise-library-figma-alignment.md`
- [x] `S8-04-history-calendar-and-drilldown.md`
- [x] `S8-05-workout-rest-summary-alignment.md`
- [x] `S8-06-settings-and-onboarding-baseline.md`
- [x] `S8-07-sprint-exit-review.md`

每个任务必须完成实现、定向测试、Self Review 和 Validation 后才能进入下一项。

## Sprint 非目标

- 完整 AI Coach
- 真实 Voice Engine
- Camera / Pose Detection
- 用户自定义动作
- 云账号、订阅、远程同步
- 修改 WorkoutSession / Runtime 核心状态机

## 约束

- 保持 UI → Application → Domain → Repository → Database 边界
- 不绕过 Repository 直接访问 SQLite
- 不修改历史训练事实
- 不把设计对齐变成重构全部页面
