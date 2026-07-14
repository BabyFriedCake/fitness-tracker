# Fitness Tracker Database Documentation

Version: v1.0  
Status: Approved

本目录定义 Fitness Tracker V1 的本地 SQLite 数据结构。

## 文件

- `database-design.md`：整体设计原则
- `schema.md`：表、字段、外键、索引和查询
- `data-dictionary.md`：字段、枚举和统计口径
- `migrations.md`：数据库版本升级规则

## 已确认的产品规则

1. 取消训练时，已完成组保留，但默认不进入正式统计。
2. 历史允许纠错，并标记为已修改。
3. 哑铃记录单只重量。
4. 有氧数据模型预留，首版界面暂不实现。
