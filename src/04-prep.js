// 90天 → 今天对应天数
  function dayIndex(){
    var a = S.startDay.split("-"), b = dateStr(0).split("-");
    var da = new Date(a[0],a[1]-1,a[2]);
    var db = new Date(b[0],b[1]-1,b[2]);
    var diff = Math.round((db-da)/86400000);
    return diff + 1;
  }

  // 阶段（学习与复习窗口对齐）
  function phaseName(d){
    if(d<=30) return "基础阶段 · 教材通读期";
    if(d<=60) return "强化阶段 · 提升正确率";
    return "冲刺阶段 · 模拟查漏";
  }
  // 学习窗口：207个知识点顺序铺进全部 90 天（通读阶段），每个点固定落在某一天，考前至少通读覆盖一遍
  var COVER_DAYS = 90;

  // 月假日：从当天有任务的科目中随机保留 2 个不同科目（确定性，避免重渲染抖动）
  function randomTwoSubs(t){
    var day = dayIndexForDate(t);
    var avail = [];
    for(var s=0;s<SUBJECTS.length;s++){
      var sub = SUBJECTS[s].id;
      if(newKpsOf(sub, day).length > 0) avail.push(sub);
    }
    if(avail.length <= 2) return avail;                 // 不足 2 科则全部保留（已是轻量日）
    var rng = seededRand(hashStr("period|"+t));
    var sh = shuffle(avail.slice(), rng);
    return [sh[0], sh[1]];
  }
  // 打卡记录：以“当日应学知识点是否全部掌握”为准
  function dueSubjects(){
    var t = dateStr(0);
    if(S.periodToday === t) return randomTwoSubs(t);                     // 月假：随机保留 2 个不同科目
    if(S.easyDay === t)      return [SUBJECTS[0].id, SUBJECTS[1].id];    // 轻松一下：2 科
    return SUBJECTS.map(function(s){ return s.id; });                   // 正常：4 科
  }
  // 某科目第 i 个知识点被排到的“学习日”（顺序铺开到 COVER_DAYS，保证考前全覆盖、按科目权重）
  function homeDay(sub, i){
    var N = KP_LIB[sub] ? KP_LIB[sub].length : 0;
    if(!N) return 1;
    if(N===1) return 1;
    return 1 + Math.floor(i * (COVER_DAYS - 1) / (N - 1));
  }
  // 某天某科“新学”知识点（homeDay == d）
  function newKpsOf(sub, d){
    var arr = KP_LIB[sub], out = [];
    for(var i=0;i<arr.length;i++) if(homeDay(sub,i)===d) out.push(arr[i]);
    return out;
  }
  // 冲刺阶段复习选点（全局顺序轮转，spaced review）
  function reviewKpsOf(d){
    var subs = dueSubjects(), all = [];
    for(var s=0;s<subs.length;s++){
      var arr = KP_LIB[subs[s]];
      for(var i=0;i<arr.length;i++) all.push({sub:subs[s], kp:arr[i]});
    }
    if(!all.length) return [];
    var per = 6;
    var start = ((d - (COVER_DAYS+1)) * per) % all.length;
    if(start < 0) start += all.length;
    var out = [];
    for(var k=0;k<per;k++) out.push(all[(start+k)%all.length]);
    return out;
  }
  // 某天的学习任务（顺序新学 + 冲刺复习，应用特殊关爱·轻松一下削减）
  function dailyTasks(d){
    var subs = dueSubjects(), tasks = [], isChong = d > COVER_DAYS;
    for(var s=0;s<subs.length;s++){
      var sub = subs[s];
      var news = newKpsOf(sub, d);
      for(var i=0;i<news.length;i++) tasks.push({sub:sub, kp:news[i], mode:"new"});
    }
    if(isChong && tasks.length===0){
      var rv = reviewKpsOf(d);
      for(var r=0;r<rv.length;r++) tasks.push({sub:rv[r].sub, kp:rv[r].kp, mode:"review"});
    }
    return tasks;
  }
  function todayKps(){
    return dailyTasks(dayIndex());
  }
  function isTodayKp(sub, kid){
    var ks = todayKps();
    for(var i=0;i<ks.length;i++) if(ks[i].sub===sub && ks[i].kp.id===kid) return true;
    return false;
  }
  // 单个任务是否已完成（新学/补学=已掌握；复习=今日已复习过）
  function taskSatisfied(t){
    if(t.mode==="review"){
      var rd = S.reviewed[dateStr(0)];
      return !!(rd && rd[t.sub+":"+t.kp.id]);
    }
    return !!(S.kpDone[t.sub] && S.kpDone[t.sub][t.kp.id]);
  }
  function isDayFull(d){
    if(S.done[d] && S.done[d].full) return true;
    if(d !== dayIndex()) return false;
    var tasks = dailyTasks(d);
    if(!tasks.length) return false; // 有任务才判定，避免空日误判
    for(var i=0;i<tasks.length;i++) if(!taskSatisfied(tasks[i])) return false;
    return true;
  }
  function markReviewed(sub, kid){
    var t = dateStr(0);
    if(!S.reviewed[t]) S.reviewed[t] = {};
    S.reviewed[t][sub+":"+kid] = 1;
  }
