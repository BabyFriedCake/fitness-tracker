# S17-03 公共模板管理

状态：已完成（内存与 PostgreSQL 适配器）

## Scope

- 公共 WorkoutTemplate 与 TemplateExercise 服务端契约
- 模板 CRUD
- 版本化发布状态
- 公开模板发布前后的快照边界

不实现用户模板、WorkoutSession、WorkoutSet、移动端同步、认证和 RBAC。

## 当前实现限制

当前 API 在配置 `DATABASE_URL` 时使用 PostgreSQL Repository，未配置时保留内存适配器用于开发和测试。
生产环境连接编排仍待部署完成。

## Acceptance Criteria

- [x] 模板输入经过运行时校验。
- [x] sets、targetReps、restSeconds 和可选 weightKg 被保留。
- [x] 模板支持 draft、review、published、archived 状态。
- [x] 已发布或归档模板不能直接编辑。
- [x] 发布版本保留稳定 id 和版本号。
- [x] 完成服务端 PostgreSQL Repository 适配器（生产连接编排待完成）。
- [x] 增加管理员权限和审计事件。
