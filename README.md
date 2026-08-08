# AI Exam OS

本地优先 AI 个性化考试学习系统（V1.0，农学考研为第一阶段产品）。

> 依据：《AI Exam OS PRD V1.0》（用户提供，2026-08-08）
> 三原则：**Local First**（核心功能离线可用）、**AI Optional**（AI 是可插拔增强）、**Config Driven**（考试系统 = 学习引擎 + 考试配置包）。

## 目录

```
ai-exam-os/
├── docs/
│   ├── ARCHITECTURE.md      # 系统架构设计图（分层/引擎/时序/数据流）
│   └── PHASE1_TASKS.md      # Phase 1 开发任务拆解（Cursor 任务粒度）
└── config/
    └── agriculture_339/     # 农学 339 第一版知识库 JSON 模板（Exam Package）
        ├── exam.json
        ├── subjects.json
        ├── knowledge.json
        ├── questions.json
        ├── learning_strategy.json
        ├── ai_prompt.json
        └── README.md        # 配置包规范与校验规则
```

## 执行状态

- [x] 三件套（架构 / 知识库模板 / 任务拆解）
- [x] Phase 0：React + TS + Tailwind + PWA + Dexie 基础框架
- [x] Phase 1：农学核心学习闭环（目标创建 / 知识体系 / 计划 / 学习 / 测试 / 复习 / 掌握度 / 备份）
- [x] Phase 2（轻）：错题本 / 学习报告 / 会话计时
- [ ] Phase 3：AI 增强（用户自带 Key，Provider 模式）
- [ ] Phase 4：AI 考试系统生成器（大纲 → Exam Package）

## 本地运行

```bash
npm install
npm run dev        # 开发模式 http://localhost:5173
npm run build      # 构建到 dist/（含 PWA）
npm run preview    # 预览构建产物
npm test           # 引擎单元测试（11 项）
npm run smoke      # UI 冒烟测试（无头浏览器走核心闭环）
```

## 已实现功能

- 考试目标创建（选 339 / 考试日期 / 每日时间 / 水平）
- 今日任务（新学 3 + 复习 8 + 测试 10，按优先级公式排序）
- 知识库（科目→章节→知识点，六类学习元素，前置/关联，AI 固定提示词复制）
- 测评（单选 / 判断 / 简答 / AI 问答自评，限时，通过判定，逐题解析）
- 复习（间隔 [1,3,7,15,30]、答错重置、高正确率跳步、到期清单）
- 掌握度（0–100，等级映射，随学习/测评/复习联动）
- 错题本（错误计数、按 [1,3,7] 天排期重练、通过移除）
- 报告（覆盖率 / 平均掌握度 / 连续学习 / 专注时长 / 科目分布）
- 专注计时（会话计时，计入日/周报告）
- 数据（IndexedDB 本地存储；JSON 导出 / 导入 / 清空）
