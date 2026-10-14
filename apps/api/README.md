# Fitness Tracker Admin API

## 本地启动

1. 启动 PostgreSQL（完整 Compose 启动需要先提供认证配置）：

   ```sh
   cp docker-compose.public-content.env.example .env
   # 编辑 .env，替换 POSTGRES_PASSWORD、DATABASE_URL 和 ADMIN_JWT_SECRET
   docker compose -f docker-compose.public-content.yml up -d
   ```

   生产或 OIDC 场景使用 `ADMIN_JWKS_URL`、`ADMIN_JWT_ISSUER` 和
   `ADMIN_JWT_AUDIENCE`，不要设置开发密钥；Compose 会把空的
   `ADMIN_JWT_SECRET` 传给 API，由 API 强制要求 JWKS 配置完整。

2. 复制环境变量模板并按需修改：

   ```sh
   cp apps/api/.env.example apps/api/.env
   ```

3. 启动 API：

   ```sh
   pnpm --filter @fitness-tracker/api dev
   ```

API 默认监听 `http://localhost:4000`。配置 `DATABASE_URL` 后启动会执行服务端 migration；
生产环境不会回退到内存 Repository。

## 容器化

从仓库根目录执行 `docker compose -f docker-compose.public-content.yml up --build`。
该编排会启动 PostgreSQL、API 和 Admin Web，Admin Web 从 `http://localhost:8080` 访问。
生产环境必须通过外部 secret 管理器提供 `ADMIN_JWT_SECRET` 或 `ADMIN_JWKS_URL`，不得把凭据写入 compose 文件。

## 认证

- 开发测试可使用 `ADMIN_JWT_SECRET` 的 HS256 适配器。
- 生产环境应配置 `ADMIN_JWKS_URL`，并同时确认 `ADMIN_JWT_ISSUER`、`ADMIN_JWT_AUDIENCE`。
- 生产环境的 `ADMIN_JWKS_URL` 必须使用 HTTPS，并且三项 JWKS 配置必须同时存在；启动配置不完整时 API 会直接失败。
- 生产 HS256 secret 至少 32 个字符；`ADMIN_JWT_SECRET` 与 `ADMIN_JWKS_URL` 不能同时配置。
- 当前代码不创建用户、不签发 token，也不绑定具体 OIDC 供应商。

## 主要接口

- `GET /health`
- `GET /public/v1/content`
- `/admin/exercises`
- `/admin/templates`
- `/admin/media`
- `/admin/users`
- `PATCH /admin/users/:id/roles`（仅 `content_admin`）
- `PATCH /admin/users/:id/status`（仅 `content_admin`）
- `/admin/audit-events`

公共接口只返回 `published` 内容，并使用 `Cache-Control: public, max-age=60, stale-while-revalidate=300`；Admin 接口通过 Bearer token 和 RBAC 保护，响应使用 `Cache-Control: no-store`。

媒体对象目前只提供本地开发适配器 `LocalMediaObjectStorage`。生产环境必须替换为
经过凭据、访问控制、生命周期和备份审查的对象存储适配器，不能把本地目录作为生产存储。
