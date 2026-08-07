// 顶部按钮
  $("btnExport").addEventListener("click", function(){
    var data = { startDay:S.startDay, done:S.done, kpDone:S.kpDone, score:S.score, records:S.records, redeemed:S.redeemed, curSub:S.curSub, attempts:S.attempts, wrong:S.wrong, easyDay:S.easyDay, periodUsed:S.periodUsed, periodMonth:S.periodMonth, periodToday:S.periodToday, notes:S.notes, reviewed:S.reviewed, studyDays:S.studyDays, lastStudy:S.lastStudy, lastReview:S.lastReview, revStep:S.revStep, mastery:S.mastery, qStats:S.qStats, milestones:S.milestones, prepDate:S.prepDate, prepTriggered:S.prepTriggered, prepShown:S.prepShown, _type:"kaoyan-workbench-v2", _v:2 };
    var blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "我ai学习备份-"+dateStr(0)+".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast("已导出，记得妥善保存。");
  });
  $("btnImport").addEventListener("click", function(){ $("fileInput").click(); });
  $("fileInput").addEventListener("change", function(e){
    var f = e.target.files[0]; if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){
      try{
        var d = JSON.parse(rd.result);
        if(importEncryptedData(d)){ return; }   // 加密备份走解密导入
        if(!d || d._type!=="kaoyan-workbench-v2"){ alert("文件格式不对，不是本工作台的备份哦～"); return; }
        if(d._v!==2){ alert("备份版本不兼容（需要 v2），请用新版导出。"); return; }
        if(typeof d.done!=="object" || !d.done){ alert("备份内容缺少必要字段，已取消导入。"); return; }
        // 导入前自动备份当前数据（存于 localStorage _preImportBackup），覆盖后仍可恢复
        try{
          var cur = { startDay:S.startDay, done:S.done, kpDone:S.kpDone, score:S.score, records:S.records, redeemed:S.redeemed, curSub:S.curSub, attempts:S.attempts, wrong:S.wrong, easyDay:S.easyDay, periodUsed:S.periodUsed, periodMonth:S.periodMonth, periodToday:S.periodToday, notes:S.notes, reviewed:S.reviewed, studyDays:S.studyDays, lastStudy:S.lastStudy, lastReview:S.lastReview, revStep:S.revStep, mastery:S.mastery, qStats:S.qStats, milestones:S.milestones, prepDate:S.prepDate, prepTriggered:S.prepTriggered, prepShown:S.prepShown, _type:"kaoyan-workbench-v2", _v:2 };
          localStorage.setItem(KEY+"_preImportBackup", JSON.stringify(cur));
        }catch(e){ /* 备份失败不阻断导入 */ }
        S = sanitizeImport(d);
        saveAll(); renderAll();
        showToast("导入成功！已自动备份导入前数据。");
      }catch(err){ alert("解析失败，请检查文件～"); }
      e.target.value="";
    };
    rd.readAsText(f);
  });
  $("btnClear").addEventListener("click", function(){
    if(!confirm("确定要清空所有数据吗？\n打卡记录、积分、知识点进度都会删除且不可恢复。\n建议先点导出备份。")) return;
    if(!confirm("最后确认：清空后将重新开始 90 天计划，真的继续吗？")) return;
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf(KEY)===0) localStorage.removeItem(k); });
    idbClear();   // 同步清空 IndexedDB 镜像，防止清空后又被自动恢复
    S.startDay = dateStr(0); S.done={}; S.kpDone={}; S.score=0; S.records=[]; S.redeemed=[]; S.curSub="all"; S.attempts={}; S.wrong=[]; S.easyDay=null; S.periodUsed=0; S.periodMonth=""; S.periodToday=null; S.notes={}; S.reviewed={}; S.studyDays=90; S.lastStudy={}; S.lastReview={}; S.revStep={}; S.mastery={}; S.qStats={}; S.milestones={}; S.prepDate=""; S.prepTriggered=""; S.prepShown="";
    saveAll(); renderAll();
    showToast("已清空，新一轮 90 天开始啦！");
  });
