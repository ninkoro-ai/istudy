// 我ai学习 · 数据与实现审计脚本（只读）
// 运行：node scripts/audit.mjs
// 职责：从 app.html 抽取真实数据，核对 PRD 关键声明（知识点数、题库覆盖率、
//       自动出题可用率、导出字段完整性、死代码等），输出审计基线。
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, '..', 'app.html'), 'utf8');

function jsonOf(name) {
  // 构建产物中数据以 JSON 内联（var NAME = {...};）
  const m = html.match(new RegExp('var ' + name + ' = (\\{.*?\\});', 's'));
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

function valueOf(name) {
  const m = html.match(new RegExp('var ' + name + '\\s*=\\s*([^;\\n]+)'));
  return m ? m[1].trim() : null;
}

const KP_LIB = jsonOf('KP_LIB') || {};
const QUIZ = jsonOf('QUIZ') || {};
const PLAN = jsonOf('PLAN') || {};

const kps = [];
for (const sub of Object.keys(KP_LIB)) {
  for (const k of KP_LIB[sub]) kps.push({ id: k.id, t: k.t, b: k.b, src: k.src, sub });
}

function subOf(id) {
  if (/^p/.test(id)) return 'pol';
  if (/^e/.test(id)) return 'eng';
  if (/^b/.test(id)) return 's339';
  return 's881';
}

console.log('===== 知识点规模 =====');
const bySub = {};
for (const k of kps) bySub[subOf(k.id)] = (bySub[subOf(k.id)] || 0) + 1;
for (const [s, n] of Object.entries(bySub)) console.log(`${s}: ${n}`);
console.log(`知识点总数: ${kps.length}`);

console.log('\n===== 手写题库 QUIZ 覆盖率 =====');
const quizKids = new Set();
let quizQCount = 0;
for (const sub of Object.keys(QUIZ)) {
  for (const kid of Object.keys(QUIZ[sub])) {
    quizKids.add(kid);
    for (const set of QUIZ[sub][kid]) quizQCount += set.length;
  }
}
console.log(`手写题覆盖知识点: ${quizKids.size}/${kps.length} = ${(quizKids.size / kps.length * 100).toFixed(1)}%`);
console.log(`手写题目总数: ${quizQCount}`);

console.log('\n===== 自动出题 genQuiz 可用率（kp.b 切句） =====');
function factsOf(b) {
  let parts = (b || '').split(/[；;。]+/).map((x) => x.trim()).filter((x) => x.length > 6);
  if (parts.length < 2) {
    parts = (b || '').split(/[，,；;。]+/).map((x) => x.trim()).filter((x) => x.length > 6);
  }
  return parts;
}
const allFacts = kps.reduce((a, k) => a.concat(factsOf(k.b)), []);
let ok = 0;
const noQuiz = [];
for (const k of kps) {
  const f = factsOf(k.b);
  if (f.length >= 2 && allFacts.length - f.length >= 3) ok++;
  else noQuiz.push(`${subOf(k.id)}:${k.id}（可切句数=${f.length}）`);
}
console.log(`自动题可用: ${ok}/${kps.length} = ${(ok / kps.length * 100).toFixed(1)}%`);
if (noQuiz.length) console.log('无题可出: ' + noQuiz.join('、'));

console.log('\n===== PLAN 每日计划长度（应为 90） =====');
const planLens = {};
for (const s of Object.keys(PLAN)) planLens[s] = PLAN[s].length;
for (const [s, n] of Object.entries(planLens)) console.log(`${s}: ${n}`);

console.log('\n===== 常量核对（PRD §3） =====');
for (const name of ['KEY', 'TOTAL', 'PER_TASK', 'PER_DAY_FULL', 'PER_KP', 'SCHEMA_V', 'QUIZ_TIME', 'PERIOD_MAX', 'COVER_DAYS']) {
  const v = valueOf(name);
  console.log(`${name}: ${v === null ? '(未找到)' : v}`);
}

console.log('\n===== 死代码 / 引用检查 =====');
const perTaskRefs = (html.match(/PER_TASK/g) || []).length;
console.log(`PER_TASK 引用次数: ${perTaskRefs}（0 = 已移除）`);

console.log('\n===== 导出 / 导入字段完整性（对照 S 字段） =====');
const S_FIELDS = ['startDay', 'done', 'kpDone', 'score', 'records', 'redeemed', 'curSub',
  'attempts', 'wrong', 'easyDay', 'periodUsed', 'periodMonth', 'periodToday', 'notes',
  'reviewed', 'studyDays', 'lastStudy', 'lastReview', 'revStep', 'mastery', 'qStats',
  'milestones', 'prepDate', 'prepTriggered', 'prepShown'];
const exportSec = html.slice(html.indexOf('btnExport").addEventListener'), html.indexOf('btnImport").addEventListener'));
const importSec = html.slice(html.indexOf('function sanitizeImport'), html.indexOf('function sanitizeImport') + 2200);
for (const f of S_FIELDS) {
  const inExport = exportSec.includes(f);
  const inImport = importSec.includes(f);
  if (!inExport || !inImport) console.log(`字段 ${f}: 导出=${inExport} 导入=${inImport}`);
}
console.log('（以上仅列出缺失字段，无输出即全部齐全）');

console.log('\n===== 其它实现抽查 =====');
const initBody = (html.match(/function init\(\)\{[\s\S]*?\n  \}/) || [''])[0];
console.log('init 中 startDay 仅在缺失时设置默认值:', initBody.includes('if(!S.startDay') && initBody.includes('S.startDay = "2026-08-02"'));
console.log('normalizeState 缺失 startDay 默认 2026-08-02:', /s\.startDay[^;]*: "2026-08-02"/.test(html));
console.log('inline script 语法检查:');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
scripts.forEach((s, i) => {
  try { new Function(s); console.log(`  script ${i}: OK`); }
  catch (e) { console.log(`  script ${i}: 语法错误 ${e.message}`); }
});
