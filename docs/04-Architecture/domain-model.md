# Fitness Tracker Domain Model

Version: v1.0  
Status: Draft  
Owner: Product Owner  
Last Updated: 2026-07-14

Related Documents:

- `docs/01-Vision/vision.md`
- `docs/02-Constitution/constitution.md`
- `docs/03-PRD/PRD.md`
- `docs/04-Architecture/architecture.md`
- `docs/05-Prototype/`

---

## 1. 文档目标

本文档定义 Fitness Tracker 的核心业务对象、对象职责、生命周期和相互关系。

本文档回答：

- 系统中有哪些核心实体？
- 哪些数据属于计划？
- 哪些数据属于真实训练？
- 哪些数据是用户输入的事实？
- 哪些内容是系统计算出的结果？
- 哪些对象需要长期保存？
- 哪些对象只表示临时状态？

本文档不定义：

- SQLite 字段类型
- 数据库索引
- React Native 页面
- UI 样式
- 具体代码结构

---

## 2. 领域模型总览

```text
Exercise
   │
   ├───────────────┐
   │               │
   ▼               ▼
WorkoutTemplate   WorkoutSession
   │               │
   ▼               ▼
TemplateExercise  SessionExercise
                       │
                       ▼
                   WorkoutSet
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     RestTimer     ProgressMetric  Recommendation
```

辅助对象：

```text
DailyStatus
UserSetting
WorkoutNote
```

---

## 3. 核心领域划分

Fitness Tracker V1 分为五个领域：

### 3.1 动作领域

负责标准动作定义。

核心对象：

- Exercise

### 3.2 计划领域

负责用户打算如何训练。

核心对象：

- WorkoutTemplate
- TemplateExercise

### 3.3 训练执行领域

负责某一天真实发生的训练。

核心对象：

- WorkoutSession
- SessionExercise
- WorkoutSet
- RestTimer

### 3.4 进步分析领域

负责根据历史事实计算训练表现。

核心对象：

- ProgressMetric
- PersonalRecord
- Recommendation

### 3.5 用户偏好领域

负责用户的训练状态和本地偏好。

核心对象：

- DailyStatus
- UserSetting

---

## 4. Exercise

### 4.1 定义

Exercise 表示动作库中的一个标准训练动作。

例如：

- 杠铃卧推
- 高位下拉
- 坐姿划船
- 哑铃肩推
- 跑步机
- 椭圆机

Exercise 是标准定义，不是某一次训练记录。

### 4.2 核心属性

概念属性包括：

- 唯一标识
- 中文名称
- 英文名称
- 主要训练部位
- 次要训练部位
- 器械类型
- 训练类型
- 动作说明
- 图片资源
- 数据来源
- 是否启用

### 4.3 业务规则

1. 每个 Exercise 必须具有稳定唯一标识。
2. 历史记录通过标识关联动作，不通过显示名称关联。
3. 修改动作名称不得破坏历史记录。
4. V1 用户只能从标准动作库选择动作。
5. V1 不支持用户自定义动作。
6. 动作被停用后，历史训练仍必须正常显示。
7. 动作数据集升级不能自动改写历史训练事实。

### 4.4 Exercise 类型

#### Strength Exercise

力量训练动作。

记录：

- 重量
- 次数
- 组数
- 休息时间

例如：

- 卧推
- 腿举
- 哑铃弯举

#### Cardio Exercise

有氧训练动作。

V1 计划支持：

- 跑步机
- 椭圆机

未来可以记录：

- 时长
- 距离
- 阻力
- 坡度

V1 的核心开发仍以力量训练为优先。

---

## 5. WorkoutTemplate

### 5.1 定义

WorkoutTemplate 表示用户长期保存、可重复使用的一套训练计划。

例如：

- Push
- Pull
- Legs
- 胸肩训练
- 全身训练

它描述“计划怎么练”，不描述“实际练了什么”。

### 5.2 核心属性

- 唯一标识
- 模板名称
- 描述
- 状态
- 动作集合
- 创建时间
- 更新时间

### 5.3 生命周期

```text
Created
   ↓
Active
   ↓
Archived
```

V1 不建议直接永久删除已使用过的模板。

归档模板：

