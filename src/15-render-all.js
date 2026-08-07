// ---------- 底部标签栏切换 ----------
  function switchTab(page){
    var pages = document.querySelectorAll(".page");
    for(var i=0;i<pages.length;i++) pages[i].classList.remove("active");
    var target = $("page-"+page);
    if(target) target.classList.add("active");
    var tbs = document.querySelectorAll(".tabbar .tb");
    for(var j=0;j<tbs.length;j++) tbs[j].classList.remove("on");
    var cur = document.querySelector('.tabbar .tb[data-page="'+page+'"]');
    if(cur) cur.classList.add("on");
    if(page==="plan"){ var n=new Date(); calView = { y:n.getFullYear(), m:n.getMonth() }; clampCal(); renderPlan(); }
    if(page==="kp") resetSearch();
    if(page==="mine") renderScore();
    if(page==="stats") renderStats();
    if(page==="today") renderToday();
    winScroll(0,0);
  }
  var tbBtns = document.querySelectorAll(".tabbar .tb");
  for(var ti=0;ti<tbBtns.length;ti++){
    tbBtns[ti].addEventListener("click", function(){ switchTab(this.getAttribute("data-page")); });
  }

  // 全站搜索
  var kpSearchEl = $("kpSearch");
  if(kpSearchEl) kpSearchEl.addEventListener("input", doSearch);

  // 日历翻月 & 备注弹窗
  function bindId(id, fn){ var el=$(""+id); if(el) el.addEventListener("click", fn); }
  bindId("calPrev", function(){
    calView.m--; if(calView.m<0){ calView.m=11; calView.y--; } clampCal(); renderCalendar();
  });
  bindId("calNext", function(){
    calView.m++; if(calView.m>11){ calView.m=0; calView.y++; } clampCal(); renderCalendar();
  });
  bindId("noteSave", saveNote);
  bindId("noteClose", function(){ $("noteOverlay").classList.remove("on"); lockScroll(false); });
  bindId("noteOverlay", function(e){ if(e.target===$("noteOverlay")){ $("noteOverlay").classList.remove("on"); lockScroll(false); } });
  // 补卡弹层
  bindId("muConfirm", confirmMakeup);
  bindId("muJump", muJump);
  bindId("muClose", closeMakeup);
  bindId("makeupOverlay", function(e){ if(e.target===$("makeupOverlay")) closeMakeup(); });
  // 顶部 banner 错题本快捷入口：一键跳到题库页错题本并自动展开全部错题，方便回顾
  bindId("wrongQuick", function(){
    switchTab("kp");
    setTimeout(function(){
      var wc=$("wrongCard");
      if(wc) wc.scrollIntoView({behavior:"smooth", block:"start"});
      var items=document.querySelectorAll("#wrongCard .witem");
      for(var i=0;i<items.length;i++) items[i].classList.add("expanded");
    }, 90);
  });

  // 专注准备弹窗：点击遮罩关闭（无任何清单/校验逻辑）
  var _prepOv = $("prepOverlay");
  if(_prepOv){
    _prepOv.addEventListener("click", function(e){ if(e.target === _prepOv) closePrep(); });
  }
