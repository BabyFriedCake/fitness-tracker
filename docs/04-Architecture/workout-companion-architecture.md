# Workout Companion Architecture

## 目标

扩展 Sprint 5 Workout Runtime，支持未来陪练能力。

---

# Architecture

```
External Event Source

↓

Workout Companion Event Contract

↓

Workout Runtime

↓

UI / Voice / Analytics
```

---

# Event Source

包括：

- Timer
- Voice
- Camera
- Rep Counter

具体实现不属于 Runtime。

---

# 原则

## Runtime First

Runtime 管理训练状态。

UI 不直接修改训练进度。

## Event Driven

所有外部能力通过 Event Contract 接入。

## Device Independent

Runtime 不依赖：

- Camera
- Voice Engine
- AI Model

---

# Future Extension

支持：

- Voice Engine
- Camera Pose Provider
- AI Coach Service
