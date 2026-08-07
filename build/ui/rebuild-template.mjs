// UI v3 重建脚本：用 build/ui/style-*.css + build/ui/new-body.html 替换 app.template.html 的样式与正文
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ui = join(__dirname);

let template = readFileSync(join(ROOT, 'app.template.html'), 'utf8');
const css = ['style-1.css', 'style-2.css', 'style-3.css']
  .map((f) => readFileSync(join(ui, f), 'utf8').trim())
  .join('\n');
const body = readFileSync(join(ui, 'new-body.html'), 'utf8').trim();

// 替换 <style>…</style>
template = template.replace(/<style>[\s\S]*?<\/style>/, '<style>\n' + css + '\n</style>');

// 替换 <body>…</body>（保留两个脚本占位符）
const scripts = [
  '<script>\n(function(){\n  "use strict";\n/*__APP_JS__*/\n})();\n</script>',
  '<script>\n/*__TOUCH_JS__*/\n</script>'
].join('\n');
template = template.replace(/<body>[\s\S]*?<\/body>/, '<body>\n' + body + '\n' + scripts + '\n</body>');

writeFileSync(join(ROOT, 'app.template.html'), template, 'utf8');
console.log('✓ app.template.html 已重建（UI v3）');
