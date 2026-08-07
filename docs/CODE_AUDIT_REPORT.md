# 我ai学习（istudy）代码审计报告 · 当前状态

> 生成日期：2026-08-07
> 审计对象：`app.html`（单文件 PWA 应用主程序）+ `index.html` / `guide.html` / `sw.js` / `manifest.webmanifest` / `server.js`
> 代码基线：仓库 `F:\istudy`（main，首个提交 `eb94934`）；开发副本 `F:\woaixuexi`（原上游 `ninkoro-ai/woai-xuexi@d744b57` + 本地 v2.1 修复）
> 验证基线：`node --test tests/unit.test.mjs`（20/20 通过）、`node scripts/audit.mjs`（数据审计脚本可复现本报告全部数字）

## 0. 给 ChatGPT 的任务提示（可直接粘贴使用）

> 你是一位资深前端 / 全栈技术顾问。请阅读下方《我ai学习代码审计报告》，针对这份「零后端、纯前端、单文件 PWA」的考研备考应用，输出一份**可执行的改进方案**：按优先级（P0 安全/数据 / P1 功能质量 / P2 工程化 / P3 体验与增长）列出改进项，每项说明：现状问题、改进方案、改动范围、工作量估计、风险与回退方式。请特别关注题库质量、复习算法、数据安全、单文件工程化、测试与 CI 五个方面。

---

## 1. 项目概况

| 项 | 值 |
|---|---|
| 产品 | 「我ai学习」——2026 考研专硕 095131 农艺与种业（作物方向）备考工作台 |
| 形态 | 单文件 PWA（`app.html` 约 7581 行 / 350 KB），纯 HTML/CSS/原生 JS，无框架、无构建步骤 |
| 数据 | 全部存浏览器 `localStorage`（键前缀 `wb_kaoyan2_`，22 个状态字段 + `_schema` + `_preImportBackup`），零后端、零上传 |
| 离线 | `sw.js`（缓存名 `kycg-v50`）+ `manifest.webmanifest`（`display: standalone`） |
| 本地运行 | `server.js`（零依赖 Node 静态服务器）+ `启动-本地服务.bat` |
| 部署状态 | GitHub 仓库 `ninkoro-ai/istudy` 尚未创建；Cloudflare Pages 项目未建；自定义域目标 `ixuexi.ninkoro.com`（已记录 Account ID `1f2fcea04028e028fabc64836ae5dd9c`、Zone ID `c0e406449d9f80ac422b68be44f52a11`）；**当前未上线**，卡在缺少 Cloudflare API Token 与 GitHub 凭据 |
| 单元测试 | 20/20 通过（纯函数抽取自 `app.html` 真实实现，防止实现漂移） |

### 文件结构

```
index.html            营销落地页（CTA → app.html / guide.html）
app.html              应用主程序（全部业务逻辑、状态、渲染内联）
guide.html            快速上手手册
sw.js                 Service Worker（离线缓存，导航回退 app.html）
manifest.webmanifest  PWA 清单
_headers              Cloudflare 响应头 / CSP
server.js             零依赖本地静态服务器
启动-本地服务.bat      Windows 一键启动
tests/unit.test.mjs   单元测试（20 项）
scripts/audit.mjs     数据与实现审计脚本
docs/                 审计报告与 PRD（v2.1）
```

## 2. 架构与数据流

### 2.1 功能模块（4 页面 + 若干弹层）

| 模块 | 入口 | 说明 |
|---|---|---|
| M1 今日打卡 | `page-today` | 当天日期/阶段/距考研天数、今日任务清单、进度、打卡奖励 |
| M2 考试历 | `page-plan` | 90 天日历（今天/学习日/缺卡/补卡标记）、每日备注、补卡弹层 |
| M3 题库 | `page-kp` | 科目→章节→知识点三级折叠、全站搜索、知识点详情、闯关答题、错题本、AI 讲题入口 |
| M4 我的 | `page-mine` | 积分、成就、奖励兑换（含「轻松一下」）、月假、数据导出/导入/清空 |
| M5 AI 讲题 | `aiOverlay` | 按学科生成教学式提示词，一键复制到外部 AI（不调用任何 API） |
| M6 复习引擎 | 后台 | 艾宾浩斯自动排期 `[1,3,7,15,30]`、掌握度 0–100 计算、到期复习清单 |
| M7 准备引导 | `prepOverlay` | 每日一次专注提醒（鼓励语，无强制） |
| M8 备注 | `noteOverlay` | 按日期写学习计划/目标 |
| 纯阅读模式 | `readOverlay` | 无可用题目的知识点：先读正文，主动确认后才标记掌握（v2.1 新增） |

