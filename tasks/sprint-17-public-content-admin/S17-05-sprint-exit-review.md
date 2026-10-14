# S17-05 Sprint Exit Review

状态：已完成（PASS WITH WARNINGS）

## Review 范围

- Admin Web 与 Admin API 是否保持独立边界。
- 公共 Exercise 与 WorkoutTemplate 是否支持校验、编辑、审核、发布和归档。
- PostgreSQL migration、Repository 和审计持久化是否具备可验证的事务边界。
- 管理员认证、RBAC、拒绝审计和审计查询是否覆盖所有后台写操作。
- 是否触碰移动端 SQLite、WorkoutSession、WorkoutSet 或 Runtime。
- 生产 OIDC/JWKS、部署、媒体存储和移动端同步是否明确记录为后续工作。

## 验收标准

- [x] 通过 API、Admin Web、数据库和任务文档的整体一致性检查。
- [x] `pnpm --filter @fitness-tracker/api typecheck` 通过。
- [x] `pnpm --filter @fitness-tracker/api test` 通过（12 个测试文件、25 个测试）。
- [x] `pnpm --filter @fitness-tracker/admin typecheck` 通过。
- [x] `pnpm --filter @fitness-tracker/admin build` 通过。
- [x] `pnpm format:check` 通过。
- [x] `git diff --check` 通过。
- [x] 生产化限制、风险和后续任务已记录，不将当前基线标记为最终发布。

## Review 结论

### Strengths

- Admin Web 只通过 Admin API 访问公共内容，API 通过 Repository 访问服务端数据库。
- Exercise 与 WorkoutTemplate 支持运行时校验、编辑、审核、发布和归档边界。
- 所有受保护写操作使用 RBAC；拒绝请求和成功写操作均可审计，审计查询受 `audit:read` 保护。
- 未修改移动端 SQLite、WorkoutSession、WorkoutSet 或 Runtime。

### Warnings

- 当前 JWT 是可替换的 HS256 适配器，生产 OIDC/JWKS 提供方、密钥轮换和管理员生命周期尚未接入。
- PostgreSQL 连接和迁移代码已具备，但容器编排、密钥管理、备份和正式部署尚未完成。
- 图片上传/对象存储和移动端公共内容同步尚未实现。

### Ready for Next Phase

YES WITH WARNINGS：可以进入生产化准备阶段，不可直接作为最终发布版本。

## 明确不在本次 Review 内

- 不接入未经确认的 OIDC/JWKS 供应商。
- 不创建移动端云同步接口。
- 不修改移动端数据库、WorkoutSession、WorkoutSet 或 Runtime。
- 不实现图片上传存储和第三方分发。
