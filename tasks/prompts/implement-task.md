# Implement Task Prompt v2

请执行当前任务，并按以下顺序：

1. 阅读 `AGENTS.md`
2. 阅读 Task 中列出的相关 docs
3. 阅读当前 Task 文件

规则：
- 严格遵守 Scope
- 不提前实现后续任务
- 不修改未获允许的文件
- 不新增 IDE/AI 私有配置
- 发现冲突或缺失立即停止
- 不做无关重构

完成后必须执行：
- Task 要求的验证命令
- `tasks/prompts/self-review.md`
- `git status --short`
- `git diff --check`
- `git diff --stat`
- `git clean -nd`

发现问题先修复，再重新验证。

最终汇报：
- Summary
- Files Changed
- Commands Run
- Validation
- Repository Hygiene
- Acceptance Criteria
- Known Limitations
