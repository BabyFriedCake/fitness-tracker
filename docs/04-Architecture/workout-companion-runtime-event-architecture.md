# Workout Companion Runtime Event Architecture

## 目的

定义陪练事件和 Runtime 的边界。

------------------------------------------------------------------------

# Event Flow

    Companion Event Source

    ↓

    RepCompleted Event

    ↓

    Workout Runtime

    ↓

    SetCompleted

    ↓

    ExerciseCompleted

------------------------------------------------------------------------

# Companion Layer

负责：

-   按 Event Source contract 提供已确认的 Rep 事件
-   产生 RepCompleted

不负责：

-   数据持久化
-   Session 状态管理

------------------------------------------------------------------------

# Runtime Layer

负责：

-   running
-   paused
-   set_completion_pending
-   resting
-   exercise_completion_pending
-   completed

负责：

-   进度更新
-   Set 完成判断
-   状态流转

不负责：

-   动作识别
-   姿态判断
-   生成模拟次数

# UI / Application Adapter

负责：

-   管理 Event Source 订阅生命周期。
-   验证 `RepCompleted` 外部输入。
-   按产生顺序串行交给 Runtime。
-   将 Runtime phase 和进度映射为 UI 状态。

不负责：

-   生成 Rep。
-   直接持久化 WorkoutSet。
-   绕过 Runtime 修改训练进度。
