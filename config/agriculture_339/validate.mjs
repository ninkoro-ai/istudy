// Exam Package 校验器（V1）：按 README 规范检查 agriculture_339 配置包
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(__dirname, f), 'utf8'));

const exam = read('exam.json');
const subjects = read('subjects.json');
const knowledge = read('knowledge.json');
const questions = read('questions.json');
const strategy = read('learning_strategy.json');
const errors = [];

const types = new Set(['concept', 'structure', 'process', 'comparison', 'memory']);
const importance = new Set(['high', 'medium', 'low']);
const qTypes = new Set(['single', 'judge', 'short', 'ai_open']);

// 1) exam
if (!exam.id || !exam.name) errors.push('exam.json 缺少 id/name');

// 2) subjects
const subIds = new Set(subjects.subjects.map((s) => s.id));
const chapIds = new Set();
for (const s of subjects.subjects) {
  if (!s.id || !s.name) errors.push('subjects.json 存在缺 id/name 的科目');
  const w = Number(s.weight);
  if (!Number.isFinite(w) || w <= 0) errors.push(`科目 ${s.id} weight 非法`);
  for (const c of s.chapters || []) {
    if (!c.id || !c.name) errors.push(`科目 ${s.id} 存在缺 id/name 的章节`);
    chapIds.add(`${s.id}:${c.id}`);
  }
}
const totalW = subjects.subjects.reduce((a, s) => a + Number(s.weight), 0);
if (Math.abs(totalW - 1) > 0.01) errors.push(`科目权重合计 ${totalW.toFixed(2)}，应≈1`);

// 3) knowledge
const nodeIds = new Set(knowledge.nodes.map((n) => n.id));
for (const n of knowledge.nodes) {
  if (!n.id || !n.name) { errors.push('knowledge.json 存在缺 id/name 的节点'); continue; }
  if (!types.has(n.type)) errors.push(`节点 ${n.id} type 非法: ${n.type}`);
  if (!importance.has(n.importance)) errors.push(`节点 ${n.id} importance 非法`);
  if (!Number.isInteger(n.difficulty) || n.difficulty < 1 || n.difficulty > 5) errors.push(`节点 ${n.id} difficulty 越界`);
  if (!subIds.has(n.subjectId)) errors.push(`节点 ${n.id} subjectId 不存在: ${n.subjectId}`);
  if (!chapIds.has(`${n.subjectId}:${n.chapterId}`)) errors.push(`节点 ${n.id} chapterId 不存在: ${n.chapterId}`);
  for (const p of n.prerequisite || []) if (!nodeIds.has(p)) errors.push(`节点 ${n.id} prerequisite 悬空: ${p}`);
  for (const r of n.related || []) if (!nodeIds.has(r)) errors.push(`节点 ${n.id} related 悬空: ${r}`);
  const el = n.elements || {};
  for (const key of ['summary', 'plain', 'definition', 'keyPoints', 'pitfalls', 'mnemonic']) {
    if (el[key] === undefined) errors.push(`节点 ${n.id} 缺少 elements.${key}`);
  }
}

// 4) questions
for (const q of questions.questions) {
  if (!qTypes.has(q.type)) errors.push(`题目 ${q.id} type 非法`);
  if (!nodeIds.has(q.knowledge_id)) errors.push(`题目 ${q.id} knowledge_id 悬空: ${q.knowledge_id}`);
  if (q.type === 'single' && (!Array.isArray(q.options) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length)) errors.push(`题目 ${q.id} 单选答案非法`);
  if (q.type === 'judge' && typeof q.answer !== 'boolean') errors.push(`题目 ${q.id} 判断答案须为布尔`);
}

// 5) strategy
const iv = strategy.review.intervals;
if (!iv.every((x, i) => Number.isInteger(x) && x > 0 && (i === 0 || x > iv[i - 1]))) errors.push('intervals 须为升序正整数');
const levels = strategy.mastery.levels;
if (levels[0].max !== 30 || levels.at(-1).max !== 100) errors.push('mastery.levels 未覆盖 0–100');
for (let i = 1; i < levels.length; i++) if (levels[i].max <= levels[i - 1].max) errors.push('mastery.levels max 非递增');

if (errors.length) {
  console.error('❌ 校验失败：');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('✓ agriculture_339 Exam Package 校验通过');
console.log(`  知识点 ${knowledge.nodes.length} · 题目 ${questions.questions.length} · 科目 ${subjects.subjects.length}`);
