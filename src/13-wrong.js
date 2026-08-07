// ---------- 全站搜索 ----------
  function hl(text, q){
    var e = esc(text);
    if(!q) return e;
    if(q.length>50) q = q.slice(0,50);
    var re = new RegExp("("+q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");
    return e.replace(re, "<mark>$1</mark>");
  }
  function resetSearch(){
    var ip=$("kpSearch"); if(ip) ip.value="";
    var sr=$("searchResults"); if(sr) sr.classList.add("hidden");
    var lc=$("kpLibCard"); if(lc) lc.classList.remove("hidden");
    var wc=$("wrongCard"); if(wc) wc.classList.remove("hidden");
    renderKP();
  }
  function doSearch(){
    var ip=$("kpSearch"); if(!ip) return;
    var raw=ip.value.trim();
    var q=raw.toLowerCase();
    var sr=$("searchResults"), lc=$("kpLibCard"), wc=$("wrongCard");
    if(!q){
      if(sr) sr.classList.add("hidden");
      if(lc) lc.classList.remove("hidden");
      if(wc) wc.classList.remove("hidden");
      return;
    }
    if(lc) lc.classList.add("hidden");
    if(wc) wc.classList.add("hidden");
    if(sr) sr.classList.remove("hidden");

    var kpHits=[];
    for(var s=0;s<SUBJECTS.length;s++){
      var sid=SUBJECTS[s].id, sname=SUBJECTS[s].name, arr=KP_LIB[sid];
      for(var k=0;k<arr.length;k++){
        var item=arr[k];
        var hay=(item.t+" "+item.b+" "+item.src+" "+sname).toLowerCase();
        if(hay.indexOf(q)>=0) kpHits.push({sname:sname,t:item.t,b:item.b,src:item.src,id:item.id,sub:sid});
      }
    }
    var wrongHits=[], seen={};
    for(var i=0;i<S.wrong.length;i++){
      var w=S.wrong[i];
      var key=w.sub+':'+w.kid+':'+w.qi; if(seen[key]) continue; seen[key]=true;
      var qz=null; try{ qz=QUIZ[w.sub][w.kid][0][w.qi]; }catch(e){}
      if(!qz) continue;
      var kp=findKp(w.sub,w.kid), sn=subName(w.sub);
      var hay=(qz.q+" "+qz.opts.join(" ")+" "+(kp?kp.t:"")+" "+sn).toLowerCase();
      if(hay.indexOf(q)>=0) wrongHits.push({sn:sn,t:kp?kp.t:"错题回顾",q:qz.q,ans:qz.ans,exp:qz.exp,sub:w.sub,kid:w.kid});
    }
    if(!kpHits.length && !wrongHits.length){
      sr.innerHTML='<div class="empty">没有找到和「'+esc(raw)+'」相关的内容，换个词试试~</div>';
      return;
    }
    var h="";
    if(kpHits.length){
      h+='<div class="sres"><div class="sgrp">'+IC_BOOK+' 知识点 · '+kpHits.length+' 条</div>';
      for(var i=0;i<kpHits.length;i++){
        var it=kpHits[i];
        h+='<div class="si-item" data-act="kpdetail" data-sub="'+escAttr(it.sub)+'" data-id="'+escAttr(it.id)+'"><div class="si-t">'+hl(it.t,q)+'</div><div class="si-b">'+hl(it.b,q)+'</div><span class="si-src">'+esc(it.sname)+' · '+esc(it.src)+'</span></div>';
      }
      h+='</div>';
    }
    if(wrongHits.length){
      h+='<div class="sres"><div class="sgrp">错题 · '+wrongHits.length+' 条</div>';
      for(var i=0;i<wrongHits.length;i++){
        var wt=wrongHits[i];
        h+='<div class="si-item" data-act="kpdetail" data-sub="'+escAttr(wt.sub)+'" data-id="'+escAttr(wt.kid)+'"><div class="si-src">'+esc(wt.sn)+' · '+esc(wt.t)+'</div><div class="si-q">'+hl(wt.q,q)+'</div><div class="si-b">答案：'+'ABCD'[wt.ans]+'　解析：'+esc(wt.exp)+'</div></div>';
      }
      h+='</div>';
    }
    sr.innerHTML=h;
  }

  function countKpDone(sub){
    var n=0;
    if(S.kpDone[sub]) for(var k in S.kpDone[sub]) n++;
    return n;
  }

  function renderScore(){
    if(typeof fillAiSettingsForm==="function") fillAiSettingsForm();
    $("scoreBig").innerHTML = S.score+'<span style="font-size:18px;font-weight:600;color:var(--ink-3);-webkit-text-fill-color:var(--ink-3);"> 分</span>';
    var d = dayIndex();
    var dayDone = isDayFull(d)?1:0;
    $("mDay").innerHTML = isDayFull(d)? IC_CHECK:"·";
    var kpTotal = 0;
    for(var k in S.kpDone) for(var j in S.kpDone[k]) kpTotal++;
    $("mKp").textContent = kpTotal;
    $("mStreak").textContent = streak();

    // 成就
    var ah = "";
    for(var i=0;i<ACHS.length;i++){
      var a = ACHS[i];
      var on = false;
      if(a.type==="phase"){
        var dn = a.day;
        for(var x=1;x<=dn;x++){ if(!isDayFull(x)){ on=false; break; } on=true; }
      } else if(a.type==="finish"){
        on = true;
        for(var x=1;x<=TOTAL;x++) if(!isDayFull(x)){ on=false; break; }
      } else {
        on = S.score >= a.need;
      }
      ah += '<div class="it'+(on?' on':'')+'">'
        + '<div class="lock">'+(on?'已点亮':'未解锁')+'</div>'
        + '<div class="medal">'+pawSVG+'</div>'
        + '<div class="nm">'+a.name+'</div>'
        + '<div class="nd">'+(on?('达成 '+IC_CHECK):a.desc)+'</div>'
        + '</div>';
    }
    $("achList").innerHTML = ah;

    // 奖励
    var rh = "";
    for(var i=0;i<REWS.length;i++){
      var r = REWS[i];
      var can = S.score>=r.cost;
      rh += '<div class="it">'
        + '<svg class="gift" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>'
        + '<div class="nm">'+r.name+'</div>'
        + '<div class="cost'+(can?'':' no')+'">'+r.cost+' 积分</div>'
        + '<button class="btn '+(can?'gold':'soft')+'" data-act="redeem" data-id="'+escAttr(r.id)+'" '+(can?'':'disabled')+'>'+(can?'兑换':'积分不足')+'</button>'
        + '</div>';
    }
    $("rwList").innerHTML = rh;

    // 兑换记录
    var rl = "";
    if(S.redeemed.length){
      rl = '<div style="font-weight:700;font-size:13px;margin:8px 0 4px;">已兑换的小奖励</div>';
      for(var i=0;i<S.redeemed.length;i++){
        var x = S.redeemed[i];
        rl += '<div class="rec-item"><span>'+esc(x.name)+'</span><span class="t">'+esc(x.date)+'</span></div>';
      }
    }
    $("redeemList").innerHTML = rl;

    // 积分明细
    var rel = "";
    if(S.records.length){
      rel = '<div style="font-weight:700;font-size:13px;margin:10px 0 4px;">最近积分记录</div>';
      var n = Math.min(10, S.records.length);
      for(var i=0;i<n;i++){
        var r = S.records[i];
        var cls = r.delta>=0 ? "add":"sub";
        var sign = r.delta>=0?"+":"";
        rel += '<div class="rec-item"><span>'+esc(r.reason)+'<div class="t">'+esc(r.date)+'</div></span><span class="r '+cls+'">'+sign+r.delta+'</span></div>';
      }
    }
    $("recList").innerHTML = rel;

    // 提示
    var total = S.records.length + Object.keys(S.kpDone).length;
    if(total>=30) $("notice30").classList.remove("hidden");
    else $("notice30").classList.add("hidden");
  }

  function streak(){
    var n=0; var d=0;
    while(true){
      var key = dayIndex()-d;
      if(key<1) break;
      if(isDayFull(key)){ n++; d++; } else break;
    }
    return n;
  }
