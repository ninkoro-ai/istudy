// ---------- 实时时间同步 ----------
  // 严格跟随真实系统时间：跨午夜、从后台切回、页面重新可见时，立即重算“今天”并刷新
  var _renderDate = "";
  function syncTime(){
    var today = dateStr(0);
    if(today === _renderDate) return;       // 日期没变，不重渲染
    // 月份切换时重置“特殊关爱”配额（init 只跑一次，这里兜底）
    if(S.periodMonth !== today.substring(0,7)){
      S.periodUsed = 0; S.periodMonth = today.substring(0,7); S.periodToday = null;
      save("periodUsed", 0); save("periodMonth", S.periodMonth); save("periodToday", null);
    }
    _renderDate = today;
    renderAll();
  }
