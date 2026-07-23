# S6-04 Exercise Library 与 Exercise Detail

状态：Completed

## Goal

完成 P007 动作库升级和 P012 动作详情体验。

## Scope

- 展示真实本地动作数据和媒体占位状态。
- 保留中英文搜索、肌群和器械组合筛选。
- 完整展示动作说明、媒体、来源和许可。
- 保持 browse 与 selection 两种上下文。

## Allowed Files

- `apps/mobile/src/features/exercise-library/`
- `apps/mobile/app/exercises/`
- 相关 route 与测试
- P007、P012 和相关 Design System 文档

## Non-goals

- 不修改 Template 创建或编辑规则。
- 不增加用户自定义动作。
- 不实现视频播放、识别或联网加载数据集。

## Acceptance Criteria

- Loading、Empty、Ready、No Results、Error 状态完整。
- 搜索和组合筛选结果正确。
- 动作详情可访问且许可可查。
- 选择动作返回后草稿与顺序保持。
- 不活跃动作不用于新选择但历史仍可读取。

## Tests

- Application filtering
- List and detail component tests
- Selection navigation regression
- Accessibility labels
- Invalid/missing media fallback

## Risks

- 大数据量下列表性能。
- 本地媒体 URI 在不同平台表现不同。