### 2.2 状态模型（S，22 字段）

`startDay, done, kpDone, score, records, redeemed, curSub, attempts, wrong, easyDay, periodUsed, periodMonth, periodToday, notes, reviewed, studyDays, lastStudy, revStep, mastery, prepDate, prepTriggered, prepShown`

- 备份导出 schema：`_type:"kaoyan-workbench-v2"`、`_v:2`，**22 字段全量导出**（v2.1 起无损失）。
- 导入流程：校验 `_type/_v/done` → `sanitizeImport` 强类型/范围收敛 → 覆盖 S；导入前自动备份当前数据到 `_preImportBackup`。
- 渲染流程：`init()` 归一化并保存 → `renderAll()` 用 `safeRender` 逐模块容错渲染（任一模块异常不白屏）→ `syncTime()` 跨午夜/回前台自动重算。

### 2.3 核心函数契约（关键索引）

`normalizeState / sanitizeImport / migrateState / planBounds / dayIndex / dailyTasks / taskSatisfied / isDayFull / kpMastery / kpStatus / nextReview / recordLearn / recordReview / streak / normalBonusFor / makeupBonusFor / makeupClaimable / dayMakeupDone / genQuiz / ensureQuiz / openQuiz / sq / toggleKp / redeem / aiPrompt / visGuideFor / renderToday / renderPlan / renderKP / renderScore / safeRender / syncTime / showFatal`

完整签名与规则见 `docs/我ai学习_PRD.md` §9。

## 3. 规模与数据基线（可复现）

| 项目 | 数值 | 说明 |
|---|---|---|
| 知识点总数 | **207** | pol 45 / eng 36 / s339 70 / s881 56 |
| 计划天数 | 90（默认） | `studyDays` 可导入 30–365；`COVER_DAYS` 已跟随 `TOTAL` |
| 每日计划 PLAN | 4 科 × 90 天 | 与知识点库独立的手写日程文案 |
| 手写题库 | **34/207 = 16.4%** | 340 道题 |
| 自动出题可用 | **132/207 = 63.8%** | `genQuiz` 由正文切句生成 |
| 无题知识点 | **75 个** | 正文可切句 <2 句 → 走纯阅读模式 |
| 常量 | `PERIOD_MAX=2`、`PER_DAY_FULL=20`、`PER_KP=10`、`EB=[1,3,7,15,30]`、`QUIZ_TIME=300`、`SCHEMA_V=2` | `PER_TASK` 死代码已移除 |

## 4. 代码质量评估

### 4.1 已具备的工程化措施（优点）

- **安全**：所有用户可控文本经 `esc`/`escAttr` 转义后入 DOM；搜索高亮 `hl()` 查询截断 50 字符防 ReDoS；导入数据强类型/范围校验；`_headers` 含 CSP（`default-src 'self'`、`script-src 'self' 'unsafe-inline'`）；零外部请求。
- **健壮性**：`safeRender` 分模块容错；`showFatal` 错误边界面板（非白屏）；`save()` 配额异常静默降级；跨午夜 `syncTime`；补卡二次校验；答题防重复提交。
- **可测试性**：`tests/unit.test.mjs` 从 `app.html` 抽取真实函数断言（20 项），覆盖转义、导入归一化、排期边界、出题质量、导出字段、关键修复点。
- **可审计性**：`scripts/audit.mjs` 一键输出知识点数、题库覆盖、字段完整性、语法检查。
- **PWA/离线**：Service Worker 预缓存 + 导航回退；`_headers` 中 `sw.js` 使用 `max-age=0, must-revalidate` 防陈旧 SW。

