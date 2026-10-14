# Sprint 17 - Public Content Admin

状态：实现基线已确定，生产持久化与认证接入进行中

目标：

建立独立的公共内容管理后台，用于维护动作库和公共训练模板。
本 Sprint 不引入用户账号、云同步或训练历史云端存储。

任务：

- [x] S17-00 公共内容后台范围与架构决策（实现基线已确定）
- [x] S17-01 Admin Web 与 API 基础设施（本地 PostgreSQL 连接与迁移基线已完成）
- [x] S17-02 公共动作库管理（内存与 PostgreSQL 适配器、权限与审计已完成）
- [x] S17-03 公共模板管理与发布（内存与 PostgreSQL 适配器、权限与审计已完成）
- [x] S17-04 管理员认证、角色与审计（JWT 适配器、RBAC、PostgreSQL 审计查询已完成）
- [ ] S17-05 Sprint Exit Review

Exit Review：见 `S17-05-sprint-exit-review.md`。

明确边界：

- 后台不得直接访问移动端 SQLite。
- 后台不得修改用户 WorkoutSession 或 WorkoutSet。
- 模板发布必须使用版本或快照语义，不得改写用户历史训练。
- 移动端继续支持离线训练。
- 用户账号与移动端同步不属于本 Sprint。

前置决策：

- 服务端技术栈与部署方式
- 服务端数据库
- 公共内容 API 版本
- 管理员认证方式
- 动作媒体授权和发布审核规则
