# Fitness Tracker Database Migrations

Version: v1.0  
Status: Approved  
Last Updated: 2026-07-14

---

## 1. 目标

确保 App 升级时：

- 用户历史数据不丢失
- 数据结构可追踪
- 迁移可以测试
- 失败时可以安全停止
- Codex 不得直接修改生产结构而不写 migration

---

## 2. 版本规则

数据库使用整数版本号。

例如：

```text
1
2
3
```

每个版本对应一份迁移。

命名建议：

```text
0001_initial_schema.sql
0002_add_session_edit_fields.sql
0003_add_workout_groups.sql
```

---

## 3. 初始迁移

V1 初始迁移：

```text
0001_initial_schema
```

创建：

- schema_migrations
- exercises
- workout_templates
- workout_template_exercises
- workout_sessions
- workout_session_exercises
- workout_sets
- rest_timer_states
- daily_statuses
- user_settings
- 所有索引

---

## 4. 执行规则

App 启动时：

1. 读取当前 schema version
2. 获取未执行迁移
3. 按版本顺序执行
4. 每个 migration 在事务中运行
5. 成功后写入 schema_migrations
6. 失败时回滚并停止进入主界面
7. 向用户显示可恢复错误

---

## 5. 禁止行为

不得：

- 直接删除包含历史数据的列
- 直接重命名列而不迁移数据
- 直接清空表
- 为了修复 Bug 重建数据库
- 在 migration 中修改 Workout Set 的业务事实
- 使用应用启动逻辑偷偷修正历史数据

---

## 6. 破坏性变更

必须采用：

1. 新增新表或新列
2. 复制转换数据
3. 验证数据
4. 切换读取逻辑
5. 后续版本再清理旧结构

不应在同一版本中直接破坏旧数据。

---

## 7. 数据备份

V1 开发阶段：

- migration 前可复制数据库文件作为调试备份
- 正式版本应提供导出能力
- 高风险迁移前应创建本地备份

---

## 8. 测试要求

每个 migration 必须测试：

- 空数据库
- 只有模板的数据
- 有 completed Session 的数据
- 有 in_progress Session 的数据
- 有 cancelled Session 的数据
- 有历史纠错标记的数据
- migration 重复执行不会再次修改数据

---

## 9. 回滚策略

移动端本地数据库通常不执行自动 downgrade。

如果新版 migration 失败：

- 保持旧数据库不变
- 停止后续迁移
- 不删除用户数据
- 记录错误
- 提供重新尝试或导出支持

---

## 10. Codex 规则

Codex 修改数据库结构时必须：

1. 更新 `schema.md`
2. 更新 `data-dictionary.md`
3. 新增 migration 文件
4. 更新 migration 测试
5. 说明对已有数据的影响
6. 不得只修改 TypeScript 类型而忽略数据库
