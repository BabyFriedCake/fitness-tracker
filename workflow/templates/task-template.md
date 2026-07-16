# <TASK_ID>：<任务中文名称>

## Execution Prompt

Before doing anything:

Read and follow:

`workflow/prompts/implement-task.md`

Implementation MUST stop if this prompt cannot be read.

---

## 元数据

- Sprint：<SPRINT_ID>
- 状态：Ready
- 优先级：P0 / P1 / P2
- 负责人：AI + Human Reviewer
- 依赖任务：<TASK_ID 或 N/A>

---

## 目标

用 1～3 段说明当前 Task 必须交付的具体结果。

不要写整个 Sprint 的目标。

---

## 必读

- `AGENTS.md`
- `<相关 Prototype>`
- `<相关 Domain Model>`
- `<相关 Database 文档>`
- `<相关 Design System>`
- `<前置 Task 输出>`

只列真正影响本任务的文档。

---

## Scope

### 允许

- <允许修改的模块>
- <允许新增的能力>
- <允许同步的文档>

### 禁止

- <明确不做的后续功能>
- <不得修改的层>
- <不得引入的依赖>
- <不得改变的产品行为>

---

## 架构约束

- <依赖方向>
- <SQL 所在位置>
- <Route / Screen 边界>
- <Domain 纯度>
- <事务或快照原则>

不适用时写 N/A。

---

## 领域规则

- <核心业务规则>
- <状态转换>
- <验证要求>
- <幂等要求>

不涉及领域规则时写 N/A。

---

## 实现要求

- <必要实现细节>
- <错误处理>
- <可访问性>
- <性能边界>
- <离线行为>

只写必须遵守的约束，不规定无必要的具体实现。

---

## 验收标准

- [ ] <可验证结果 1>
- [ ] <可验证结果 2>
- [ ] <关键错误状态>
- [ ] <关键测试>
- [ ] 未提前实现后续 Task
- [ ] format、lint、typecheck、tests 全部通过
- [ ] Repository Hygiene 通过

所有验收项必须可以通过代码、测试或命令验证。

---

## 建议提交信息

```text
<type>: <中文提交说明>
```

例如：

```text
feat: 实现训练模板列表
```

---

## 人工 Review 重点

- <最需要人工确认的文件或设计>
- <容易过度实现的地方>
- <可能影响后续 Sprint 的契约>

---

## 完成产物

- <代码文件>
- <测试文件>
- <必要文档>

不适用时写 N/A。
