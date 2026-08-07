# 我ai学习 · 产品需求文档（PRD）

> 文档类型：产品需求文档（可被开发 / 测试 / 设计 agent 直接读取复用）
> 版本：v2.1（2026-08-07 审计修复后对齐）
> 基准版本：仓库 `ninkoro-ai/woai-xuexi`（审计基线 `d744b57`；本副本随本地化改造更新）
> 数据基线：`tests/unit.test.mjs`（19 项断言）+ `scripts/audit.mjs` + 源码逐段核对
> 生成日期：2026-08-07
> 范围说明：本文档描述**当前已实现的真实功能**（代码即事实）。未实现的需求若需写入，应置于「未来规划」或单独 FR 工单，不得与本文件混淆。
> 不含内容：UI 视觉设计（配色、布局、图标样式）不在本文档范围。
> 变更记录：v2.1 基于审计（见 `docs/AUDIT_REPORT.md`）修复 9 项缺陷、完善 5 项功能，详见 §15。

---

## 0. 文档元信息

| 字段 | 值 |
|---|---|
| 产品名 | 我ai学习（StudyOS / Learning OS） |
| 产品定位 | 2026 考研专硕 **095131 农艺与种业（作物方向）** 备考工作台 |
| 形态 | 单文件 PWA（零后端、本地存储、离线可用） |
| 技术栈 | 纯 HTML/CSS/原生 JS（无框架、无构建步骤） |
| 部署 | 本地运行（零依赖，`server.js` / `启动-本地服务.bat`）或免费静态托管（Cloudflare Pages 等） |
| 数据归属 | 全部留存浏览器 `localStorage`，不上云、不注册 |
| 文档状态 | 已实现对齐（as-built，v2.1） |

---

## 1. 产品概述

### 1.1 目标用户
报考 2026 年硕士研究生、专业代码 **095131 农艺与种业（作物方向）** 的考生。科目锁定为四门：

| 科目 ID | 科目名 | 代码 | 主题书 |
|---|---|---|---|
| `pol` | 政治 | 101 | 2026 考研政治 |
| `eng` | 英语二 | 204 | 词汇闪过 + 句句真研 + 黄皮书真题 |
| `s339` | 339 农综一 A | 339 | 植物学 + 植物生理学 + 遗传学 |
| `s881` | 881 栽培育种 | 881 | 栽培学总论 + 育种学总论 |

### 1.2 核心价值主张
1. **本地化**：零账号、零上传、离线可用；换设备通过 JSON 备份恢复。
2. **定制化**：按真实考纲切分知识点，铺进 90 天日程。
3. **轻量化**：单网页文件即全部，可「添加到主屏幕」，无广告、无更新弹窗。

### 1.3 产品形态与文件结构
| 文件 | 角色 |
|---|---|
| `index.html` | 营销落地页（产品介绍、卖点、使用步骤、打卡规则说明） |
| `app.html` | 应用主程序（全部业务逻辑、状态、渲染均内联于此单文件） |
| `guide.html` | 快速上手手册（用户向） |
| `sw.js` | Service Worker（`Cache-Control: public, max-age=0, must-revalidate`），负责离线缓存 |
| `manifest.webmanifest` | PWA 清单（`display: standalone`，`start_url: app.html`） |
| `_headers` | Cloudflare 响应头与 CSP 策略 |
| `server.js` | 零依赖本地静态服务器（仅 Node 内置模块，无任何安装包） |
| `启动-本地服务.bat` | Windows 双击一键启动本地服务并打开浏览器 |
| `scripts/audit.mjs` | 数据与实现审计脚本（知识点数 / 题库覆盖 / 字段完整性） |
| `tests/unit.test.mjs` | 纯逻辑单元测试（抽取 `app.html` 真实函数断言，防实现漂移） |

### 1.4 关键规模常量（以代码为准）
| 概念 | 实际值 | 说明 |
|---|---|---|
| 知识点总数 | **207** | `KP_LIB` 中各科目条目之和（`src:` 字段计数 = 207） |
| 计划天数 | **90** | 常量 `TOTAL = 90`、`COVER_DAYS = 90`（`dayIndex` 取值 1..90） |
| 科目数 | 4 | `pol / eng / s339 / s881` |
| 艾宾浩斯间隔（天） | `[1, 3, 7, 15, 30]` | 常量 `EB` |
| 答题限时 | 300 秒 | 常量 `QUIZ_TIME = 300`（5 分钟） |
| 月假配额 | 每月 2 次 | `periodUsed` 限制 `0..2` |
| 连胜加成阈值 | ≥ 3 天 | `streak() >= 3 → 1.5×` |

> ⚠️ **常量语义澄清**：`TOTAL = 90` 表示「90 天备考计划」，**不是**知识点数。营销页「207 个知识点 + 90 天计划」两者均正确，无冲突。

---

## 2. 关键术语

