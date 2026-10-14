# S17-00 公共内容后台范围与架构决策

状态：待评审

## 目标

在实现代码前，明确公共内容管理后台与现有 local-first 移动端之间的边界，
形成可评审、可测试、可回滚的实施基础。

## Scope

只定义：

- 公共 Exercise 与公共 WorkoutTemplate 的服务端管理边界
- Admin Web、Admin API、服务端数据库的职责
- 内容发布、下线、版本和审核状态
- 移动端后续读取公共内容的兼容边界
- 管理员角色与审计要求

不实现：

- 用户注册、登录和账号同步
- 用户训练历史云同步
- 修改移动端 SQLite Schema 或 Migration
- 修改 WorkoutSession、WorkoutSet 或 Runtime
- AI Coach、推荐和订阅

## 必须遵守

1. 移动端仍可离线完成训练。
2. 公共模板只能作为新建 Session 的来源，不覆盖已存在的 Session 快照。
3. 后台不能修改用户的 WorkoutSet、WorkoutSession 或本地模板事实。
4. 公共动作媒体必须保留 source、sourceId、license 和审核记录。
5. 所有写操作必须可审计。
6. API 必须具备版本边界，不能让移动端直接依赖后台数据库结构。

## Acceptance Criteria

- [ ] 形成 Admin Web、Admin API、Server Database、Mobile Client 的边界图。
- [ ] 明确定义 Exercise 与 WorkoutTemplate 的公共内容字段。
- [ ] 明确定义 draft、published、archived 等内容状态及状态转换。
- [ ] 明确定义公共模板发布后移动端如何处理已存在数据。
- [ ] 明确定义管理员角色、权限和审计事件。
- [ ] 明确媒体授权、审核和下线规则。
- [ ] 明确离线移动端在 API 不可用时的行为。
- [ ] 产出 Architecture Decision Record，并由 Product/Architecture Review 通过。

## 测试要求

- 用例覆盖内容状态转换和非法转换。
- 用例覆盖公共模板版本不影响历史 Session。
- 用例覆盖 API 不可用时移动端保持本地可用。
- 用例覆盖管理员无权操作被拒绝并产生审计记录。

