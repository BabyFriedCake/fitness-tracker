# Fitness Tracker SQLite Schema

Version: v1.0  
Status: Approved  
Last Updated: 2026-07-17

---

## 1. schema_migrations

用于记录数据库版本。

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
```

---

## 2. exercises

标准动作库。

```sql
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_en TEXT,
  exercise_type TEXT NOT NULL DEFAULT 'strength',
  primary_muscle_group TEXT NOT NULL,
  secondary_muscle_groups_json TEXT,
  equipment TEXT NOT NULL,
  description TEXT,
  instruction_steps_json TEXT,
  image_uri TEXT,
  source_name TEXT,
  source_reference TEXT,
  source_license TEXT,
  source_attribution TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

约束说明：

- exercise_type: strength | cardio
- is_active: 0 | 1
- secondary_muscle_groups_json 保存 JSON 数组
- instruction_steps_json 保存本地化有序步骤对象
- image_uri 只引用可合法分发的本地媒体
- source_license 和 source_attribution 不得通过 source_reference 拼接代替

索引：

```sql
CREATE INDEX idx_exercises_name_zh
ON exercises(name_zh);

CREATE INDEX idx_exercises_name_en
ON exercises(name_en);

CREATE INDEX idx_exercises_muscle_equipment
ON exercises(primary_muscle_group, equipment);

CREATE INDEX idx_exercises_active
ON exercises(is_active);
```

---

## 3. workout_templates

训练模板。

```sql
CREATE TABLE workout_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK (
    (status = 'active' AND archived_at IS NULL)
    OR (status = 'archived' AND archived_at IS NOT NULL)
  )
);
```

状态：

- active
- archived

索引：

```sql
CREATE INDEX idx_workout_templates_status
ON workout_templates(status);

CREATE INDEX idx_workout_templates_updated_at
ON workout_templates(updated_at DESC);
```

---

## 4. workout_template_exercises

模板动作配置。

```sql
CREATE TABLE workout_template_exercises (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  target_sets INTEGER NOT NULL CHECK (target_sets > 0),
  target_reps_min INTEGER NOT NULL CHECK (target_reps_min > 0),
  target_reps_max INTEGER NOT NULL
    CHECK (target_reps_max >= target_reps_min),
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds >= 0),
  group_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (template_id)
    REFERENCES workout_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (exercise_id)
    REFERENCES exercises(id)
    ON DELETE RESTRICT
);
```

索引：

```sql
CREATE UNIQUE INDEX idx_template_exercise_position
ON workout_template_exercises(template_id, position);

CREATE INDEX idx_template_exercises_template
ON workout_template_exercises(template_id);

CREATE INDEX idx_template_exercises_exercise
ON workout_template_exercises(exercise_id);
```

V1 规则：

- target_sets > 0
- target_reps_min > 0
- target_reps_max >= target_reps_min
- rest_seconds >= 0
- group_key 预留超级组能力，V1 通常为空

---

## 5. workout_sessions

一次真实训练。

```sql
CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  source_template_id TEXT,
  workout_name_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  daily_status TEXT
    CHECK (
      daily_status IS NULL
      OR daily_status IN ('normal', 'fatigued', 'menstrual', 'unwell')
    ),
  notes TEXT,
  started_at TEXT,
  ended_at TEXT,
  current_session_exercise_id TEXT,
  current_set_number INTEGER
    CHECK (current_set_number IS NULL OR current_set_number > 0),
  was_edited INTEGER NOT NULL DEFAULT 0
    CHECK (was_edited IN (0, 1)),
  edited_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0
    CHECK (is_deleted IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  CHECK (
    (status = 'draft' AND started_at IS NULL AND ended_at IS NULL)
    OR (
      status = 'in_progress'
      AND started_at IS NOT NULL
      AND ended_at IS NULL
    )
    OR (
      status = 'completed'
      AND started_at IS NOT NULL
      AND ended_at IS NOT NULL
    )
    OR (status = 'cancelled' AND ended_at IS NOT NULL)
  ),

  FOREIGN KEY (source_template_id)
    REFERENCES workout_templates(id)
    ON DELETE SET NULL
);
```

状态：

- draft
- in_progress
- completed
- cancelled

生命周期时间约束：

