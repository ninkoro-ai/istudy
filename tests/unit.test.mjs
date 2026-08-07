// 我ai学习 · 纯逻辑单元测试（M-06 整改基线）
// 通过从 deploy/app.html 抽取真实源码函数进行断言，避免与实现漂移。
// 运行：node --test deploy/tests/unit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, '..', 'app.html'), 'utf8');

// 按函数名抽取源码（花括号匹配），eval 为函数
function extract(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const m = html.match(re);
  if (!m) throw new Error('未找到函数: ' + name);
  let i = m.index + m[0].length - 1; // 定位首个 '{'
  let depth = 0;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(m.index, i);
}
function loadFn(name) {
  // 直接 eval：使抽取出的函数闭包捕获本模块作用域（esc/dateStr/S/TOTAL 等依赖）
  return eval('(' + extract(name) + ')');
}

// 常量
const TOTAL = Number((html.match(/var TOTAL\s*=\s*(\d+)/) || [])[1]);
const KEY = (html.match(/var KEY\s*=\s*"([^"]+)"/) || [])[1];
const PER_KP = Number((html.match(/var PER_KP\s*=\s*(\d+)/) || [])[1]);
const PERIOD_MAX = Number((html.match(/var PERIOD_MAX\s*=\s*(\d+)/) || [])[1]);
const EB = [1, 3, 7, 15, 30];
const REVIEW_CFG = {
  intervals: EB,
  adaptive: true,
  fastThreshold: 0.9,
  slowThreshold: 0.6,
  maxStep: 5
};
const WRONG_CLEAR_BONUS = Number((html.match(/var WRONG_CLEAR_BONUS\s*=\s*(\d+)/) || [])[1]);
const STREAK_BONUS = eval('(' + html.match(/var STREAK_BONUS\s*=\s*(\{[^}]*\})/)[1] + ')');
// DOM/反馈桩：统计与错题函数依赖的浏览器对象
const $ = () => null;
function showToast() {}

const esc = loadFn('esc');
const escAttr = loadFn('escAttr');
const hl = loadFn('hl');
const pad = loadFn('pad');
const dateStr = loadFn('dateStr');
const sanitizeImport = loadFn('sanitizeImport');
const planBounds = loadFn('planBounds');
const normalizeState = loadFn('normalizeState');
const seededRand = loadFn('seededRand');
const shuffle = loadFn('shuffle');
const range = loadFn('range');
const hashStr = loadFn('hashStr');
const splitFacts = loadFn('splitFacts');
const uniqArr = loadFn('uniqArr');
const numOf = loadFn('numOf');
const genQuiz = loadFn('genQuiz');
const recordQuiz = loadFn('recordQuiz');
const quizAccuracy = loadFn('quizAccuracy');
const reviewIntervalFor = loadFn('reviewIntervalFor');
const nextReview = loadFn('nextReview');
const recordReview = loadFn('recordReview');
const wrongCount = loadFn('wrongCount');
const daysBetween = loadFn('daysBetween');
const kpMastery = loadFn('kpMastery');
const recalcMastery = loadFn('recalcMastery');
const wrongRetryDue = loadFn('wrongRetryDue');
const removeWrongFor = loadFn('removeWrongFor');
const wrongCountOf = loadFn('wrongCountOf');
const masteryTrendPoints = loadFn('masteryTrendPoints');
const subMasteryPct = loadFn('subMasteryPct');
const addRec = loadFn('addRec');

// genQuiz 依赖的科目/知识点库桩
const SUBJECTS = [{ id: 's1' }, { id: 's2' }];
const KP_LIB = {
  s1: [
    { id: 'a1', t: '知识点A', b: '事实甲是核心内容；事实乙也是核心内容；事实丙同样是重点；事实丁是重要补充；事实戊是延伸考点；事实己是易错辨析。' },
    { id: 'a2', t: '知识点B', b: '其它事实一是基本内容；其它事实二也是基本内容；其它事实三是补充内容；其它事实四是重点内容。' },
    { id: 'a3', t: '知识点C', b: '别的事实一是参考依据；别的事实二是判断标准；别的事实三是最终结论。' }
  ],
  s2: [
    { id: 'b1', t: '科目二知识点', b: '跨科目事实一是重点内容；跨科目事实二是次要内容；跨科目事实三是补充内容。' }
  ]
};

