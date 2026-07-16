# Implement Task Prompt

Version: 2.1
Status: Draft for Validation

## 使命

严格按照当前 Task 和项目规范，完成最小、可验证、可审查的实现。

目标不是尽可能多地写代码，而是在不扩大 Scope 的前提下，准确交付当前 Task。

---

## 1. 启动协议

开始前必须读取：

1. 仓库根目录 `AGENTS.md`
2. 当前 Task 文件
3. 当前 Task 的 `必读 / Read First`
4. 当前 Task 引用的架构、领域、数据库、Prototype 和 Design System 文档
5. 当前代码与测试

如果以下任一条件成立，必须停止实现并报告：

- 无法读取本 Prompt
- 无法读取 `AGENTS.md`
- 当前 Task 缺少目标、Scope 或验收标准
- Task 与上层规范冲突
- 实现需要修改未获授权的 schema、导航或产品行为
- Acceptance Criteria 无法验证
- 工作区存在来源不明、可能影响本 Task 的未提交修改

不得自行猜测缺失规则。

---

## 2. 执行效率规则

- 只使用当前 Agent，不启动 subagent。
- 实现期间优先运行当前 Task 的定向测试。
- 不要在每次小修改后运行完整测试套件。
- Self Review 只执行一轮。
- 自动修正最多执行一轮。
- 一轮修正后仍存在阻塞问题时，停止并报告，不继续循环。
- 修正后只重新运行受影响的定向测试。
- 完整的 `format`、`lint`、`typecheck` 和 `test`
  只在实现和 Self Review 完成后运行一次。
- 不自动触发 GitHub PR Code Review。
- Final Report 不超过 50 行，不复述 Task 原文。
- 不重复读取与当前 Task 无关的文档。
- Human Review 修正时，只读取受影响文件和相关契约。
- 不执行 `git add`、`git commit`、`git push`、merge、tag 或 release，
  除非当前 Task 明确要求。

---

## 3. Task 理解

在修改文件前，先确认：

- Goal：当前任务最终要交付什么
- Scope：允许修改什么
- Non-goals：明确不能做什么
- Dependencies：依赖哪些既有实现
- Acceptance Criteria：如何判断完成
- Documentation Impact：是否需要同步文档

输出一个简短实施计划，最多 7 项。

不要重新拆分整个 Sprint，也不要提前实现后续 Task。

---

## 4. Scope 控制

必须遵守：

- 只修改当前 Task 允许的文件与模块
- 不做无关重构
- 不顺手实现后续功能
- 不新增未批准的第三方依赖
- 不新增 IDE、AI 工具或个人环境配置
- 不改变已批准的领域术语
- 不创建 `final`、`new`、`v2` 等重复正式文件
- 不使用临时代码掩盖架构问题

如确实需要扩大 Scope，先停止并说明原因，等待人工决定。

---

## 5. 实现原则

### 5.1 架构

遵守仓库定义的依赖方向。

默认检查：

```text
Route / UI
    ↓
Application / Use Case
    ↓
Domain
    ↓
Repository Interface
    ↓
Infrastructure Implementation
```

禁止：

- React Component 直接执行 SQL
- Domain 依赖 React、Expo、Router 或 SQLite
- Route 承担业务逻辑
- Infrastructure 反向定义领域规则
- Hook 绕过 Application 层直接拼装复杂业务流程

### 5.2 领域模型

如果 Task 新增或修改核心领域对象，检查：

- 命名是否与 Domain Model 一致
- ID 是否需要 branded type 或同等类型保护
- 对象是否默认不可变
- 验证是否发生在边界
- 是否错误地加入了未批准的未来字段
- 是否为未来 Sprint 保留合理扩展空间，但不提前实现未来需求

### 5.3 数据与持久化

如果 Task 涉及数据库：

- SQL 只存在于 database / infrastructure 模块
- 使用参数化查询
- 写入流程根据需要事务化
- Migration 有编号、可重复、安全回滚
- 数据库行映射必须验证
- 重复点击不得造成重复持久化
- 修改模板不得影响历史快照等既定事实

### 5.4 UI

如果 Task 涉及 UI：

- Route 保持 thin
- 覆盖 Loading、Empty、Normal、Error
- 遵守 Prototype 的 Visibility Rules 与 Interaction Matrix
- 文案使用项目指定语言
- 关键交互具备 accessibility label
- 不用假数据代替真实 Repository
- 不提前实现下一页面或下一流程

---

## 6. 测试策略

根据改动补充适当层级的测试：

- Domain 规则：纯单元测试
- Repository / Migration：临时数据库测试
- Application：Use Case 测试
- UI：组件和交互测试
- Bugfix：回归测试

实现期间：

- 优先运行当前 Task 的定向测试
- 定向测试失败时，先修复当前问题
- 不要反复运行完整测试套件

不得：

- 删除失败测试来让 CI 通过
- 只测试实现细节
- 声称未实际运行的测试已通过

---

## 7. Self Review

完成实现和定向测试后，读取并遵循：

`workflow/prompts/self-review.md`

如果该文件无法读取，必须停止并报告。

Self Review 必须：

- 只使用当前 Agent
- 只审查当前 Task 的未提交 Diff
- 只执行一轮
- 自动修正最多一轮
- 修正后只重新运行受影响的定向测试
- 仍存在阻塞问题时停止并报告
- 不执行完整 Validation

Self Review 完成前，不得运行完整 Validation。

---

## 8. 最终 Validation

Self Review 完成且没有遗留阻塞问题后，执行当前 Task 要求的验证命令。

默认至少包括：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

完整 Validation 原则上只运行一次。

如果某项失败：

- 只修复导致失败的问题
- 优先重新运行受影响的检查
- 最终必须重新确认完整 Validation 全部通过

如 Task 要求，还应执行：

- Expo start / web
- Migration tests
- Browser smoke test
- Native-device check
- Build

如果某项无法执行，必须说明具体原因和影响。

---

## 9. Repository Hygiene

完成实现后执行：

```bash
git status --short
git diff --check
git diff --stat
git clean -nd
```

检查：

- `.DS_Store`
- `.idea/`
- 未批准的 `.vscode/`
- `.claude/`
- `.cursor/`
- 重复的 `AGENTS.md` / `CLAUDE.md`
- 临时日志、缓存、本地数据库、导出文件
- 密钥、token、环境变量文件
- Merge conflict markers
- 调试代码、`debugger`
- 生产代码中的无理由 `TODO` / `FIXME`
- Scope 外改动

说明：

- `git clean -nd` 只用于预览
- 未经人工确认不得执行 `git clean -fd`
- 用户已有且与本 Task 无关的修改必须保留，不得覆盖

---

## 10. 最终报告

最终回复不得超过 50 行，并必须包含：

### Summary

完成了什么。

### Files Changed

新增、修改、删除了哪些文件。

### Decisions

列出重要实现决定及原因；没有重要决定时写 N/A。

### Self Review

报告：

- Self Review 是否发现阻塞问题
- 自动修正了哪些问题
- 是否仍有遗留问题

### Focused Tests

列出实现期间实际运行的定向测试。

### Final Validation

逐项报告 format、lint、typecheck、tests，以及 Task 额外验证。

### Repository Hygiene

说明工作区、未跟踪文件、Scope 外修改、临时配置等状态。

### Acceptance Criteria

逐条说明是否满足。

### Known Limitations

只列出真实存在的限制。

### Review Status

写明：

- `Ready for Human Review`
- 或 `Blocked`

不得自行执行 `git add`、`git commit`、`git push`、merge、tag 或 release，
除非当前 Task 明确要求。
