# Task Review Checklist v2

## Scope
- [ ] 未修改 Scope 外文件
- [ ] 未提前实现后续任务
- [ ] 未做无关重构
- [ ] 未加未批准依赖或配置

## Specification
- [ ] 符合 `AGENTS.md`
- [ ] 符合 Development Guide
- [ ] UI/Domain/Database 与对应文档一致

## Quality
- [ ] lint 通过
- [ ] typecheck 通过
- [ ] tests 通过或明确 N/A
- [ ] 无调试代码、TODO、FIXME
- [ ] 无类型绕过

## Repository Hygiene
- [ ] `git diff --check` 通过
- [ ] `git clean -nd` 无异常文件
- [ ] 无 `.DS_Store`
- [ ] 无 `.idea/`
- [ ] 无未批准 `.vscode/`
- [ ] 无 `.claude/`、`.cursor/`
- [ ] 根目录只有一份正式 `AGENTS.md`
- [ ] 无日志、缓存、本地数据库、导出文件
- [ ] 无密钥、环境变量文件
- [ ] 无冲突标记

## Acceptance
- [ ] Task Acceptance Criteria 全部满足
- [ ] Codex 报告与实际命令一致
- [ ] 已知限制说明清楚

结论：Approve / Approve with comments / Changes requested
