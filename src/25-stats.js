  // ---------- 统计页（SVG 图表，零依赖、纯本地计算） ----------
  function subMasteryPct(sub){
    var arr = KP_LIB[sub] || [], done = 0;
    for(var i=0;i<arr.length;i++) if(S.kpDone[sub] && S.kpDone[sub][arr[i].id]) done++;
    return arr.length ? Math.round(done/arr.length*100) : 0;
  }
  // 累计掌握趋势：按 lastStudy 日期统计截至每天的已掌握数（最多 60 天）
  function masteryTrendPoints(){
    var counts = {};
    for(var sub in S.kpDone){
      for(var kid in S.kpDone[sub]){
        var d = (S.lastStudy[sub] && S.lastStudy[sub][kid]) || S.startDay;
        counts[d] = (counts[d]||0) + 1;
      }
    }
    var out=[], today=dateStr(0);
    var days = Math.min(60, Math.max(1, daysBetween(S.startDay, today)+1));
    var p=S.startDay.split("-");
    var cur=new Date(p[0],p[1]-1,p[2]);
    var run=0;
    for(var i=0;i<days;i++){
      var ds=cur.getFullYear()+"-"+pad(cur.getMonth()+1)+"-"+pad(cur.getDate());
      run += (counts[ds]||0);
      out.push({date:ds, n:run});
      cur.setDate(cur.getDate()+1);
    }
    return out;
  }
  function svgTrend(points){
    if(!points || !points.length) return '<div class="empty">暂无数据，学一个知识点后这里会出现趋势。</div>';
    var W=320,H=120,P=8;
    var max=Math.max(1, points[points.length-1].n);
    var step=(W-P*2)/Math.max(1,points.length-1);
    var pts=points.map(function(pd,i){
      return (P+i*step).toFixed(1)+","+(H-P-(pd.n/max)*(H-P*2)).toFixed(1);
    }).join(" ");
    var last=points[points.length-1];
    var lastX=(P+(points.length-1)*step).toFixed(1);
    var lastY=(H-P-(last.n/max)*(H-P*2)).toFixed(1);
    return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="掌握度趋势图">'
      + '<polyline points="'+pts+'" fill="none" stroke="#7FC8A9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="'+lastX+'" cy="'+lastY+'" r="3.5" fill="#2E7D52"/>'
      + '<text x="'+W+'" y="'+(H-2)+'" text-anchor="end" font-size="9" fill="var(--ink-3)">累计掌握 '+last.n+' / '+Object.keys(S.kpDone).reduce(function(a,s){return a+Object.keys(S.kpDone[s]||{}).length;},0)+'</text>'
      + '</svg>';
  }
  function heatData(){
    var weeks=[], today=dateStr(0);
    var p=today.split("-");
    var end=new Date(p[0],p[1]-1,p[2]);
    var start=new Date(end); start.setDate(start.getDate()-83); // 最近 12 周
    var cur=new Date(start), week=[];
    for(var i=0;i<84;i++){
      var ds=cur.getFullYear()+"-"+pad(cur.getMonth()+1)+"-"+pad(cur.getDate());
      var di=dayIndexForDate(ds);
      var st=(di>=1&&di<=TOTAL)? dayStatus(di) : null;
      week.push({ds:ds, st:st, today: ds===today});
      if(week.length===7){ weeks.push(week); week=[]; }
      cur.setDate(cur.getDate()+1);
    }
    if(week.length) weeks.push(week);
    return weeks;
  }
  function svgHeat(weeks){
    var cell=11, gap=2;
    var W=weeks.length*(cell+gap)+gap, H=7*(cell+gap)+gap;
    var cls={done:"hd-done", partial:"hd-partial", miss:"hd-miss", future:"hd-future"};
    var html='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="每日打卡热力图">';
    weeks.forEach(function(w,wi){
      w.forEach(function(d,di){
        var k=d.st ? (cls[d.st]||"hd-none") : "hd-out";
        if(d.today) k+=" hd-today";
        html+='<rect x="'+(gap+wi*(cell+gap))+'" y="'+(gap+di*(cell+gap))+'" width="'+cell+'" height="'+cell+'" rx="2.5" class="'+k+'"><title>'+d.ds+' · '+(d.st||"非计划日")+'</title></rect>';
      });
    });
    html+='</svg><div class="heat-legend"><i class="hd-done"></i>已打卡 <i class="hd-partial"></i>进行中 <i class="hd-miss"></i>缺卡 <i class="hd-out"></i>计划外</div>';
    return html;
  }
  function svgRadar(){
    var subs=SUBJECTS.map(function(s){ return { id:s.id, name:s.name.split(" ")[0], v:subMasteryPct(s.id) }; });
    var cx=110, cy=92, R=58, W=cx*2, H=cy*2+12;
    function pt(i,r){ var ang=Math.PI/2 - i*2*Math.PI/subs.length; return [cx+r*Math.cos(ang), cy-r*Math.sin(ang)]; }
    var html='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="科目掌握度雷达图">';
    for(var ring=1;ring<=4;ring++){
      var gp=[]; for(var i=0;i<subs.length;i++){ var q=pt(i,R*ring/4); gp.push(q[0].toFixed(1)+","+q[1].toFixed(1)); }
      html+='<polygon points="'+gp.join(" ")+'" fill="none" stroke="var(--hairline)" stroke-width="1"/>';
    }
    var poly=[]; for(var i=0;i<subs.length;i++){ var q=pt(i,R*subs[i].v/100); poly.push(q[0].toFixed(1)+","+q[1].toFixed(1)); }
    html+='<polygon points="'+poly.join(" ")+'" fill="rgba(127,200,169,.35)" stroke="#2E7D52" stroke-width="2"/>';
    for(var i=0;i<subs.length;i++){
      var lbl=pt(i,R+14);
      html+='<text x="'+lbl[0].toFixed(1)+'" y="'+(lbl[1]+3).toFixed(1)+'" text-anchor="middle" font-size="9.5" fill="var(--ink-2)">'+esc(subs[i].name)+' '+subs[i].v+'%</text>';
    }
    html+='</svg>';
    return html;
  }
  function renderStats(){
    var trend=$("statTrend"); if(trend) trend.innerHTML=svgTrend(masteryTrendPoints());
    var heat=$("statHeat"); if(heat) heat.innerHTML=svgHeat(heatData());
    var radar=$("statRadar"); if(radar) radar.innerHTML=svgRadar();
    var sum=$("statSummary");
    if(sum){
      var doneDays=0;
      for(var i=1;i<=TOTAL;i++) if(isDayFull(i)) doneDays++;
      var wrong=S.wrong?S.wrong.length:0;
      var due=reviewDueList().length;
      var tot=0; for(var s in S.kpDone) tot+=Object.keys(S.kpDone[s]||{}).length;
      sum.innerHTML='<div class="mini3">'
        + '<div class="m"><div class="n">'+doneDays+'/'+TOTAL+'</div><div class="t">已打卡天数</div></div>'
        + '<div class="m"><div class="n">'+wrong+'</div><div class="t">当前错题</div></div>'
        + '<div class="m"><div class="n">'+due+'</div><div class="t">今日待复习</div></div>'
        + '</div>'
        + '<div class="dm-hint">累计掌握 '+tot+' 个知识点；统计均由本地数据实时计算。</div>';
    }
  }
