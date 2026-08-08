# AI Exam OS · Phase 0–2 开发任务拆解（Cursor 任务粒度）

> 依据：《AI Exam OS PRD V1.0》+《ARCHITECTURE.md》
> 用法：每个任务可由一个 Agent 独立执行，按序依赖；完成后按「完成定义 DoD」自查。

## 总执行规则（PRD Part 4 §十五）

1. 所有考试差异必须通过配置解决，禁止硬编码考试逻辑。
2. 学习算法必须独立，禁止写在页面组件。
3. AI 必须是可插拔模块，禁止绑定单一模型。
4. Phase 1 必须保证：农学考研完整学习闭环。
5. 优先完成学习体验，其次才是复杂 AI 生成。
6. 所有数据优先本地存储。

技术栈：React + TypeScript + Tailwind CSS + Dexie.js + Vite + PWA。目录见 `ARCHITECTURE.md §7`。

---

## Phase 0：基础框架（跑起来）

### T0.1 项目脚手架

- 目标：可运行的 React+TS 项目，含 PWA 与 CI。
- 实现点：`npm create vite`（react-ts）→ 装 Tailwind、vite-plugin-pwa、dexie → 配置 `vite.config.ts`（PWA manifest/offline）→ 建目录骨架（`src/app|pages|components|core|storage|config`）→ GitHub Actions（lint+typecheck+test+build）。
- 依赖：无。
- DoD：`npm run dev/build` 通过；PWA 可安装；CI 绿。
- 预估：1 任务。

### T0.2 Dexie 数据层

- 目标：8 张表可用，含迁移。
- 实现点：`src/storage/db.ts`（UserProfile / ExamPackage / KnowledgePoint / LearningRecord / MasteryRecord / Question / WrongBook / DailyTask / QuizRecord / StudySession）；版本迁移；`storage/repos/*` 通用 CRUD。
- 依赖：T0.1。
- DoD：单测覆盖 CRUD 与迁移；类型安全。

### T0.3 应用壳与路由

- 目标：PRD 信息架构的页面骨架。
- 实现点：底部导航（首页 / 学习 / 知识库 / 测试 / 错题 / 复习 / 数据分析 / AI 助手 / 设置 → 合并为可用 Tab 集合）；空页面；主题 Token；iOS 安全区与 PWA 全屏适配基础。
- 依赖：T0.1。
- DoD：切换路由正常；移动端贴底导航；无横向溢出。

### T0.4 Exam Package 加载器

- 目标：配置驱动生效。
- 实现点：`src/exam-engine/loader.ts` 读取内置 `agriculture_339`；`validator.ts`（移植 validate.mjs 规则）；导入 IndexedDB（KnowledgePoint/Question）；加载失败有明确错误。
- 依赖：T0.2。
- DoD：导入后知识库/题库可查询；校验失败阻断导入并提示。

### T0.5 PWA 离线

- 目标：首载后可离线使用核心功能。
- 实现点：SW 预缓存 App Shell + 内置配置包；离线检测提示；更新提示（新版本一键刷新）。
- 依赖：T0.1。
- DoD：断网后核心页面可用；SW 更新可见提示。

---

## Phase 1：农学核心闭环

### T1.1 考试目标创建

- 目标：用户创建 339 目标。
- 实现点：`pages/setup`：选择考试（内置 agriculture_339）、输入考试日期/每日学习时间/当前水平；写 UserProfile；首页展示倒计时。
- 依赖：T0.3、T0.4。
- DoD：创建后可进入学习首页；刷新不丢；改目标可重新创建。

### T1.2 知识体系展示

- 目标：科目→章节→知识点树 + 节点详情。
- 实现点：`pages/knowledge`：树导航；节点详情展示 Learning Elements 六件套；前置/关联知识点提示与跳转。
- 依赖：T0.4。
- DoD：任意节点可查看完整学习元素；前置依赖可点击跳转。

### T1.3 计划引擎（Scheduler）

- 目标：自动生成今日任务。
- 实现点：`core/scheduler`：阶段划分（基础/强化/冲刺）；每日任务 = 新学 3 + 复习 8 + 测试 10（按策略配置）；优先级公式 `重要度×遗忘×薄弱÷耗时` 排序；生成 DailyTask。
- 依赖：T1.2。
- DoD：给定用户状态可复现生成任务；策略参数可配置生效；任务持久化。

### T1.4 学习流程

- 目标：学习知识点并记录。
- 实现点：`core/learning-engine`：开始/结束会话（写 LearningRecord，含 duration/status）；阅读模式与「我已学会」标记；联动掌握度。
- 依赖：T1.2、T1.3。
- DoD：每次学习产生一条记录；状态流转正确；断网可用。

### T1.5 测试系统

- 目标：答题 + 判分 + 解析。
- 实现点：`pages/quiz`：单选/判断/简答（自评）/AI 开放问答（占位）；限时；通过判定（策略）；结果页（逐题解析）；写 QuizRecord 与 WrongBook。
- 依赖：T1.4。
- DoD：四种题型可作答；判分与策略一致；错题入库。

### T1.6 复习引擎

- 目标：间隔排期与到期清单。
- 实现点：`core/review-engine`：间隔表、基线、答错重置、自适应（高/低正确率调整）；`dueList(today)`；复习记录推进复习步。
- 依赖：T1.4。
- DoD：给定记录可计算 nextReview；到期清单准确；答错后间隔重置。

### T1.7 掌握度引擎

- 目标：0–100 掌握度与等级。
- 实现点：`core/mastery-engine`：score（学习完成度+测试正确率+复习表现−遗忘衰减，权重来自策略）；等级映射；与学习/测试/复习联动更新 MasteryRecord。
- 依赖：T1.5、T1.6。
- DoD：score 恒在 [0,100]；等级边界正确；可单测。

### T1.8 数据导出/导入

- 目标：数据可迁移。
- 实现点：`storage/backup`：全量 JSON 导出（含版本）；导入校验（版本/畸形拒绝）+ 导入前备份；清空（含各介质）。
- 依赖：T0.2。
- DoD：导出→清空→导入无损；导入畸形数据被拒且不崩溃。

---

## Phase 2：增强

### T2.1 错题系统

- 实现点：错题列表、错误类型标注（概念/记忆/理解/审题）、按 [1,3,7] 天重练排期、重练通过移除。
- 依赖：T1.5。
- DoD：错题可追溯原题；重练通过后收敛。

### T2.2 学习报告

- 实现点：日/周报告（学习时长、完成数、新增掌握、薄弱点）；覆盖率/掌握度/连续学习指标。
- 依赖：T1.7、T2.3（数据）。
- DoD：指标与明细一致。

### T2.3 可视化

- 实现点：掌握度趋势、打卡热力、科目分布（零依赖或轻量图表库）。
- 依赖：T2.2 数据。
- DoD：图表数据与统计口径一致。

### T2.4 番茄计时

- 实现点：25/5/10 会话计时（策略配置）；日/周时长统计；切后台自动暂停。
- 依赖：T0.3。
- DoD：计时只计前台有效时长；统计与明细一致。

---

## Phase 3/4（不在本次范围，仅占位）

- P3：AI Connector（Provider/Adapters/Prompt Library）——用户自带 Key，L2 模式。
- P4：AI 考试系统生成器（大纲 → Exam Blueprint → Exam Package → 导入运行）。
