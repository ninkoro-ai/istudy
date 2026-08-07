// 逐模块渲染保护：任一模块异常只记录并展示，不连累其它模块与整体白屏
  function safeRender(fn, name){
    try { fn(); }
    catch(e){ console.error('[render '+name+']', e); if(typeof showFatal==='function') showFatal(e, '渲染「'+name+'」模块时出错'); }
  }
  function activePage(){
    var p = document.querySelector(".page.active");
    return p ? p.id.replace("page-","") : "today";
  }
  // 性能优化：只渲染「今日」与当前激活页；切换页签时按需渲染
  function renderAll(){
    var ap = activePage();
    safeRender(renderToday, '今日打卡');
    if(ap==="plan") safeRender(renderPlan, '学习计划');
    else if(ap==="kp") safeRender(renderKP, '题库');
    else if(ap==="mine") safeRender(renderScore, '积分');
    else if(ap==="stats") safeRender(renderStats, '统计');
  }