| 术语 | 定义 |
|---|---|
| 知识点（KP） | `KP_LIB[sub]` 中的最小学习单元，含 `id / t(标题) / b(正文) / src(出处)` |
| 学习日 `d` | 计划内第几天，`d = dayIndex()`，取值 1..90 |
| 任务（task） | 某天的待学项，结构 `{sub, kp, mode}`；`mode ∈ {new, review}` |
| 掌握（mastered） | `S.kpDone[sub][kid] === 1` |
| 掌握度 | 0–100 连续分值，由 `kpMastery()` 计算 |
| 打卡（full） | 当日全部任务满足，`S.done[d].full === 1` |
| 连胜（streak） | 从今天向前连续的「已打卡」天数 |
| 补卡（makeup） | 对过去缺卡日回溯补齐，`S.done[d].makeup === 1` |
| 月假 | 用户主动申请，当日随机保留 2 科、其余任务免除 |
| 轻松一下 | 积分兑换的奖励，当日仅 2 科任务 |
| 艾宾浩斯排期 | 依 `EB` 间隔自动推算下次复习日期 |
| 复习步 `revStep` | 当前已完成复习轮次（0..5），驱动 `nextReview` |

---

## 3. 全局配置参数表

| 常量名 | 值 | 用途 / 处理规则 |
|---|---|---|
| `KEY` | `"wb_kaoyan2_"` | localStorage 键前缀 |
| `TOTAL` | `90` | 计划天数；亦用于 `daysUntilExam`、`isDayFull` 上界 |
| `COVER_DAYS` | `90` | 知识点顺序铺开覆盖天数 |
| `PER_KP` | `10` | 掌握 1 个知识点 `+10` 分；取消掌握 `-10` |
| `PER_DAY_FULL` | `20` | 当日全打卡 `+20`（连胜≥3 时 ×1.5 = 30） |
| `EB` | `[1,3,7,15,30]` | 艾宾浩斯复习间隔（天） |
| `SCHEMA_V` | `2` | 数据 schema 版本，用于迁移 |
| `QUIZ_TIME` | `300` | 单场闯关限时（秒） |
| `PERIOD_MAX` | `2` | 月假每月上限（`periodUsed` clamp 0..2） |
| 闯关通过线 | `need = quiz.length<=3 ? quiz.length : quiz.length-1` | 默认 5 题需对 4（见 §7.3） |
| 闯关机会 | 2 次 | 第 2 次仍未过 → 判定「恶意打卡」扣 20 分且不计掌握 |
| 三阶段 | `d<=30` 基础 / `d<=60` 强化 / `d>60` 冲刺 | `phaseName(d)` |

---

## 4. 数据模型

### 4.1 状态对象 `S`（运行时内存态）
`S` 由 `localStorage` 按字段分别加载，经 `normalizeState()` 归一化。字段契约如下：

| 字段 | 类型 | 范围 / 约束 | 说明 |
|---|---|---|---|
| `startDay` | string(`YYYY-MM-DD`) | 合法日期；缺失 → `2026-08-02`（默认） | 计划第 1 天；`planBounds()` 基线 |
| `done` | object | `{ [day:int]: {full:0/1, makeup:0/1} }` | 每日打卡记录 |
| `kpDone` | object | `{ [sub]: { [kid]: 1 } }` | 已掌握知识点 |
| `score` | number | `>= 0`（扣分下限 0） | 累计积分 |
| `records` | array | 长度上限 300 | 积分流水，新项 `unshift` 到头部 |
| `redeemed` | array | — | 已兑换奖励（`{name, date}`） |
| `curSub` | string | 科目 ID 或 `'all'` | 题库当前筛选科目 |
| `attempts` | object | `{ [sub:kid]: int }` | 闯关已用机会数 |
| `wrong` | array | `{sub, kid, qi, date}` | 错题本 |
| `easyDay` | string\|null | 日期 | 已激活「轻松一下」的当天 |
| `periodUsed` | int | `0..2` | 本月已用月假次数 |
| `periodMonth` | string | `YYYY-MM` | 月假配额归属月 |
| `periodToday` | string\|null | 日期 | 今日是否已启用月假 |
| `notes` | object | `{ [date]: string }` | 每日备注 / 学习计划 |
| `reviewed` | object | `{ [date]: { [sub:kid]: 1 } }` | 当日已复习标记 |
| `studyDays` | int | `1..365` | 计划天数（默认 90） |
| `lastStudy` | object | `{ [sub]: { [kid]: date } }` | 最近学习日期（艾宾浩斯基线） |
| `revStep` | object | `{ [sub]: { [kid]: int 0..5 } }` | 复习步 |
| `mastery` | object | `{ [sub]: { [kid]: 0..100 } }` | 掌握度缓存（由 `kpMastery` 推导） |
| `prepDate` | string | 日期 | 今日是否已确认准备弹窗 |
| `prepTriggered` | string | 日期 | 准备弹窗触发标记 |
| `prepShown` | string | 日期 | 专注提醒展示标记 |

