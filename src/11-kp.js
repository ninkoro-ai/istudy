// ---------- 知识点详情路由（搜索跳转目标） ----------
  function openKpDetail(sub, kid){
    if(kpView && kpView.indexOf("detail:")!==0) kpViewPrev = kpView;
    kpView = "detail:"+sub+":"+kid;
    var sr=$("searchResults"); if(sr) sr.classList.add("hidden");
    var lc=$("kpLibCard"); if(lc) lc.classList.remove("hidden");
    var wc=$("wrongCard"); if(wc) wc.classList.add("hidden");
    renderKP();
    winScroll(0,0);
  }
  function backFromKpDetail(){
    kpView = kpViewPrev || "today";
    renderKP();
    var ip=$("kpSearch");
    if(ip && ip.value.trim()){ doSearch(); }
    else { var sr=$("searchResults"); if(sr) sr.classList.add("hidden"); }
  }
  function kpDetailHtml(sub, kp, subInfo){
    var st = kpStatus(sub, kp.id), ms = kpMastery(sub, kp.id);
    var done = (S.kpDone[sub] && S.kpDone[sub][kp.id]);
    var stCls = ({'未学习':'st0','学习中':'st1','已掌握':'st2','待复习':'st3','薄弱':'st4'})[st] || 'st0';
    var color = subInfo ? subInfo.color : '#FF6B8A';
    var name = subInfo ? subInfo.name : sub;
    return '<div class="kp-detail-view">'
      + '<div class="kp-dv-head">'
      +   '<span class="tag" style="background:'+color+';color:#fff;">'+esc(name)+'</span>'
      +   (kp.src ? '<span class="src">'+esc(kp.src)+'</span>' : '')
      +   '<span class="stchip '+stCls+'">'+st+' · '+ms+'%</span>'
      + '</div>'
      + '<h3 class="kp-dv-title">'+esc(kp.t)+'</h3>'
      + '<div class="kp-dv-body">'+esc(kp.b)+'</div>'
      + '<div class="kp-dv-actions">'
      +   '<button class="btn '+(done?'soft':'primary')+'" data-act="kp" data-sub="'+escAttr(sub)+'" data-id="'+escAttr(kp.id)+'">'+(done?('已完成 '+IC_CHECK):'去闯关')+'</button>'
      +   '<button class="btn soft" data-act="ai" data-sub="'+escAttr(sub)+'" data-id="'+escAttr(kp.id)+'">让AI教我</button>'
      + '</div>'
      + '</div>';
  }
