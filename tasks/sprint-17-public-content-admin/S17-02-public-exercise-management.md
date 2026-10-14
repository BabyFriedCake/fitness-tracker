# S17-02 公共动作库管理

状态：代码基线已完成，生产部署与媒体上传待完成

## Scope

- 公共 Exercise 服务端契约
- 动作 CRUD
- source、sourceId、license、imageUri 媒体元数据
- draft、review、published、archived 状态转换
- 发布前编辑保护

不实现用户自定义动作、移动端同步、图片上传存储、管理员认证和 RBAC。

## 当前实现限制

已提供内存测试适配器和 PostgreSQL Repository；图片上传存储、移动端同步和生产部署不在本任务内。

## Acceptance Criteria

- [x] Exercise 输入经过运行时校验。
- [x] CRUD 路由不直接依赖数据库实现。
- [x] source、sourceId、license、imageUri 被保留。
- [x] 非法状态转换被拒绝。
- [x] published 和 archived 内容不能直接编辑。
- [x] 接入服务端持久化数据库适配器。
- [x] 增加管理员权限检查和审计事件。
