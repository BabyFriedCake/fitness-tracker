# Sprint 14 Exercise Media Asset Strategy

状态：PASS WITH WARNINGS  
日期：2026-07-28

## Scope

本次只完成动作图片资源策略审计，不下载、不复制、不导入未确认授权的第三方图片或 GIF，不修改 Database Schema / Migration。

## Findings

- 当前 `image_uri` 字段已经存在，后续可以承载合法本地媒体路径。
- 当前 seed dataset 的 `imageUri` 全部为 `null`。
- 当前 UI 使用 `exercise-placeholder.png`，这是可保留的安全占位策略。
- `hasaneyldrm/exercises-dataset` 的媒体来自 Gym Visual，未获得单独媒体授权前不得打包进 App。
- 运行时读取 GitHub 不符合本项目 local-first 要求，继续禁止。

## Decision

保留当前占位图策略。

正式动作图片导入必须作为后续独立任务执行，并且先完成：

- 媒体来源确认。
- 授权证明记录。
- 本地打包方案。
- license manifest。
- seed import 校验。

## Documents Updated

- `docs/08-Development/exercise-media-asset-strategy.md`
- `docs/08-Development/prototype-implementation-status.md`
- `docs/08-Development/sprint-14-plan.md`
- `tasks/sprint-14-post-release-ux-polish/S14-04-exercise-media-asset-strategy.md`

## Validation

- `git status --short`：已执行
- `git diff --check`：PASS
- `pnpm format:check`：PASS

只做策略文档与状态同步，未运行完整测试。

## Acceptance Criteria

- 图片资源来源、许可、打包方式和替换路径清晰：PASS
- 当前占位图策略是否保留有明确结论：PASS
- 若需要正式导入图片，已拆出后续任务建议和文档更新要求：PASS

## Warning

尚未获得正式动作媒体授权，因此 Sprint 14 不应导入真实动作图片。
