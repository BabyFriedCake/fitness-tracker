# Workout Companion Architecture

## 目标

定义训练陪伴系统架构。

## 数据流

```
External Input
      |
      v
Workout Companion Event Source
      |
      v
Workout Runtime
      |
      +---- Voice Coach
      |
      +---- Auto Rep Counter
      |
      v
Workout History
```

## 原则

- Runtime 不直接依赖具体输入设备。
- Camera、Voice、Timer Simulation 作为 Event Source。
- 所有外部能力通过 Contract 接入。

## 后续扩展

支持：

- Camera Pose Provider
- Voice Engine
- AI Coach Service