- 不再出现在默认训练选择列表
- 不影响由它生成的历史 Session
- 以后可以恢复

### 5.4 业务规则

1. 模板至少包含一个动作才能用于开始训练。
2. 模板不代表真实训练记录。
3. 模板不固定保存下一次真实重量。
4. 模板修改不得影响历史 Session。
5. 模板可以重复创建多个 Session。
6. 模板不绑定固定星期。
7. 用户每天可以根据身体状态自主选择模板。

---

## 6. TemplateExercise

### 6.1 定义

TemplateExercise 表示一个动作在训练模板中的配置。

它不是独立 Exercise，也不是实际完成记录。

例如：

```text
Push 模板中的杠铃卧推：

目标 4 组
目标 8–10 次
休息 90 秒
顺序 1
```

### 6.2 核心属性

- 所属模板
- 标准动作
- 动作顺序
- 目标组数
- 目标次数
- 最小目标次数
- 最大目标次数
- 默认休息时间
- 分组信息预留

### 6.3 业务规则

1. 同一个动作可以存在于多个模板。
2. 同一个动作可以在一个模板中重复出现，但 V1 默认阻止重复添加。
3. 调整顺序只影响未来从模板创建的 Session。
4. 修改目标参数不影响历史。
5. 重量不属于固定模板目标。
6. 超级组能力可预留分组标识，但 V1 不开放交互入口。

---

## 7. WorkoutSession

### 7.1 定义

WorkoutSession 表示某一天真实发生的一次训练。

它是训练历史的主体。

例如：

```text
2026-07-14
Push
开始时间 18:20
结束时间 19:18
状态 completed
```

### 7.2 来源

Session 可以来源于：

- WorkoutTemplate
- 未来的自定义空白训练
- 未来的 AI 推荐计划

V1 主要来源于 WorkoutTemplate。

### 7.3 生命周期

```text
Draft
  ↓
In Progress
  ↓
Completed
```

其他路径：

```text
Draft → Cancelled
In Progress → Cancelled
```

### 7.4 状态定义

#### Draft

已经创建训练副本，但尚未正式开始。

用户可以：

- 添加动作
- 删除动作
- 修改顺序
- 修改组数
- 修改次数
- 修改休息时间

#### In Progress

训练已经开始。

系统开始记录：

- 训练开始时间
- 当前动作
- 当前组
- 已完成 Workout Set
- 休息状态

#### Completed

用户完成并保存训练。

进入：

- 历史统计
- PR 计算
- 下一次建议计算

#### Cancelled

训练被取消。

已完成的组可以保留为恢复数据或取消记录，但默认不进入正式训练统计。

具体保留策略在 Database Design 中确定。

### 7.5 核心属性

- 唯一标识
- 来源模板
- 训练名称快照
- 状态
- 开始时间
- 结束时间
- Session 动作集合
- 当日状态
- 训练备注
- 创建时间
- 更新时间

### 7.6 业务规则

1. Session 创建时必须复制模板内容。
2. Session 后续不依赖模板才能显示。
3. 修改 Session 不得修改 Template。
4. 修改 Template 不得修改 Session。
5. Completed Session 是历史事实。
6. 训练过程中完成的每一组必须立即保存。
7. 同一时间 V1 默认只允许一个进行中的 Session。
8. App 启动时发现进行中的 Session，必须提供恢复入口。
9. Session 名称应保存快照，避免模板改名影响历史。

---

## 8. SessionExercise

### 8.1 定义

SessionExercise 表示某一个动作在本次真实训练中的配置和执行状态。

它由 TemplateExercise 复制产生，但复制后独立存在。

### 8.2 核心属性

- 所属 Session
- 标准动作标识
- 动作名称快照
- 动作顺序
- 目标组数
- 目标次数范围
- 当前休息时间
- 是否启用
- 是否跳过
- 是否完成

### 8.3 为什么需要快照

假设训练完成后：

- 动作库修改了名称
- 模板删除了该动作
- 模板修改了目标组数
- 模板改变了动作顺序

历史 Session 仍然需要准确显示当时的训练内容。

因此 SessionExercise 必须保存本次训练快照。

### 8.4 业务规则

