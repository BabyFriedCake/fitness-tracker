# Self Review Prompt v2

停止新增功能，仅审查当前任务。

## Scope
- 是否修改 Scope 外文件？
- 是否提前实现后续任务？
- 是否有无关重构或依赖？

## Specification
- 是否符合 `AGENTS.md`？
- 是否符合相关 Development Guide？
- 是否满足 Acceptance Criteria？

## Quality
- 是否存在调试代码、TODO、FIXME？
- 是否存在类型绕过或不必要抽象？
- 是否保留不该保留的生成器示例？

## Repository Hygiene

执行：

```bash
git status --short
git diff --check
git diff --stat
git clean -nd
```

检查并清理：
- `.DS_Store`
- `.idea/`
- 未批准的 `.vscode/`
- `.claude/`
- `.cursor/`
- 重复的 `AGENTS.md` / `CLAUDE.md`
- 临时日志、缓存、本地数据库、导出文件
- 密钥和环境变量文件
- 冲突标记与异常生成文件

注意：
- 根目录唯一正式 AI 规则文件是 `AGENTS.md`
- `git clean -nd` 只预览，不执行 `git clean -fd`

## Validation
实际运行 lint、typecheck、tests，以及 Task 要求的 start/build。

最终输出：
- Scope：通过/不通过
- Specification：通过/不通过
- Quality：通过/不通过
- Repository Hygiene：通过/不通过
- Validation：实际结果
- Acceptance Criteria：逐项结果
- Remaining Issues
