# AI Development Workflow（ADW）v2.0 Core

状态：Draft for Validation  
参考项目：Fitness Tracker  
目标：用统一的 Task、Prompt、Review 和 Report 驱动 AI 协作开发。

## 本包包含

```text
workflow/
├── README.md
├── VERSION.md
├── prompts/
│   ├── implement-task.md
│   └── sprint-exit-review.md
└── templates/
    ├── task-template.md
    └── sprint-exit-report-template.md
```

## 当前使用原则

- `Task` 说明“做什么”。
- `Prompt` 说明“怎么执行”。
- `Report Template` 说明“最终报告长什么样”。
- AI 不得依赖聊天记忆补齐缺失规范。
- 找不到 Execution Prompt 时必须停止。
- 每次只执行一个 Task。
- 人工 Review 通过后再 Commit。
- Sprint 完成后生成正式 Exit Report。

## 在 Fitness Tracker 中的迁移方式

先把 `workflow/` 整体复制到仓库根目录。

Sprint 3 验证期间：

- 保留现有 `tasks/prompts/`
- 新任务优先引用 `workflow/prompts/`
- 不要立刻删除旧 Prompt
- Sprint 3 结束后，根据实践决定是否完全迁移

## 执行示例

```text
执行：

tasks/sprint-3-workout-templates/S3-01-template-domain-and-contracts.md
```

Task 顶部必须明确引用：

```text
workflow/prompts/implement-task.md
```

Sprint Exit Task 顶部必须引用：

```text
workflow/prompts/sprint-exit-review.md
```
