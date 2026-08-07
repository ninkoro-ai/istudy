// 我ai学习 · UI 冒烟测试（Playwright + 本地服务）
// 运行：node tests/e2e/smoke.mjs（依赖 devDependencies: playwright-core）
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const PORT = 8090;

const server = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
  windowsHide: true
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  await sleep(1500);
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto('http://127.0.0.1:' + PORT + '/app.html', { waitUntil: 'networkidle' });

  const dayTag = await page.textContent('#dayTag');
  assert.match(dayTag, /第 \d+ 天/);
  await page.waitForSelector('#todayTasks .kp.compact');
  // 首次进入会弹出「专注提醒」，先关闭再操作
  const prep = await page.$('#prepOverlay');
  if (prep && await prep.isVisible()) {
    await page.click('#prepOverlay [data-act="closePrep"]');
  }

  // 题库页
  await page.click('.tabbar .tb[data-page="kp"]');
  await page.waitForSelector('#kpNav .kpnav-item');
  await page.waitForSelector('#kpList .kp.compact');

  // 打开闯关弹窗并关闭
  await page.click('#kpList .kp.compact .kp-row');
  await page.click('#kpList .kp.compact [data-act="kp"]');
  await page.waitForSelector('#qOverlay.on');
  assert.ok(await page.isVisible('#qOverlay'));
  await page.click('#qClose');
  await page.waitForFunction(() => !document.getElementById('qOverlay').classList.contains('on'));

  // 统计页
  await page.click('.tabbar .tb[data-page="stats"]');
  await page.waitForSelector('#statTrend svg, #statTrend .empty');

  // 我的页
  await page.click('.tabbar .tb[data-page="mine"]');
  await page.waitForSelector('#scoreBig');

  assert.equal(await page.isVisible('#fatalError'), false);
  const fatalErrors = errors.filter((e) => /FATAL|ReferenceError|TypeError|未捕获/.test(e));
  assert.deepEqual(fatalErrors, [], '存在致命前端错误：' + fatalErrors.join(' | '));

  console.log('✓ 冒烟测试通过：今日 / 题库 / 答题弹窗 / 统计 / 我的 全部正常');
  console.log('  控制台非致命错误 ' + errors.length + ' 条');
} finally {
  if (browser) await browser.close();
  server.kill();
}
