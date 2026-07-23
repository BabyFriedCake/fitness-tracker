# Fitness Tracker Architecture

Version: v1.0  
Status: Approved

## 核心原则

- Workout Template 是计划。
- Workout Session 是某一天真实训练的快照。
- Workout Set 是最高优先级的事实数据。

数据优先级：

1. WorkoutSet
2. WorkoutSession
3. WorkoutTemplate

## 数据流

```text
WorkoutTemplate
→ WorkoutSession (draft)
→ 当天临时调整
→ WorkoutSession (in_progress)
→ WorkoutSet 即时保存
→ WorkoutSession (completed)
→ 历史、统计和建议
```

## 核心对象

- Exercise
- WorkoutTemplate
- TemplateExercise
- WorkoutSession
- SessionExercise
- WorkoutSet
- RestTimer
- DailyStatus
- UserSetting

## Session 创建规则

1. 选择模板后创建 draft Session。
2. 复制模板名称和动作配置。
3. 查询最近历史表现。
4. 计算默认重量和建议。
5. 用户可临时调整。
6. 开始后状态改为 in_progress。

## 恢复规则

必须持久化：

- 当前 Session
- 当前动作
- 已完成组
- 当前休息状态
- 目标结束时间

App 启动时应恢复进行中的训练。

## 统计原则

```text
单组容量 = 重量 × 实际次数
完成率 = 完成有效组数 ÷ 目标组数
```

PR 必须来自真实完成组。

## 禁止项

- 模板变化不得改写历史。
- 不得只在训练结束时保存全部组。
- 不得使用显示名称作为唯一关联。
- 计时不得只存在页面内存中。
- AI 建议不得覆盖用户数据。
