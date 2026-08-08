// AI Exam OS · UI 冒烟测试：本地静态服务 + 无头 Chromium 走核心闭环
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const PORT = 4187;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(dist, p);
  if (!fp.startsWith(dist)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

server.listen(PORT, async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=创建考试目标', { timeout: 15000 });
    await page.click('button:has-text("生成学习计划并开始")');
    await page.waitForSelector('text=今日任务', { timeout: 15000 });
    console.log('✓ 目标创建 → 今日页');

    await page.click('.tabbar button:has-text("知识库")');
    await page.waitForSelector('text=知识点（', { timeout: 15000 });
    await page.click('button:has-text("叶绿体结构")');
    await page.waitForSelector('text=一句话理解', { timeout: 15000 });
    console.log('✓ 知识库 → 知识点详情');
    await page.click('button:has-text("我已学会，记录学习")');

    await page.click('.tabbar button:has-text("测评")');
    await page.waitForSelector('text=今日测评', { timeout: 15000 });
    await page.click('button:has-text("开始")');
    await page.waitForSelector('text=提交答卷', { timeout: 15000 });
    // 逐题作答：单选用第一项，判断题选“正确”，问答点“我答对了”
    const items = await page.$$('button:has-text("提交答卷")');
    if (items.length) {
      const firstOpts = await page.$$('.rounded-lg.border.px-3.py-2');
      for (const b of firstOpts) {
        const txt = (await b.textContent()) || '';
        if (txt.trim().startsWith('A.') || txt.trim() === '正确' || txt.trim() === '我答对了') {
          await b.click();
        }
      }
      await page.click('button:has-text("提交答卷")');
      await page.waitForSelector('text=通过', { timeout: 15000 }).catch(() => {});
      await page.waitForSelector('text=返回列表', { timeout: 15000 });
      console.log('✓ 测评 → 提交 → 结果');
    }

    await page.click('.tabbar button:has-text("复习")');
    await page.waitForSelector('text=今日到期复习', { timeout: 15000 });
    await page.click('.tabbar button:has-text("报告")');
    await page.waitForSelector('text=学习概览', { timeout: 15000 });
    await page.waitForSelector('button:has-text("导出备份")', { timeout: 15000 });
    console.log('✓ 复习页 / 报告页（含导出）');

    const fatal = errors.filter((e) => /ReferenceError|TypeError|Unhandled/.test(e));
    console.log('fatal errors:', fatal.length ? fatal.join(' | ') : 'none');
    console.log('console errors:', errors.length);
    await browser.close();
    server.close();
    process.exit(fatal.length ? 1 : 0);
  } catch (e) {
    console.error('SMOKE FAIL:', e.message);
    if (browser) await browser.close();
    server.close();
    process.exit(1);
  }
});
