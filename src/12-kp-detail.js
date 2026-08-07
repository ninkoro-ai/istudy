// ---------- 错题本（可展开） ----------
  var CARET_SVG = '<svg class="wcaret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function subName(id){ for(var x=0;x<SUBJECTS.length;x++) if(SUBJECTS[x].id===id) return SUBJECTS[x].name; return id; }
  function findKp(sub,kid){ if(!KP_LIB[sub]) return null; for(var j=0;j<KP_LIB[sub].length;j++) if(KP_LIB[sub][j].id===kid) return KP_LIB[sub][j]; return null; }

  // ---------- 错题重练排期：按错误次数间隔 [1,3,7] 天到期重练 ----------
  function wrongCountOf(sub, kid){
    var n=0;
    for(var i=0;i<S.wrong.length;i++) if(S.wrong[i].sub===sub && S.wrong[i].kid===kid) n++;
    return n;
  }
  function wrongRetryDue(w){
    var n = wrongCountOf(w.sub, w.kid);
    var gap = [1,3,7][Math.min(Math.max(n-1,0), 2)];
    var p = w.date.split("-");
    var d = new Date(p[0], p[1]-1, p[2]);
    d.setDate(d.getDate() + gap);
    var due = d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
    return due <= dateStr(0);
  }
  function removeWrongFor(sub, kid){
    var prev = S.wrong.length;
    S.wrong = S.wrong.filter(function(w){ return !(w.sub===sub && w.kid===kid); });
    if(prev>0 && S.wrong.length===0 && prev!==S.wrong.length){
      S.score += WRONG_CLEAR_BONUS;
      addRec("错题全部清零 +"+WRONG_CLEAR_BONUS, WRONG_CLEAR_BONUS);
      showToast("错题全部清零！奖励 +"+WRONG_CLEAR_BONUS+" 分");
    }
  }

  function renderWrong(){
    var box = $("wrongList"); if(!box) return;
    if(!S.wrong || !S.wrong.length){
      box.innerHTML = '<div class="empty">还没有错题，继续保持。做错的题会自动收进这里。</div>';
      return;
    }
    // 去重（同 sub:kid:qi 只显示最新一次），时间倒序
    var seen={}, items=[];
    for(var i=S.wrong.length-1;i>=0;i--){
      var w=S.wrong[i];
      var key=w.sub+':'+w.kid+':'+w.qi;
      if(seen[key]) continue; seen[key]=true;
      items.push(w);
    }
    var h="";
    for(var i=0;i<items.length;i++){
      var w=items[i];
      var qz=null;
      ensureQuiz(w.sub, w.kid); // 刷新后自动题可能未在内存，先生成
      try{ qz = QUIZ[w.sub][w.kid][0][w.qi]; }catch(e){ qz=null; }
      if(!qz) continue;
      var kp=findKp(w.sub,w.kid);
      var sn=subName(w.sub);
      var due = wrongRetryDue(w);
      var optsHtml="";
      for(var o=0;o<qz.opts.length;o++){
        var ocls = (o===qz.ans) ? "wopt correct" : "wopt";
        var omk = (o===qz.ans) ? CHECK_SVG : "";
        optsHtml += '<div class="'+ocls+'"><span class="mk">'+omk+'</span><span>'+esc(qz.opts[o])+'</span></div>';
      }
      h += '<div class="witem">'
        + '<div class="whead">'
        +   '<span class="wtag">'+esc(sn)+'</span>'
        +   '<span class="wt">'+esc(kp?kp.t:'错题回顾')+'</span>'
        +   (due ? '<span class="badge today">可重练</span>' : '')
        +   CARET_SVG
        + '</div>'
        + '<div class="wbody">'
        +   '<div class="wq">'+esc(qz.q)+'</div>'
        +   '<div class="wopts">'+optsHtml+'</div>'
        +   '<div class="wans">正确答案：'+'ABCD'[qz.ans]+'</div>'
        +   '<div class="wexp"><b>解析：</b>'+esc(qz.exp)+'</div>'
        +   '<div class="wdate">答错记录于 '+esc(w.date)+'</div>'
        +   (due ? '<div class="wretry"><button class="btn primary sm" data-act="wrongretry" data-sub="'+escAttr(w.sub)+'" data-id="'+escAttr(w.kid)+'">去重练（间隔排期）</button></div>' : '<div class="wdate">按间隔 [1,3,7] 天排期重练</div>')
        + '</div>'
        + '</div>';
    }
    box.innerHTML = h;
    updateWrongQuick();
  }
  // 顶部 banner 错题本快捷入口：实时显示错题库数量
  function updateWrongQuick(){
    var btn=$("wrongQuick"); if(!btn) return;
    var c = S.wrong ? S.wrong.length : 0;
    var cnt=$("wqCount"); if(cnt) cnt.textContent = c>99?"99+":c;
    if(c>0) btn.classList.remove("empty"); else btn.classList.add("empty");
  }