### 4.2 localStorage 键命名
- 前缀：`wb_kaoyan2_`（常量 `KEY`）。
- 模式：`KEY + <字段名>`，例如 `wb_kaoyan2_startDay`、`wb_kaoyan2_done`、`wb_kaoyan2_kpDone`。
- 附加键：`wb_kaoyan2_schema`（schema 版本号）、`wb_kaoyan2_preImportBackup`（导入前自动备份）。

### 4.3 数据持久化规则
- 单次写入：`save(k, v)` → `localStorage.setItem(KEY+k, JSON.stringify(v))`（try/catch 静默失败）。
- 全局保存：`saveAll()` 将 `S` 各字段分别写入对应键。
- 配额保护：写入失败时提示「本地存储空间已满 / 不可用」，不阻断渲染（见 §11）。

### 4.4 备份导出 Schema（`_type: "kaoyan-workbench-v2"`, `_v: 2`）
导出 JSON 顶层字段（来自 `btnExport` 实际行为，**全量 22 字段，备份无损失**）：

```
{
  _type: "kaoyan-workbench-v2",
  _v: 2,
  startDay, done, kpDone, score, records, redeemed, curSub,
  attempts, wrong,
  easyDay, periodUsed, periodMonth, periodToday, notes,
  reviewed, studyDays, lastStudy, revStep, mastery,
  prepDate, prepTriggered, prepShown
}
```

### 4.5 导入校验规则（`sanitizeImport`）
导入前必须满足：
1. `_type === "kaoyan-workbench-v2"`，否则拒绝（alert「文件格式不对」）。
2. `_v === 2`，否则拒绝（alert「版本不兼容，需 v2」）。
3. `done` 为 object，否则拒绝（alert「缺少必要字段」）。

通过后用 `sanitizeImport` 做类型 / 范围收敛（防畸形值注入）：
- `score` → `Number(x)||0`
- `studyDays` → `clamp(Number, 1, 365)`
- `periodUsed` → `clamp(floor(Number), 0, 2)`
- `wrong` 非数组 → `[]`；过滤掉缺 `sub/kid` 的非法项
- `records` 非数组 → `[]`；`notes` 非对象 → `{}`
- `done / kpDone / mastery / reviewed / lastStudy / revStep` 非对象 → `{}`
- `prepShown / prepTriggered / prepDate` 非字符串 → `''`
- 缺失字段 → 安全默认（如 `curSub='all'`、`easyDay=null`）
- 导入前自动将当前 `S` 备份至 `wb_kaoyan2_preImportBackup`，导入后仍可恢复。

---

## 5. 功能模块清单

| 模块 | 入口（页面 / 弹层） | 功能概要 |
|---|---|---|
| M1 今日打卡 | `page-today` | 展示当天日期 / 阶段 / 距考研天数、今日待学进度、当日任务清单、到期复习清单、准备引导弹窗 |
| M2 考试历 | `page-plan` | 90 天日历视图（标记今天 / 学习日 / 缺卡日）、每日备注编辑、补卡发起 |
| M3 题库 | `page-kp` | 三级折叠导航（科目→章节→知识点）、全站搜索、知识点详情、闯关答题、错题本 |
| M4 我的 | `page-mine` | 积分与成就（打卡天数 / 掌握数 / 连胜 / 积分）、奖励兑换、月假与轻松一下说明、数据备份（导出 / 导入 / 清空） |
| M5 AI 讲题 | `aiOverlay` | 按学科生成「教学式」提示词，一键复制粘贴至外部 AI |
| M6 复习引擎 | 后台（无独立页） | 艾宾浩斯自动排期、掌握度计算、到期复习清单 |
| M7 准备引导 | `prepOverlay` | 首次 / 每日进入展示鼓励语，无强制校验 |
| M8 备注 | `noteOverlay` | 按日期写学习计划 / 目标 / 自语 |

---

## 6. 功能详述（输入 / 输出 / 处理规则）

### 6.1 M1 今日打卡（`renderToday`）
**输入**：`dayIndex()`（今天在计划中的位置）、`S` 状态。
**处理**：
1. 计算 `d = dayIndex()`；`d<1`→1，`d>90`→90。
2. 标题：`d===1`「考研第一天，开始吧」；`d>90`「第一期 90 天已打卡完结」；否则「今天按计划继续学习」。
3. 阶段标签：`phaseName(d)`（基础 / 强化 / 冲刺）+ 月假 / 轻松一下 标记。
4. 进度：`todayKps()` 取今日任务，统计 `doneCnt / total`；全完成显示「今日打卡完成！」。
5. 距考研天数：`daysUntilExam()` = `max(0, startDay + 90 − today)`。
6. 渲染到期复习清单 `reviewDueList()`。
**输出**：DOM 更新（日期卡、进度条、任务卡、复习卡）。
**副作用**：无写入（纯渲染）；`syncTime()` 跨午夜自动重算。

