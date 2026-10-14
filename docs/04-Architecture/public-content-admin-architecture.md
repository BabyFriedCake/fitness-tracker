# 公共内容管理后台架构决策

状态：Proposed - implementation baseline
版本：v1.0
适用范围：Sprint 17 公共动作库与公共训练模板管理

## 决策

公共内容后台采用独立应用边界：

Admin Web → Admin API → Server Database

移动端继续使用本地 SQLite。移动端后续只通过版本化 Public Content API 获取已发布内容，
不直接访问后台数据库，也不把后台作为训练过程的运行时依赖。

## 范围

第一阶段只管理公共内容：

- Exercise
- WorkoutTemplate
- TemplateExercise 配置
- 媒体元数据和授权记录
- 发布与下线状态

第一阶段不管理：

- 用户账号和登录
- 用户 WorkoutSession
- 用户 WorkoutSet
- 用户本地模板
- 训练同步、订阅和 AI 推荐

## 内容版本规则

1. 后台编辑的是内容草稿，不直接修改已发布版本。
2. 发布操作生成不可变的内容版本号。
3. 移动端只消费 published 版本。
   公共模板只有在其引用的全部 Exercise 也处于 published 状态时才可进入公共快照。
4. 下线只影响未来获取或刷新，不删除移动端已有本地数据。
5. 公共模板生成 WorkoutSession 时，必须复制为 Session 快照。
6. 已创建的 WorkoutSession、WorkoutSet 不因公共模板后续发布而变化。

建议状态：

- draft
- review
- published
- archived

非法状态转换必须由 API 拒绝并记录审计事件。

## 数据边界

公共内容字段可以与移动端 Domain 对齐，但服务端 DTO 必须独立版本化。
不得把 SQLite row 或内部数据库字段直接暴露为公共 API 契约。

所有公共内容写操作必须包含：

- actorId
- action
- resourceType
- resourceId
- beforeVersion
- afterVersion
- createdAt

## 离线原则

- 移动端已有本地内容和训练流程不依赖 API 在线。
- API 不可用时，动作库继续展示最近一次本地内容。
- 同步失败不得删除本地内容。
- 本 Sprint 不实现账号登录，因此不上传用户训练事实。

## 技术边界

当前实施基线采用 Fastify + PostgreSQL + 可替换 JWT/OIDC 认证适配器。
认证供应商仍不在 API 代码中硬编码，部署凭据通过环境变量提供。
无论后续是否替换技术实现，都必须满足：

- TypeScript strict
- API 与数据库分层
- 服务端输入运行时校验
- 数据库迁移可回滚
- API 集成测试和权限测试
- 本地开发可重复启动

### 数据库实施基线

- PostgreSQL 仅存储公共 Exercise、公共 WorkoutTemplate、版本和审计事件。
- 迁移使用事务，并保持 `published` 版本不可变。
- 任何数据库不可用都不能影响移动端本地训练。
- 当前个人开发环境允许继续使用内存适配器运行契约测试；生产启动不得默认回退到内存存储。

## 风险与未决事项

- 公共内容 API 的部署环境尚未确定。
- 管理员认证提供方尚未确定。
- 现有 Personal Use 媒体授权不能直接支持公开分发，发布前必须重新审核。
- 移动端内容同步属于后续 Sprint，不在 S17-01 中提前实现。
