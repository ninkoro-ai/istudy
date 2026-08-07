// ---------- 掌握度（0-100）+ 艾宾浩斯复习 ----------
  function wrongCount(sub, kid){
    if(!S.wrong) return 0;
    var n=0; for(var i=0;i<S.wrong.length;i++){ if(S.wrong[i].sub===sub && S.wrong[i].kid===kid) n++; }
    return n;
  }
  function daysBetween(a, b){
    var pa=a.split("-"), pb=b.split("-");
    var da=new Date(pa[0],pa[1]-1,pa[2]), db=new Date(pb[0],pb[1]-1,pb[2]);
    return Math.round((db-da)/86400000);
  }
  // 答题统计：记录该知识点累计正确率（驱动自适应间隔）
  function recordQuiz(sub, kid, correct, total){
    if(!S.qStats) S.qStats = {};
    var key = sub+":"+kid;
    var st = S.qStats[key] || { ok:0, total:0 };
    st.ok += correct;
    st.total += total;
    S.qStats[key] = st;
  }
  function quizAccuracy(sub, kid){
    if(!S.qStats) return null;
    var st = S.qStats[sub+":"+kid];
    if(!st || !st.total) return null;
    return st.ok / st.total;
  }
  // 自适应间隔：正确率越高间隔越长；越低间隔越短（下限 1 天）
  function reviewIntervalFor(sub, kid){
    var step = (S.revStep[sub] && S.revStep[sub][kid]) || 0;
    var base = EB[Math.min(step, EB.length-1)] || 1;
    if(!REVIEW_CFG.adaptive) return base;
    var acc = quizAccuracy(sub, kid);
    if(acc === null) return base;
    if(acc >= REVIEW_CFG.fastThreshold) return Math.round(base * 1.5);
    if(acc < REVIEW_CFG.slowThreshold) return Math.max(1, Math.round(base * 0.6));
    return base;
  }
  function nextReview(sub, kid){
    if(!(S.kpDone[sub] && S.kpDone[sub][kid])) return null;
    var step = (S.revStep[sub] && S.revStep[sub][kid]) || 0;
    if(step >= REVIEW_CFG.maxStep) return null;
    // 基线优先「上次复习成功日」，其次「最近学习日」，最后计划起点
    var base = (S.lastReview[sub] && S.lastReview[sub][kid])
      || (S.lastStudy[sub] && S.lastStudy[sub][kid])
      || S.startDay;
    var p = base.split("-");
    var d = new Date(p[0], p[1]-1, p[2]); d.setDate(d.getDate() + reviewIntervalFor(sub, kid));
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  }
  function recordLearn(sub, kid){
    if(!S.lastStudy[sub]) S.lastStudy[sub] = {};
    if(!S.revStep[sub]) S.revStep[sub] = {};
    S.lastStudy[sub][kid] = dateStr(0);
    if(S.revStep[sub][kid]===undefined) S.revStep[sub][kid] = 0;
    recalcMastery(sub, kid);
  }
  function recordReview(sub, kid, accuracy){
    if(!S.revStep[sub]) S.revStep[sub] = {};
    var step = (S.revStep[sub][kid]===undefined) ? 0 : S.revStep[sub][kid];
    var inc = 1;
    if(REVIEW_CFG.adaptive && typeof accuracy === "number"){
      if(accuracy >= REVIEW_CFG.fastThreshold) inc = 2;       // 掌握好 → 跳过一个间隔
      else if(accuracy < REVIEW_CFG.slowThreshold) inc = 0;   // 掌握差 → 原地巩固
    }
    S.revStep[sub][kid] = Math.min(step + inc, REVIEW_CFG.maxStep);
    // 记录「上次复习成功日」作为下一次排期基线
    if(!S.lastReview[sub]) S.lastReview[sub] = {};
    S.lastReview[sub][kid] = dateStr(0);
    recalcMastery(sub, kid);
  }
  function recalcMastery(sub, kid){ if(!S.mastery[sub]) S.mastery[sub] = {}; S.mastery[sub][kid] = kpMastery(sub, kid); }
  function kpMastery(sub, kid){
    if(!(S.kpDone[sub] && S.kpDone[sub][kid])) return 0;
    var m = 60;
    var step = (S.revStep[sub] && S.revStep[sub][kid]) || 0;
    m += Math.min(step, REVIEW_CFG.maxStep) * 8;
    m -= Math.min(wrongCount(sub, kid), 5) * 4;
    if(S.lastStudy[sub] && S.lastStudy[sub][kid]){ var days = daysBetween(S.lastStudy[sub][kid], dateStr(0)); m -= Math.min(Math.max(days,0), 30) * 0.6; }
    var acc = quizAccuracy(sub, kid);
    if(acc !== null) m += Math.round((acc - 0.7) * 12);   // 正确率加成（0~100 内 clamp）
    return Math.max(0, Math.min(100, Math.round(m)));
  }
  function kpStatus(sub, kid){
    if(!(S.kpDone[sub] && S.kpDone[sub][kid])) return "未学习";
    if(wrongCount(sub, kid) > 0) return "薄弱";
    if(nextReview(sub, kid) === dateStr(0)) return "待复习";
    if((S.revStep[sub] && S.revStep[sub][kid] || 0) >= REVIEW_CFG.maxStep) return "已掌握";
    return "学习中";
  }
  function reviewDueList(){
    var out = [], t = dateStr(0);
    if(!S.kpDone) return out;
    for(var sub in S.kpDone){ for(var kid in S.kpDone[sub]){ if(nextReview(sub, kid) === t){ var rd = S.reviewed[t]; if(!(rd && rd[sub+":"+kid])) out.push({sub:sub, kid:kid}); } } }
    return out;
  }
