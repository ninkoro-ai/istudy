// 极简构建：src/*.js + data/*.json → app.html（单文件 PWA）
// 运行：node build/build.mjs [--minify]
// 依赖：仅 Node 内置模块；若本地安装了 terser 会自动启用（否则仅做安全的空白压缩）
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MINIFY = process.argv.includes('--minify');
const DRY = process.argv.includes('--dry-run');

// ---------- 数据注入 ----------
function readData(name) {
  return JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));
}
const KP_LIB = readData('kp.json');
const PLAN = readData('plan.json');
const QUIZ = readData('quiz.json');
const QUIZ_EXTRA = readData('quiz-extra.json');

// 合并手写题库补充（quiz-extra.json）
for (const sub of Object.keys(QUIZ_EXTRA)) {
  if (!QUIZ[sub]) QUIZ[sub] = {};
  for (const kid of Object.keys(QUIZ_EXTRA[sub])) {
    if (QUIZ[sub][kid]) errors.push(`quiz-extra.json 与 quiz.json 重复定义：${sub}:${kid}`);
    QUIZ[sub][kid] = QUIZ_EXTRA[sub][kid];
  }
}

// ---------- 构建期数据校验 ----------
const errors = [];
const warn = [];

// 1) 知识点 id 唯一 & 前缀与科目匹配
const seen = new Map();
const subOf = (id) => (/^p/.test(id) ? 'pol' : /^e/.test(id) ? 'eng' : /^b/.test(id) ? 's339' : 's881');
const kpCount = {};
for (const sub of Object.keys(KP_LIB)) {
  kpCount[sub] = KP_LIB[sub].length;
  const ids = new Set();
  for (const k of KP_LIB[sub]) {
    if (ids.has(k.id)) errors.push(`知识点 id 重复：${sub}:${k.id}`);
    ids.add(k.id);
    const expect = subOf(k.id);
    if (expect !== sub) errors.push(`知识点 ${k.id} 前缀与科目 ${sub} 不符（应为 ${expect}）`);
    if (!k.t || !k.b || !k.src) errors.push(`知识点 ${sub}:${k.id} 缺少 t/b/src`);
    seen.set(sub + ':' + k.id, k);
  }
}
const totalKp = Object.values(kpCount).reduce((a, b) => a + b, 0);

// 2) PLAN 每科长度与计划天数一致
const planLen = {};
for (const sub of Object.keys(PLAN)) {
  planLen[sub] = PLAN[sub].length;
}
const planVals = Object.values(planLen);
if (planVals.some((n) => n !== planVals[0])) errors.push(`PLAN 各科长度不一致：${JSON.stringify(planLen)}`);

// 3) QUIZ 手写题校验
let quizKps = 0;
let quizQs = 0;
for (const sub of Object.keys(QUIZ)) {
  for (const kid of Object.keys(QUIZ[sub])) {
    if (!seen.has(sub + ':' + kid)) errors.push(`QUIZ 引用了不存在的知识点：${sub}:${kid}`);
    quizKps++;
    for (const set of QUIZ[sub][kid]) {
      quizQs += set.length;
      for (const q of set) {
        if (!q.q || !Array.isArray(q.opts) || q.opts.length !== 4) errors.push(`QUIZ ${sub}:${kid} 题目选项数不为 4`);
        if (typeof q.ans !== 'number' || q.ans < 0 || q.ans > 3) errors.push(`QUIZ ${sub}:${kid} ans 越界`);
      }
    }
  }
}

// 4) 自动出题可用率报告（与 src/07-score.js 的 splitFacts 保持同口径）
function factsOf(b) {
  let parts = (b || '').split(/[；;。]+/).map((x) => x.trim()).filter((x) => x.length > 6);
  if (parts.length < 2) {
    parts = (b || '').split(/[，,；;。]+/).map((x) => x.trim()).filter((x) => x.length > 6);
  }
  return parts;
}
const allFacts = [];
for (const sub of Object.keys(KP_LIB)) for (const k of KP_LIB[sub]) allFacts.push(...factsOf(k.b));
let autoOk = 0;
const noQuizKps = [];
for (const sub of Object.keys(KP_LIB)) {
  for (const k of KP_LIB[sub]) {
    const f = factsOf(k.b);
    const hasHand = QUIZ[sub] && QUIZ[sub][k.id];
    if (hasHand || (f.length >= 2 && allFacts.length - f.length >= 3)) autoOk++;
    else noQuizKps.push(`${sub}:${k.id}`);
  }
}
console.log(`  自动出题可用：${autoOk}/${totalKp}（${(autoOk / totalKp * 100).toFixed(1)}%）；无题走纯阅读：${noQuizKps.length} 个`);
if (noQuizKps.length) console.log('  无题知识点：' + noQuizKps.join('、'));

