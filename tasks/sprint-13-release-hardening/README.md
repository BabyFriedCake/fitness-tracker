# Sprint 13 - Release Hardening

状态：Completed

## 目标

完成 Final Release 前的验证、技术债收口和文档一致性对齐。

## 执行顺序

- [x] `S13-00-release-readiness-and-debt-sync.md`
- [x] `S13-01-hook-warning-triage.md`
- [x] `S13-02-recommendation-warning-cleanup.md`
- [x] `S13-03-release-verification-and-ci-review.md`
- [x] `S13-04-tag-release-changelog-preparation.md`
- [x] `S13-05-final-release-review.md`

## 非目标

- 不实现完整 AI Coach。
- 不引入云账号或订阅。
- 不改变 Workout Runtime 主状态机。
- 不新增数据库结构。

## 约束

- 只做发布硬化与技术债闭环。
- 不修改历史训练事实。
- 保持 Event Source Architecture。
- UI 不直接访问 SQLite。
