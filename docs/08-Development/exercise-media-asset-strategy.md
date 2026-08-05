# Exercise Media Asset Strategy

状态：Approved for Sprint 14  
日期：2026-07-28

## Goal

定义动作库图片资源策略，确保 Exercise Library 可以继续离线可用，并把媒体使用场景区分为：

- Personal Use：允许本地开发、个人设备使用和本地 assets 打包。
- Commercial Release：保留未来商业发布的更严格授权要求。

## Current State

当前实现：

- `exercises.image_uri` 已存在。
- Exercise Domain 支持 `imageUri`。
- Exercise Repository 会读写 `image_uri`。
- Exercise Seed Dataset 在 Personal Use 模式下会把合法本地图片或动图写入 `imageUri`。
- 动作库、训练中、暂停和休息页使用同一 `imageUri` 本地资源；GIF 在支持的资源上用于动作示意。
- UI 使用 `apps/mobile/assets/images/exercise-placeholder.png` 作为离线占位图。
- App 不会运行时读取 GitHub。

当前策略在 Personal Use 模式下允许本地导入已确认可用于个人自用的媒体，并继续保留占位图作为兜底。

## Source Review

### hasaneyldrm/exercises-dataset

用途：

- 可继续作为动作元数据和说明文本的输入来源，前提是保留 pinned revision、source name、source reference、license 和 attribution。

媒体限制：

- 上游 README 说明该数据集包含缩略图和 GIF，但媒体版权归 Gym Visual。
- 未来若进入 Commercial Release，仍必须重新确认媒体授权，不能默认沿用个人 Beta 的本地打包策略。
- 不得在运行时从 GitHub 或第三方 CDN 拉取这些图片。

结论：

- Personal Use 模式下，可将已确认可用于个人自用的图片导入本地 assets。
- Commercial Release 模式下，仍需单独确认媒体授权后才能打包分发。
- 当前占位图策略继续保留为兜底方案。

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

Personal Beta 推荐：

- 列表可优先使用图片；训练中、暂停和休息状态可使用同一动作的本地 GIF。
- 每个动作最多 1 张主图。
- 建议尺寸：至少 360x360。
- 格式：PNG 或 WebP。
- 命名：`exercise-slug.png` 或 `exercise-slug.webp`。
- 不新增运行时网络媒体；GIF 仅使用已打包的本地资产。

原因：

- 图片更易控制授权和包体积；GIF 仅用于个人 Beta 的训练动作示意。
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

保留当前占位图策略作为兜底。

原因：

- 已满足离线优先原则。
- Personal Use 模式下，本地 assets 可直接服务个人设备使用。
- Commercial Release 仍然保留授权风险控制。
- 不需要 Schema / Migration。
- 与当前 `image_uri` 字段设计兼容。
- 可在未来商业授权确认后无破坏替换。

## Follow-up Task Recommendation

建议后续拆分任务：

`S15-01-exercise-media-license-and-import.md`

范围：

- 确认正式动作图片来源。
- 建立媒体 license manifest。
- 导入少量合法图片作为试点。
- 保持无授权图片继续使用占位图。

### Personal Use 允许范围

在当前 Personal Beta 阶段，允许：

- 本地开发和本地调试。
- 个人设备上的离线使用。
- 将已确认可用于个人自用的动作图片和动图打包进 `apps/mobile/assets/`。

禁止：

- 商业发布。
- App Store / 商店发布。
- 分发给第三方或开放给其他团队直接复用。

如果未来需要进入 Commercial Release，必须重新审核媒体来源、授权证明、分发范围和可用平台。

该任务必须先完成授权确认，再允许导入媒体文件。
