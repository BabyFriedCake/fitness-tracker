# Sprint 18 生产化与公共内容同步计划

状态：规划中

## 目标

将 Sprint 17 的 Admin Web/API 代码基线推进到可部署、可维护、可被移动端安全消费的阶段，
不上传用户训练事实，也不改变移动端 WorkoutSession、WorkoutSet 和 Runtime。

## 任务

1. S18-01 认证与密钥配置
   - 确认 OIDC/JWKS 提供方
   - 配置 issuer、audience、JWKS、密钥轮换和管理员生命周期
   - 保持 API 认证适配器可替换
   - 已先提供通用 JWKS 验证适配器，未绑定供应商
2. S18-02 服务端部署与运维
   - API/Admin Web 容器化
   - PostgreSQL 备份、健康检查、迁移和密钥注入
   - 生产环境禁止回退到内存 Repository
3. S18-03 媒体存储与授权
   - 定义图片/GIF 存储和 CDN 策略
   - 重新确认公开分发授权
   - 保留 source、sourceId、license 和媒体版本
4. S18-04 Public Content API 与移动端同步（当前等待 ID 与 migration 决策）
   - 只提供 published 内容和版本
   - 已先落地只读 `/public/v1/content` API 基线
   - 本地 SQLite 增量更新、失败重试和离线保留
   - 不触碰用户训练事实
5. S18-05 Production Exit Review
   - 按认证、部署、媒体和移动端同步四个维度审查真实证据
   - 区分本地基线、测试通过和生产就绪

## 开始条件

- 认证供应商和部署环境经过评审确认。
- 媒体授权允许目标分发范围。
- PostgreSQL 备份和恢复责任人已明确。

## 不在范围内

- 用户账号体系和用户训练云同步。
- WorkoutSession、WorkoutSet、Runtime 或本地训练流程重构。
- AI 推荐和订阅能力。