// 5) src 重复函数名检查
const SRC_ORDER = [
  '01-core.js', '02-data.js', '03-init.js', '04-prep.js', '05-schedule.js',
  '06-review.js', '07-score.js', '08-quiz.js', '09-render.js', '10-makeup.js',
  '11-kp.js', '12-kp-detail.js', '13-wrong.js', '14-search.js', '15-render-all.js',
  '16-bindings.js', '17-interactions.js', '18-buttons.js', '19-toast.js',
  '20-ai.js', '21-sync.js', '22-startup.js', '24-backup.js', '25-stats.js',
  '26-pwa.js', '27-a11y.js'
];
const fnNames = new Map();
for (const f of SRC_ORDER) {
  const txt = readFileSync(join(ROOT, 'src', f), 'utf8');
  for (const m of txt.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (fnNames.has(m[1])) errors.push(`函数重复定义：${m[1]}（${fnNames.get(m[1])} 与 ${f}）`);
    fnNames.set(m[1], f);
  }
}

if (errors.length) {
  console.error('❌ 构建期校验失败：');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log(`✓ 数据校验通过：知识点 ${totalKp}（${JSON.stringify(kpCount)}），PLAN ${JSON.stringify(planLen)}，手写题 ${quizKps} 个知识点 / ${quizQs} 题`);
if (warn.length) warn.forEach((w) => console.warn('  ⚠ ' + w));

// ---------- 组装 ----------
function minifyJs(code) {
  // 安全压缩：去掉行首缩进与空行（不动字符串/注释，避免破坏语义）
  return code.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0).join('\n');
}

const dataInjects = {
  __KP_DATA__: JSON.stringify(KP_LIB, null, 0),
  __PLAN_DATA__: JSON.stringify(PLAN, null, 0),
  __QUIZ_DATA__: JSON.stringify(QUIZ, null, 0)
};

let appJs = '';
for (const f of SRC_ORDER) {
  let txt = readFileSync(join(ROOT, 'src', f), 'utf8');
  for (const [marker, value] of Object.entries(dataInjects)) {
    txt = txt.split(marker).join(value);
  }
  appJs += txt + '\n';
}
const touchJs = readFileSync(join(ROOT, 'src', 'touch.js'), 'utf8');

// 语法检查
try {
  new Function(appJs);
  new Function(touchJs);
} catch (e) {
  console.error('❌ 合并后脚本语法错误：', e.message);
  process.exit(1);
}

if (MINIFY) {
  appJs = minifyJs(appJs);
  touchJs = minifyJs(touchJs);
  // 尝试 terser（若已安装）
  try {
    const terser = await import('terser');
    const r1 = await terser.minify(appJs, { compress: true, mangle: false });
    if (r1.code) appJs = r1.code;
    const r2 = await terser.minify(touchJs, { compress: true, mangle: false });
    if (r2.code) touchJs = r2.code;
    console.log('✓ 已使用 terser 压缩');
  } catch (e) { console.log('（未安装 terser，仅做空白压缩）'); }
}

let template = readFileSync(join(ROOT, 'app.template.html'), 'utf8');
template = template.replace('/*__APP_JS__*/', appJs);
template = template.replace('/*__TOUCH_JS__*/', touchJs);

if (DRY) {
  console.log('✓ 校验通过（--dry-run，未写出 app.html）');
  process.exit(0);
}

// 统一 CRLF（与仓库既有文件一致）
const out = template.split(/\r?\n/).join('\r\n');
writeFileSync(join(ROOT, 'app.html'), out, 'utf8');

const size = Buffer.byteLength(out);
console.log(`✓ app.html 已生成：${(size / 1024).toFixed(1)} KB${MINIFY ? '（压缩模式）' : ''}`);
