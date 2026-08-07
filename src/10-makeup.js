// ---------- 题库：默认「今日学习」+ 三级折叠（科目 → 章节 → 知识点）+ 懒渲染 ----------
  var kpView = "today";     // "today" | "chap:<sub>:<src>" | "detail:<sub>:<kid>"
  var kpViewPrev = "today"; // 进入详情前的视图，用于返回
  var kpOpen = {};          // 已展开的科目 id

  function chaptersOf(sub){
    var map={}, order=[];
    var arr=KP_LIB[sub];
    for(var i=0;i<arr.length;i++){ var s=arr[i].src; if(map[s]===undefined){ map[s]=0; order.push(s); } map[s]++; }
    return order.map(function(s){ return {src:s, n:map[s]}; });
  }
  function countTasksDone(ks){ var n=0; for(var i=0;i<ks.length;i++) if(taskSatisfied(ks[i])) n++; return n; }

  function renderKpNav(){
    if(kpView.indexOf("detail:")===0){
      var p=kpView.split(":"); var sid=p[1];
      var sn=subName(sid);
      $("kpNav").innerHTML = '<div class="kpnav-item" data-act="kpback">'
        + '<svg class="kpni-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
        + '<span class="kpni-t">返回</span></div>'
        + '<span class="kpnav-crumb">'+esc(sn)+' · 知识点详情</span>';
      return;
    }
    var ks=todayKps();
    var tn=ks.length, td=countTasksDone(ks);
    var nav='<div class="kpnav-item today'+(kpView==="today"?" active":"")+'" data-view="today">'
          + '<span class="kpni-ic">'+IC_STAR+'</span><span class="kpni-t">今日学习</span>'
          + '<span class="kpni-n">'+td+'/'+tn+'</span></div>';
    for(var s=0;s<SUBJECTS.length;s++){
      var o=SUBJECTS[s], cnt=countKpDone(o.id), tot=KP_LIB[o.id].length;
      nav+='<div class="kpnav-item acc'+(kpOpen[o.id]?" open":"")+'" data-sub="'+escAttr(o.id)+'">'
          + '<span class="dot" style="background:'+o.color+'"></span>'
          + '<span class="kpni-t">'+esc(o.name)+'</span>'
          + '<span class="kpni-n">'+cnt+'/'+tot+'</span>'
          + '<svg class="kpni-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>'
          + '</div>';
      nav+='<div class="kpnav-subs'+(kpOpen[o.id]?" open":"")+'" data-subs="'+o.id+'">';
      var chs=chaptersOf(o.id);
      for(var c=0;c<chs.length;c++){
        nav+='<div class="kpnav-chap" data-sub="'+escAttr(o.id)+'" data-src="'+esc(chs[c].src)+'"><span>'+esc(chs[c].src)+'</span><span class="kpni-n">'+chs[c].n+'</span></div>';
      }
      nav+='</div>';
    }
    var wc=S.wrong?S.wrong.length:0;
    var rvn=reviewDueList().length;
    nav+='<div class="kpnav-item" data-view="review"><span class="kpni-ic">'+IC_STAR+'</span><span class="kpni-t">待复习</span><span class="kpni-n">'+rvn+'</span></div>';
    nav+='<div class="kpnav-item" data-view="wrong"><span class="kpni-ic">'+IC_BOOK+'</span><span class="kpni-t">错题本</span><span class="kpni-n">'+wc+'</span></div>';
    $("kpNav").innerHTML=nav;
  }

  function renderKpProgress(){
    if(kpView.indexOf("detail:")===0){
      var p=kpView.split(":"); var sid=p[1], kid=p.slice(2).join(":");
      var done = (S.kpDone[sid] && S.kpDone[sid][kid]) ? 1 : 0;
      var pct = kpMastery(sid, kid);
      var eD=$("kpDoneN"),eT=$("kpTodoN"),eP=$("kpPct"),eF=$("kpFill"),eU=$("kpTurtle");
      if(eD) eD.textContent=done;
      if(eT) eT.textContent=(1-done);
      if(eP) eP.textContent=pct.toFixed(2)+"%";
      if(eF) eF.style.width=pct+"%";
      if(eU){ eU.style.left=Math.max(6,Math.min(94,pct))+"%"; eU.style.display=""; }
      var sub2=$("kpSub"); if(sub2) sub2.textContent="知识点详情";
      return;
    }
    var done=0, tot=0;
    if(kpView==="today"){ var ks=todayKps(); tot=ks.length; done=countTasksDone(ks); }
    else if(kpView.indexOf("chap:")===0){
      var p=kpView.split(":"); var sid=p[1], src=p.slice(2).join(":");
      var arr=KP_LIB[sid].filter(function(k){return k.src===src;});
      tot=arr.length;
      for(var x=0;x<arr.length;x++){ if(S.kpDone[sid]&&S.kpDone[sid][arr[x].id]) done++; }
    } else {
      for(var i=0;i<SUBJECTS.length;i++){ tot+=KP_LIB[SUBJECTS[i].id].length; done+=countKpDone(SUBJECTS[i].id); }
    }
    var pct=tot>0?done/tot*100:0;
    var eD=$("kpDoneN"),eT=$("kpTodoN"),eP=$("kpPct"),eF=$("kpFill"),eU=$("kpTurtle");
    if(eD) eD.textContent=done;
    if(eT) eT.textContent=(tot-done);
    if(eP) eP.textContent=pct.toFixed(2)+"%";
    if(eF) eF.style.width=pct+"%";
    if(eU){ eU.style.left=Math.max(6,Math.min(94,pct))+"%"; eU.style.display=(tot>0?"":"none"); }
  }

  function renderKpList(){
    var el=$("kpList"); if(!el) return;
    if(kpView.indexOf("detail:")===0){
      var p=kpView.split(":"); var sid=p[1], kid=p.slice(2).join(":");
      var kp=findKp(sid,kid);
      if(!kp){ el.innerHTML='<div class="empty">未找到该知识点。</div>'; return; }
      var subInfo=null; for(var j=0;j<SUBJECTS.length;j++) if(SUBJECTS[j].id===sid) subInfo=SUBJECTS[j];
      el.innerHTML = kpDetailHtml(sid, kp, subInfo);
      return;
    }
    if(kpView==="review"){
      var rv = reviewDueList();
      if(!rv.length){ el.innerHTML='<div class="empty">今天没有待复习的知识点，保持得很好。</div>'; return; }
      var hh="";
      for(var ri=0;ri<rv.length;ri++){
        var rsub=rv[ri].sub, rid=rv[ri].kid, rk=null, rInfo=null;
        for(var x=0;x<KP_LIB[rsub].length;x++) if(KP_LIB[rsub][x].id===rid) rk=KP_LIB[rsub][x];
        for(var j=0;j<SUBJECTS.length;j++) if(SUBJECTS[j].id===rsub) rInfo=SUBJECTS[j];
        if(!rk||!rInfo) continue;
        hh += '<div class="kp due">' + '<div class="top"><span class="tag" style="background:'+rInfo.color+';color:#fff;">'+esc(rInfo.name)+'</span>' + '<span class="badge today">复习</span>' + '<span class="title">'+esc(rk.t)+'</span></div>' + '<div class="foot"><span class="src">'+esc(rk.src)+'</span>' + '<div class="kp-acts"><button class="btn primary sm" data-act="rev" data-sub="'+escAttr(rsub)+'" data-id="'+escAttr(rid)+'">去复习</button></div></div>';
      }
      el.innerHTML=hh; return;
    }
    if(kpView==="today"){
      $("kpSub").textContent="当日应学 · 打开即学，先完成今天的任务。";
      renderDueKpList(el, false);
      return;
    }
    if(kpView.indexOf("chap:")===0){
      var p=kpView.split(":"); var sid=p[1], src=p.slice(2).join(":");
      var subInfo=null; for(var j=0;j<SUBJECTS.length;j++) if(SUBJECTS[j].id===sid) subInfo=SUBJECTS[j];
      $("kpSub").textContent=(subInfo?subInfo.name:"")+" · "+src;
      var list=KP_LIB[sid].filter(function(k){return k.src===src;});
      var html="";
      for(var i=0;i<list.length;i++){
        html+=kpCardHtml(sid, list[i], (S.kpDone[sid]&&S.kpDone[sid][list[i].id]), isTodayKp(sid, list[i].id));
      }
      el.innerHTML=html;
      return;
    }
    // 兜底：全量
    $("kpSub").textContent="全量学习内容 · 所有科目";
    var h="";
    for(var g=0; g<SUBJECTS.length; g++){
      var gid=SUBJECTS[g].id, glist=KP_LIB[gid];
      h+='<div class="kp-group"><div class="kp-group-h">'+esc(SUBJECTS[g].name)+'</div>';
      for(var i=0;i<glist.length;i++){
        h+=kpCardHtml(gid, glist[i], (S.kpDone[gid]&&S.kpDone[gid][glist[i].id]), isTodayKp(gid, glist[i].id));
      }
      h+='</div>';
    }
    el.innerHTML=h;
  }

  function scrollToWrong(){
    var wc=$("wrongCard");
    if(wc){
      wc.scrollIntoView({behavior:"smooth", block:"start"});
      var items=wc.querySelectorAll(".witem");
      for(var i=0;i<items.length;i++) items[i].classList.add("expanded");
    }
  }

  function renderKP(){
    renderKpNav();
    renderKpProgress();
    renderKpList();
    var wb=$("kpBadge");
    if(wb){
      var wc=S.wrong?S.wrong.length:0;
      if(wc>0){ wb.textContent=wc>99?"99+":wc; wb.classList.remove("hidden"); }
      else wb.classList.add("hidden");
    }
    renderWrong();
  }