// 供 planBounds / normalizeState 使用的全局桩
const S = { startDay: '2026-08-02' };

test('esc 转义 & < > " ', () => {
  assert.equal(esc('<a>&"'), '&lt;a&gt;&amp;&quot;');
});

test('escAttr 额外转义 单引号/反引号/斜杠', () => {
  assert.equal(escAttr(`a'b\`c/d`), 'a&#39;b&#96;c&#47;d');
  // 同时仍转义 & < > "
  assert.equal(escAttr('<x>&"'), '&lt;x&gt;&amp;&quot;');
});

test('hl 高亮命中（大小写不敏感）', () => {
  const out = hl('Hello World', 'world');
  assert.ok(out.includes('<mark>World</mark>'));
});

test('hl 空查询直接返回转义文本', () => {
  assert.equal(hl('<b>', ''), '&lt;b&gt;');
});

test('hl 查询超长被截断（防 ReDoS）', () => {
  const longQ = 'a'.repeat(500);
  // 不应抛错；内部截断到 50
  const out = hl('a'.repeat(600), longQ);
  assert.ok(typeof out === 'string');
});

test('dateStr 返回 YYYY-MM-DD', () => {
  assert.match(dateStr(0), /^\d{4}-\d{2}-\d{2}$/);
});

test('TOTAL / PER_KP 常量合理', () => {
  assert.equal(TOTAL, 90);
  assert.equal(PER_KP, 10);
  assert.equal(KEY, 'wb_kaoyan2_');
});

test('sanitizeImport 拒绝畸形值（类型/范围校验）', () => {
  const d = {
    _type: 'kaoyan-workbench-v2', _v: 2, done: {},
    score: '999999',            // 字符串 -> 数值
    wrong: 'not-an-array',      // 应为数组 -> 兜底 []
    studyDays: 99999,           // 超出上限 -> 截断 365
    periodUsed: 99,             // 超出上限 -> 截断 2
    notes: 'x',                 // 应为对象 -> 兜底 {}
    kpDone: null
  };
  const s = sanitizeImport(d);
  assert.equal(s.score, 999999);
  assert.deepEqual(s.wrong, []);
  assert.equal(s.studyDays, 365);
  assert.equal(s.periodUsed, 2);
  assert.deepEqual(s.notes, {});
  assert.deepEqual(s.kpDone, {});
});

test('sanitizeImport 缺失字段兜底为安全默认', () => {
  const s = sanitizeImport({ _type: 'kaoyan-workbench-v2', _v: 2, done: {} });
  assert.equal(s.curSub, 'all');
  assert.equal(s.easyDay, null);
  assert.deepEqual(s.records, []);
  assert.equal(s.prepShown, '');
  assert.equal(s.prepTriggered, '');
});

test('sanitizeImport 保留 prepShown / prepTriggered 值', () => {
  const s = sanitizeImport({
    _type: 'kaoyan-workbench-v2', _v: 2, done: {},
    prepShown: '2026-08-07', prepTriggered: '2026-08-07'
  });
  assert.equal(s.prepShown, '2026-08-07');
  assert.equal(s.prepTriggered, '2026-08-07');
});

test('planBounds 基于 startDay 动态推算（不再写死 2026）', () => {
  S.startDay = '2026-08-02';
  let b = planBounds();
  assert.deepEqual(b.min, { y: 2026, m: 7 });   // 8月
  assert.deepEqual(b.max, { y: 2026, m: 9 });   // 8/2 + 89天 = 10/30 -> 10月

  // 跨年场景：计划不会“伪报废”
  S.startDay = '2027-08-02';
  b = planBounds();
  assert.deepEqual(b.min, { y: 2027, m: 7 });
  assert.deepEqual(b.max, { y: 2027, m: 9 });
});

test('planBounds startDay 缺失时兜底 2026-08-02', () => {
  const saved = S.startDay;
  S.startDay = undefined;
  const b = planBounds();
  assert.deepEqual(b.min, { y: 2026, m: 7 });
  S.startDay = saved;
});

