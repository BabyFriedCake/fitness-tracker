# S17-01 Admin Web 与 API 基础设施

状态：代码基线已完成，生产部署编排待完成

## 目标

建立公共内容后台的最小可运行基础设施，验证 Admin Web、Admin API 和服务端数据库之间的边界。

## Scope

只实现：

- 独立 Admin Web 应用骨架
- 独立 Admin API 应用骨架
- 服务端数据库连接和第一条迁移
- 健康检查接口
- API 错误格式与运行时输入校验基础
- 本地开发启动和测试命令

不实现：

- Exercise 业务 CRUD
- WorkoutTemplate 业务 CRUD
- 用户账号和登录
- RBAC 具体权限
- 移动端同步
- 修改 apps/mobile 业务代码、Schema 或 Migration

## 验收标准

- [x] Admin Web 与 Admin API 位于独立应用目录。
- [x] API 可通过健康检查确认服务端数据库可用。
- [x] 服务端迁移可重复执行且失败可回滚。
- [x] API 错误响应包含稳定 code、message 和 requestId。
- [x] 外部输入在进入领域逻辑前完成运行时校验。
- [x] Admin Web 只通过 API 访问数据，不直连数据库。
- [x] 移动端现有 format、lint、typecheck、test 不受影响。

## 测试要求

- API 健康检查集成测试。
- 数据库迁移成功、重复执行和失败回滚测试。
- 非法请求体返回稳定错误格式的测试。
- Admin Web 不直接导入数据库模块的边界检查。

## 当前实现状态

已完成 Admin Web、Admin API、健康检查、输入校验基础、事务化公共内容 SQL
迁移文件、迁移版本表、可注入迁移执行器、PostgreSQL 连接池工厂和公共动作
Repository 适配器。API 启动已支持 `DATABASE_URL`：配置后执行迁移并使用 PostgreSQL
Repository；配置数据库时健康检查会执行 `SELECT 1`，生产环境缺少该变量会直接失败。
仓库提供 `docker-compose.public-content.yml` 和 `apps/api/.env.example` 作为本地开发基线；
密钥管理、容器化 API/Admin 部署和正式运维配置仍待完成。

## Stop Rule

如果未确定服务端数据库、部署方式或认证策略，不得在本任务中补做用户系统或生产部署配置。