### 6.2 M2 考试历（`renderPlan` / `renderCalendar`）
**输入**：`planBounds()`（基于 `startDay` 动态推算的年月范围）、`S.done`、`S.notes`。
**处理**：
- 日历单元格：粉色圈 = 今天；带 `D` 标记 = 计划内学习日；红色「缺卡」= 过去未完成且可补卡日。
- 点击某天 → `openNote(ds)`（写备注）或 `openMakeup(ds)`（若 `makeupClaimable`）。
**输出**：月历网格 + 备注弹层 + 补卡弹层。
**边界**：`clampCal()` 约束视图不超出计划范围；跨年不会「伪报废」（`planBounds` 动态推算）。

### 6.3 M3 题库（`renderKP` / 导航 / 搜索 / 详情 / 闯关）
**输入**：`SUBJECTS`、`KP_LIB`、`S.curSub`、`S.kpDone`、`S.wrong`。
**处理**：
- 三级导航：`chaptersOf(sub)` 聚合章节；点击科目→章节→知识点展开。
- 搜索 `doSearch()`：跨知识点标题 / 正文 / 错题；`hl()` 高亮命中（大小写不敏感、查询截断至 50 字符防 ReDoS）；空查询返回转义原文。
- 知识点详情 `openKpDetail`：展示 `t / b / src`、掌握状态、AI 讲题入口。
- 点击知识点 → `toggleKp(sub, kid)`：已掌握则取消（扣 10 分）；未掌握则 `openQuiz` 发起闯关。
- 错题本 `renderWrong`：列出 `S.wrong`，可跳转重学。
**输出**：题库页 DOM、详情弹层、答题弹层。

### 6.4 M4 我的（`renderScore` + 备份）
**输入**：`S.score`、`streak()`、掌握数、连胜、`REWS`、`periodUsed`。
**处理**：
- 成就区：今日打卡、累计掌握、连胜、积分。
- 奖励兑换 `redeem(id)`：见 §7.5。
- 月假按钮：剩余 `2 - periodUsed` 次；点击设置 `periodToday = today`。
- 备份：导出（`btnExport`）、导入（`btnImport`→`fileInput`）、清空（`btnClear`，二次 confirm）。
**输出**：积分页 DOM、兑换提示、下载 JSON、导入结果提示。

### 6.5 M5 AI 讲题（`aiPrompt`）
**输入**：`sub`、`kid`。
**处理**：拼装结构化提示词 `text`：
- 角色：考研辅导老师，按学科特点生成辅助图。
- 固定 7 步：① 建立认知框架 ② 学科自适应可视化（`visGuideFor(sub)`：政治=概念关系图、英语=长难句成分拆解、农综一=遗传关系图、农综二=田间实例）③ 类比 ④ 点明考法 ⑤ 引导互动 ⑥ 循序渐进练习 ⑦ 复习小卡片。
- 注入 `kp.t`（知识点标题）与 `kp.b`（背景参考）作为上下文。
**输出**：`aiText` 文本框内容 + 复制按钮（`navigator.clipboard.writeText`）。**不调用任何外部 AI**，仅生成可复制提示词。

### 6.6 M6 复习引擎（后台）
见 §8.3、§8.4（掌握度与艾宾浩斯排期）。

---

## 7. 核心用户流程

### 7.1 首次进入 / 引导
1. 访问 `app.html`（或 PWA 启动）。
2. `init()` 加载 `S`；缺失或非法 `startDay` → 默认 `2026-08-02`（2026 考研周期起点）；**已有存档则保留**（导入 / 清空重开均生效）。
3. `migrateState` + `normalizeState` 确保结构安全；写 `wb_kaoyan2_schema = 2`。
4. `renderAll()` 分模块安全渲染（任一模块异常仅记录，不白屏）。
5. 展示「准备引导」弹窗（鼓励语），确认后进入。

### 7.2 每日学习闭环
```
进入 app → 今日打卡页
  ├─ 查看今日任务（new + 到期 review）
  ├─ 逐个知识点：点击 → 闯关（§7.3）
  ├─ review 任务：点击 → 复习答题 → markReviewed
  ├─ 当全部任务满足 → checkDayComplete → 打卡 +20（连胜≥3 则 +30）
  └─ 同步：错题入 S.wrong；掌握度重算
```

### 7.3 闯关答题流程（`openQuiz` → `sq`）
**输入**：`sub`、`kid`、`forceMode`（learn / review）。
**处理**：
1. 取题：`QUIZ[sub][kid][attempt]`（手写题库优先；无则 `genQuiz` 由 `kp.b` 自动切句生成事实型选项题）。
2. **无题兜底（纯阅读模式）**：手写库与自动生成均无题（正文可切句不足 2 句）→ 打开纯阅读弹窗展示正文，用户点击「我已认真读完，标记掌握」后才记掌握 `+10` 分；**不静默白送积分**。
3. 每题 4 选项（A–D），单选；限时 `QUIZ_TIME=300s`（计时器 `st()`）。
4. 提交 `sq()`：逐题比对 `answers[i] === quiz[i].ans`，统计 `correct`；`submitted` 标记防重复结算。
5. **通过判定**：`need = quiz.length<=3 ? quiz.length : quiz.length-1`；`passed = correct >= need`（默认 5 题需对 4）。
6. 通过分支：
   - `S.kpDone[sub][kid] = 1`，`score += PER_KP(10)`，`attempts` 清零。
   - `mode==='review'` → `markReviewed` + `recordReview`；否则 `recordLearn`。
   - 错误题仍入 `S.wrong`。
   - 触发 `checkDayComplete()`。
