// ---------- 渲染 ----------
  var pawSVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="15" r="4.5"/><circle cx="5'+
    '" cy="9" r="2.5"/><circle cx="19" cy="9" r="2.5"/><circle cx="8" cy="4.5" r="2.2"/><circle cx="16" cy="4.5" r="2.2"/></svg>';

  function daysUntilExam(){
    var a=S.startDay.split("-"); var da=new Date(a[0],a[1]-1,a[2]);
    var target=new Date(da.getFullYear(),da.getMonth(),da.getDate());
    target.setDate(target.getDate()+TOTAL);
    var n=new Date(); var today=new Date(n.getFullYear(),n.getMonth(),n.getDate());
    return Math.max(0, Math.round((target-today)/86400000));
  }

  function renderToday(){
    var d = dayIndex();
    $("todayCard").style.background = "";
    if(d<1) d=1;
    if(d>TOTAL){ d=TOTAL; }
    $("dayTag").textContent = "第 "+d+" 天 · Day "+d;
    var phase = phaseName(d);
    var perRemain = PERIOD_MAX - S.periodUsed;
    var perTag = '';
    if(S.periodToday === dateStr(0)) perTag = ' <span style="font-size:11px;color:var(--pink);">（今日月假，随机保留 2 科，轻松一点~）</span>';
    else if(perRemain>0) perTag = ' <button class="btn soft sm" id="btnPeriod" title="每月可免费申请 2 次月假：当天随机保留 2 科，其余任务免除，轻松一点~" style="font-size:10px;min-height:24px;padding:0 8px;vertical-align:middle;">月假('+perRemain+'/2)</button>';
    $("dayPhase").innerHTML = phase + perTag;
    if(S.periodToday !== dateStr(0) && S.easyDay === dateStr(0)) $("dayPhase").innerHTML += "（今日「轻松一下」生效，任务减半~）";
    if(d===1) $("dayTitle").textContent = "考研第一天，开始吧";
    else if(d>TOTAL) $("dayTitle").textContent = "第一期 90 天已打卡完结，太棒啦！";
    else $("dayTitle").textContent = "今天按计划继续学习";

    // 当日待学进度
    var ks = todayKps();
    var total = ks.length, doneCnt = 0;
    for(var i=0;i<ks.length;i++){ if(taskSatisfied(ks[i])) doneCnt++; }
    var tp = $("todayProg");
    if(tp){
      if(total>0){
        var all = (doneCnt===total);
        tp.innerHTML = '今日待学 <b>'+total+'</b> 个任务 · 已完成 <b>'+doneCnt+'</b>' + (all ? ' <span class="done">今日打卡完成！</span>' : '');
      } else { tp.textContent = ''; }
    }
    var dc=$("dayCount"); if(dc) dc.textContent = "距离考研还有 "+daysUntilExam()+" 天";
    renderDueKpList($("todayTasks"), true);
    var rv = reviewDueList();
    var rEl = $("reviewList");
    if(rEl){
      if(rv.length){
        var rh = "";
        for(var ri=0; ri<rv.length; ri++){
          var rsub=rv[ri].sub, rkp_id=rv[ri].kid, rk=null, rInfo=null;
          for(var x=0;x<KP_LIB[rsub].length;x++) if(KP_LIB[rsub][x].id===rkp_id) rk=KP_LIB[rsub][x];
          for(var j=0;j<SUBJECTS.length;j++) if(SUBJECTS[j].id===rsub) rInfo=SUBJECTS[j];
          if(!rk||!rInfo) continue;
          rh += '<div class="kp due">' + '<div class="top"><span class="tag" style="background:'+rInfo.color+';color:#fff;">'+esc(rInfo.name)+'</span>' + '<span class="badge today">复习</span>' + '<span class="title">'+esc(rk.t)+'</span></div>' + '<div class="foot"><span class="src">'+esc(rk.src)+'</span>' + '<div class="kp-acts"><button class="btn primary sm" data-act="rev" data-sub="'+escAttr(rsub)+'" data-id="'+escAttr(rkp_id)+'">去复习</button></div></div>';
        }
        rEl.innerHTML = rh;
      } else { rEl.innerHTML = '<div class="empty">今天没有待复习的知识点，保持得很好。</div>'; }
    }
    var rc = $("reviewCount"); if(rc) rc.textContent = rv.length + " 个知识点";
  }

  // 渲染“当日应学知识点”列表（今日打卡页 & 题库页共用）—— 复用知识点库 .kp.compact 紧凑行样式（单列逐条、点按展开）
  function renderDueKpList(el, showPlan){
    if(!el) return;
    var ks = todayKps();
    if(!ks.length){ el.innerHTML = '<div class="empty">今天没有安排，好好休息。</div>'; return; }
    var html = "";
    for(var i=0;i<ks.length;i++){
      var sid = ks[i].sub, kp = ks[i].kp, mode = ks[i].mode;
      var done = (mode==="review") ? (S.reviewed[dateStr(0)] && S.reviewed[dateStr(0)][sid+":"+kp.id]) : (S.kpDone[sid] && S.kpDone[sid][kp.id]);
      // 复用知识点库条目样式：新学/补学标「今日待学」，复习项不标（状态芯片显示待复习）
      html += kpCardHtml(sid, kp, done, (mode!=="review"));
    }
    el.innerHTML = html;
  }

  // 日期 → 第几天（基于 startDay）
  function dayIndexForDate(ds){
    var a = S.startDay.split("-"), b = ds.split("-");
    var da = new Date(a[0],a[1]-1,a[2]);
    var db = new Date(b[0],b[1]-1,b[2]);
    var diff = Math.round((db-da)/86400000);
    return diff + 1;
  }
  // 某天的打卡状态
  function dayStatus(di){
    if(di<1 || di>TOTAL) return null;          // 非计划日
    if(isDayFull(di)) return "done";
    var d = dayIndex();
    var tasks = dailyTasks(di);
    if(!tasks.length) return (di < d) ? "done" : "future"; // 无任务的轻量日视为达标
    var sat = 0;
    for(var i=0;i<tasks.length;i++) if(taskSatisfied(tasks[i])) sat++;
    if(sat > 0) return "partial";              // 进行中（部分完成）
    if(di < d) return "miss";                  // 过去且零完成 = 缺卡
    return "future";
  }

  // 闯关页：日历
  function renderPlan(){
    var doneCount = 0;
    for(var i=1;i<=TOTAL;i++) if(isDayFull(i)) doneCount++;
    var pct = Math.round(doneCount/TOTAL*100);
    var strk = streak();
    var cs = $("calStat");
    if(cs) cs.textContent = "已打卡 "+doneCount+"/"+TOTAL+" 天 · "+pct+"%" + (strk>=3?(" · 连胜"+strk):"");
    if(!calView.y){ var n=new Date(); calView = { y:n.getFullYear(), m:n.getMonth() }; }
    renderCalendar();
  }

  function renderCalendar(){
    var y=calView.y, m=calView.m;
    var ct=$("calTitle"); if(ct) ct.textContent = y+"年"+(m+1)+"月";
    var cp=$("calPrev"), cn=$("calNext");
    var b = planBounds();
    if(cp) cp.disabled = (y===b.min.y && m===b.min.m);
    if(cn) cn.disabled = (y===b.max.y && m===b.max.m);
    var first = new Date(y,m,1);
    var startW = first.getDay();               // 0=周日
    var daysInMonth = new Date(y,m+1,0).getDate();
    var todayS = dateStr(0);
    var html = "";
    for(var i=0;i<startW;i++) html += '<div class="cal-cell empty"></div>';
    for(var day=1; day<=daysInMonth; day++){
      var ds = y+"-"+pad(m+1)+"-"+pad(day);
      var di = dayIndexForDate(ds);
      var st = dayStatus(di);
      var cls = "cal-cell";
      var hasNote = (S.notes && S.notes[ds]);
      if(st) cls += " "+st;
      if(ds===todayS) cls += " today";
      var diTag = (st) ? '<span class="cal-di">D'+di+'</span>' : '';
      var noteDot = hasNote ? '<i class="note-dot" title="有备注"></i>' : '';
      var madeup = (st==="done" && S.done[di] && S.done[di].makeup);
      if(madeup) cls += " madeup";
      var muTag = madeup ? '<span class="cal-di" style="color:#E9A23B;">补</span>' : '';
      html += '<div class="'+cls+'" data-date="'+ds+'" tabindex="0" role="button" aria-label="'+ds+'">'
        + '<span class="cal-num">'+day+'</span>'+diTag+noteDot+muTag+'</div>';
    }
    var grid=$("calGrid"); if(grid) grid.innerHTML = html;
  }

  // 每日备注 / 学习计划
  function openNote(ds){
    noteDate = ds;
    var di = dayIndexForDate(ds);
    var t = $("noteTitle");
    if(t) t.textContent = ds + (di>=1 && di<=TOTAL ? " · 第 "+di+" 天" : " · 非计划日");
    var ph = "";
    if(di>=1 && di<=TOTAL){
      var rows=[];
      for(var s=0;s<SUBJECTS.length;s++){
        var sid=SUBJECTS[s].id;
        var pt = (PLAN[sid] && PLAN[sid][di-1]) ? PLAN[sid][di-1] : "";
        if(pt) rows.push('<div class="np-row"><span class="np-tag" style="background:'+SUBJECTS[s].color+';color:#fff;">'+esc(SUBJECTS[s].name.split(" ")[0])+'</span>'+esc(pt)+'</div>');
      }
      if(rows.length) ph = '<div class="np-title">当日计划</div>'+rows.join("");
    }
    var np=$("notePlan"); if(np) np.innerHTML = ph;
    var ni=$("noteInput"); if(ni) ni.value = (S.notes && S.notes[ds]) ? S.notes[ds] : "";
    var ov=$("noteOverlay"); if(ov){ ov.classList.add("on"); lockScroll(true); }
  }
  function saveNote(){
    var ni=$("noteInput");
    var v = ni ? ni.value.trim() : "";
    if(!S.notes) S.notes = {};
    if(v) S.notes[noteDate] = v; else delete S.notes[noteDate];
    save("notes", S.notes);
    saveAll();
    var ov=$("noteOverlay"); if(ov){ ov.classList.remove("on"); lockScroll(false); }
    renderCalendar();
    showToast("已保存这一天的计划~");
  }