1. SessionExercise 可以临时添加或删除。
2. 删除只影响当前 Session。
3. 跳过动作保留在 Session 中，但不生成完成组。
4. 动作顺序可以在训练前调整。
5. 训练开始后仍可跳过或临时添加动作。
6. 已完成动作不得因排序变化丢失记录。

---

## 9. WorkoutSet

### 9.1 定义

WorkoutSet 表示用户实际完成的一组力量训练。

例如：

```text
动作：杠铃卧推
组号：1
重量：80 kg
次数：10
状态：Completed
```

WorkoutSet 是系统中最重要的训练事实。

### 9.2 核心属性

- 所属 SessionExercise
- 组序号
- 组类型
- 实际重量
- 实际次数
- 完成状态
- 完成时间
- 是否属于额外组

### 9.3 组类型预留

V1 默认：

- normal

未来可以支持：

- warmup
- drop_set
- failure
- assisted

V1 暂不在 UI 中开放复杂组类型。

### 9.4 业务规则

1. 每完成一组立即保存。
2. WorkoutSet 保存实际数据，不保存目标数据。
3. 未点击完成的输入不属于正式 WorkoutSet。
4. 重量和次数可与模板目标不同。
5. 实际完成组数可以小于或大于目标组数。
6. 额外组应保留，但完成率上限仍为 100%。
7. PR 和训练容量只计算有效完成组。
8. 删除或纠正历史 Set 必须遵循历史修正规则。
9. App 崩溃后，已完成 Set 不能丢失。

---

## 10. RestTimer

### 10.1 定义

RestTimer 表示训练过程中的一次休息状态。

它不是单纯的页面倒计时，而是可持久化、可恢复的领域状态。

### 10.2 核心状态

```text
Running
Paused
Completed
Skipped
Cancelled
```

### 10.3 核心属性

- 所属 Session
- 所属 SessionExercise
- 上一组序号
- 下一组序号
- 原始休息时长
- 开始时间
- 目标结束时间
- 暂停时剩余时间
- 当前状态

### 10.4 业务规则

1. 完成一组后可以自动创建 RestTimer。
2. 剩余时间必须由目标结束时间计算。
3. App 进入后台后计时继续。
4. App 被终止后可以恢复。
5. 用户可以增加当前休息时间。
6. 用户可以暂停或跳过。
7. 修改当前休息时间不修改模板。
8. 到期后不得出现负数倒计时。
9. 通知失败不影响训练数据保存。

---

## 11. DailyStatus

### 11.1 定义

DailyStatus 表示用户某一天的主观训练状态。

V1 状态：

- 正常
- 疲劳
- 经期
- 不适

### 11.2 边界

DailyStatus：

- 不是医疗诊断
- 不是完整经期管理工具
- 不是身体健康档案
- 不自动决定用户能否训练

### 11.3 业务规则

1. 每个自然日最多一个当前状态记录。
2. 用户可以当天修改。
3. V1 只用于历史上下文。
4. V1 不自动改变重量、组数或动作。
5. 未来建议功能可读取，但只能给出建议。

---

## 12. UserSetting

### 12.1 定义

UserSetting 表示用户在本设备上的训练和 App 偏好。

### 12.2 V1 设置

- 重量单位
- 默认重量步进
- 默认休息时间
- 通知开关
- 声音开关
- 震动开关
- 是否完成 Onboarding

### 12.3 业务规则

1. 修改默认值不影响已有模板。
2. 修改单位不得破坏原始重量值。
3. 通知关闭不影响倒计时本身。
4. V1 设置保存在本地。
5. 未来云同步需要区分设备设置和账号设置。

---

## 13. ProgressMetric

### 13.1 定义

ProgressMetric 表示从原始训练数据计算出的表现指标。

它是派生数据，不是用户直接输入的事实。

### 13.2 V1 指标

- 单次训练容量
- 周训练容量
- 月训练容量
- 训练完成率
- 动作最大重量
- 某一重量下最高次数
- 最近训练重量趋势
- 训练次数

### 13.3 业务规则

1. 指标应能从 WorkoutSet 重新计算。
2. 可以缓存，但缓存不是唯一事实来源。
3. 算法变更不得修改历史 WorkoutSet。
4. 有氧数据与力量容量应分开计算。
5. 无有效数据时不得展示误导性趋势。

---

## 14. PersonalRecord

### 14.1 定义

