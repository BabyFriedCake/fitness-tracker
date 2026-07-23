# Workout Companion Extension

## 架构目标

扩展 Sprint 5 Workout Runtime。

结构：

External Event Source

↓

Workout Companion Event Contract

↓

Workout Runtime

↓

UI / Voice / Analytics


## Event Source

包括：

- Timer
- Voice
- Camera
- Rep Counter


## 原则

Runtime 不依赖具体设备。

所有输入通过事件接口进入系统。