7. 未通过分支：
   - `attempts++`；错误题入 `S.wrong`。
   - `attempt < 2` → 允许「再试一次」（切换下一套题库，`attempt` 递增）。
   - `attempt >= 2` → **恶意打卡**：`score = max(0, score - 20)`，`attempts` 清零，**不计掌握**，禁用重试。
8. `showResultDetail` 展示逐题正误 + 正确答案 + 解析（若有 `exp`）。
**输出**：掌握状态变更、积分变更、错题本变更、打卡可能完成、结果弹层。

### 7.4 艾宾浩斯复习排期（`nextReview` / `recordReview`）
**输入**：已掌握知识点 `sub/kid`。
**处理**：
- 步数 `step = S.revStep[sub][kid] || 0`。
- 若 `step >= EB.length(5)` → 返回 `null`（已掌握，不再排期）。
- 基线 `base = S.lastStudy[sub][kid] || S.startDay`；`next = base + EB[step]` 天。
- `recordReview`：`revStep = min(step+1, 5)`，重算掌握度。
**输出**：下次复习日期；到期日出现在 `reviewDueList()`（今日待复习清单）。

### 7.5 积分与奖励兑换（`redeem`）
**输入**：奖励 `id ∈ {r1,r2,r3,r4}`。
**规则**：
| ID | 名称 | 成本 | 特效 |
|---|---|---|---|
| `r1` | 一杯奶茶 | 100 | — |
| `r2` | 一顿大餐 | 300 | — |
| `r3` | 轻松一下 | 300 | 当日任务减半（仅 2 科） |
| `r4` | 心仪小礼物 | 1000 | — |

处理：
1. 若 `S.score < cost` → 拒绝。
2. `r3` 且 `easyDay === today` → 拒绝（今日已激活）。
3. `score -= cost`；`redeemed.unshift({name, date})`；记流水。
4. `r3` → `easyDay = today`（影响 `dueSubjects` 当日仅 2 科）。

### 7.6 补卡流程（`openMakeup` → `confirmMakeup`）
**输入**：缺卡日日期 `ds`。
**前置**（`makeupClaimable(d)`）：
- `1 <= d <= TOTAL`；`d < dayIndex()`（过去日）；`!done[d].makeup`；`!done[d].full`。
**处理**：
1. 渲染补卡弹层：列出当日任务完成度；展示正常可得 `normalBonusFor()` 与补卡可得 `makeupBonusFor()`（正常一半）。
2. 若任务未全部完成 → 禁用确认，提示「请先完成学习任务」并提供跳转入口。
3. 确认 `confirmMakeup`：二次校验 `dayMakeupDone(d)`；满足则 `done[d] = {full:1, makeup:1}`，`score += makeupBonusFor()`。
**输出**：该日标记「已打卡（补）」，发放正常积分 50%（连胜≥3 时基数 ×1.5 → 即 10 或 15 分）。每人每个缺卡日限补一次。

### 7.7 月假与轻松一下
- **月假**：`periodUsed` 上限 2；按钮设置 `periodToday = today` → 当日 `dueSubjects()` 随机保留 2 科（`randomTwoSubs`，按 `hashStr("period|"+t)` 确定性随机，避免重渲染抖动）。配额跨月重置（`syncTime` 兜底）。
- **轻松一下**：积分兑换（`r3`）→ 当日 `easyDay = today` → `dueSubjects()` 返回 `[pol, eng]`（2 科）。

### 7.8 数据备份 / 恢复 / 清空
- 导出：`btnExport` → 组装 §4.4 JSON → `Blob` 下载 `我ai学习备份-<date>.json`。
- 导入：`btnImport` → 选文件 → `FileReader.readAsText` → 校验 `_type/_v/done` → `sanitizeImport` → 覆盖 `S` → 自动备份导入前数据到 `_preImportBackup`。
- 清空：`btnClear` → 二次 confirm → 删除所有 `wb_kaoyan2_*` 键 → `S` 重置为初始（`startDay = 当天`、打卡 / 积分 / 错题 / 准备弹窗字段全部清零；下次打开保留新起点，不再被强制重置）。

---

## 8. 业务规则与算法（精确契约）

### 8.1 每日任务生成
- `dueSubjects()`：
  - `periodToday === today` → `randomTwoSubs(t)`（2 科）
  - `easyDay === today` → `[pol, eng]`（2 科）
  - 否则 → 全部 4 科
