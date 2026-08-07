// ---------- 启动 ----------
  setVH();
  window.addEventListener('resize', setVH, { passive:true });
  window.addEventListener('orientationchange', function(){ setTimeout(setVH, 200); }, { passive:true });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden){ syncTime(); setVH(); } });
  // iOS Safari 地址栏伸缩 / 微信高度漂移：visualViewport 变化即重算 --vh，消除高度跳动
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', setVH, { passive:true });
    window.visualViewport.addEventListener('scroll', setVH, { passive:true });
  }
  window.addEventListener('focus', syncTime);
  window.addEventListener('pageshow', function(e){ if(e.persisted){ syncTime(); setVH(); } });
  // 兜底：每分钟检查一次真实日期是否变化（处理长时间挂后台/跨午夜）
  setInterval(syncTime, 60000);
  // IndexedDB 镜像：离开页面时立即落盘，防止异步写入丢失
  window.addEventListener('pagehide', idbFlushNow);

  try { init(); _renderDate = dateStr(0); renderAll(); }
  catch(e){ console.error('[boot]', e); showFatal(e, '应用初始化失败'); }
  _appRendered = true;
  // localStorage 为空（新设备/清缓存）时尝试从 IndexedDB 恢复
  idbRestoreIfEmpty();
  // #prepOverlay 在本脚本之后才解析，故延迟到解析完成后弹「专注提醒」（每日一次）
  setTimeout(maybeShowFocusReminder, 0);