### 4.2 安全审计

| 项 | 现状 | 风险 |
|---|---|---|
| XSS | 转义基本到位；`showResultDetail` 等内联样式使用固定色值 | 低 |
| CSP | 有 `unsafe-inline`（单文件内联脚本所需） | 中（属单文件架构的固有取舍） |
| 数据安全 | 明文 JSON 导出/导入；localStorage 无加密 | 中（备份文件包含全部学习数据） |
| 隐私 | 零外部请求；AI 讲题仅生成提示词，用户自行粘贴 | 低 |
| 导入校验 | 强类型/范围收敛，但 `wrong/records` 条目仅做浅校验 | 低 |

### 4.3 性能

- 首屏即加载 350 KB 内联 JS/CSS/HTML 单文件；无分包、无懒加载（题库导航有懒渲染 `kpView` 状态机，搜索全量遍历 207 条）。
- `renderAll()` 每次状态变更全量重渲染 4 个页面模块；`reviewDueList()` 每次遍历全部已掌握知识点。
- localStorage 同步读写，数据量小（预期 <1 MB）无瓶颈；导入大备份时 JSON 解析为一次性开销。

### 4.4 可维护性与结构问题（主要痛点）

1. **单文件 7581 行**：逻辑/数据/CSS/HTML 全部内联，无模块边界；函数靠注释分区，难以复用、难以测试 UI、容易产生重复代码（如多处手写 `kpCardHtml` 式模板）。
2. **无构建管线**：没有 lint、type check、minify、版本化；`?v=50` 等缓存版本号需手工 bump。
3. **数据与 UI 强耦合**：状态变更后靠 `saveAll()+renderAll()` 全量刷新，缺少单一事件/状态管理抽象。
4. **内容数据内嵌在代码里**：`KP_LIB`(207)、`QUIZ`(34 组)、`PLAN`(360 条) 与逻辑同文件，编辑内容即改代码。
5. **测试只覆盖纯函数**：无 UI 级自动化测试（点击、弹层、localStorage 模拟）。
6. **无 CI/CD**：部署依赖 Cloudflare Pages + GitHub webhook，仓库内无 workflow。

### 4.5 可靠性 / 边界

- `startDay` 缺失默认 `2026-08-02`（产品决策，考研周期 8/2 开跑）；已有存档保留（v2.1 修复）。
- 补卡、月假、轻松一下、连胜加成等规则有明确边界并已测试。
- 已知理论边界：`score` 无自然上限（仅导入时 clamp 999999）；`records` 截断 300 条；`wrong` 去重按 `sub:kid:qi` 但可能累积较大。

## 5. 已知问题与限制（改进的切入点）

| # | 类别 | 问题 | 现状影响 |
|---|---|---|---|
| L1 | 内容 | 手写题库覆盖率仅 16.4%；75 个知识点连自动出题都无法生成（正文单句） | 大量知识点只能纯阅读确认，答题体验不完整 |
| L2 | 内容 | 自动出题质量有限：事实型单句匹配题，干扰项可能语义相近度不足 | 检测区分度弱 |
| L3 | 算法 | 艾宾浩斯间隔固定 `[1,3,7,15,30]`，不随答对率/掌握度自适应；`lastStudy` 在重复学习时覆盖基线 | 复习时机非个性化 |
| L4 | 数据 | localStorage 容量约 5 MB、易被清缓存清掉；备份明文 JSON | 数据丢失风险；无跨设备自动同步 |
| L5 | 工程 | 单文件 350 KB、无构建/无 lint/无 UI 测试/无 CI | 迭代速度与回归风险 |
| L6 | 产品 | 积分经济单一（掌握+10、全打卡+20、恶意-20）；成就阈值固定 | 激励衰减 |
| L7 | 产品 | 无统计报表（无学习时长、掌握趋势、科目分布热力图） | 无法复盘 |
| L8 | AI | 「AI 讲题」只生成提示词，需用户手动粘贴到外部 AI | 0 成本约束下的折中，链路长 |
| L9 | PWA | 无「更新可用」提示；`sw.js` 缓存版本手工维护；无桌面端宽屏布局 | 更新感知差 |
| L10 | 合规 | `startDay` 默认 2026-08-02 为硬编码产品决策；`studyDays` 支持但 UI 无入口 | 参数可配置性差 |