- `homeDay(sub, i)`：第 `i` 个知识点落在 `1 + floor(i*(COVER_DAYS-1)/(N-1))` 天（`N` = 该科目知识点数），顺序铺开保证考前全覆盖。
- `newKpsOf(sub, d)`：`homeDay(sub,i)===d` 的知识点集合（`mode:"new"`）。
- `reviewKpsOf(d)`：`d > COVER_DAYS`（冲刺阶段）且当日无新任务时启用；全局顺序轮转，`per=6`，`start = ((d-(COVER_DAYS+1))*6) % all.length`。
- `dailyTasks(d)` = 各科目新学任务；仅冲刺且无新任务时追加复习任务。

### 8.2 打卡完成判定
- `taskSatisfied(t)`：
  - `mode==='review'` → `S.reviewed[today][sub:kid]` 存在
  - 否则 → `S.kpDone[sub][kid]` 存在
- `isDayFull(d)`：`done[d].full` 为真；或（`d===today` 且 `dailyTasks(d)` 非空且全部 `taskSatisfied`）；空任务日不判满（防误判）。
- `checkDayComplete()`：满足后 `done[d].full=1`，`score += round(PER_DAY_FULL * (streak>=3?1.5:1))`，记流水，触发打卡 toast。

### 8.3 掌握度计算（`kpMastery`）
```
base = 60
m = 60
m += min(revStep, 5) * 8
m -= min(wrongCount, 5) * 4
if lastStudy: m -= min(max(daysSince,0), 30) * 0.6
return clamp(round(m), 0, 100)
```
`kpStatus`：未学习 → 薄弱（wrong>0）→ 待复习（nextReview===today）→ 已掌握（revStep>=5）→ 学习中。

### 8.4 艾宾浩斯排期
- 间隔 `EB = [1,3,7,15,30]`。
- `nextReview`：基线 `lastStudy||startDay` + `EB[revStep]`；`revStep>=5` → `null`（不再排）。
- `recordLearn`：置 `lastStudy=today`，`revStep` 初始化 0。
- `recordReview`：`revStep = min(step+1, 5)`。

### 8.5 连胜与加成
- `streak()`：从今天向前数连续 `isDayFull` 天数（遇首个非满即止）。
- `normalBonusFor()` = `round(PER_DAY_FULL * (streak>=3?1.5:1))` = 20 或 30。
- `makeupBonusFor()` = `round(normalBonusFor() * 0.5)` = 10 或 15。

### 8.6 防作弊 / 护栏
- 闯关 2 次未通过：扣 20 分、不计掌握、禁用重试（文案「恶意打卡」）。
- 无题知识点：不静默发放掌握积分，须在纯阅读模式中主动确认「我已认真读完」。
- 答题结算：`submitted` 一次性标记，防计时归零与手动提交重复发分。
- 取消掌握：`score -= 10`，计负流水。
- 积分下限 0（`Math.max(0, score-…)`）。

---

## 9. 内部接口定义（供复用 / 测试）

> 以下为可直接调用的纯函数契约（签名来自源码，输入 / 输出 / 副作用明确），其它 agent 可据此做单元回归或二次开发。

| 函数 | 输入 | 输出 | 处理规则 / 副作用 |
|---|---|---|---|
| `normalizeState(s)` | state 对象 | 归一化后的 `s` | 补全 / 收敛所有字段类型与范围（见 §4.1） |
| `sanitizeImport(d)` | 导入原始对象 | 安全 state | 强类型 / 强范围校验（见 §4.5） |
| `migrateState(s)` | state 对象 | 迁移后 `s` | 旧结构 `done/kpDone/wrong` 收敛 |
| `planBounds()` | — | `{min:{y,m}, max:{y,m}}` | 基于 `startDay` 推算计划年月范围 |
| `dayIndex()` | — | int 1..90 | 今天相对 `startDay` 的天序号 |
| `dailyTasks(d)` | day int | `task[]` | 生成当日 new/review 任务 |
| `taskSatisfied(t)` | task | bool | 任务是否满足（见 §8.2） |
| `isDayFull(d)` | day int | bool | 当日是否打卡满 |
| `kpMastery(sub,kid)` | sub,kid | int 0..100 | 掌握度公式（§8.3） |
| `kpStatus(sub,kid)` | sub,kid | enum | 未学习/薄弱/待复习/学习中/已掌握 |
| `nextReview(sub,kid)` | sub,kid | date\|null | 下次复习日（§8.4） |
| `recordLearn(sub,kid)` | sub,kid | — | 写 `lastStudy`、`revStep` 初值、重算掌握度 |
| `recordReview(sub,kid)` | sub,kid | — | `revStep+1`、重算掌握度 |
| `streak()` | — | int | 连续打卡天数 |
| `normalBonusFor()` | — | int | 当日正常打卡积分（含连胜加成） |
| `makeupBonusFor()` | — | int | 补卡积分（正常一半） |
| `makeupClaimable(d)` | day int | bool | 该缺卡日可否补卡 |
| `dayMakeupDone(d)` | day int | bool | 补卡前任务是否全完成 |
| `genQuiz(sub,kid)` | sub,kid | quiz\|null | 由 `kp.b` 自动切句生成事实型题（无手写库时） |
| `aiPrompt(sub,kid)` | sub,kid | — | 渲染 AI 讲题提示词弹层 |
| `redeem(id)` | reward id | — | 兑换奖励（§7.5） |
| `addRec(reason,delta)` | str,int | — | 追加积分流水（上限 300） |
| `esc(s)` / `escAttr(s)` / `hl(text,q)` | str | str | HTML 转义 / 属性转义 / 高亮（防 XSS、防 ReDoS） |

