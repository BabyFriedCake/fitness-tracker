# Bugfix Prompt v2

流程：
1. 阅读 `AGENTS.md` 与相关规范
2. 复现问题或写失败测试
3. 确认被违反的规则
4. 做最小修复
5. 添加回归测试（如适用）
6. 运行 lint、typecheck、tests
7. 执行 `tasks/prompts/self-review.md`
8. 执行 Repository Hygiene 检查

禁止：
- 无关重构
- 修改无关模块
- 删除失败测试来通过 CI
- 用类型绕过掩盖问题

最终汇报：
- Root Cause
- Files Changed
- Tests Added
- Commands Run
- Validation Result
- Repository Hygiene
- Remaining Limitations
