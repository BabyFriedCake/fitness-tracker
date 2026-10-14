# Sprint 18 Productionization Exit Report

日期：2026-08-05

## Overall Result

**FAIL FOR PRODUCTION RELEASE**

代码基线和本地验证通过，但正式生产发布所需的身份提供方、部署平台、对象存储、备份恢复和移动端同步决策尚未完成。因此不能将 Sprint 18 标记为生产就绪。

## 已验证

- Admin Web、API、PostgreSQL Repository 和审计边界已实现。
- API 支持 JWKS、RBAC、审计、公共内容快照、快照版本、ETag 和 `304 Not Modified`。
- 公开模板引用的动作必须全部为 `published`。
- 未审核或 Personal Use 媒体不会进入公共内容 API。
- Migration 在事务中执行，并通过 PostgreSQL 事务级 advisory lock 串行化启动。
- 生产配置要求数据库、认证方式和足够强度的 HS256 secret；HS256 与 JWKS 不能同时配置。
- CI 已加入 Compose 配置校验。
- Admin 接口禁止缓存，Admin Web Nginx 已配置基础安全响应头，API 容器以非特权用户运行。

## Validation

- Mobile：55 个测试套件，542 个测试通过。
- API：17 个测试文件，47 个测试通过。
- `pnpm format:check` 通过。
- `pnpm lint` 通过。
- `pnpm typecheck` 通过。
- API/Admin typecheck、build 通过。
- `git diff --check` 通过。
- 本地未执行 Docker Compose 校验，因为当前环境没有 Docker；CI 将执行该检查。

## 未完成与风险

- 正式 OIDC/JWKS issuer、audience 和 claim 映射尚未绑定真实供应商。
- 生产部署平台、域名、TLS、日志、告警和审计访问策略尚未确认。
- 生产对象存储适配器尚未实现；当前本地文件存储仅用于开发。
- PostgreSQL 真实备份恢复演练尚未执行。
- 移动端公共内容同步的服务端 ID 与本地 Exercise ID 映射尚未决策。

## Decision

**Not Ready for Final Release**

完成上述外部决策和真实环境验证后，重新执行 S18-05 Exit Review。