PersonalRecord 表示用户在某个动作上的个人最佳表现。

V1 包括：

- 最大单组重量
- 某一重量下最高次数

### 14.2 业务规则

1. 只能来自 Completed Session 中的有效 Set。
2. 取消训练中的组默认不进入正式 PR。
3. PR 可以重新计算。
4. 修改动作名称不影响 PR。
5. PR 提示不应等同于医疗或专业训练建议。

---

## 15. Recommendation

### 15.1 定义

Recommendation 表示系统根据历史训练生成的下一次挑战建议。

V1 使用确定性规则，不使用 AI。

### 15.2 输入

- 最近一次有效训练表现
- 模板目标组数
- 目标次数范围
- 实际完成组数
- 每组实际次数
- 最近连续未完成次数
- 用户重量步进设置

### 15.3 输出

- 建议重量
- 建议次数范围
- 建议原因代码
- 用户可读说明

例如：

```text
建议重量：82.5 kg
建议次数：8–10
原因：上次已完成全部目标组
```

### 15.4 业务规则

1. 建议不能自动写入历史数据。
2. 建议不能自动修改模板。
3. 用户可以接受、忽略或修改建议。
4. 无历史数据时不生成伪精确建议。
5. 建议必须尽量说明原因。
6. 算法升级不得修改历史训练记录。

---

## 16. 聚合边界

### 16.1 WorkoutTemplate 聚合

包含：

```text
WorkoutTemplate
└── TemplateExercise[]
```

模板负责保证：

- 名称有效
- 至少一个可用动作
- 动作排序正确
- 目标参数有效

### 16.2 WorkoutSession 聚合

包含：

```text
WorkoutSession
├── SessionExercise[]
│   └── WorkoutSet[]
```

Session 负责保证：

- 状态转换合法
- 训练组属于正确动作
- Completed 后历史内容完整
- 同一 Session 的组号和动作关系有效

RestTimer 是独立聚合，通过 WorkoutSessionId 和 SessionExerciseId 与当前训练
关联。它不属于 WorkoutSession 聚合内部，也不得改变 WorkoutSet 事实。

---

## 17. 领域关系

```text
Exercise 1 ──── * TemplateExercise
Exercise 1 ──── * SessionExercise

WorkoutTemplate 1 ──── * TemplateExercise
WorkoutTemplate 1 ──── * WorkoutSession

WorkoutSession 1 ──── * SessionExercise
SessionExercise 1 ──── * WorkoutSet

WorkoutSession 1 ──── 0..* RestTimer
WorkoutSession * ──── 0..1 DailyStatus

Exercise 1 ──── * PersonalRecord
Exercise 1 ──── * Recommendation
```

注意：

Recommendation 和 ProgressMetric 是否需要永久存储，将在 Database Design 中决定。

---

## 18. 关键不变量

### INV-001

修改 WorkoutTemplate 不得修改任何历史 WorkoutSession。

### INV-002

WorkoutSet 必须属于一个明确的 SessionExercise。

### INV-003

Completed Session 必须保留自己的动作和目标快照。

### INV-004

用户未确认的 Recommendation 不得成为真实 WorkoutSet。

### INV-005

RestTimer 到期或失败不得导致 WorkoutSet 丢失。

### INV-006

历史统计必须能够追溯到原始 WorkoutSet。

### INV-007

同一时间 V1 最多存在一个 `in_progress` Session。

### INV-008

Exercise 名称变化不得改变动作历史归属。

---

## 19. V1 之外的预留能力

模型需要允许未来扩展：

- 超级组
- 热身组
- 递减组
- 有氧详细数据
- AI 建议
- 云同步
- 多设备
- 华为健康数据
- 用户自定义动作

但这些能力不得增加 V1 的实现复杂度。

---

## 20. 待确认事项

以下内容留到 Database Design 或正式开发前确认：

1. 取消训练时，已完成 Set 是否进入历史统计。
2. 历史训练是否允许用户手动纠错。
3. 默认最小重量步进是否统一为 2.5 kg。
4. 哑铃重量记录是单只重量还是总重量。
5. 有氧训练是否进入 V1 首个可用版本。
6. Recommendation 是否实时计算或保存缓存。
7. Session 草稿保留多久。
