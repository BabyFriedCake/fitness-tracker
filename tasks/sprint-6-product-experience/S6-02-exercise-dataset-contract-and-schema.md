# S6-02 Exercise Dataset Contract 与 Schema

状态：Completed

## Goal

为离线动作数据集建立明确、可验证的 Domain 和 SQLite 数据契约。

## Scope

- 定义动作说明步骤、许可、来源归属和媒体边界。
- 保持 Exercise 稳定 ID 和历史 SessionExercise 快照边界。
- 新增编号 Migration，不修改历史 Migration。
- 更新 Schema、Data Dictionary 和 Migration 文档。
- 更新 Row Mapper、Repository 查询与测试。

## Allowed Files

- `apps/mobile/src/domain/exercise/`
- `apps/mobile/src/database/migrations/`
- `apps/mobile/src/database/schema/`
- `apps/mobile/src/database/repositories/exercise/`
- 对应测试
- `docs/04-Architecture/domain-model.md`
- `docs/06-Database/`

## Non-goals

- 不导入完整数据集。
- 不修改 Exercise Library UI。
- 不修改 Workout Runtime、WorkoutSession 或 Template 历史事实。

## Acceptance Criteria

- 旧数据库可无损升级。
- 新字段具有明确可空性和验证规则。
- Migration 可重复执行并在失败时回滚。
- Repository 映射完整且参数化查询不回归。

## Tests

- Domain validation
- Fresh database migration
- 0003 到新版本升级
- 失败回滚与重复运行
- Repository row mapping

## Risks

- 外部数据枚举无法映射。
- 媒体许可信息不完整。