test('normalizeState 把 null/畸形字段收敛为安全默认', () => {
  const s = normalizeState({
    startDay: null, done: null, kpDone: null, score: 'x',
    records: 'bad', wrong: null, periodUsed: 99, studyDays: 'abc',
    notes: null, mastery: null
  });
  assert.equal(typeof s.startDay, 'string');
  assert.deepEqual(s.done, {});
  assert.equal(s.score, 0);
  assert.deepEqual(s.records, []);
  assert.deepEqual(s.wrong, []);
  assert.equal(s.periodUsed, 2);
  assert.equal(s.studyDays, 90);
  assert.deepEqual(s.notes, {});
});

test('PERIOD_MAX 常量存在且月假配额收敛为 0..2', () => {
  assert.equal(PERIOD_MAX, 2);
  const s = sanitizeImport({ _type: 'kaoyan-workbench-v2', _v: 2, done: {}, periodUsed: 99 });
  assert.equal(s.periodUsed, PERIOD_MAX);
});

test('startDay 缺失时默认 2026-08-02（8/2 开跑），已有值保留', () => {
  const s1 = normalizeState({ startDay: null });
  assert.equal(s1.startDay, '2026-08-02');
  const s2 = sanitizeImport({ _type: 'kaoyan-workbench-v2', _v: 2, done: {} });
  assert.equal(s2.startDay, '2026-08-02');
  const s3 = normalizeState({ startDay: '2027-01-01' });
  assert.equal(s3.startDay, '2027-01-01');
});

test('genQuiz 生成两套题，题型覆盖属于/正确/错误/判断/填空/术语', () => {
  const sets = genQuiz('s1', 'a1');
  assert.ok(Array.isArray(sets) && sets.length === 2);
  const qs = sets[0].concat(sets[1]);
  assert.ok(qs.length >= 4);
  const types = new Set(qs.map((q) => q.q));
  assert.ok([...types].some((q) => q.includes('属于')));
  assert.ok([...types].some((q) => q.includes('正确的是')));
  assert.ok([...types].some((q) => q.includes('错误的是')));
  assert.ok([...types].some((q) => q.includes('判断')));
  assert.ok([...types].some((q) => q.includes('填空')));
  assert.ok([...types].some((q) => q.includes('术语解释')));
  for (const q of qs) {
    assert.ok(q.opts.length >= 2 && q.opts.length <= 4);
    assert.ok(q.ans >= 0 && q.ans <= 3);
  }
});

test('genQuiz 对不足 2 句的知识点返回 null（走纯阅读模式）', () => {
  const src = extract('genQuiz');
  assert.ok(src.includes('if(facts.length<2) return null;'));
});

test('recordQuiz 累计正确率', () => {
  S.qStats = {};
  recordQuiz('s1', 'a1', 4, 5);
  recordQuiz('s1', 'a1', 3, 5);
  assert.equal(quizAccuracy('s1', 'a1'), 7 / 10);
  assert.equal(quizAccuracy('s1', 'x'), null);
});

test('自适应间隔：高正确率拉长、低正确率缩短', () => {
  S.revStep = { s1: { a1: 1, a2: 1, a3: 1 } };
  S.qStats = {
    's1:a1': { ok: 10, total: 10 },
    's1:a2': { ok: 2, total: 5 },
    's1:a3': { ok: 7, total: 10 }
  };
  assert.equal(reviewIntervalFor('s1', 'a1'), Math.round(3 * 1.5)); // 快 → 5（步1 基础 3）
  assert.equal(reviewIntervalFor('s1', 'a2'), Math.max(1, Math.round(3 * 0.6))); // 慢 → 2
  assert.equal(reviewIntervalFor('s1', 'a3'), 3); // 中等 → 基础
});

test('nextReview 基线优先「上次复习成功日」', () => {
  S.kpDone = { s1: { a1: 1 } };
  S.revStep = { s1: { a1: 0 } };
  S.lastStudy = { s1: { a1: '2026-08-06' } };
  S.lastReview = { s1: { a1: '2026-08-05' } };
  S.qStats = {};
  assert.equal(nextReview('s1', 'a1'), '2026-08-06'); // 08-05 + 1
  delete S.lastReview.s1.a1;
  assert.equal(nextReview('s1', 'a1'), '2026-08-07'); // 回退 lastStudy
  S.revStep.s1.a1 = REVIEW_CFG.maxStep;
  assert.equal(nextReview('s1', 'a1'), null); // 已达上限
});

