# S17-04 管理员认证、角色与审计

状态：JWT 适配器、RBAC、审计写入与查询已完成，生产 OIDC/JWKS 配置待完成

## 目标

为公共内容后台定义可替换的管理员身份、角色授权和审计边界，
不把具体认证供应商或服务端数据库未经评审地写入业务代码。

## Scope

只实现（决策确认后）：

- Admin API 的认证端口和当前请求 actor 上下文
- 管理员角色与公共内容权限矩阵
- 写操作的审计事件契约
- 未认证、无权限请求的稳定错误响应
- 可替换的认证、授权和审计适配器
- 认证、权限和审计的 API 测试

不实现：

- 用户注册、登录或移动端账号同步
- 用户 WorkoutSession、WorkoutSet 或训练历史云同步
- 移动端 SQLite、Schema 或 Migration
- 第三方认证供应商 SDK
- 生产数据库连接、部署和密钥管理
- 审计日志的长期存储实现，除非服务端数据库方案已批准

## 待确认决策

在实现前必须确认：

1. 管理员认证提供方：自建账号密码、Supabase Auth、Clerk 或其他方案。
2. 服务端数据库：PostgreSQL、SQLite 或其他方案。
3. 审计日志保留周期、访问范围和删除策略。
4. 是否允许先使用仅测试用的内存适配器验证端口契约。

## 建议的权限模型

角色先保持最小集合：

- `content_editor`：创建和编辑 `draft` 内容，提交审核。
- `content_reviewer`：审核并发布或退回内容。
- `content_admin`：归档内容、管理内容权限和查看审计记录。

所有写操作必须携带认证后的 `actorId`，并生成：

- `actorId`
- `action`
- `resourceType`
- `resourceId`
- `beforeVersion`
- `afterVersion`
- `createdAt`

## 当前实现状态

已将可注入的认证器、RBAC 和审计 Sink 接入 Admin API 写路由，并提供 `audit:read` 查询端点；
开发/测试可验证未认证、无权限和审计行为。认证适配器支持测试内存实现和
外部签发的 HS256 JWT；PostgreSQL 审计 Sink 已完成，但生产 OIDC/JWKS 签发方
和密钥轮换配置尚未接入。

## Acceptance Criteria

- [x] 认证、授权和审计均通过独立端口访问。
- [x] 未认证请求返回稳定 `UNAUTHENTICATED` 错误。
- [x] 无权限请求返回稳定 `FORBIDDEN` 错误。
- [x] Exercise 与 WorkoutTemplate 的所有写操作都执行权限检查（需注入认证器）。
- [x] 未认证或无权限写操作不会写入资源，并生成拒绝审计记录。
- [x] 审计事件不包含 WorkoutSet 或 WorkoutSession 数据。
- [x] 认证适配器可在不改业务路由的情况下替换。

## Stop Rule

如果认证提供方、服务端数据库或审计持久化策略仍未确认，
不得实现生产登录流程、数据库表或部署配置；只能完成本任务的契约和测试适配器。
