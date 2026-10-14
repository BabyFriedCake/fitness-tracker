# S18-04 Public Content API 与移动端同步

状态：Public API 快照、ETag 与发布依赖过滤已完成；移动端同步等待数据库与 ID 映射决策

## 当前阻塞

移动端 `exercises` 表当前没有 `sourceId`、公共内容版本、来源归属或远端删除状态字段。
移动端模板和已创建的 WorkoutSession 又通过 Exercise ID 与本地数据关联。
因此不能直接把 `/public/v1/content` 的服务端 ID 写入本地表，也不能通过名称匹配动作。

直接实现会产生以下风险：

- 同一个动作出现两个本地 ID。
- 现有本地模板的 Exercise 外键无法稳定迁移。
- 公共内容刷新覆盖用户已有本地内容。
- 已归档内容和本地历史事实边界不清。

## 实现前必须确认

1. 公共内容使用独立的 `source_id` 映射，还是服务端保持与移动端稳定 Exercise ID 一致。
2. 是否允许新增移动端 migration，增加 `public_source_id`、`public_version`、`public_status` 等字段。
3. 公共内容刷新是否只更新带公共来源的记录，用户本地动作是否永不修改。
4. 已归档内容是否保留本地展示，及其对模板选择的影响。
5. API 的增量同步协议：全量快照、游标，或基于版本的变更集。

## ID 方案决策记录

当前事实：移动端 `exercises.id` 是本地稳定主键，`source_reference` 保存数据集提交地址，
不是可用于同步的来源 ID。服务端 `public_exercises.id` 目前是独立公共内容主键。

可选方案：

1. **服务端复用移动端 Exercise ID**
   - 优点：无需新增移动端映射字段，模板引用可以直接复用。
   - 风险：服务端必须保证所有公共来源 ID 全局唯一，且不能覆盖用户本地动作；历史数据约束较强。

2. **新增 `public_source_id` 映射字段（推荐）**
   - 优点：明确区分本地主键和公共来源，支持多来源内容和未来替换服务端 ID。
   - 需要：新增移动端 migration、row mapper、Repository upsert contract 和同步失败恢复测试。
   - 规则：只更新带公共映射的记录；用户自定义动作、本地模板和 WorkoutSession 不被覆盖。

在上述方案确认前，不实现公共内容写入移动端 SQLite，也不使用名称、图片 URL 或提交 URL 作为唯一键。

当前已提供：`GET /public/v1/content` 返回 published 快照，并支持 `ETag`/`304 Not Modified`；快照 `version` 由全部资源版本推导以避免归档后回退，模板只有在其引用动作全部 published 时返回；响应提供 `Cache-Control: public, max-age=60, stale-while-revalidate=300`。

## Scope

确认上述决策后，只实现：

- Public Content API 的版本/增量契约。
- Exercise 公共字段 migration 与 row mapper。
- 公共动作安全 upsert 和失败重试。
- 公共模板同步边界，不修改 WorkoutSession、WorkoutSet 或 Runtime。

## 验收标准

- [ ] 同一公共动作重复同步不会产生重复本地记录。
- [ ] 用户自定义动作和本地模板不会被公共刷新覆盖。
- [ ] 同步失败保留上一次完整可用内容。
- [ ] 离线时动作库和训练流程继续工作。
- [ ] 已有模板、Session、WorkoutSet 的引用和历史快照全部保留。
- [ ] migration、repository、application 和测试覆盖真实升级路径。

## 本次不实现

- 不修改 WorkoutSession、WorkoutSet 或 Runtime。
- 不用动作名称作为唯一键。
- 不把服务端数据库直接暴露给移动端。
