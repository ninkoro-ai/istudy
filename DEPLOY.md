# istudy 部署说明

站点：**ixuexi.ninkoro.com**（Cloudflare Pages）
仓库：`ninkoro-ai/istudy`（本仓库）

## 部署架构（与原 study.ninkoro.com 一致）

1. GitHub 仓库 `ninkoro-ai/istudy`（Public，main 分支）；
2. Cloudflare Pages 项目 `istudy` 连接该仓库：Build command = `node build/build.mjs --minify`、Output 目录 `/`（构建会做数据校验并把 `src/` + `data/*.json` 合并为 `app.html`）；
3. Pages 自定义域 `ixuexi.ninkoro.com`（zone `ninkoro.com` 已在 Cloudflare 托管，子域自动签发 SSL）；
4. 兜底：若自动 DNS 未生成，手动添加 CNAME `ixuexi.ninkoro.com → <project>.pages.dev`（proxied）。

此后每次 `git push` 到 main 即自动重新部署。仓库另附 GitHub Actions（`ci.yml` 测试+构建、`pages.yml` 作为 GitHub Pages 兜底）。

## 本地构建与验证

```bash
npm ci
npm test        # 28 项单元测试
npm run lint    # ESLint
node build/build.mjs   # 生成 app.html
node tests/e2e/smoke.mjs   # UI 冒烟测试
```

## Cloudflare 关键标识

- Account ID：`1f2fcea04028e028fabc64836ae5dd9c`
- Zone ID（ninkoro.com）：`c0e406449d9f80ac422b68be44f52a11`

## 本地预览

双击 `启动-本地服务.bat`（或 `node server.js`）后访问 `http://127.0.0.1:8080/`。
