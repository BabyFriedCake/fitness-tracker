# Fitness Tracker Database Design

Version: v1.0  
Status: Approved  
Owner: Product Owner  
Last Updated: 2026-07-14

Related Documents:

- `docs/03-PRD/PRD.md`
- `docs/04-Architecture/architecture.md`
- `docs/04-Architecture/domain-model.md`
- `docs/05-Prototype/`

---

## 1. 文档目标

本文档定义 Fitness Tracker V1 的本地数据库设计原则、数据边界和持久化策略。

本文档回答：

- 哪些领域对象需要落库？
- 哪些数据属于事实数据？
- 哪些数据属于快照？
- 哪些结果实时计算，哪些可以缓存？
- 如何保证训练过程中数据不丢失？
- 如何为未来迁移、导出和云同步预留空间？

本文档不定义：

- React Native 页面
- 具体组件实现
- 云端数据库
- AI 模型
- UI 样式

---

## 2. 技术方向

V1 使用 SQLite 作为本地数据库。

目标：

- 无网络可完整使用
- 不要求登录
- 每完成一组立即保存
- App 意外退出后可恢复
- 支持未来数据导出
- 支持未来云同步
- 支持数据库迁移

所有业务 ID 使用稳定字符串 ID，建议使用 UUID。

时间统一保存为 ISO 8601 UTC 字符串，例如：

```text
2026-07-14T10:20:30.000Z
```

本地展示时再转换为用户时区。

---

## 3. 数据分类

### 3.1 事实数据

事实数据表示真实发生的训练。

包括：

- workout_sessions
- workout_session_exercises
- workout_sets
- daily_statuses

事实数据拥有最高优先级。

### 3.2 计划数据

计划数据表示用户打算如何训练。

包括：

- workout_templates
- workout_template_exercises

修改计划不得影响历史事实。

### 3.3 参考数据

参考数据是动作库和配置。

包括：

- exercises
- user_settings

### 3.4 临时状态

包括：

- rest_timer_states

它需要持久化，以支持后台恢复和 App 重启恢复。

### 3.5 派生数据

包括：

- 训练容量
- 完成率
- PR
- 趋势
- 推荐重量

V1 默认不将这些结果作为唯一事实长期保存。

它们应能由原始训练数据重新计算。

---

## 4. V1 表清单

```text
exercises
workout_templates
workout_template_exercises
workout_sessions
workout_session_exercises
workout_sets
rest_timer_states
daily_statuses
user_settings
schema_migrations
```

V1 暂不创建：

```text
personal_records
progress_metrics
recommendations
workout_groups
users
cloud_sync_records
```

这些对象可以实时计算或留到后续版本。

---

## 5. 关键设计决策

### 5.1 Template 与 Session 分离

开始训练时，将模板动作复制为 Session 动作快照。

原因：

- 当天可以临时调整
- 修改模板不影响历史
- 动作库变化不影响历史显示

### 5.2 SessionExercise 保存快照

SessionExercise 除了保存 exercise_id，还保存：

- exercise_name_snapshot
- muscle_group_snapshot
- equipment_snapshot
- 目标参数快照

原因：

即使动作库以后修改，历史仍能准确展示。

### 5.3 每组即时保存

用户点击“完成本组”后，必须立即写入 workout_sets。

不得等到训练结束后统一保存。

### 5.4 取消训练保留数据

已确认规则：

- 取消训练时，已完成组保留
- Session 状态设为 cancelled
- cancelled Session 默认不进入正式统计
- 用户可以从历史修复或恢复逻辑中查看
- 后续版本可支持转为 completed

### 5.5 历史允许纠错

已确认规则：

- 历史训练允许纠错
- 被修改的 Session 或 Set 必须标记为已编辑
- 保留 edited_at
- V1 不做完整审计日志，但预留字段

### 5.6 哑铃记录单只重量

例如两只 10 kg 哑铃，记录重量为：

```text
10
```

而不是 20。

后续统计容量时仍采用：

```text
weight × reps
```

不自动乘以 2。

这一规则必须在界面和说明中保持一致。

### 5.7 有氧暂不进入首版界面

V1 数据模型允许 Exercise 类型为 cardio。

但首个可用版本不实现有氧记录表单。

---

## 6. 数据删除策略

### Exercise

不建议物理删除。

使用 is_active 标记停用。

### WorkoutTemplate

优先归档，不直接删除。

### WorkoutSession

- draft 可删除
- cancelled 默认保留
- completed 默认不删除
- 未来支持软删除

### WorkoutSet

历史纠错时允许修改。

不建议直接删除，优先标记 is_deleted。

---

## 7. 事务要求

以下操作必须使用事务：

### 创建 Session

- 创建 workout_session
- 复制所有 workout_session_exercises

必须同时成功或同时失败。

### 完成本组

- 写入 workout_set
- 更新 session 当前状态或更新时间
- 创建或更新 rest_timer_state

应尽量在同一事务中完成。

### 完成训练

- 更新 session 为 completed
- 写入 end_time
- 清理 active rest_timer_state

---

## 8. 索引原则

优先为以下查询建立索引：

- 动作搜索
- 模板动作排序
- Session 状态查询
- 历史按时间倒序
- 查询某个动作最近一次训练
- 查询某 Session 的所有动作
- 查询某动作的所有 Set
- 查询当前运行中的 RestTimer

具体索引见 `schema.md`。

---

## 9. 数据恢复原则

App 启动时：

1. 查询 `workout_sessions.status = in_progress`
2. 若存在，恢复当前 Session
3. 查询对应 rest_timer_state
4. 根据 end_at 重新计算剩余时间
5. 若已到期，标记 completed 或显示到期状态
6. 已完成 WorkoutSet 不得丢失

V1 同一时间最多允许一个 in_progress Session。

---

## 10. 数据导出原则

未来导出至少覆盖：

- exercises 引用信息
- workout_templates
- workout_template_exercises
- workout_sessions
- workout_session_exercises
- workout_sets
- daily_statuses
- user_settings

格式：

- JSON
- CSV

导出必须保留稳定 ID 和时间字段。

---

## 11. 未来扩展

未来可加入：

- workout_groups：超级组
- cardio_records：有氧明细
- personal_records：PR 缓存
- recommendation_cache：建议缓存
- sync_metadata：云同步元数据
- audit_logs：完整修改日志

V1 不提前创建无实际用途的表。