- draft：started_at 和 ended_at 均为空
- in_progress：started_at 有值，ended_at 为空
- completed：started_at 和 ended_at 均有值
- cancelled：started_at 可为空，ended_at 必须有值

daily_status：

- normal
- fatigued
- menstrual
- unwell

索引：

```sql
CREATE INDEX idx_sessions_status
ON workout_sessions(status);

CREATE INDEX idx_sessions_started_at
ON workout_sessions(started_at DESC);

CREATE INDEX idx_sessions_template
ON workout_sessions(source_template_id);

CREATE INDEX idx_sessions_deleted
ON workout_sessions(is_deleted);
```

应用层必须保证：

- 同一时间最多一个 in_progress Session

---

## 5A. today_workout_plans

Today 页面中某个本地日期已选择的训练模板入口。

```sql
CREATE TABLE today_workout_plans (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  source_template_id TEXT NOT NULL,
  session_id TEXT,
  title_snapshot TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  status TEXT NOT NULL
    CHECK (status IN ('planned', 'draft', 'in_progress', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  UNIQUE(local_date, source_template_id),
  UNIQUE(session_id),

  FOREIGN KEY (source_template_id)
    REFERENCES workout_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (session_id)
    REFERENCES workout_sessions(id)
    ON DELETE SET NULL
);
```

状态：

- planned
- draft
- in_progress
- completed
- cancelled

索引：

```sql
CREATE INDEX idx_today_workout_plans_local_date
ON today_workout_plans(local_date, position ASC);

CREATE INDEX idx_today_workout_plans_template
ON today_workout_plans(source_template_id);

CREATE INDEX idx_today_workout_plans_status
ON today_workout_plans(status);
```

规则：

- local_date 使用用户本地自然日，格式为 YYYY-MM-DD。
- 同一 local_date 下同一 source_template_id 只能出现一次。
- session_id 可为空，表示尚未创建 WorkoutSession。
- session_id 非空时必须唯一。
- status 用于查询和缓存，展示状态必须优先读取关联 WorkoutSession。

---

## 6. workout_session_exercises

本次训练中的动作快照。

```sql
CREATE TABLE workout_session_exercises (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  source_exercise_id TEXT NOT NULL,
  exercise_name_snapshot TEXT NOT NULL,
  primary_muscle_group_snapshot TEXT,
  equipment_snapshot TEXT,
  position INTEGER NOT NULL CHECK (position > 0),
  is_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (is_enabled IN (0, 1)),
  is_skipped INTEGER NOT NULL DEFAULT 0
    CHECK (is_skipped IN (0, 1)),
  is_completed INTEGER NOT NULL DEFAULT 0
    CHECK (is_completed IN (0, 1)),
  target_sets INTEGER NOT NULL CHECK (target_sets > 0),
  target_reps_min INTEGER NOT NULL CHECK (target_reps_min > 0),
  target_reps_max INTEGER NOT NULL
    CHECK (target_reps_max >= target_reps_min),
  current_rest_seconds INTEGER NOT NULL
    CHECK (current_rest_seconds >= 0),
  group_key TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_id)
    REFERENCES workout_sessions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (source_exercise_id)
    REFERENCES exercises(id)
    ON DELETE RESTRICT
);
```

索引：

```sql
CREATE UNIQUE INDEX idx_session_exercise_position
ON workout_session_exercises(session_id, position);

CREATE INDEX idx_session_exercises_session
ON workout_session_exercises(session_id);

CREATE INDEX idx_session_exercises_exercise
ON workout_session_exercises(source_exercise_id);
```

---

## 7. workout_sets

真实训练组。

```sql
CREATE TABLE workout_sets (
  id TEXT PRIMARY KEY,
  session_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  set_type TEXT NOT NULL DEFAULT 'normal'
    CHECK (set_type = 'normal'),
  actual_reps INTEGER NOT NULL CHECK (actual_reps >= 0),
  weight REAL NOT NULL CHECK (weight >= 0),
  is_completed INTEGER NOT NULL DEFAULT 1
    CHECK (is_completed IN (0, 1)),
  is_extra_set INTEGER NOT NULL DEFAULT 0
    CHECK (is_extra_set IN (0, 1)),
  completed_at TEXT NOT NULL,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  is_deleted INTEGER NOT NULL DEFAULT 0
    CHECK (is_deleted IN (0, 1)),
  was_edited INTEGER NOT NULL DEFAULT 0
    CHECK (was_edited IN (0, 1)),
  edited_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_exercise_id)
    REFERENCES workout_session_exercises(id)
    ON DELETE CASCADE
);
```

