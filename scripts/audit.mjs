// 我ai学习 · 数据与实现审计脚本（只读）
// 运行：node scripts/audit.mjs
// 职责：从 app.html 抽取真实数据，核对 PRD 关键声明（知识点数、题库覆盖率、
//       自动出题可用率、导出字段完整性、死代码等），输出审计基线。
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, '..', 'app.html'), 'utf8');

function blockOf(name) {
  const re = new RegExp('var ' + name + ' = \\{');
  const m = html.match(re);
  if (!m) return null;
  let i = m.index + m[0].length - 1;
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
  }
  return html.slice(m.index, i + 1);
}

function valueOf(name) {
  const m = html.match(new RegExp('var ' + name + '\\s*=\\s*([^;\\n]+)'));
  return m ? m[1].trim() : null;
}

const KP_LIB = blockOf('KP_LIB');
const QUIZ = blockOf('QUIZ');
const PLAN = blockOf('PLAN');

const kpRe = /\{id:"([a-z]\d+)",t:"([^"]+)",b:"([^"]+)",src:"([^"]+)"\}/g;
const kps = [];
let m;
while ((m = kpRe.exec(KP_LIB)) !== null) {
  kps.push({ id: m[1], t: m[2], b: m[3], src: m[4] });
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
const quizKids = new Set([...QUIZ.matchAll(/"([a-z]\d+)":\s*\[/g)].map((x) => x[1]));
const quizQCount = (QUIZ.match(/"q":/g) || []).length;
console.log(`手写题覆盖知识点: ${quizKids.size}/${kps.length} = ${(quizKids.size / kps.length * 100).toFixed(1)}%`);
console.log(`手写题目总数: ${quizQCount}`);

console.log('\n===== 自动出题 genQuiz 可用率（kp.b 切句） =====');
function factsOf(b) {
  return b.split(/[；;。.]/).map((x) => x.trim()).filter((x) => x.length > 6);
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
const subRe = /^\s{4}([a-z0-9]+):\s*\[/gm;
let sm;
const planLens = {};
while ((sm = subRe.exec(PLAN)) !== null) {
  const s = sm[1];
  let i = sm.index + sm[0].length - 1;
  let depth = 0;
  for (; i < PLAN.length; i++) {
    if (PLAN[i] === '[') depth++;
    else if (PLAN[i] === ']') { depth--; if (depth === 0) break; }
  }
  const blk = PLAN.slice(sm.index + sm[0].length - 1, i + 1);
  planLens[s] = (blk.match(/"/g) || []).length / 2;
}
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
  'reviewed', 'studyDays', 'lastStudy', 'revStep', 'mastery', 'prepDate', 'prepTriggered', 'prepShown'];
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
