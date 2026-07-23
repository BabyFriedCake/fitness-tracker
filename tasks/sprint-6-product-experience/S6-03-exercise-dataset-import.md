# S6-03 Exercise Dataset Import

状态：Completed

## Goal

将批准的开源动作数据在构建阶段转换为本地 Seed，不在运行时访问 GitHub。

## Scope

- 建立可重复的 Dataset Adapter 与规范化流程。
- 生成仓库内可审计的本地 Seed 数据。
- 校验稳定 ID、重复项、枚举映射、媒体和许可。
- 使用事务幂等导入 SQLite。
- 仅导入 MIT 覆盖的元数据和说明；未经单独许可不复制 Gym Visual 媒体。

## Allowed Files

- `apps/mobile/src/database/seed/exercises/`
- 必要的本地数据资源
- 对应测试和数据来源说明

## Non-goals

- 不在 App 运行时联网。
- 不远程热更新动作数据。
- 不修改 UI、Workout Runtime 或 Session 数据。

## Acceptance Criteria

- App 离线可读取导入后的动作。
- 同一 Seed 重复导入结果稳定。
- 无效、重复或缺少许可的数据被拒绝。
- 数据来源、版本、许可证和转换规则可追溯。

## Tests

- Dataset mapping
- Validation rejection
- Transaction rollback
- Idempotent import
- Existing exercise update without history mutation

## Risks

- 上游许可证不允许分发媒体。
- 上游字段无法直接映射到批准枚举。