set_type：

- normal

未来预留：

- warmup
- drop_set
- failure
- assisted

索引：

```sql
CREATE UNIQUE INDEX idx_set_number_active
ON workout_sets(session_exercise_id, set_number)
WHERE is_deleted = 0;

CREATE INDEX idx_sets_session_exercise
ON workout_sets(session_exercise_id);

CREATE INDEX idx_sets_completed_at
ON workout_sets(completed_at DESC);

CREATE INDEX idx_sets_deleted
ON workout_sets(is_deleted);
```

规则：

- actual_reps >= 0
- weight >= 0
- 哑铃记录单只重量
- 未点击完成的输入不写入本表
- 不保存 target_reps；目标次数属于 SessionExercise 快照

`current_session_exercise_id`、`current_set_number`、历史纠错、软删除、
动作补充快照、`group_key`、`completed_at` 和 `weight_unit` 等列由 `0003`
原样迁移保留，避免破坏已有数据；S4-02 不实现这些列对应的 Recovery 或纠错流程。

---

## 8. rest_timer_states

当前休息计时状态。

```sql
CREATE TABLE rest_timer_states (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  session_exercise_id TEXT NOT NULL,
  previous_set_number INTEGER,
  next_set_number INTEGER,
  original_duration_seconds INTEGER NOT NULL,
  started_at TEXT,
  target_end_at TEXT,
  paused_remaining_seconds INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (session_id)
    REFERENCES workout_sessions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (session_exercise_id)
    REFERENCES workout_session_exercises(id)
    ON DELETE CASCADE
);
```

状态：

- running
- paused
- completed
- skipped
- cancelled

索引：

```sql
CREATE INDEX idx_rest_timer_status
ON rest_timer_states(status);

CREATE INDEX idx_rest_timer_target_end
ON rest_timer_states(target_end_at);
```

每个 Session 最多一条当前 RestTimer 记录。

完成或跳过后可以更新状态，也可以在 Session 完成时清理。

---

## 9. daily_statuses

每日主观状态。

```sql
CREATE TABLE daily_statuses (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

local_date 格式：

```text
YYYY-MM-DD
```

状态：

- normal
- fatigued
- menstrual
- unwell

索引：

```sql
CREATE INDEX idx_daily_status_date
ON daily_statuses(local_date DESC);
```

---

## 10. user_settings

本地用户设置。

```sql
CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

建议键：

```text
weight_unit
default_weight_increment
default_rest_seconds
notification_enabled
sound_enabled
vibration_enabled
onboarding_completed
```

value_json 统一保存 JSON 编码值。

---

## 11. 查询示例

### 查询进行中的 Session

```sql
SELECT *
FROM workout_sessions
WHERE status = 'in_progress'
  AND is_deleted = 0
LIMIT 1;
```

### 查询某动作最近一次有效训练

```sql
SELECT
  ws.weight,
  ws.actual_reps,
  ws.completed_at
FROM workout_sets ws
JOIN workout_session_exercises wse
  ON wse.id = ws.session_exercise_id
JOIN workout_sessions session
  ON session.id = wse.session_id
WHERE wse.source_exercise_id = ?
  AND session.status = 'completed'
  AND session.is_deleted = 0
  AND ws.is_completed = 1
  AND ws.is_deleted = 0
ORDER BY ws.completed_at DESC
LIMIT 1;
```

### 查询某次训练详情

```sql
SELECT
  wse.*,
  ws.*
FROM workout_session_exercises wse
LEFT JOIN workout_sets ws
  ON ws.session_exercise_id = wse.id
  AND ws.is_deleted = 0
WHERE wse.session_id = ?
ORDER BY wse.position, ws.set_number;
```

---

## 12. 不落库的派生结果

V1 默认实时计算：

- 训练总容量
- 完成率
- PR
- 周/月统计
- Progressive Challenge
- 动作趋势

性能不足时再增加缓存表。
