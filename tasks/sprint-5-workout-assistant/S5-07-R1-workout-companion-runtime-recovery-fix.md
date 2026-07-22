# S5-07-R1-workout-companion-runtime-recovery-fix.md

## 任务名称

S5-07-R1 训练陪练运行时恢复机制修复

## 背景

S5-07 已完成 Workout Companion Runtime 与 UI Runtime Binding：

-   新增 WorkoutCompanionEventSource。
-   Rep Event 已进入 Companion Runtime Flow。
-   页面已移除手动次数和完成本组入口。
-   Runtime 已支持暂停、恢复、休息、总结和失败重试流程。

Human Review 发现以下问题：

1.  resting 阶段没有真实倒计时展示。
2.  持久化失败后的 pending 状态缺少可靠恢复路径。
3.  Runtime 替换、事件拒绝和失败场景缺少测试覆盖。

------------------------------------------------------------------------

## Scope

### 1. Resting 倒计时状态展示

要求：

-   Runtime 输出剩余休息秒数。
-   UI 展示 countdown。
-   倒计时结束后进入已有恢复流程。

示例：

``` ts
{
  phase: "resting",
  restRemainingSeconds: 45
}
```

------------------------------------------------------------------------

### 2. Pending 状态恢复机制

修复：

-   exercise_completion_pending
-   set_completion_pending

成功流程：

    pending
     ↓
    persist success
     ↓
    completed

失败流程：

    pending
     ↓
    persist failure
     ↓
    保持 pending
     ↓
    允许 retry

要求：

-   不推进错误 Runtime 状态。
-   不重复生成完成事件。
-   retry 后可以继续正常流程。

------------------------------------------------------------------------

### 3. Runtime 生命周期安全

增加：

-   Runtime 替换时正确 unsubscribe。
-   Session 替换时取消旧事件订阅。
-   pending phase 拒绝非法 Rep Event。
-   非 running 状态不能推进训练动作。

------------------------------------------------------------------------

## 测试要求

覆盖：

-   resting countdown。
-   pending 保存失败恢复。
-   retry 成功和失败。
-   Runtime 替换取消订阅。
-   pending 状态拒绝 RepCompleted。
-   Companion 持久化失败。
-   Voice Adapter 失败隔离。

------------------------------------------------------------------------

## 明确不包含

禁止修改：

-   Exercise Library
-   动作库导入
-   Figma UI Layout 重构
-   History Calendar
-   AI 计数
-   Pose Recognition
-   Voice Rep Counter 实现

------------------------------------------------------------------------

## Validation

执行：

``` bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

------------------------------------------------------------------------

## 完成标准

-   resting 阶段有真实倒计时。
-   pending 状态失败可恢复。
-   Runtime 生命周期安全。
-   测试全部通过。
-   不引入 Sprint 6 范围内容。
