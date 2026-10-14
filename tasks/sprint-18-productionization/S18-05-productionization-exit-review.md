# S18-05 Sprint 18 Productionization Exit Review

## Review 范围

审查 S18-01 至 S18-04 的实际实现、测试证据和生产限制，不以本地测试通过代替生产就绪。

## 必查内容

### 认证

- 正式 OIDC/JWKS issuer、audience 和 claim 映射是否已确认。
- 过期、错误签名、错误 issuer/audience、密钥轮换是否有测试证据。
- 生产密钥是否只通过 secret 管理注入。

### 部署与运维

- API、Admin Web 和 PostgreSQL 是否能在目标平台重复部署。
- migration 是否事务化、幂等且失败回滚。
- 健康检查是否能区分进程存活和数据库可用。
- 备份、恢复、日志、告警和审计访问是否有记录。

### 媒体

- 媒体来源、许可证、署名和分发范围是否可追溯。
- Personal Use 资源是否被阻止公开发布。
- 正式对象存储是否配置访问控制、生命周期和备份。
- 未审核媒体是否不会出现在公共 API。

### 移动端同步

- Public Content API 是否只返回 published 内容。
- ETag/版本行为是否确定。
- 移动端 schema 与服务端 ID 映射是否已确认。
- 同步失败是否保留本地内容且不影响离线训练。

## Exit Decision

- `PASS`：所有生产验收证据齐全，可以进入发布准备。
- `PASS WITH WARNINGS`：核心代码基线可用，但明确记录剩余生产风险。
- `FAIL`：存在安全、数据完整性、离线训练或发布边界阻塞。

## 禁止提前宣称

- 本地 HS256 测试通过不等于正式 OIDC 已接入。
- 本地文件存储通过不等于生产对象存储已就绪。
- Public Content API 可用不等于移动端同步已完成。
- Admin Web 能打开不等于生产部署、备份和监控已完成。
