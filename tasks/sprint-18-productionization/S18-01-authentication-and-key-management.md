# S18-01 认证与密钥配置

状态：JWKS 适配器与集成测试已完成，等待供应商决策

## 已完成

- Admin API 支持可替换 HS256 JWT 适配器。
- Admin API 支持通用 JWKS 适配器 `JwksAdminAuthenticator`。
- issuer、audience、JWKS URL 和 secret 均通过环境变量注入。
- 生产启动会校验数据库、认证配置、HTTPS JWKS URL 以及 issuer/audience 的完整性。
- 业务路由只依赖 `AdminAuthenticator`，不依赖具体供应商 SDK。
- 集成测试覆盖有效 token、未签名/错误签名、过期、错误 issuer、错误 audience、未知 key 和新旧 key 轮换。

## 待确认

- OIDC/JWKS 供应商和租户配置。
- JWT 中角色 claim 的正式名称和映射规则。
- 密钥轮换、撤销、过期和缓存策略。
- 管理员创建、禁用和离职流程的责任边界。

## 验收标准

- [ ] 正式 issuer/audience/JWKS 配置在目标供应商环境中通过集成测试；本地通用 JWKS 集成测试已通过。
- [x] 未签名、过期、错误 audience、错误 issuer 的 token 均返回 `UNAUTHENTICATED`。
- [x] 角色 claim 只能映射到批准的管理员角色。
- [x] JWKS 轮换期间旧 key 和新 key 的行为有测试证据。
- [x] 生产配置解析拒绝缺失认证、非 HTTPS JWKS 和不完整 issuer/audience。
- [ ] 生产密钥不进入仓库、镜像或日志。
- [ ] 不修改移动端账号、训练事实或本地 SQLite。
