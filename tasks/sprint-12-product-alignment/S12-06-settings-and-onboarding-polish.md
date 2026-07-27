# S12-06 Settings and Onboarding Polish

状态：Done

## 目标

完善基础设置和首次引导体验，使入口和状态更清楚。

## 范围

- Settings 基础入口收口。
- Onboarding 首次流程梳理。
- 状态持久化可用性确认。

## 验收标准

- 设置入口行为稳定。
- 首次引导不阻塞主流程。
- 文案与状态一致。

## 完成记录

### 结论

Settings 和 Onboarding 的基础体验已稳定：

- Settings tab 入口可打开 Companion 设置页面
- Companion 设置页可切换语音与输入源状态
- Onboarding 可从首次进入完成、跳过或继续
- Onboarding 状态通过 UserSetting 持久化

### 测试

- `pnpm --filter mobile test -- workout-companion-settings-screen onboarding-screen onboarding-state --watchAll=false`: PASS
- `pnpm --filter mobile typecheck`: PASS

