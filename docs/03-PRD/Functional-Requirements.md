# Functional Requirements

版本：2.1

## FR-001 Exercise Library

目标：

提供完整动作库能力。

需求：

- 动作搜索
- 分类筛选
- 肌群筛选
- 器械筛选
- 动作详情
- 图片和说明资源

动作数据必须通过稳定 ID 关联。

---

## FR-002 Workout Companion

目标：

提供训练陪练能力。

数据流：

External Event Source

↓

Workout Companion Event Contract

↓

Workout Runtime

↓

UI / Voice / Analytics


原则：

Runtime 不依赖具体输入设备。

---

## FR-003 Voice Coach

目标：

提供类似 Keep 的训练语音反馈。

包括：

- 开始训练提示
- 次数反馈
- 组完成提示
- 休息提醒
- 训练总结

当前阶段：

仅定义能力和接口，不实现完整语音引擎。

---

## FR-004 Auto Rep Counter

目标：

支持自动次数识别。

未来输入：

- Camera
- Pose Detection
- Voice

输出：

RepCompleted Event

限制：

识别模块不能直接修改 Runtime。

---

## FR-005 History Enhancement

增强：

- 训练详情
- 日历
- 趋势
- 统计

---

## FR-006 AI Coach

未来支持：

- 训练建议
- 历史分析
- 动作建议
- 个性化反馈
