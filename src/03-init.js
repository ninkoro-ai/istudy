// ---------- 专注准备弹窗（开始学习前的简单确认） ----------
  var _prepCb = null;
  function dayOfYear(){
    var n = new Date();
    var s = new Date(n.getFullYear(), 0, 0);
    return Math.floor((n - s) / 86400000);
  }
  function todayEncourage(){
    if(!ENCOURAGE || !ENCOURAGE.length) return "今天也要认真学，你离上岸更近一步。";
    var i = ((dayOfYear() - 1) % ENCOURAGE.length + ENCOURAGE.length) % ENCOURAGE.length;
    return ENCOURAGE[i];
  }
  function prepReadyToday(){ return S.prepDate === dateStr(0); }
  function markPrepTriggered(){ var t = dateStr(0); if(S.prepTriggered !== t){ S.prepTriggered = t; saveAll(); } }
  function openPrep(cb){
    _prepCb = (typeof cb === "function") ? cb : function(){ renderToday(); scrollToTasks(); };
    var ov = $("prepOverlay"); if(!ov) return;
    var ec = $("prepEncourage"); if(ec) ec.textContent = todayEncourage();
    // 简单弹窗：仅展示今日鼓励，无勾选/校验
    document.documentElement.classList.add("modal-open");
    ov.classList.remove("hidden");
    if(typeof updateFocusTrap === 'function') updateFocusTrap();
  }
  function closePrep(){
    var ov = $("prepOverlay"); if(ov) ov.classList.add("hidden");
    document.documentElement.classList.remove("modal-open");
    _prepCb = null;
    if(typeof updateFocusTrap === 'function') updateFocusTrap();
  }
  function confirmPrep(){
    if(!prepReadyToday()){
      S.prepDate = dateStr(0);
      saveAll();
    }
    var cb = _prepCb;
    closePrep();
    if(cb) cb();
  }
  function focusReminderShownToday(){ return S.prepShown === dateStr(0); }
  function maybeShowFocusReminder(){
    if(focusReminderShownToday()) return;     // 每日仅展示一次
    S.prepShown = dateStr(0); saveAll();
    openPrep();                                // openPrep 负责填充每日鼓励并弹出
  }
  function scrollToTasks(){
    var t = $("todayTasks"); if(t) t.scrollIntoView({behavior:"smooth", block:"start"});
  }