---

## 10. 安全与校验规则

1. **XSS 防护**：所有用户可控文本（知识点、备注、搜索）经 `esc` / `escAttr` 转义后入 DOM；`hl()` 查询截断 50 字符防 ReDoS。
2. **数据校验**：导入经 `sanitizeImport` 强类型 / 强范围；畸形值不进入状态。
3. **CSP**（见 `_headers`）：`default-src 'self'`；`script-src 'self' 'unsafe-inline'`（应用内联脚本所需）；`img/font/src 'self' data:`；`connect-src 'self'`（无外部请求）。
4. **隐私**：零外部网络请求（`connect-src 'self'`），数据仅存本地。
5. **配额保护**：`save` 失败静默提示，不阻断渲染。
6. **导入前备份**：`wb_kaoyan2_preImportBackup` 自动留存，覆盖可恢复。

---

## 11. 非功能性需求

| 维度 | 要求 / 现状 |
|---|---|
| 离线可用 | PWA + `sw.js`（`max-age=0, must-revalidate`），无网络可学习 |
| 性能 | 单文件内联、无构建；`safeRender` 分模块容错；`syncTime` 仅在跨日期重渲染 |
| 兼容性 | 现代浏览器 + iOS/Android 添加到主屏幕；`IntersectionObserver` 降级兜底 |
| 可访问性 | `prefers-reduced-motion` / `prefers-reduced-transparency` 适配；语义化标签 |
| 数据持久化 | `localStorage` 按字段分键；导入 / 导出 JSON 备份 |
| 安全 | 见 §10（CSP、转义、校验） |
| 可测试性 | `tests/unit.test.mjs` 抽取真实函数断言（常量、转义、导入归一化、排期边界） |
| 部署 | 本地零依赖运行（`server.js`）或免费静态托管；无服务端逻辑 |

---

## 12. 边界条件与已知约束

1. `TOTAL=90` 为天数；`startDay` 跨年不报废（`planBounds` 动态推算）。
2. 题库分「手写题 `QUIZ`」与「自动生成 `genQuiz`」两类；自动题由 `kp.b` 切句，需 `facts>=2` 否则返回 `null`（退化为纯阅读）。
3. `periodToday` / `easyDay` 仅当日生效，次日恢复全量 4 科。
4. 连胜按「是否 `isDayFull`」计算，补卡日（`makeup`）计入满卡，可延续连胜。
5. 积分下限 0，不因扣分变负。
6. 导出字段**全量**包含 `attempts/wrong/prepTriggered/prepShown`；旧 v2 备份缺这些字段时由 `sanitizeImport` 兜底为安全默认，向后兼容。
7. `sw.js` 缓存 `max-age=0`（每次回源校验），避免陈旧 SW 劫持（与心桥站点同类问题的对照教训：本产品已采用 `no-store` 式策略）。

8. `startDay`：缺失默认 `2026-08-02`；已有存档不再被覆盖（v2.1 修复）。
9. `COVER_DAYS` 跟随 `studyDays`（默认 90），自定义计划长度（30–365）时知识点铺开不错位（v2.1 修复）。
10. 手写题库覆盖 34/207（16.4%）；自动出题可用 132/207（63.8%）；其余 75 个知识点走纯阅读模式（v2.1 核对）。

---

## 13. 待对齐 / 已知问题（如实记录）

| 项 | 状态 | 说明 |
|---|---|---|
| 营销页「207 知识点」 | ✅ 已核对一致 | `src:` 计数 = 207，与 `app.html` 实际库一致 |
| `PER_TASK=20` 常量 | ✅ 已移除（v2.1） | 主计分走 `PER_KP(10)` + `PER_DAY_FULL(20)`，死代码已清理 |
| 导出字段集 | ✅ 已全量（v2.1） | 22 个状态字段全部导出 / 导入，备份无损失 |
| `quiz` 手写题库覆盖率 | ✅ 已统计（v2.1） | 手写题 34/207（16.4%）；自动出题可用 132/207（63.8%）；其余 75 个知识点走纯阅读模式 |
| `init()` 覆盖 startDay | ✅ 已修复（v2.1） | 仅缺失时默认 `2026-08-02`，不再每次启动覆盖 |
| 冲刺期复习任务无法满足 | ✅ 已修复（v2.1） | 复习任务按 review 模式闯关并写入 `reviewed` |
| 无题知识点静默掌握 | ✅ 已修复（v2.1） | 改为纯阅读模式主动确认 |
| 单元测试基线 | ✅ 19 项通过 | 纯函数 + 静态接线断言；UI 渲染仍无自动测试（见遗留建议） |

