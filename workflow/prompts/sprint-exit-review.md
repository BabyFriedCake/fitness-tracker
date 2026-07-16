# Sprint Exit Review Prompt

Version: 2.0  
Status: Draft for Validation

## 使命

审查整个 Sprint 是否达到了既定目标，并生成可追溯的正式 Exit Report。

这是 Review 任务，不是开发任务。

不得在初始审查阶段实现新功能。

---

## 1. 启动协议

开始前必须读取：

1. 仓库根目录 `AGENTS.md`
2. 当前 Sprint README
3. 当前 Sprint 全部 Task
4. 当前 Sprint Exit Review Task
5. `docs/00-Project/roadmap.md`
6. 相关 Architecture、Domain、Database、Prototype、Design System
7. `docs/09-Release/Sprint-Exit-Report-Template.md`，若不存在则使用 `workflow/templates/sprint-exit-report-template.md`

无法读取本 Prompt 或当前 Sprint Task 时必须停止。

---

## 2. Review 原则

必须区分三类结果：

### PASS
所有阻塞性质量门通过，可以进入下一 Sprint。

### PASS WITH WARNINGS
阻塞性质量门通过，但仍有非阻塞验证或技术债需要记录。

### FAIL
存在阻塞问题，不应进入下一 Sprint。

不得因为以下情况单独判定 FAIL：

- 本地提交尚未 Push
- GitHub-hosted CI 尚未因 Push 而运行
- Roadmap 尚待最终收尾更新
- 非本 Sprint 强制要求的真机验证尚未执行
- Tag / Release 尚未创建

这些应记录为 Warnings 或 Release Follow-ups。

---

## 3. 阻塞性质量门

以下任一失败，应判定 FAIL：

- Task 核心验收标准未满足
- format、lint、typecheck 或 tests 失败
- 存在未解决的架构越界
- 数据库 Migration 不安全
- 关键持久化存在数据丢失或重复写入风险
- Repository Hygiene 发现密钥、冲突标记或来源不明文件
- Sprint 交付与 Prototype / Domain / Database 明显冲突
- 关键功能无法在任务要求的平台运行

---

## 4. Sprint 完成度审查

逐项检查：

- 所有计划 Task 是否完成
- 未完成项是否明确记录
- 是否提前混入下一 Sprint
- 是否存在 Scope creep
- 每个 Task 是否有可追溯提交或变更
- Sprint Goal 是否真正交付给用户或下游模块

---

## 5. 架构审查

检查：

- 依赖方向
- Domain 纯度
- Route / UI 边界
- Application / Use Case 责任
- Repository interface 与实现
- SQL 隔离
- Migration
- Snapshot / History 等既定原则
- 第三方依赖合理性
- 是否出现为未来过度设计

输出明确的 Architecture Violations 数量。

---

## 6. 质量验证

执行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

并执行 Sprint Task 要求的额外验证。

记录：

- Test suites
- Tests
- Passed / Failed / Skipped
- Browser / Native / Build 状态
- Migration 数量
- 关键业务场景覆盖

---

## 7. Repository Hygiene

执行：

```bash
git status --short
git diff --check
git diff --stat
git clean -nd
```

检查：

- 单一正式 `AGENTS.md`
- IDE / AI 私有配置
- 缓存、日志、数据库、导出文件
- 密钥与环境文件
- 冲突标记
- TODO / FIXME / debugger
- 未使用 Demo 或模板残留
- 未提交的来源不明修改

---

## 8. CI 与 Release Readiness

检查：

- GitHub Actions workflow 是否存在
- 依赖安装是否 frozen lockfile
- CI Pipeline 是否覆盖 format / lint / typecheck / tests
- GitHub-hosted CI 当前状态
- Merge、Tag、Release、Roadmap 的后续动作

CI 尚未因 Push 触发时写 `Pending`，不要因此单独判定 FAIL。

---

## 9. 文档同步

检查：

- Roadmap 是否反映当前 Sprint 状态
- Architecture 是否仍与代码一致
- Database 文档是否与 Migration 一致
- Prototype 是否与页面行为一致
- Development Guide 是否仍适用
- 技术债是否记录
- Exit Report 数据是否有仓库证据

---

## 10. Exit Decision

按以下格式给出结论：

- Overall Result：PASS / PASS WITH WARNINGS / FAIL
- Ready for Next Sprint：YES / YES WITH WARNINGS / NO
- Blocking Issues：阻塞问题
- Warnings：非阻塞事项
- Release Follow-ups：Merge、Push、CI、Tag、Release、Roadmap 等收尾动作

结论必须基于证据，不得为了“完成 Sprint”而降低标准。

---

## 11. Output

根据：

`workflow/templates/sprint-exit-report-template.md`

或仓库已采用的等价模板，生成：

`docs/09-Release/Sprint-<N>-Exit-Report.md`

要求：

- 创建真实 Markdown 文件
- 填写所有适用章节
- 不适用项写 N/A 并说明
- 数据必须来自仓库、命令和测试结果
- 不得编造 Test 数量、CI 状态或完成情况
- 不要只在聊天中输出完整报告
- 不得自动 Commit、Push、Merge、Tag 或修改 Roadmap
- 生成后等待 Human Review

最终聊天回复只需包含：

- 新增/修改文件
- Overall Result
- Ready for Next Sprint
- Blocking Issues
- Warnings
- 等待人工 Review
