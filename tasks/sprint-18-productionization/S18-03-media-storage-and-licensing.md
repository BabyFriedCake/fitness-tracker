# S18-03 媒体存储与授权

## 目标

为公共动作库建立可审计的媒体存储和授权边界，支持后台管理动作媒体元数据，
但不把 Personal Use 资产直接视为可公开分发资产。

## Scope

- 为公共 Exercise 媒体定义独立的媒体元数据契约。
- 保留 source、sourceId、license、attribution、授权范围、审核状态和媒体版本。
- 明确对象存储与 API 的接口边界；具体云厂商通过适配器注入。
- 公共 API 只返回已通过授权审核且随 published 版本发布的媒体引用。
- 为媒体替换保留版本和审计记录，不覆盖历史发布版本。

## 禁止

- 不把移动端本地 SQLite 作为后台媒体存储。
- 不在 API 或移动端运行时读取 GitHub、个人电脑路径或临时文件路径。
- 不把 Personal Use 授权自动升级为 Commercial/Public Distribution 授权。
- 不删除已发布版本引用的媒体对象。
- 不修改 WorkoutSession、WorkoutSet、Runtime 或训练历史。

## 实现要求

1. 先确认目标分发范围和每个媒体文件的授权证明。
2. 设计 `MediaAsset` 版本化契约，至少包含：
   - `id`
   - `exerciseId`
   - `source`
   - `sourceId`
   - `license`
   - `attribution`
   - `distributionScope`
   - `reviewStatus`
   - `uri`
   - `version`
3. 媒体上传、读取、审核和发布分别经过明确的 API 权限检查。
4. 公开内容只允许返回 `reviewStatus=approved` 且属于当前 published 版本的媒体。
5. 媒体 URI 不得泄漏对象存储凭据；需要临时 URL 时由服务端短期签发。
6. 记录上传、替换、授权审核、发布和下线审计事件。

## 测试要求

- 未审核媒体不能出现在公共内容 API。
- Personal Use 媒体不能在 Public Distribution 范围下发布。
- 媒体版本替换不修改历史发布版本。
- 未授权、过期授权和缺少 attribution 的媒体被拒绝。
- 权限不足不能上传、审核或发布媒体。
- API 不返回本地路径、GitHub URL 或敏感对象存储凭据。

## Acceptance Criteria

- [ ] 目标分发范围已由产品和授权责任人确认。
- [ ] 媒体元数据和版本契约已实现并通过测试。
- [ ] 授权审核状态能阻止未授权媒体发布。
- [ ] 公共 API 只返回已批准且已发布版本的媒体引用。
- [ ] 媒体操作均有审计记录。
- [ ] 不修改移动端训练事实、Schema、Migration 或 Runtime。

## 当前进度

- [x] `MediaAsset` 元数据契约、授权范围和审核状态机已实现。
- [x] Personal Use 媒体禁止进入 public approval 的领域测试已通过。
- [x] 媒体审核状态转换和版本递增测试已通过。
- [x] PostgreSQL 媒体表、迁移和 Repository 基线已实现。
- [x] Admin API 媒体列表、创建、审核和公共内容过滤路由已实现。
- [x] Admin Web 媒体登记和审核界面已实现。
- [x] 供应商无关的媒体对象存储接口和本地开发适配器已实现。
- [ ] 生产对象存储适配器尚未实现。

## 当前阻塞

目标对象存储供应商、公开分发授权和媒体授权责任人尚未确定。在这些决策确定前，
不得实现真实上传或把当前 Personal Use 资产发布为公共内容。
