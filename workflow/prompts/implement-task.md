# Implement Task Prompt

Version: 2.0  
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

## 2. Task 理解

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

## 3. Scope 控制

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

## 4. 实现原则

### 4.1 架构

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

### 4.2 领域模型

如果 Task 新增或修改核心领域对象，检查：

- 命名是否与 Domain Model 一致
- ID 是否需要 branded type 或同等类型保护
- 对象是否默认不可变
- 验证是否发生在边界
- 是否错误地加入了未批准的未来字段
- 是否为未来 Sprint 保留合理扩展空间，但不提前实现未来需求

### 4.3 数据与持久化

如果 Task 涉及数据库：

- SQL 只存在于 database / infrastructure 模块
- 使用参数化查询
- 写入流程根据需要事务化
- Migration 有编号、可重复、安全回滚
- 数据库行映射必须验证
- 重复点击不得造成重复持久化
- 修改模板不得影响历史快照等既定事实

### 4.4 UI

如果 Task 涉及 UI：

- Route 保持 thin
- 覆盖 Loading、Empty、Normal、Error
- 遵守 Prototype 的 Visibility Rules 与 Interaction Matrix
- 文案使用项目指定语言
- 关键交互具备 accessibility label
- 不用假数据代替真实 Repository
- 不提前实现下一页面或下一流程

---

## 5. 测试策略

根据改动补充适当层级的测试：

- Domain 规则：纯单元测试
- Repository / Migration：临时数据库测试
- Application：Use Case 测试
- UI：组件和交互测试
- Bugfix：回归测试

不得：

- 删除失败测试来让 CI 通过
- 只测试实现细节
- 声称未实际运行的测试已通过

---

## 6. Validation

执行当前 Task 要求的命令。

默认至少包括：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

如 Task 要求，还应执行：

- Expo start / web
- Migration tests
- Browser smoke test
- Native-device check
- Build

如果某项无法执行，必须说明具体原因和影响。

---

## 7. Repository Hygiene

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

## 8. 自我审查

提交最终结果前检查：

### Scope
- 是否只完成当前 Task
- 是否提前实现后续任务
- 是否加入无关依赖或重构

### Specification
- 是否符合 `AGENTS.md`
- 是否符合 Prototype / Domain / Database / Design System
- 是否同步了必要文档

### Architecture
- 依赖方向是否正确
- 是否存在基础设施泄漏
- Route / Screen 是否过重
- Repository contract 是否被破坏

### Quality
- 类型是否严格
- 错误处理是否明确
- 测试是否覆盖关键风险
- 是否存在重复写入风险

### Future Compatibility
- 当前设计是否会强迫下一 Sprint 进行破坏性重写
- 命名是否稳定
- 是否过度为未来设计
- 是否保留了合理扩展点

发现问题后先修复，再重新执行 Validation 和 Hygiene。

---

## 9. 最终报告

最终回复必须包含：

### Summary
完成了什么。

### Files Changed
新增、修改、删除了哪些文件。

### Decisions
列出重要实现决定及原因；没有重要决定时写 N/A。

### Commands Run
实际执行的命令。

### Validation
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

不得自行 Commit、Push、Merge 或修改 Roadmap，除非当前 Task 明确要求。
