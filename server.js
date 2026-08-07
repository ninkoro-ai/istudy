// 我ai学习 · 零依赖本地静态服务器
// 仅使用 Node.js 内置模块（http / fs / path），无需安装任何依赖、无需联网。
// 用途：本地完整运行 PWA（Service Worker / 添加到主屏幕需要 http(s) 环境）。
// 启动：双击「启动-本地服务.bat」，或命令行运行 node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function safeResolve(urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath);
  } catch (e) {
    return null;
  }
  if (p.indexOf('\0') !== -1) return null;
  let fp = path.join(ROOT, path.normalize(p));
  // 防目录穿越：解析后的路径必须仍在 ROOT 内
  if (fp !== ROOT && !fp.startsWith(ROOT + path.sep)) return null;
  return fp;
}

const server = http.createServer((req, res) => {
  let urlPath = (req.url || '/').split('?')[0].split('#')[0];
  if (urlPath === '/') urlPath = '/index.html';

  let filePath = safeResolve(urlPath);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // 无扩展名路径尝试补 .html（如 /app → app.html、/guide → guide.html）
  const candidates = path.extname(filePath) === '' ? [filePath + '.html', filePath] : [filePath];

  const tryNext = (i) => {
    if (i >= candidates.length) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    fs.stat(candidates[i], (err, st) => {
      if (err || !st.isFile()) {
        tryNext(i + 1);
        return;
      }
      fs.readFile(candidates[i], (e2, buf) => {
        if (e2) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Server Error');
          return;
        }
        const ext = path.extname(candidates[i]).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache'
        });
        res.end(buf);
      });
    });
  };
  tryNext(0);
});

server.listen(PORT, HOST, () => {
  const url = 'http://' + HOST + ':' + PORT + '/';
  console.log('我ai学习 · 本地服务已启动：' + url);
  console.log('（关闭本窗口或按 Ctrl+C 即可停止服务，数据不会丢失。）');
  // 自动打开默认浏览器
  try {
    const cmd = process.platform === 'win32'
      ? 'start "" "' + url + '"'
      : process.platform === 'darwin'
        ? 'open "' + url + '"'
        : 'xdg-open "' + url + '"';
    require('child_process').exec(cmd);
  } catch (e) { /* 打不开也不影响服务 */ }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('端口 ' + PORT + ' 已被占用。请先关闭占用程序，或设置环境变量 PORT=其他端口后重试。');
  } else {
    console.error('服务启动失败：', e.message);
  }
  process.exit(1);
});
