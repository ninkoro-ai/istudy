// ---------- 交互 ----------
  document.addEventListener("click", function(e){
    var wh = e.target.closest(".whead");
    if(wh){ wh.parentElement.classList.toggle("expanded"); return; }

    var cell = e.target.closest(".cal-cell[data-date]");
    if(cell){
      var ds = cell.getAttribute("data-date");
      var di = dayIndexForDate(ds);
      if(di>=1 && di<=TOTAL && makeupClaimable(di)){ openMakeup(ds); }
      else { openNote(ds); }
      return;
    }

    var chap = e.target.closest(".kpnav-chap");
    if(chap){
      kpView = "chap:"+chap.getAttribute("data-sub")+":"+chap.getAttribute("data-src");
      renderKP();
      var lc=$("kpLibCard"); if(lc) winScroll({top:lc.offsetTop-64, behavior:"smooth"});
      return;
    }
    var acc = e.target.closest(".kpnav-item.acc");
    if(acc){
      var sid=acc.getAttribute("data-sub");
      kpOpen[sid]=!kpOpen[sid];
      renderKpNav();
      return;
    }
    var nv = e.target.closest(".kpnav-item[data-view]");
    if(nv){
      var v=nv.getAttribute("data-view");
      if(v==="wrong"){ scrollToWrong(); return; }
      kpView=v; renderKP();
      var lc2=$("kpLibCard"); if(lc2) winScroll({top:lc2.offsetTop-64, behavior:"smooth"});
      return;
    }
    var kpc = e.target.closest(".kp.compact");
    if(kpc && !e.target.closest("[data-act]")){
      kpc.classList.toggle("expanded");
      return;
    }
    var btn = e.target.closest("[data-act]");
    if(btn){
      var a = btn.getAttribute("data-act");
      if(a==="kp") toggleKp(btn.getAttribute("data-sub"), btn.getAttribute("data-id"));
      else if(a==="ai") aiPrompt(btn.getAttribute("data-sub"), btn.getAttribute("data-id"));
      else if(a==="rev") openQuiz(btn.getAttribute("data-sub"), btn.getAttribute("data-id"), "review");
      else if(a==="redeem") redeem(btn.getAttribute("data-id"));
      else if(a==="prep"){ markPrepTriggered(); openPrep(); }
      else if(a==="confirmPrep") confirmPrep();
      else if(a==="closePrep") closePrep();
      else if(a==="kpdetail") openKpDetail(btn.getAttribute("data-sub"), btn.getAttribute("data-id"));
      else if(a==="kpback") backFromKpDetail();
      else if(a==="mutask") muGoTask(btn.getAttribute("data-sub"), btn.getAttribute("data-id"));
      else if(a==="wrongretry") openQuiz(btn.getAttribute("data-sub"), btn.getAttribute("data-id"), "wrong");
    }
    if(e.target.id==="btnPeriod"){
      var rem=PERIOD_MAX-S.periodUsed;
      if(rem<=0){ showToast("本月月假次数已用完，下月再申请~"); return; }
      if(!confirm("确定要使用本月月假吗？\n当月剩余 "+(rem-1)+"/"+PERIOD_MAX+" 次\n\n申请后今日随机保留 2 个不同科目，其余科目任务免除（轻松一点~）")) return;
      S.periodUsed++;
      S.periodToday = dateStr(0);
      addRec("申请月假（本月已用"+S.periodUsed+"/"+PERIOD_MAX+"）",0);
      saveAll(); renderAll();
      showToast("月假已生效，今天只做 2 科，好好休息。");
    }
  });
