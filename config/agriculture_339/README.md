# 农学 339 · Exam Package 模板（第一版）

这是「AI Exam OS」的第一个考试配置包（V0.1 模板），按 PRD 五级结构（Exam → Subject → Chapter → KnowledgePoint → LearningElement）组织。

## 文件说明

| 文件 | 内容 |
|---|---|
| `exam.json` | 考试元信息（id/名称/年份/默认考试日期） |
| `subjects.json` | 科目与权重、章节结构 |
| `knowledge.json` | 知识图谱节点（含学习元素：一句话理解/通俗解释/专业定义/核心考点/易错点/记忆方法） |
| `questions.json` | 题库（单选/判断/简答/AI 开放问答） |
| `learning_strategy.json` | 计划/任务/复习/掌握/测评/番茄参数 |
| `ai_prompt.json` | Prompt 库（teacher/summary/mistake-analysis/generate-question/exam-builder） |

## 字段规范（校验规则）

### knowledge.json

- `id` 全局唯一；`subjectId/chapterId` 须存在于 `subjects.json`。
- `type` ∈ `concept | structure | process | comparison | memory`。
- `importance` ∈ `high | medium | low`；`difficulty` 1–5。
- `prerequisite[]`、`related[]` 引用的 id 必须存在于本文件 `nodes` 中。
- `elements` 六项齐全：`summary / plain / definition / keyPoints[] / pitfalls[] / mnemonic`。
- `estimatedMinutes` 为正整数。

### questions.json

- `type` ∈ `single | judge | short | ai_open`；`single` 须有 `options` 且 `answer` 为索引；`judge` 的 `answer` 为布尔。
- `knowledge_id` 必须存在于 `knowledge.json`。

### learning_strategy.json

- `review.intervals` 升序正整数；`mastery.levels` 的 `max` 连续覆盖 0–100。
- `subjects.json` 的 `weight` 合计 ≈ 1。

## 校验

```bash
node config/agriculture_339/validate.mjs
```

## 如何扩充

1. 在 `subjects.json` 增加章节；
2. 在 `knowledge.json` 增加节点（保持引用可解析）；
3. 为每个节点至少配 1 题（`questions.json`）；
4. 运行校验后提交。
