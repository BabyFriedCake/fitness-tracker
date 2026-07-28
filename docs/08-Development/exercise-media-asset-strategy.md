# Exercise Media Asset Strategy

状态：Approved for Sprint 14  
日期：2026-07-28

## Goal

定义动作库图片资源策略，确保 Exercise Library 可以继续离线可用，同时不把未确认授权的第三方图片或 GIF 导入正式 App。

## Current State

当前实现：

- `exercises.image_uri` 已存在。
- Exercise Domain 支持 `imageUri`。
- Exercise Repository 会读写 `image_uri`。
- Exercise Seed Dataset 中 `imageUri` 全部为 `null`。
- UI 使用 `apps/mobile/assets/images/exercise-placeholder.png` 作为离线占位图。
- App 不会运行时读取 GitHub。

当前策略是安全的：无授权图片不进入 App，用户仍能离线浏览动作库。

## Source Review

### hasaneyldrm/exercises-dataset

用途：

- 可继续作为动作元数据和说明文本的输入来源，前提是保留 pinned revision、source name、source reference、license 和 attribution。

媒体限制：

- 上游 README 说明该数据集包含缩略图和 GIF，但媒体版权归 Gym Visual。
- 在没有单独媒体授权前，不得把这些图片或 GIF 复制、转换、压缩或打包进本 App。
- 不得在运行时从 GitHub 或第三方 CDN 拉取这些图片。

结论：

- 当前 Sprint 不导入该仓库媒体。
- 当前占位图策略继续保留。

### 可接受的正式图片来源

后续若要进入正式图片导入，只允许以下来源：

1. 自制图片 / 插画 / 动作示意图。
   - 项目拥有完整分发权。
   - 推荐作为首选。

2. 明确公共领域或可商用分发的数据集。
   - 必须保留 license file。
   - 必须记录 source attribution。
   - 必须验证每个媒体文件与许可证一致。

3. 已购买或书面授权的第三方媒体。
   - 必须保存授权证明。
   - 必须明确允许移动 App 打包分发。
   - 必须明确是否允许裁剪、压缩、格式转换和离线存储。

## Packaging Strategy

推荐路径：

```text
Licensed Media Source
↓
Build-time Import Script
↓
apps/mobile/assets/exercises/
↓
Generated Exercise Seed JSON imageUri
↓
Local SQLite exercises.image_uri
↓
Exercise Repository
↓
Exercise Library UI
```

规则：

- 媒体只在构建或数据导入阶段处理，不在运行时联网读取。
- `imageUri` 只保存本地可分发媒体路径或稳定 App asset URI。
- 导入脚本必须输出 license audit summary。
- 每个媒体文件必须可追溯到 source、license 和 attribution。
- 如果图片缺失或授权不完整，`imageUri` 必须保持 `null`，UI 使用占位图。

## Recommended Asset Shape

V1 推荐：

- 图片优先于 GIF。
- 每个动作最多 1 张主图。
- 建议尺寸：至少 360x360。
- 格式：PNG 或 WebP。
- 命名：`exercise-slug.png` 或 `exercise-slug.webp`。
- 不在 V1 打包大体积动作 GIF。

原因：

- 图片更易控制授权和包体积。
- Figma 当前重点是动作识别和页面氛围，不要求动画教学。
- GIF 会显著增加包体积和性能风险。

## Replacement Path

后续正式图片导入任务应包含：

- 新建 `apps/mobile/assets/exercises/`。
- 新增媒体 license manifest，例如 `apps/mobile/assets/exercises/media-manifest.json`。
- 更新 Exercise seed build script，把合法图片映射到 `imageUri`。
- 更新 seed tests，验证：
  - 每个非空 `imageUri` 都有本地文件。
  - 每个本地文件都有 license manifest 条目。
  - 缺失授权时 `imageUri` 保持 `null`。
- 更新 Database / Design System / Prototype 状态文档。

## Current Placeholder Decision

保留当前占位图策略。

原因：

- 已满足离线优先原则。
- 不引入授权风险。
- 不需要 Schema / Migration。
- 与当前 `image_uri` 字段设计兼容。
- 可在获得授权资源后无破坏替换。

## Follow-up Task Recommendation

建议后续拆分任务：

`S15-01-exercise-media-license-and-import.md`

范围：

- 确认正式动作图片来源。
- 建立媒体 license manifest。
- 导入少量合法图片作为试点。
- 保持无授权图片继续使用占位图。

该任务必须先完成授权确认，再允许导入媒体文件。