## 6. 建议的改进方向（供展开为具体方案）

1. **题库与内容**：扩充手写题（优先 75 个无题知识点）；升级 `genQuiz`（模板化、数值/辨析/填空题型、干扰项同章节优先）；把 `KP_LIB/QUIZ/PLAN` 外置为 JSON 并做构建期校验。
2. **复习算法**：将 EB 间隔参数化；引入基于答对率/掌握度的自适应间隔；复习基线改用「上次复习成功日」而非「最近学习日」。
3. **数据与同步**：迁移 IndexedDB（大容量、结构化）；备份加密（口令 + AES）；导出格式文档化；评估「WebDAV/文件系统」等零成本多设备同步路径。
4. **工程化**：拆分多文件 + 极简构建（合并/压缩/哈希版本）；引入 ESLint + TypeScript JSDoc 渐进增强；补 UI 冒烟测试（Playwright）；加 GitHub Actions 或 Pages 构建配置。
5. **性能**：首页只渲染当前页；题库数据懒加载；压缩/最小化发布产物。
6. **产品**：积分经济重平衡（新增连续全勤、错题清零奖励）；统计页（掌握度趋势、每日热力、科目雷达）；错题重练的间隔排期。
7. **AI 能力**：评估「本地模型 / BYO API Key」让讲题真正内嵌（仍是零服务器成本）；或把提示词工程升级为可保存的对话脚本。
8. **PWA 体验**：更新提示 + 一键刷新；安装引导；桌面宽屏适配。
9. **可访问性**：键盘导航、焦点管理（弹层 focus trap）、ARIA 标注、对比度核对。

## 7. 复现与验证方式

```bash
node --test tests/unit.test.mjs   # 20 项单元测试
node scripts/audit.mjs            # 数据审计（知识点/题库/字段/语法）
node server.js                    # 本地运行，http://127.0.0.1:8080/
```

## 8. 部署现状（供改进方案参考）

- 本地仓库 `F:\istudy` 已建（26 文件，0.71 MB），内容即本报告审计的应用；
- 目标上线路径：GitHub `ninkoro-ai/istudy` → Cloudflare Pages（项目名 `istudy`，无构建步骤，输出 `/`）→ 自定义域 `ixuexi.ninkoro.com`（zone 已托管，自动签发 SSL，必要时手动 CNAME 兜底）；
- 当前阻塞：缺少 Cloudflare API Token 与 GitHub 推送凭据，**尚未上线**。

---
*报告结束。建议 ChatGPT 先读 §4–§6，再结合 `docs/我ai学习_PRD.md` 的接口契约细化方案。*

---

## 附：v2.2 更新说明（本报告生成后已完成的功能升级）

- 手写题库 34→74 知识点 / 500 题；自动出题升级（切句回退 + 同章节干扰项 + 四题型）；**无题知识点归零**（原 L1 已解决）。
- 复习算法：EB 参数化 + 答对率自适应间隔/跳步 + 「上次复习成功日」基线（原 L3 已解决）。
- IndexedDB 镜像恢复 + 口令加密备份（原 L4 部分解决）；同步路径评估文档已出。
- 积分经济重平衡 + 错题重练排期 + 统计页（原 L6/L7 已解决）。
- AI：BYO API Key 内嵌讲题 + 提示词脚本（原 L8 已实现可选路径）。
- PWA 更新提示 / 安装引导 / 桌面适配（原 L9 已解决）；弹窗焦点陷阱、ARIA、键盘导航（可访问性）。
- 工程化：`src/` + `data/*.json` + 极简构建（构建期校验）、ESLint、CI/Pages 工作流、Playwright 冒烟测试、按需渲染（原 L5 大部分解决；TypeScript JSDoc 渐进增强未做，属二期）。
- 单元测试 20→28 项；`npm run build` 后 app.html 约 360 KB（`--minify` 更小）。
