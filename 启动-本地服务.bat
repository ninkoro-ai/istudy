@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   我ai学习 · 本地服务（0 成本 · 全离线）
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [提示] 未检测到 Node.js。
  echo 本应用也可以直接双击打开 app.html 或 index.html 使用，
  echo 但「添加到主屏幕 / 离线缓存（PWA）」功能需要本服务提供。
  echo.
  pause
  exit /b 1
)

echo 正在启动本地服务，浏览器会自动打开……
echo 关闭本窗口即可停止服务，学习数据保存在浏览器里，不会丢失。
echo.
node server.js
pause
