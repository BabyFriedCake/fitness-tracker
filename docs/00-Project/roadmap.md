# Roadmap

版本：v1.0  
状态：开发中（Active）  
负责人：Product Owner

## Project Vision

打造面向健身房力量训练用户的个人训练助手。

目标：

- 记录训练数据
- 辅助完成训练流程
- 提供实时训练反馈
- 帮助用户长期管理训练计划

---

## 里程碑 0：项目基础（✅ 已完成）

- [x] 产品愿景（Vision）
- [x] 项目宪章（Constitution）
- [x] 产品需求文档（PRD）
- [x] 系统架构（Architecture）
- [x] 领域模型（Domain Model）
- [x] 原型（P001–P010）
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
- 难度分类
- 肌群分类
- 动作 Seed 数据
- 动作查询能力

---

# Sprint 3（✅ 已完成）

## 训练模板（Workout Templates）

完成时间：2026-07-16

Tag：待创建

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

# Sprint 5（🚧 计划中）

## Workout Assistant

目标：

从"训练记录工具"升级为"训练陪练助手"。

重点：

让用户在健身房训练时，不需要频繁操作手机。

## S5-01 Workout Runtime Engine

实现：

- 训练运行状态
- 当前动作管理
- 当前 Set 管理
- Running / Paused / Completed 状态

## S5-02 Rep Counter Feedback

实现：

- 次数反馈事件
- Set 完成事件
- Exercise 完成事件

## S5-03 Voice Feedback Service

实现：

- 开始训练播报
- 次数播报
- 组完成播报
- 休息提醒

## S5-04 Workout Pause / Resume

实现：

暂停：

- Timer
- Voice
- Runtime

恢复：

- 当前动作
- 当前 Set
- 当前训练状态

## S5-05 Background Workout Runtime

实现：

- 切后台保持训练状态
- Timer 状态保持
- Runtime 恢复

## S5-06 Rest Timer Upgrade

升级：

- 自动休息
- 倒计时播报
- 延长休息
- 跳过休息
- 下一组提醒

## S5-07 Workout Assistant Settings

实现：

- 语音开关
- 播报频率
- 倒计时提醒
- 默认休息时间

## S5-08 Sprint 5 Exit Review

---

# Sprint 6（📋 计划）

## Exercise Library & History

目标：

增强长期使用能力。

内容：

## Exercise Library Upgrade

接入真实动作库：

- 开源动作数据
- 数据清洗
- 字段映射
- 图片资源
- 动作说明

## History Enhancement

实现：

- 完整训练历史
- 训练详情
- 数据查看

## Statistics

实现：

- 总训练次数
- 总训练量
- 动作趋势

---

# Sprint 7（📋 计划）

## Personalization

目标：

让 App 根据用户训练习惯提供帮助。

内容：

- 重量建议
- 渐进超负荷
- 训练调整
- 周期计划优化

---

# Sprint 8（📋 计划）

## Product Polish

内容：

- UI 优化
- 动作图片
- 动作动画
- 用户体验优化
- 发布准备

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
