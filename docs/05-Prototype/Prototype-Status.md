# Prototype Status

## 说明

Prototype 定义产品页面、用户体验和交互。

Sprint 定义工程交付阶段。

二者关系：

Prototype → Use Case → Domain → Repository → UI

Prototype 编号不等于 Sprint 编号。

---

# 当前 Prototype 实现状态

| Prototype             | Sprint来源 | 状态     | 说明                                             |
| --------------------- | ---------- | -------- | ------------------------------------------------ |
| P001 Today            | Sprint 4/6 | 部分完成 | 基础页面存在，缺 DailyStatus、本周概览、推荐展示 |
| P002 Workout Template | Sprint 3   | 基本完成 | 创建、编辑、排序、归档能力已实现                 |
| P003 Start Workout    | Sprint 4   | 部分完成 | 开始训练流程存在，缺训练前预览增强               |
| P004 Workout          | Sprint 4/5 | 核心完成 | Workout Runtime 主流程已完成                     |
| P005 Rest Timer       | Sprint 4/5 | 部分完成 | 基础计时完成，缺暂停、延长、跳过等完整交互       |
| P006 Workout Summary  | Sprint 4/6 | 部分完成 | 基础总结完成，缺 PR、备注、详情分析              |
| P007 Exercise Library | Sprint 2/6 | 部分完成 | 基础动作库存在，需要真实数据、图片、详情增强     |
| P008 History          | Sprint 4/6 | 部分完成 | 已有训练记录，需要日历、趋势、统计               |
| P009 Settings         | 后续       | 未开始   | 当前为占位能力                                   |
| P010 Onboarding       | 后续       | 未开始   | 未建立完整流程                                   |
| P011 Voice Coach      | Sprint 7   | 规划中   | 基于 Companion Event 接入语音反馈                |
| P012 Exercise Detail  | Sprint 6   | 规划中   | 从 P007 Exercise Library 拆出的详情能力          |
| P013 AI Coach         | Sprint 8   | 规划中   | AI 训练辅助入口                                  |

---

## 原则

Prototype 描述产品体验。

Sprint 描述工程实现阶段。

不要根据 Prototype 编号判断开发顺序。