test('recordReview：高正确率跳步 +2，并记录上次复习日', () => {
  S.kpDone = { s1: { a1: 1 } };
  S.revStep = { s1: { a1: 0 } };
  S.lastReview = {};
  S.lastStudy = { s1: { a1: '2026-08-01' } };
  S.mastery = {};
  S.wrong = [];
  S.qStats = {};
  recordReview('s1', 'a1', 1.0);
  assert.equal(S.revStep.s1.a1, 2);
  assert.match(S.lastReview.s1.a1, /^\d{4}-\d{2}-\d{2}$/);
  // 低正确率：不前进
  S.revStep.s1.a1 = 2;
  recordReview('s1', 'a1', 0.2);
  assert.equal(S.revStep.s1.a1, 2);
});

test('错题重练按 [1,3,7] 天间隔排期', () => {
  S.wrong = [{ sub: 's1', kid: 'a1', qi: 0, date: '2026-08-01' }];
  assert.equal(wrongRetryDue(S.wrong[0]), true);   // 1 天后到期（08-02 ≤ 今天）
  S.wrong = [{ sub: 's1', kid: 'a1', qi: 0, date: dateStr(0) }];
  assert.equal(wrongRetryDue(S.wrong[0]), false);  // 今天才错，1 天后才到期
  S.wrong = [
    { sub: 's1', kid: 'a1', qi: 0, date: '2026-08-01' },
    { sub: 's1', kid: 'a1', qi: 1, date: '2026-08-02' }
  ];
  assert.equal(wrongRetryDue(S.wrong[0]), true);   // 第 2 次错误 → 间隔 3 天
});

test('removeWrongFor：清空错题触发清零奖励', () => {
  S.wrong = [
    { sub: 's1', kid: 'a1', qi: 0, date: '2026-08-01' },
    { sub: 's1', kid: 'a1', qi: 1, date: '2026-08-02' },
    { sub: 's1', kid: 'a2', qi: 0, date: '2026-08-03' }
  ];
  S.score = 100;
  S.records = [];
  removeWrongFor('s1', 'a1');
  assert.equal(S.wrong.length, 1);                 // 只清 a1
  assert.equal(S.score, 100);                      // 未清空，不奖励
  removeWrongFor('s1', 'a2');
  assert.equal(S.wrong.length, 0);
  assert.equal(S.score, 100 + WRONG_CLEAR_BONUS);  // 清空奖励
  assert.ok(S.records.some((r) => r.reason.includes('错题全部清零')));
});

test('掌握度趋势按 lastStudy 日期累计', () => {
  S.startDay = '2026-08-02';
  S.kpDone = { s1: { a1: 1, a2: 1 }, s2: { b1: 1 } };
  S.lastStudy = { s1: { a1: '2026-08-02', a2: '2026-08-03' }, s2: { b1: '2026-08-05' } };
  const pts = masteryTrendPoints();
  assert.ok(Array.isArray(pts) && pts.length >= 6);
  assert.equal(pts[0].date, '2026-08-02');
  assert.equal(pts[0].n, 1);
  assert.equal(pts[1].n, 2);
  assert.equal(pts[3].n, 3);   // 08-05 累计 3
});

test('科目掌握度百分比与全勤里程碑配置存在', () => {
  S.kpDone = { s1: { a1: 1, a2: 1 } };
  const pct = subMasteryPct('s1');   // KP_LIB.s1 共 3 个
  assert.equal(pct, Math.round(2 / 3 * 100));
  assert.equal(STREAK_BONUS[7], 30);
  assert.equal(STREAK_BONUS[30], 120);
});

test('导出对象包含全部状态字段（含 attempts/wrong/准备弹窗字段）', () => {
  for (const f of ['attempts:S.attempts', 'wrong:S.wrong', 'prepTriggered:S.prepTriggered', 'prepShown:S.prepShown']) {
    assert.ok(html.includes(f), '导出应包含 ' + f);
  }
});

test('纯阅读模式（readOverlay / confirmRead）已接线', () => {
  assert.ok(html.includes('id="readOverlay"'));
  assert.ok(html.includes('id="readConfirm"'));
  assert.ok(html.includes('function confirmRead'));
});

test('init 不再无条件覆盖已有 startDay', () => {
  const m = html.match(/function init\(\)\{[\s\S]*?S\.startDay[^;]*;/);
  assert.ok(m && m[0].includes('if(!S.startDay'), 'init 应仅在缺失时设置默认 startDay');
});
