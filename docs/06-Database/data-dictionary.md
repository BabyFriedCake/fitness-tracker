# Fitness Tracker Data Dictionary

Version: v1.0  
Status: Approved  
Last Updated: 2026-07-14

---

## 通用字段

### id

稳定唯一字符串 ID。

建议 UUID。

### created_at

记录创建时间，UTC ISO 8601。

### updated_at

最后更新时间，UTC ISO 8601。

### edited_at

历史纠错时间。

### is_deleted

软删除标记：

- 0：有效
- 1：已删除

---

## 枚举

### exercise_type

- strength：力量训练
- cardio：有氧训练

### template status

- active：可使用
- archived：已归档

### session status

- draft：已创建但未开始
- in_progress：训练进行中
- completed：已完成并进入统计
- cancelled：已取消，默认不进入统计

### daily_status

- normal：正常
- fatigued：疲劳
- menstrual：经期
- unwell：不适

### rest timer status

- running：倒计时中
- paused：已暂停
- completed：自然结束
- skipped：用户跳过
- cancelled：因训练取消而结束

### set_type

V1：

- normal：普通工作组

未来预留：

- warmup
- drop_set
- failure
- assisted

### weight_unit

V1：

- kg

未来：

- lb

---

## 关键字段说明

### workout_template_exercises.target_reps_min

目标次数范围下限。

例如 8–10 次时保存 8。

### workout_template_exercises.target_reps_max

目标次数范围上限。

例如 8–10 次时保存 10。

固定 10 次时：

```text
target_reps_min = 10
target_reps_max = 10
```

### workout_sessions.name_snapshot

Session 创建时复制的模板名称。

模板以后改名，历史仍显示原名称。

### workout_sessions.current_session_exercise_id

训练恢复时使用的当前动作 ID。

### workout_sessions.current_set_number

训练恢复时使用的当前组号。

### workout_session_exercises.exercise_name_snapshot

创建 Session 时保存的动作名称快照。

### workout_sets.weight_value

实际重量。

哑铃动作记录单只重量。

### workout_sets.is_extra

是否属于目标组数之外的额外组。

额外组进入容量统计，但不使完成率超过 100%。

### workout_sets.was_edited

历史数据是否经过纠错。

### rest_timer_states.target_end_at

倒计时目标结束时间。

后台恢复时：

```text
remaining = target_end_at - now
```

### daily_statuses.local_date

用户本地自然日。

格式：

```text
YYYY-MM-DD
```

### user_settings.value_json

设置值的 JSON 编码。

示例：

```json
90
```

```json
true
```

```json
"kg"
```

---

## 统计口径

### 有效训练组

满足：

- workout_sets.is_completed = 1
- workout_sets.is_deleted = 0
- workout_sessions.status = completed
- workout_sessions.is_deleted = 0

### 单组训练容量

```text
weight_value × reps
```

### Session 总容量

所有有效力量训练组容量之和。

### 完成率

```text
有效完成组数 ÷ Session 目标组数
```

结果上限 100%。

### 最大重量 PR

某动作所有有效组中最大的 weight_value。

### 某重量最高次数

同一动作、同一 weight_value 下最大的 reps。

---

## 取消训练规则

cancelled Session：

- 保留已完成 Set
- 默认不进入历史统计和 PR
- 可以显示在恢复或异常记录中
- 后续版本可以允许用户转为 completed

---

## 历史纠错规则

V1 允许纠错：

- 修改重量
- 修改次数
- 删除错误组
- 修改备注

纠错后：

- was_edited = 1
- edited_at 写入时间
- updated_at 更新

V1 暂不保存完整旧值审计日志。
