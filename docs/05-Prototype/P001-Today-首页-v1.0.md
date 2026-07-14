
# P001 - Today 首页

Version: v1.0  
Status: Draft（Prototype Review）  
Owner: Product Owner  
Last Updated: 2026-07-14

Related Documents:

- PRD
- Domain Model
- Design System
- P003 开始训练

---

# 1. 页面目标（Page Goal）

Today 是应用默认首页，也是整个 App 的训练入口。

**唯一核心目标：帮助用户在最短时间内开始今天的训练。**

页面优先级：

1. 开始训练
2. 恢复未完成训练
3. 今日训练建议
4. 建议挑战
5. 最近训练
6. 本周统计

Today 不是数据分析页，也不是社区页。

---

# 2. 用户故事（User Story）

作为一名健身房力量训练用户，

我希望打开 App 后立即知道今天练什么，

并且能够快速开始训练，

从而把注意力放在训练，而不是寻找入口。

---

# 3. 用户入口（Entry）

进入方式：

- App 冷启动
- App 热启动
- 完成首次引导后
- 完成一次训练后返回首页

退出方式：

- 开始训练
- 查看历史
- 查看模板
- 查看设置

---

# 4. 页面布局（Layout）

```
Greeting

↓

今日训练（Primary）

↓

继续训练（有未完成训练时显示）

↓

今日建议

↓

建议挑战

↓

最近训练

↓

本周统计
```

原则：

- 第一屏只放训练相关内容。
- 一个页面只有一个 Primary Button。

---

# 5. 页面组件（Components）

## Greeting

显示：

- 上午 / 下午 / 晚上
- 用户昵称

例如：

> 晚上好，Michael

---

## 今日训练卡片

显示：

- 模板名称
- 动作数量
- 预计训练时间

Primary Button：

> 开始训练

---

## 恢复训练卡片（条件显示）

仅存在 in_progress Session 时显示。

内容：

- 模板名称
- 已完成动作
- 开始时间

按钮：

> 继续训练

---

## 今日建议

展示系统推荐今天训练哪个模板。

若无推荐，则显示：

> 请选择一个训练模板开始训练。

---

## 建议挑战

示例：

动作：

杠铃卧推

建议：

82.5 kg × 8–10 次

原因：

上次完成全部目标组。

---

## 最近训练

显示：

- 最近一次训练名称
- 日期
- 时长

点击进入训练详情。

---

## 本周统计

仅显示：

- 本周训练次数
- 连续训练天数

V1 不展示复杂图表。

---

# 6. 页面交互（Interactions）

点击：

开始训练

→ 创建 Session
→ 跳转 P003

点击：

继续训练

→ 恢复进行中的 Session

点击：

最近训练

→ 打开训练详情

点击：

建议挑战

→ 不自动修改重量，仅查看说明。

---

# 7. 页面状态（States）

## Loading

显示骨架屏。

## Empty

首次安装：

显示：

欢迎使用 Fitness Tracker

创建一个训练模板开始训练。

按钮：

创建训练模板

## Normal

展示所有可用信息。

## Resume

存在进行中的训练。

恢复训练卡片提升到页面顶部。

## Error

读取失败：

提示：

数据读取失败，请下拉刷新。

---

# 8. 数据依赖（Data Dependency）

页面依赖：

- WorkoutTemplate
- WorkoutSession
- Recommendation
- DailyStatus

Prototype 只引用领域对象，不描述数据库。

---

# 9. Source of Truth

| 页面信息 | 来源 |
|-----------|------|
| 今日训练 | WorkoutTemplate |
| 继续训练 | WorkoutSession |
| 今日建议 | Recommendation |
| 今日状态 | DailyStatus |
| 最近训练 | WorkoutSession |

---

# 10. 页面跳转

Today →

- P003 开始训练
- 历史详情
- 设置
- 模板管理

训练完成：

P006 →

Today

---

# 11. 边界情况（Edge Cases）

- 存在未完成训练时，不鼓励创建新的训练。
- 没有模板时，引导创建模板。
- Recommendation 不存在时，不显示建议挑战。
- DailyStatus 为正常时，不显示状态提醒。

---

# 12. Design Decisions

为什么首页没有复杂统计？

因为首页目标是：

> 开始训练。

为什么只有一个 Primary Button？

避免训练开始前产生选择成本。

为什么恢复训练优先？

避免误创建新的 Session。

---

# 13. 验收标准（Acceptance Criteria）

- 打开 App 3 秒内可开始训练。
- 未完成训练可恢复。
- 没有模板时有明确引导。
- 建议挑战不会自动修改用户数据。
- 首页只有一个 Primary Button。

---

# 14. V1 暂不实现

- AI 教练
- Apple Watch
- 华为健康同步
- 自定义首页
- 复杂趋势图
- 社区内容
- 成就系统
