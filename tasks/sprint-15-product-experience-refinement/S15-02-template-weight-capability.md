# S15-02 Template Weight Capability

## 目标

给训练模板增加可持久化的重量能力。

## 范围

- 训练模板 Domain
- 训练模板 Schema / Migration
- Repository
- 模板创建 / 编辑 / 详情 / 列表展示
- 相关文档同步

## 不做

- 不把重量只做成页面输入框
- 不修改 WorkoutSession 历史事实
- 不改 Runtime 训练事实

## 验收标准

- 模板可以保存重量
- 编辑页可以修改重量
- 模板详情和 Today 入口能正确展示重量

## 测试要求

- Domain contract 测试
- Schema / Migration 测试
- Repository 测试
- 模板创建/编辑 UI 测试

