// ---------- 补卡（缺卡回溯 · 正常积分一半） ----------
  // 正常打卡可得积分：与主流程 checkDayComplete 一致（连胜>=3 享 1.5 倍）
  function normalBonusFor(){
    var mult = streak() >= 3 ? 1.5 : 1;
    return Math.round(PER_DAY_FULL * mult);
  }
  // 补卡奖励 = 正常打卡积分的 50%
  function makeupBonusFor(){ return Math.round(normalBonusFor() * 0.5); }

  var makeupDate = "";

  // 补卡可发起判定：过去、计划内、且尚未领奖（未正常打卡、未补卡）的日
  function makeupClaimable(d){
    if(d<1 || d>TOTAL) return false;
    if(dayIndex() <= d) return false;          // 今天 / 未来不可补
    var rec = S.done[d];
    if(rec && rec.makeup) return false;        // 已补卡
    if(rec && rec.full) return false;          // 当时已正常打卡（已发全奖），不重复补
    return true;                               // 过去且未领奖：缺卡或事后补齐均可发起补卡
  }
  // 缺卡日对应学习任务是否全部完成（以知识点是否被掌握为准）
  function dayMakeupDone(d){
    var tasks = dailyTasks(d);
    if(!tasks.length) return true;             // 无任务日视作已完成
    for(var i=0;i<tasks.length;i++){
      if(!(S.kpDone[tasks[i].sub] && S.kpDone[tasks[i].sub][tasks[i].kp.id])) return false;
    }
    return true;
  }
  function openMakeup(ds){
    var d = dayIndexForDate(ds);
    if(!makeupClaimable(d)){ openNote(ds); return; }   // 不可补卡则退回备注
    makeupDate = ds;
    renderMakeupBody(d);
    var ov = $("makeupOverlay"); if(ov){ ov.classList.add("on"); lockScroll(true); }
  }
  // 渲染补卡弹层：任务清单 + 完成校验 + 按钮态
  function renderMakeupBody(d){
    var nb = normalBonusFor(), mb = makeupBonusFor();
    var t = $("muTitle"); if(t) t.textContent = "补卡 · 第 "+d+" 天";
    var tasks = dailyTasks(d), rows = [], doneCnt = 0;
    for(var i=0;i<tasks.length;i++){
      var tk = tasks[i];
      var done = !!(S.kpDone[tk.sub] && S.kpDone[tk.sub][tk.kp.id]);
      if(done) doneCnt++;
      var subName = "";
      for(var s=0;s<SUBJECTS.length;s++){ if(SUBJECTS[s].id===tk.sub){ subName = SUBJECTS[s].name.split(" ")[0]; break; } }
      rows.push(
        '<div class="mu-task" data-act="mutask" data-sub="'+escAttr(tk.sub)+'" data-id="'+escAttr(tk.kp.id)+'">'
        + '<span class="mu-stat '+(done?'ok':'no')+'">'+(done?'已完成':'待完成')+'</span>'
        + '<span class="mu-tt" title="'+esc(tk.kp.t)+'">'+esc(tk.kp.t)+'</span>'
        + '<span class="mu-go">去学习 ›</span>'
        + '</div>'
      );
    }
    var allDone = (tasks.length>0 && doneCnt===tasks.length);
    var body = $("muBody");
    if(body){
      var head =
        '<div style="background:var(--cream);border-radius:14px;padding:12px 14px;margin-bottom:12px;">'
        + '<div style="font-weight:600;color:var(--ink);margin-bottom:6px;">这是一次「缺卡」日 · 补卡回溯</div>'
        + '<div style="color:var(--ink-2);font-size:12.5px;line-height:1.65;">补卡触发条件：仅过去、计划内的缺卡日可发起补卡（可选日期仅限缺卡当日，每人每天一次）。系统会先校验当日学习任务是否全部完成，全部完成方可补卡并发放正常积分的一半。</div>'
        + '</div>'
        + '<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;">'
        +   '<div style="flex:1;background:#FBE3E3;border-radius:12px;padding:10px 12px;"><div style="font-size:11px;color:#E8553E;">正常打卡可得</div><div style="font-size:20px;font-weight:800;color:#E8553E;">'+nb+' 分</div></div>'
        +   '<div style="flex:1;background:var(--mint-soft);border-radius:12px;padding:10px 12px;"><div style="font-size:11px;color:#2E7D52;">补卡可得（50%）</div><div style="font-size:20px;font-weight:800;color:#2E7D52;">'+mb+' 分</div></div>'
        + '</div>'
        + '<div style="font-size:12.5px;color:var(--ink-2);margin-bottom:6px;">当日学习任务（'+doneCnt+'/'+tasks.length+' 已完成）</div>';
      var list = rows.length ? ('<div style="margin-bottom:10px;">'+rows.join("")+'</div>') : '<div style="font-size:12px;color:var(--ink-3);margin-bottom:10px;">当日无固定学习任务。</div>';
      var foot = allDone
        ? '<div style="font-size:12px;color:#2E7D52;line-height:1.6;background:var(--mint-soft);border-radius:10px;padding:9px 11px;">学习任务已全部完成，可补卡。补卡成功后第 '+d+' 天标记为「已打卡（补）」，发放 '+mb+' 积分。</div>'
        : '<div style="font-size:12px;color:#E8553E;line-height:1.6;background:#FBE3E3;border-radius:10px;padding:9px 11px;">存在 '+(tasks.length-doneCnt)+' 项未完成的学习任务，禁止直接补卡。请先前往知识点页完成对应内容，待任务全部完成后再发起补卡。</div>';
      body.innerHTML = head + list + foot;
    }
    // 按钮态：未完成 → 禁用确认并提示、显示跳转入口；全部完成 → 启用确认、隐藏跳转
    var cf = $("muConfirm"), jp = $("muJump");
    if(cf){
      cf.disabled = !allDone;
      cf.style.opacity = allDone ? "1" : ".5";
      cf.textContent = allDone ? ("确认补卡（领 "+mb+" 分）") : "请先完成学习任务";
    }
    if(jp){ jp.style.display = allDone ? "none" : ""; }
  }
  function confirmMakeup(){
    var ds = makeupDate; if(!ds) return;
    var d = dayIndexForDate(ds);
    if(!makeupClaimable(d)){ closeMakeup(); renderCalendar(); return; }
    // 二次校验：必须所有学习任务完成，否则拦截并刷新为提示态（不可直接标记完成）
    if(!dayMakeupDone(d)){ renderMakeupBody(d); return; }
    var mb = makeupBonusFor();
    if(!S.done[d]) S.done[d] = {};
    S.done[d].full = 1;
    S.done[d].makeup = 1;            // 标记为补卡，区别于正常打卡
    S.score += mb;
    addRec("补卡 第"+d+"天 +"+mb+"（正常的一半）", mb);
    saveAll();
    closeMakeup();
    renderAll();
    showToast("补卡成功！第 "+d+" 天已补 · 奖励 +"+mb+" 分");
  }
  // 跳转入口：引导用户到知识点页补充学习，完成后回到考试历再次补卡
  function muJump(){
    closeMakeup();
    switchTab("kp");
    showToast("请在第 "+dayIndexForDate(makeupDate)+" 天对应的知识点中完成待学内容，完成后回到考试历再次补卡。");
  }
  // 点击任务清单项：跳至对应任务卡片页（知识点详情），由其「去闯关」入口进入闯关，与普通任务卡片一致
  function muGoTask(sub, kid){
    if(!sub || !kid) return;
    closeMakeup();
    switchTab("kp");
    openKpDetail(sub, kid);   // 进入任务卡片详情页（含「去闯关」入口），不直接开闯关
    var kp = null;
    if(KP_LIB[sub]) for(var i=0;i<KP_LIB[sub].length;i++) if(KP_LIB[sub][i].id===kid){ kp=KP_LIB[sub][i]; break; }
    showToast("已进入「"+(kp?kp.t:kid)+"」任务详情，点「去闯关」开始学习。");
  }
  function closeMakeup(){ var ov=$("makeupOverlay"); if(ov){ ov.classList.remove("on"); lockScroll(false); } }

  function shortDesc(b){
    if(!b) return '';
    var s=(b.split(/[；;。.]/)[0]||'').trim();
    if(s.length>26) s=s.slice(0,26)+'…';
    return s;
  }
  function kpCardHtml(sub, k, done, isT){
    var st = kpStatus(sub, k.id), ms = kpMastery(sub, k.id);
    var stCls = ({'未学习':'st0','学习中':'st1','已掌握':'st2','待复习':'st3','薄弱':'st4'})[st] || 'st0';
    return '<div class="kp compact'+(done?' mastered':'')+(isT?' istoday':'')+'">'
      + '<div class="kp-row" data-toggle="kp">'
      + '<div class="kp-row-main">'
      + '<span class="title">'+esc(k.t)+'</span>'
      + '<span class="desc">'+esc(shortDesc(k.b))+'</span>'
      + '</div>'
      + (isT?'<span class="badge today">今日待学</span>':'')
      + '<span class="stchip '+stCls+'">'+st+' · '+ms+'%</span>'
      + '<svg class="kp-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>'
      + '</div>'
      + '<div class="kp-detail">'
      + '<p class="body">'+esc(k.b)+'</p>'
      + '<div class="foot"><span class="src">'+esc(k.src)+'</span>'
      + '<div class="kp-acts">'
      + '<button class="btn '+(done?'soft':'primary')+'" data-act="kp" data-sub="'+escAttr(sub)+'" data-id="'+escAttr(k.id)+'">'+(done?('已完成 '+IC_CHECK):'去闯关')+'</button>'
      + '<button class="btn soft" data-act="ai" data-sub="'+escAttr(sub)+'" data-id="'+escAttr(k.id)+'">让AI教我</button>'
      + '</div></div>'
      + '</div>'
      + '</div>';
  }
