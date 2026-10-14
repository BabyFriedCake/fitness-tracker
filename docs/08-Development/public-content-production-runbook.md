# Public Content 服务生产运行手册

状态：部署前基线，不能替代目标平台的正式运维方案

## 启动前检查

生产环境必须通过目标平台的 secret 管理注入：

- `DATABASE_URL`
- `ADMIN_JWKS_URL`
- `ADMIN_JWT_ISSUER`
- `ADMIN_JWT_AUDIENCE`

`ADMIN_JWKS_URL` 必须使用 HTTPS。不要把真实密钥写入仓库、Dockerfile、Compose 文件或日志。
生产启动缺少数据库或认证配置时应失败，不得回退到内存 Repository。

## 发布顺序

1. 发布 API 镜像。
2. 注入数据库和认证 secret。
3. 启动 API，等待 `/health` 返回 `200`。
4. 确认日志中的 migration 完成且没有回滚错误。
5. 发布 Admin Web，并确认 `/admin/` 反向代理到 API。
6. 用最小权限管理员验证读取、编辑、审核、发布和审计访问边界。

API 启动时会在事务中创建 `schema_migrations` 元数据表，并通过事务级
`pg_advisory_xact_lock` 串行化迁移。生产发布仍需在目标 PostgreSQL 上完成一次真实升级与失败恢复演练。

## 数据库备份与恢复演练

以下命令只适用于本地 Compose 基线；生产环境必须替换为目标平台的受控备份流程：

```sh
docker compose -f docker-compose.public-content.yml exec -T public-content-postgres \
  pg_dump -U fitness_tracker -d fitness_tracker --format=custom > public-content.dump

docker compose -f docker-compose.public-content.yml exec -T public-content-postgres \
  pg_restore -U fitness_tracker -d fitness_tracker --clean --if-exists < public-content.dump
```

恢复演练必须记录：备份时间、恢复目标、migration 状态、动作/模板/媒体数量、审计日志可读性和失败回滚结果。
未完成真实演练前，S18-02 不得标记为完成。

## 健康检查与故障处理

- `/health` 是数据库就绪检查，不是用户训练可用性检查，并返回 `Cache-Control: no-store`。
- API 不可用不应影响移动端已有本地训练和历史数据。
- 数据库故障时禁止切换到内存 Repository；应让健康检查失败并由平台重启或告警。
- 媒体对象存储故障不得使已发布的 WorkoutSession 或 WorkoutSet 发生变化。

## 发布后核验

- 公共 API 只返回 `published` Exercise 和 Template。
- 引用未发布动作的 Template 不得出现在公共快照。
- 未批准或仅限个人分发的媒体不得出现在公共快照。
- 使用 `ETag` 重复请求时，未发生版本变化应返回 `304`。
- 公共内容响应的 `Cache-Control` 应保持 `max-age=60` 和 `stale-while-revalidate=300`，不得缓存管理端接口。
- Admin Web 的 Nginx 应保留 CSP、`X-Content-Type-Options`、`X-Frame-Options` 和 `Referrer-Policy` 安全响应头。
- API 生产容器应以非特权 `node` 用户运行；镜像构建阶段可以使用 root 安装依赖。
- 所有管理写操作都有对应审计事件。

CI 会使用 `docker-compose.public-content.env.example` 执行 Compose 配置校验；该步骤只验证配置，不代表目标平台部署或数据库恢复演练已经完成。

## 当前未完成项

- 正式部署平台、域名和 TLS 终止位置尚未确定。
- 正式 OIDC/JWKS 供应商尚未绑定。
- 生产对象存储适配器尚未实现。
- 真实备份恢复演练尚未执行。
