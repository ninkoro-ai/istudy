// 积分记录
  function addRec(reason, delta){
    var d = dateStr(0);
    var t = new Date();
    S.records.unshift({ reason:reason, delta:delta, date:d+" "+pad(t.getHours())+":"+pad(t.getMinutes()) });
    if(S.records.length>300) S.records.length=300;
  }

  // 打卡完成判定与奖励：当日应学知识点全部掌握后触发一次
  function checkDayComplete(){
    var d = dayIndex();
    if(d<1) return;
    if(S.done[d] && S.done[d].full) return; // 已记录，避免重复发奖
    if(!isDayFull(d)) return;
    var str = streak() + 1;  // 含今天：第 3 天起享受连胜加成
    var mult = str >= 3 ? 1.5 : 1;
    var bonus = Math.round(PER_DAY_FULL * mult);
    if(!S.done[d]) S.done[d] = {};
    S.done[d].full = 1;
    S.score += bonus;
    addRec("今日打卡完成 +"+bonus, bonus);
    // 连续全勤里程碑额外奖励（每档一次）
    if(STREAK_BONUS[str] && !(S.milestones && S.milestones[str])){
      if(!S.milestones) S.milestones = {};
      S.milestones[str] = 1;
      var sb = STREAK_BONUS[str];
      S.score += sb;
      addRec("连续全勤 "+str+" 天奖励 +"+sb, sb);
      showToast("连续全勤 "+str+" 天！额外奖励 +"+sb+" 分");
    }
    saveAll();
    showToast("今日打卡完成！奖励 +"+bonus+" 分");
    pawPop();
  }
