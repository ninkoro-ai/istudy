// 一次性重构工具：把 app.html 单文件拆分为 src/ 多文件 + data/*.json + app.template.html
// 运行：node build/extract.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const html = readFileSync(join(ROOT, 'app.html'), 'utf8');

// ---------- 工具 ----------
function extractBlock(src, varName) {
  const re = new RegExp('var ' + varName + ' = \\{');
  const m = src.match(re);
  if (!m) throw new Error('未找到 var ' + varName);
  let i = m.index + m[0].length - 1;
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(m.index, i + 1);
}

function blockToJson(src, varName) {
  const objText = src.replace(new RegExp('^var ' + varName + ' = '), '').replace(/;$/, '');
  const obj = eval('(' + objText + ')'); // 受信自有代码，仅用于一次性抽取
  return JSON.stringify(obj, null, 2);
}

// ---------- 抽取内联脚本 ----------
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (scripts.length < 2) throw new Error('未找到两个内联脚本');
const main = scripts[0];
const touch = scripts[1];

// 去掉 IIFE 外壳，只保留函数体内容
const open = main.indexOf('(function(){');
const close = main.lastIndexOf('})();');
let body = main.slice(open + '(function(){'.length, close);
body = body.replace(/^\r?\n/, '').replace(/\r?\n\s*$/, '');

// ---------- 数据对象抽为 JSON ----------
const KP_BLOCK = extractBlock(body, 'KP_LIB');
const PLAN_BLOCK = extractBlock(body, 'PLAN');
const QUIZ_BLOCK = extractBlock(body, 'QUIZ');
const DATA_DIR = join(ROOT, 'data');
mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(join(DATA_DIR, 'kp.json'), blockToJson(KP_BLOCK, 'KP_LIB') + '\n', 'utf8');
writeFileSync(join(DATA_DIR, 'plan.json'), blockToJson(PLAN_BLOCK, 'PLAN') + '\n', 'utf8');
writeFileSync(join(DATA_DIR, 'quiz.json'), blockToJson(QUIZ_BLOCK, 'QUIZ') + '\n', 'utf8');

// 正文中替换为构建期注入标记
body = body.replace(KP_BLOCK, 'var KP_LIB = /*__KP_DATA__*/');
body = body.replace(PLAN_BLOCK, 'var PLAN = /*__PLAN_DATA__*/');
body = body.replace(QUIZ_BLOCK, 'var QUIZ = /*__QUIZ_DATA__*/');

// ---------- 按分区注释拆分 ----------
const SECTIONS = [
  ['01-core', '// 横震锁定'],
  ['02-data', '// 状态'],
  ['03-init', '// ---------- 专注准备弹窗'],
  ['04-prep', '// 90天 → 今天对应天数'],
  ['05-schedule', '// ---------- 掌握度（0-100）+ 艾宾浩斯复习'],
  ['06-review', '// 积分记录'],
  ['07-score', '// ---------- 答题系统'],
  ['08-quiz', '// ---------- 渲染 ----------'],
  ['09-render', '// ---------- 补卡（缺卡回溯 · 正常积分一半）'],
  ['10-makeup', '// ---------- 题库：默认「今日学习」'],
  ['11-kp', '// ---------- 知识点详情路由'],
  ['12-kp-detail', '// ---------- 错题本（可展开） ----------'],
  ['13-wrong', '// ---------- 全站搜索 ----------'],
  ['14-search', '// 逐模块渲染保护'],
  ['15-render-all', '// ---------- 底部标签栏切换 ----------'],
  ['16-bindings', '// ---------- 交互 ----------'],
  ['17-interactions', '// 顶部按钮'],
  ['18-buttons', '// ---------- 反馈 ----------'],
  ['19-toast', '// AI 教学助手'],
  ['20-ai', '// ---------- 实时时间同步 ----------'],
  ['21-sync', '// ---------- 启动 ----------'],
  ['22-startup', '// ---- 错误边界'],
  ['23-fatal', null]
];

const SRC_DIR = join(ROOT, 'src');
mkdirSync(SRC_DIR, { recursive: true });

let cursor = 0;
for (let i = 0; i < SECTIONS.length; i++) {
  const [name, marker] = SECTIONS[i];
  const nextMarker = i + 1 < SECTIONS.length ? SECTIONS[i + 1][1] : null;
  let end = body.length;
  if (nextMarker) {
    const idx = body.indexOf(nextMarker, cursor);
    if (idx === -1) throw new Error('未找到分区: ' + nextMarker);
    end = idx;
  }
  const seg = body.slice(cursor, end).trim();
  writeFileSync(join(SRC_DIR, name + '.js'), seg + '\n', 'utf8');
  cursor = end;
}

// ---------- 模板 ----------
const template = html
  .replace(main, '(function(){\n  "use strict";\n/*__APP_JS__*/\n})();')
  .replace(touch, '/*__TOUCH_JS__*/');
writeFileSync(join(ROOT, 'app.template.html'), template, 'utf8');

// ---------- touch 脚本 ----------
writeFileSync(join(SRC_DIR, 'touch.js'), touch.trim() + '\n', 'utf8');

console.log('抽取完成：src/ 共 ' + (SECTIONS.length + 1) + ' 个文件，data/ 3 个 JSON，app.template.html 已生成');
