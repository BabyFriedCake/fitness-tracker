# Sprint 17 Plan - Public Content Admin

状态：架构方案已提出，等待评审

## 产品目标

为个人 Fitness Tracker 建立独立的公共内容管理后台，集中维护标准动作和公共训练模板，
同时保持移动端 local-first 训练能力与历史训练事实不可被后台覆盖。

## 用户价值

- 动作库内容可以集中修正和维护。
- 公共模板可以经过审核后发布。
- 移动端不需要把公共内容维护逻辑写死在本地 seed 中。
- 训练过程和历史数据不因公共内容更新而改变。

## 架构边界

Admin Web → Admin API → Server Database → Published Public Content

Mobile App → Local SQLite
后续版本再通过版本化内容同步 API 连接公共内容。

Sprint 17 不实现移动端账号、云同步或用户训练历史上传。

## 实施顺序

1. S17-00 范围、状态模型、版本策略和授权决策。
2. S17-01 Admin Web、API、服务端数据库基础设施。
3. S17-02 Exercise 管理、媒体元数据和发布审核。
4. S17-03 WorkoutTemplate 管理、版本和发布。
5. S17-04 管理员认证、RBAC、审计日志。
6. S17-05 Sprint Exit Review。

当前进度：

- [x] 已完成公共内容后台边界草案。
- [x] 已提出版本化发布与移动端本地快照策略。
- [ ] S17-00 Product/Architecture Review。

## 主要风险

- 引入服务端可能削弱现有离线能力。
- 公共模板更新可能错误影响用户已有训练快照。
- 动作媒体的 Personal Use 授权不能直接推导出公开分发授权。
- 过早建立用户账号和同步，会扩大隐私、冲突解决和数据删除范围。

## Ready Gate

在 S17-00 评审通过前，不实现后台业务代码，也不修改移动端数据库。
