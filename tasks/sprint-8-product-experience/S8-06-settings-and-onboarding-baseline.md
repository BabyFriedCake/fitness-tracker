# S8-06 Settings and Onboarding Baseline

状态：Done

## 目标

把 Settings 和 Onboarding 的基础体验补到可进入后续能力扩展的状态。

## 范围

- Settings 基础入口与结构
- Onboarding 基础引导流
- 与当前会话级设置和首次启动流程对齐

## 不做

- 不做账号体系
- 不做云同步
- 不做完整 AI 计划

## 验收标准

- Settings 有清晰入口和基本结构
- Onboarding 有可完成的首次引导流程
- 不破坏已有训练入口

## 测试要求

- Settings 页面测试
- Onboarding 页面测试
- 首次启动导航测试

## 完成记录

- 使用现有 `user_settings` 表保存 onboarding 状态，不新增 Migration。
- 新增首次启动 Onboarding route 和导航 gate。
- Settings 保留现有会话级 Companion 设置入口，未扩大到账号、云同步或完整数据管理。
- 已补充 UserSetting Repository、Onboarding 状态和 Onboarding 页面测试。
