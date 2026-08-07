// 状态
  var S = {
    startDay: load("startDay", null),
    done:     load("done", null),
    kpDone:   load("kpDone", null),
    score:    load("score", null),
    records:  load("records", null),
    redeemed: load("redeemed", null),
    curSub:   load("curSub", "all"),
    attempts: load("attempts", null),
    wrong:    load("wrong", null),
    easyDay:  load("easyDay", null),
    periodUsed: load("periodUsed", 0),
    periodMonth: load("periodMonth", ""),
    periodToday: load("periodToday", null),
    notes: load("notes", {}),
    reviewed: load("reviewed", {}),
    studyDays: load("studyDays", 90),
    lastStudy: load("lastStudy", {}),
    lastReview: load("lastReview", {}),
    revStep:   load("revStep", {}),
    mastery:   load("mastery", {}),
    qStats:    load("qStats", {}),
    milestones: load("milestones", {}),
    prepTriggered: load("prepTriggered", ""),
    prepShown: load("prepShown", "")
  };
  // 数据迁移/归一化（L-04）：确保各字段类型正确，旧版本/损坏数据不致误读
  function normalizeState(s){
    // 缺失时默认 2026-08-02（2026 考研周期「8/2 开跑」）；已有存档保留
    s.startDay = typeof s.startDay==='string' ? s.startDay : "2026-08-02";
    s.done = (s.done && typeof s.done==='object') ? s.done : {};
    s.kpDone = (s.kpDone && typeof s.kpDone==='object') ? s.kpDone : {};
    s.score = Math.max(0, Math.min(999999, Number(s.score)||0));
    s.records = Array.isArray(s.records) ? s.records : [];
    s.redeemed = Array.isArray(s.redeemed) ? s.redeemed : [];
    s.curSub = typeof s.curSub==='string' ? s.curSub : 'all';
    s.attempts = (s.attempts && typeof s.attempts==='object') ? s.attempts : {};
    s.wrong = Array.isArray(s.wrong) ? s.wrong : [];
    s.easyDay = typeof s.easyDay==='string' ? s.easyDay : null;
    s.periodUsed = Math.max(0, Math.min(PERIOD_MAX, Math.floor(Number(s.periodUsed)||0)));
    s.periodMonth = typeof s.periodMonth==='string' ? s.periodMonth : '';
    s.periodToday = typeof s.periodToday==='string' ? s.periodToday : null;
    s.notes = (s.notes && typeof s.notes==='object') ? s.notes : {};
    s.reviewed = (s.reviewed && typeof s.reviewed==='object') ? s.reviewed : {};
    s.studyDays = Math.max(1, Math.min(365, Math.floor(Number(s.studyDays)||90)));
    s.lastStudy = (s.lastStudy && typeof s.lastStudy==='object') ? s.lastStudy : {};
    s.lastReview = (s.lastReview && typeof s.lastReview==='object') ? s.lastReview : {};
    s.revStep = (s.revStep && typeof s.revStep==='object') ? s.revStep : {};
    s.mastery = (s.mastery && typeof s.mastery==='object') ? s.mastery : {};
    s.qStats = (s.qStats && typeof s.qStats==='object') ? s.qStats : {};
    s.milestones = (s.milestones && typeof s.milestones==='object') ? s.milestones : {};
    s.prepDate = typeof s.prepDate==='string' ? s.prepDate : '';
    s.prepTriggered = typeof s.prepTriggered==='string' ? s.prepTriggered : '';
    s.prepShown = typeof s.prepShown==='string' ? s.prepShown : '';
    return s;
  }
  // ---- 数据版本化 + 迁移（用户升级版本 → 老数据 → 新代码 兼容，避免读取旧数据即崩溃） ----
  var SCHEMA_V = 2;
  function migrateState(s){
    // 把可能畸形/旧结构的字段收敛为当前代码安全形态
    if(s.done && typeof s.done==='object' && !Array.isArray(s.done)){
      for(var dk in s.done){
        var de = s.done[dk];
        s.done[dk] = (de && typeof de==='object' && !Array.isArray(de)) ? { full:!!de.full, makeup:!!de.makeup } : { full:false, makeup:false };
      }
    }
    if(s.kpDone && typeof s.kpDone==='object' && !Array.isArray(s.kpDone)){
      for(var sk in s.kpDone){ if(!s.kpDone[sk] || typeof s.kpDone[sk]!=='object' || Array.isArray(s.kpDone[sk])) s.kpDone[sk] = {}; }
    }
    if(Array.isArray(s.wrong)){ s.wrong = s.wrong.filter(function(w){ return w && typeof w==='object' && w.sub && w.kid; }); }
    return s;
  }
  (function(){
    var v = 0;
    try{ v = parseInt(localStorage.getItem(KEY+'_schema')||'0',10)||0; }catch(e){}
    if(v < SCHEMA_V){ migrateState(S); normalizeState(S); try{ localStorage.setItem(KEY+'_schema', String(SCHEMA_V)); }catch(e){} }
    else { normalizeState(S); }
  })();

  // 知识点答题题库（每知识点5道选择题，考研题型）
  var QUIZ = __QUIZ_DATA__;
  function saveAll(){
    save("startDay", S.startDay);
    save("done", S.done);
    save("kpDone", S.kpDone);
    save("score", S.score);
    save("records", S.records);
    save("redeemed", S.redeemed);
    save("curSub", S.curSub);
    save("attempts", S.attempts);
    save("wrong", S.wrong);
    save("easyDay", S.easyDay);
    save("periodUsed", S.periodUsed);
    save("periodMonth", S.periodMonth);
    save("periodToday", S.periodToday);
    save("notes", S.notes);
    save("reviewed", S.reviewed);
    save("studyDays", S.studyDays);
    save("lastStudy", S.lastStudy);
    save("lastReview", S.lastReview);
    save("revStep", S.revStep);
    save("mastery", S.mastery);
    save("qStats", S.qStats);
    save("milestones", S.milestones);
    save("prepDate", S.prepDate);
    save("prepTriggered", S.prepTriggered);
    save("prepShown", S.prepShown);
    idbMirror();   // 异步镜像到 IndexedDB（大容量二级存储）
  }

  function init(){
    // 计划起点：已有存档则保留（导入 / 清空重开均生效）；
    // 缺失或非法时默认 2026-08-02（2026 考研周期，对应考试历「本期 90 天（8–10 月）」窗口）
    if(!S.startDay || typeof S.startDay!=='string' || isNaN(new Date(S.startDay+'T00:00:00').getTime())){
      S.startDay = "2026-08-02";
    }
    if(!S.done) S.done = {};
    if(!S.kpDone) S.kpDone = {};
    if(S.score===null) S.score = 0;
    if(!S.records) S.records = [];
    if(!S.redeemed) S.redeemed = [];
    if(!S.attempts) S.attempts = {};
    if(!S.wrong) S.wrong = [];
    if(!S.easyDay) S.easyDay = null;
    if(S.periodMonth !== dateStr(0).substring(0,7)){ S.periodUsed = 0; S.periodMonth = dateStr(0).substring(0,7); S.periodToday = null; }
    if(!S.periodToday) S.periodToday = null;
    if(!S.notes) S.notes = {};
    if(!S.reviewed) S.reviewed = {};
    if(!S.studyDays) S.studyDays = 90;
    if(!S.lastStudy) S.lastStudy = {};
    if(!S.lastReview) S.lastReview = {};
    if(!S.revStep) S.revStep = {};
    if(!S.mastery) S.mastery = {};
    if(!S.qStats) S.qStats = {};
    if(!S.milestones) S.milestones = {};
    if(!S.prepDate) S.prepDate = "";
    if(!S.prepTriggered) S.prepTriggered = "";
    if(!S.prepShown) S.prepShown = "";
    TOTAL = (S.studyDays>=30 && S.studyDays<=365) ? S.studyDays : 90;
    COVER_DAYS = TOTAL;   // 知识点铺开天数跟随计划长度，避免导入短/长计划后知识点排到计划外
    saveAll();
  }
