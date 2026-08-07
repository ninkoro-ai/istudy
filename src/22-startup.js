// ---- 错误边界（Error Boundary）：崩溃时显示可恢复的错误面板，而非白屏/巨大"!" ----
  var _appRendered;
  function showFatal(err, where){
    var ov = document.getElementById('fatalError');
    var msg = document.getElementById('fatalMsg');
    var text = (where ? ('['+where+'] ') : '') + (err && err.message ? err.message : (''+err));
    if(err && err.stack) text += '\n\n' + (''+err.stack).split('\n').slice(0,4).join('\n');
    if(msg) msg.textContent = text;
    if(ov) ov.classList.remove('hidden');
    if(typeof updateFocusTrap === 'function') updateFocusTrap();
    if(window.console) console.error('[FATAL]', where, err);
  }
  function fatalRecover(){
    if(!window.confirm('确定恢复默认数据？当前所有进度、错题、积分将被清空且不可恢复。')) return;
    try{
      var keys=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k && k.indexOf(KEY)===0) keys.push(k); }
      keys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    }catch(e){}
    location.reload();
  }
  // 错误面板按钮（复制 / 恢复）独立委托，避免与主交互冲突
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if(!t) return;
    var act = t.getAttribute('data-act');
    if(act==='fatalRecover'){ fatalRecover(); }
    else if(act==='fatalCopy'){ try{ var m=document.getElementById('fatalMsg'); if(m && navigator.clipboard) navigator.clipboard.writeText(m.textContent); if(typeof showToast==='function') showToast('已复制错误信息'); }catch(e){} }
  });
  // 全局错误兜底（L-03）：未捕获异常/Promise 拒绝时提示并记录；渲染未完成则直接展示错误面板
  window.addEventListener('error', function(e){
    if(window.console) console.error('[global error]', (e&&e.error)||(e&&e.message));
    if(typeof showToast==='function') showToast('出错了，请重试（已记录日志）');
    if(!_appRendered && typeof showFatal==='function') showFatal((e&&e.error)||e, '运行时错误');
  });
  window.addEventListener('unhandledrejection', function(e){
    if(window.console) console.error('[unhandledrejection]', e&&e.reason);
    if(typeof showToast==='function') showToast('出错了，请重试（已记录日志）');
  });
