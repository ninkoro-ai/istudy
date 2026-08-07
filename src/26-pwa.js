  // ---------- PWA：更新提示 + 安装引导 ----------
  var _deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    _deferredInstall = e;
    var bi = $("btnInstall");
    if(bi) bi.classList.remove("hidden");
  });
  function tryInstall(){
    if(_deferredInstall){
      _deferredInstall.prompt();
      _deferredInstall.userChoice.then(function(choice){
        if(choice.outcome === "accepted") showToast("已安装，快去主屏幕找它吧！");
        _deferredInstall = null;
        var bi = $("btnInstall");
        if(bi) bi.classList.add("hidden");
      });
    } else {
      showToast("请使用浏览器菜单「添加到主屏幕 / 安装应用」。");
    }
  }
  var _updBtn = null;
  function showUpdateBar(){
    var bar = $("updateBar");
    if(!bar) return;
    bar.classList.remove("hidden");
    _updBtn = $("updateReload");
  }
  function updateReload(){ location.reload(); }
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      try{
        navigator.serviceWorker.register('sw.js?v=60').then(function(reg){
          reg.addEventListener('updatefound', function(){
            var nw = reg.installing;
            if(!nw) return;
            nw.addEventListener('statechange', function(){
              if(nw.state === 'installed' && navigator.serviceWorker.controller){
                showUpdateBar();
              }
            });
          });
        }).catch(function(){});
      }catch(e){}
    });
    // 新 SW 接管后：清掉更新条（页面即将由用户点击刷新）
    navigator.serviceWorker.addEventListener('controllerchange', function(){});
  }
