# S18-02 服务端部署与运维

状态：本地编排基线已完成，生产部署待确认

## 已完成

- API 生产环境缺少 `DATABASE_URL` 或认证配置时直接失败。
- 配置 PostgreSQL 时启动自动执行事务化 migration。
- `/health` 会检查数据库连接可用性。
- 提供 `docker-compose.public-content.yml` 作为本地 PostgreSQL 基线。
- 提供 `apps/api/.env.example`，不包含真实凭据。
- 提供 API/Admin Web 容器构建文件和本地 Compose 服务编排。
- GitHub Actions 已覆盖 Admin API typecheck/test/build 和 Admin Web build。
- Compose 中 Admin Web 等待 API 健康检查通过后启动，API 健康检查包含数据库可用性。
- 新增 `docs/08-Development/public-content-production-runbook.md`，记录发布顺序、备份恢复演练和发布后核验项。
- migration 元数据表创建已纳入事务，并通过事务级 PostgreSQL advisory lock 避免多实例并发启动竞态。

## 待确认

- 生产部署平台、域名、网络和 TLS 终止位置。
- PostgreSQL 备份、恢复、升级和数据保留责任。
- Admin Web 静态资源发布方式和 API 反向代理策略。
- 日志、告警和审计日志访问限制。

## 验收标准

- [x] API 和 Admin Web 具有可重复的容器构建定义；目标平台部署仍待验证。
- [ ] migration 只执行一次且失败可回滚。
- [ ] 数据库不可用时健康检查失败，不回退到内存 Repository。
- [ ] 备份恢复演练有记录。
- [ ] 密钥通过目标平台 secret 管理注入。
- [ ] 不影响移动端离线训练。
