# S5-04 Workout Runtime UI Integration

## Goal

将 Sprint 5 已完成的 Workout Runtime Engine 接入训练流程 UI。

让用户可以： - 进入训练 - 查看当前动作 - 查看当前组数 - 查看当前次数 -
暂停训练 - 恢复训练 - 完成训练

## Scope

### Include

-   新增 Runtime Screen Application Hook
-   UI 读取 Runtime Engine 状态
-   支持 running / paused / completed 状态展示
-   增加开始训练入口
-   增加暂停 / 恢复按钮
-   接入已有 WorkoutVoiceFeedback Application 能力

### Exclude

本任务不包含：

-   真实语音播放实现
-   后台运行
-   锁屏控制
-   Notification
-   Apple Watch
-   新增数据库字段
-   修改 Schema / Migration
-   修改 Domain Aggregate

## Architecture Requirement

必须保持：

UI

↓

Application Hook / Use Case

↓

Runtime Engine

↓

Repository

禁止：

-   UI 直接访问 SQLite
-   UI 直接修改 Session
-   UI 自己计算训练状态

## Functional Requirements

### 1. Runtime Screen

新增训练运行页面。

展示：

-   训练名称
-   当前动作名称
-   当前第几组
-   当前次数
-   当前状态

状态：

running:

训练中

paused:

训练暂停

completed:

训练完成

## 2. Start Workout

用户点击开始：

Runtime Engine:

idle → running

加载：

-   当前 Session
-   当前 Exercise
-   当前 Set

## 3. Pause Workout

用户点击暂停：

running → paused

要求：

-   不丢失当前动作
-   不改变 WorkoutSet 历史数据

## 4. Resume Workout

用户点击继续：

paused → running

恢复：

-   当前动作
-   当前 Set
-   Runtime 状态

## 5. Complete Workout

完成训练：

running → completed

保持：

-   原有 Summary 流程
-   History 流程

## Voice Integration

接入：

WorkoutVoiceFeedback

只调用 Application API。

不实现：

-   iOS Speech API
-   Android Speech API

## Files Expected

可能新增：

    apps/mobile/src/features/workout-session/application/
        use-workout-runtime.ts

    apps/mobile/src/features/workout-session/screens/
        workout-runtime-screen.tsx

    apps/mobile/src/features/workout-session/__tests__/
        workout-runtime-screen.test.tsx

实际文件根据现有结构调整。

## Tests

必须增加：

### Runtime Hook Test

覆盖：

-   初始化 runtime
-   running 状态
-   paused 状态
-   completed 状态

### UI Test

覆盖：

-   显示当前动作
-   点击暂停
-   点击恢复
-   点击完成

## Self Review

检查：

-   UI 未访问 Repository
-   UI 未访问 SQLite
-   Runtime Engine 为唯一状态来源
-   未修改 Schema
-   未修改 Domain Model
-   未引入第三方语音依赖

## Validation

执行：

``` bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

## Completion Criteria

满足：

-   用户可以进入训练运行页面
-   可以看到当前训练状态
-   可以暂停训练
-   可以恢复训练
-   可以完成训练
-   不破坏 S4-08 Recovery Flow
-   不破坏 S4-09 Today Dashboard
-   不破坏 S4-10 History
