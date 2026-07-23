# Functional Requirements

## FR-001 动作库

目标：

提供完整动作数据能力。

需求：

- 动作搜索
- 肌群分类
- 器械分类
- 动作详情
- 动作说明

数据来源：

允许接入开源动作数据，但必须检查许可证。

---

## FR-002 Voice Coach

目标：

训练过程中提供语音反馈。

需求：

- 开始提示
- 组完成提示
- 休息提示
- Runtime 状态提示

---

## FR-003 Auto Rep Counter

目标：

自动识别训练次数。

设计：

当前阶段只定义 Event Contract。

未来接入：

- Camera
- Pose Detection
- Rep Recognition

---

## FR-004 AI Coach

目标：

提供训练辅助。

范围：

- 历史分析
- 训练建议
- 动作建议

V1 不自动修改训练计划。

---

## FR-005 History Enhancement

增强历史能力：

- 日历视图
- 训练统计
- 趋势分析
- PR 展示