---

## 14. 附录

### 14.1 科目与知识点分布（节选）
- `pol`：马原 / 毛中特 / 史纲 / 思修 等（含哲学基本问题、矛盾分析法、剩余价值、社会主义初级阶段…）
- `eng`：英语二（词汇 / 长难句 / 真题）
- `s339`：植物学 / 植物生理学 / 遗传学
- `s881`：栽培学总论 / 育种学总论（含回交育种、转基因育种、杂交育种…）
- 合计 **207** 个知识点，顺序铺入 90 天。

### 14.2 导出 JSON 示例（最小可导入）
```json
{
  "_type": "kaoyan-workbench-v2",
  "_v": 2,
  "startDay": "2026-08-02",
  "done": { "1": { "full": 1, "makeup": 0 } },
  "kpDone": { "pol": { "p1": 1 } },
  "score": 30,
  "records": [{ "reason": "今日打卡完成 +20", "delta": 20, "date": "2026-08-02 09:30" }],
  "redeemed": [],
  "curSub": "all",
  "attempts": {},
  "wrong": [],
  "easyDay": null,
  "periodUsed": 0,
  "periodMonth": "",
  "periodToday": null,
  "notes": {},
  "reviewed": {},
  "studyDays": 90,
  "lastStudy": { "pol": { "p1": "2026-08-02" } },
  "revStep": { "pol": { "p1": 0 } },
  "mastery": { "pol": { "p1": 60 } },
  "prepDate": "2026-08-02",
  "prepTriggered": "",
  "prepShown": ""
}
```

### 14.3 验收要点（测试 agent 可直接复用）
- `normalizeState`：null / 畸形字段收敛为安全默认（见 `tests/unit.test.mjs`）。
- `sanitizeImport`：字符串数值化、数组兜底、范围截断（score / studyDays / periodUsed）。
- `planBounds`：基于 `startDay` 动态推算；跨年不报废；缺失兜底 `2026-08-02`。
- `startDay`：缺失 → 默认 `2026-08-02`；已有存档保留（v2.1）。
- `kpMastery`：0–100 边界 clamp；wrong / 间隔 / 天数的权重符合 §8.3。
- 闯关：`need = length-1`（5 题需 4）；2 次未过扣 20 且不计掌握。
- 无题知识点：不自动掌握，走纯阅读模式，主动确认后才 +10 分（v2.1）。
- 复习任务：以 review 模式闯关 → 写 `reviewed`，当日可正常打卡（v2.1）。
- 打卡：连胜≥3 → 1.5×；补卡 = 正常一半；月假每月 2 次上限。
- 备份：导出含全部 22 字段；导入兼容旧 v2（缺失字段兜底）（v2.1）。

### 14.4 本地化运行（0 成本）

| 方式 | 命令 / 操作 | 说明 |
|---|---|---|
| 双击 | `app.html` | 直接可用核心功能；`file://` 下 PWA 离线不可用 |
| 推荐 | 双击 `启动-本地服务.bat` | 自动 `node server.js` 并打开 `http://127.0.0.1:8080/`；完整 PWA（可添加到主屏幕、断网可用） |
| 手动 | `node server.js` | 支持 `PORT=8081 node server.js` 换端口 |
| 免费托管（可选） | Cloudflare Pages / GitHub Pages | 纯静态上传；`_headers` 含 CSP |

零依赖说明：`server.js` 仅使用 Node 内置 `http / fs / path`，无需 npm install、无联网、无任何费用。

### 14.5 变更记录（v2.1）

1. 修复：`init()` 不再无条件覆盖 `startDay`（D1）。
2. 修复：导入补齐 `prepShown`；导出/导入前备份全量化（D2）。
3. 修复：冲刺期复习任务按 review 模式闯关（D3）。
4. 修复：无题知识点改为纯阅读确认，不静默加分（D4）。
5. 修复：答题防重复结算（D5）；清空重置准备弹窗字段（D6）；`COVER_DAYS` 跟随 `studyDays`（D7）；复制提示词兜底（D8）；营销页文案对齐（D9）。
6. 完善：`genQuiz` 干扰项同科目优先 + 「属于 / 正确的是 / 错误的是」三种题型。
7. 清理：移除 `PER_TASK`，新增 `PERIOD_MAX=2` 常量。
8. 新增：`server.js`、`启动-本地服务.bat`、`README.md`、`scripts/audit.mjs`、`docs/AUDIT_REPORT.md`。

---
*文档结束。本文档以 `ninkoro-ai/woai-xuexi@d744b57` 的 `app.html` 真实实现为唯一事实来源。*
