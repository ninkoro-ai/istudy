// ---------- 答题系统 ----------
  var QUIZ_TIME = 300;

  // ---- 自动生成闯关题（用于尚未手写题库的知识点）----
  function hashStr(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function seededRand(seed){ var s=seed>>>0; return function(){ s=(s+0x6D2B79F5)>>>0; var t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
  function shuffle(arr,rng){ for(var i=arr.length-1;i>0;i--){ var j=Math.floor(rng()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; } return arr; }
  function range(n){ var a=[]; for(var i=0;i<n;i++) a.push(i); return a; }
  // 正文切句：优先按分号/句号切；不足 2 句时回退按逗号切，扩大可出题知识点覆盖面
  function splitFacts(b){
    var parts=(b||"").split(/[；;。]+/).map(function(x){return x.trim();}).filter(function(x){return x.length>6;});
    if(parts.length<2){
      parts=(b||"").split(/[，,；;。]+/).map(function(x){return x.trim();}).filter(function(x){return x.length>6;});
    }
    return parts;
  }
  function uniqArr(a){ var out=[], seen={}; for(var i=0;i<a.length;i++){ if(!seen[a[i]]){ seen[a[i]]=1; out.push(a[i]); } } return out; }
  function numOf(s){ var m=String(s).match(/\d+(?:\.\d+)?/g); return m?m.join('、'):''; }
  function genQuiz(sub, kid){
    var lib=KP_LIB[sub]; if(!lib) return null;
    var kp=null; for(var i=0;i<lib.length;i++) if(lib[i].id===kid) kp=lib[i];
    if(!kp) return null;
    var facts=uniqArr(splitFacts(kp.b));
    if(facts.length<2) return null;
    // 干扰项优先级：同章节 > 同科目 > 跨科目（保证“像真的”，提升区分度）
    var sameChap=[], sameSub=[], cross=[];
    for(var i=0;i<lib.length;i++){
      if(lib[i].id===kid) continue;
      var fs=uniqArr(splitFacts(lib[i].b));
      var bucket=(lib[i].src===kp.src)?sameChap:sameSub;
      for(var j=0;j<fs.length;j++) bucket.push(fs[j]);
    }
    for(var s=0;s<SUBJECTS.length;s++){
      var arr=KP_LIB[SUBJECTS[s].id];
      for(var i=0;i<arr.length;i++){
        if(SUBJECTS[s].id===sub) continue;
        var fs2=uniqArr(splitFacts(arr[i].b));
        for(var j=0;j<fs2.length;j++) cross.push(fs2[j]);
      }
    }
    var pool = sameChap.length>=3 ? sameChap : (sameSub.length>=3 ? sameSub : cross);
    pool=uniqArr(pool);
    if(pool.length<3) return null;
    var sets=[];
    for(var sIdx=0;sIdx<2;sIdx++){
      var rng=seededRand(hashStr(sub+"|"+kid+"|"+sIdx));
      var qIdx=shuffle(range(facts.length),rng).slice(0,Math.min(5,facts.length));
      var qs=[];
      for(var q=0;q<qIdx.length;q++){
        var ci=qIdx[q]; var correct=facts[ci];
        var others=uniqArr(shuffle(pool.slice(),rng)).slice(0,3);
        var opts, ans, qText, exp;
        var tpl=q%4;
        if(tpl===3){
          // 数值题：正确事实含数字时，选项为各事实中的关键数字/年份
          var nums=uniqArr(facts.map(numOf).filter(Boolean));
          if(nums.length>=2){
            var correctNum=numOf(correct);
            var wrongNums=uniqArr(pool.map(numOf).filter(Boolean)).filter(function(n){return n!==correctNum;}).slice(0,3);
            if(wrongNums.length>=3){
              opts=uniqArr(shuffle([correctNum].concat(wrongNums.slice(0,3)),rng));
              ans=opts.indexOf(correctNum);
              qText="「"+kp.t+"」涉及的关键数字/年份是？";
              exp="正确答案："+correctNum+"（依据："+correct+"）";
              qs.push({q:qText,opts:opts,ans:ans,exp:exp});
              continue;
            }
          }
          tpl=0;
        }
        if(tpl===2 && facts.length>=3){
          // 错误选项题：把“别的知识点的事实”伪装成该知识点内容，其余为正确事实
          var wrong=others[0];
          var rightOpts=shuffle(facts.slice(),rng).slice(0,3);
          opts=uniqArr(shuffle([wrong].concat(rightOpts),rng));
          ans=opts.indexOf(wrong);
          qText="关于「"+kp.t+"」，下列说法错误的是？";
          exp="正确答案："+wrong+"（其余选项才是「"+kp.t+"」的正确表述）";
        } else {
          opts=uniqArr(shuffle([correct].concat(others.slice(0,3)),rng));
          ans=opts.indexOf(correct);
          qText=(tpl===1)
            ? "关于「"+kp.t+"」，下列说法正确的是？"
            : "下列属于「"+kp.t+"」内容的是？";
          exp="正确答案："+correct;
        }
        qs.push({q:qText,opts:opts,ans:ans,exp:exp});
      }
      if(!qs.length) return null;
      sets.push(qs);
    }
    return sets;
  }
  function ensureQuiz(sub,kid){
    if(QUIZ[sub] && QUIZ[sub][kid]) return true;
    var g=genQuiz(sub,kid); if(!g) return false;
    if(!QUIZ[sub]) QUIZ[sub]={}; QUIZ[sub][kid]=g; return true;
  }

  // ---------- 纯阅读模式（无可用题目的知识点：先读正文，主动确认后才标记掌握） ----------
  var readState = null;
  function openReadingMode(sub, kid, mode){
    var kp=null;
    for(var i=0;i<KP_LIB[sub].length;i++) if(KP_LIB[sub][i].id===kid) kp=KP_LIB[sub][i];
    if(!kp) return;
    var sn='';
    for(var i=0;i<SUBJECTS.length;i++) if(SUBJECTS[i].id===sub) sn=SUBJECTS[i].name;
    var t=$("readTitle"); if(t) t.textContent="纯阅读模式 · "+kp.t;
    var s=$("readSrc"); if(s) s.textContent=sn+(kp.src?(" · "+kp.src):"");
    var b=$("readBody"); if(b) b.textContent=kp.b;
    readState={sub:sub, kid:kid, mode:mode || "new"};
    var ov=$("readOverlay"); if(ov){ ov.classList.add("on"); lockScroll(true); }
  }
  function confirmRead(){
    if(!readState) return;
    var sub=readState.sub, kid=readState.kid, mode=readState.mode || "new";
    readState=null;
    if(!S.kpDone[sub]) S.kpDone[sub]={};
    S.kpDone[sub][kid]=1;
    S.score+=PER_KP;
    addRec("掌握知识点（纯阅读） +"+PER_KP, PER_KP);
    if(mode === "review"){
      markReviewed(sub, kid);
      recordReview(sub, kid);
    } else {
      recordLearn(sub, kid);
    }
    removeWrongFor(sub, kid);
    var ov=$("readOverlay"); if(ov) ov.classList.remove("on");
    lockScroll(false);
    saveAll(); renderAll(); checkDayComplete();
    showToast("已认真读完并标记掌握 +"+PER_KP+" 分");
  }
  function closeRead(){
    readState=null;
    var ov=$("readOverlay"); if(ov){ ov.classList.remove("on"); lockScroll(false); }
  }

  function openQuiz(sub, kid, forceMode){
    var subName = '';
    for(var i=0;i<SUBJECTS.length;i++) if(SUBJECTS[i].id===sub) subName=SUBJECTS[i].name;
    var kp = null;
    for(var i=0;i<KP_LIB[sub].length;i++) if(KP_LIB[sub][i].id===kid) kp=KP_LIB[sub][i];
    if(!kp) return;
    // 判断该知识点今日的任务模式（新学/补学/复习），用于复习日记录“已复习”
    var mode = forceMode || "new";
    var quizArr = QUIZ[sub] && QUIZ[sub][kid];
    if(!quizArr){ // 该知识点尚无手写题库 → 自动生成一套，保证可闯关
      var g = genQuiz(sub, kid);
      if(g){ if(!QUIZ[sub]) QUIZ[sub]={}; QUIZ[sub][kid]=g; quizArr=g; }
    }
    if(!quizArr){ openReadingMode(sub, kid, mode); return; }  // 无题可出 → 纯阅读模式，主动确认后才掌握
    var att = S.attempts[sub+':'+kid]||0;
    var quiz = quizArr[Math.min(att, quizArr.length-1)];
    qState = {sub:sub,kid:kid,answers:[-1,-1,-1,-1,-1],seconds:QUIZ_TIME,attempt:att,subName:subName,mode:mode,submitted:false};
    $('qTitle').textContent='检测：'+kp.t;
    var qn=quiz.length, qneed=(qn<=3?qn:qn-1);
    $('qSub').textContent=subName+' · 共'+qn+'题 · 答对'+qneed+'题通过 · 第'+(att+1)+'次机会';
    $('qResult').innerHTML=''; $('qRetry').style.display='none';
    $('qSubmit').style.display=''; $('qSubmit').disabled=false;
    $('qSubmit').textContent='提交答卷';
    rq(); $('qOverlay').classList.add('on'); lockScroll(true); st();
  }

  function rq(){
    var quiz=QUIZ[qState.sub][qState.kid][Math.min(qState.attempt, QUIZ[qState.sub][qState.kid].length-1)];
    var h='';
    for(var i=0;i<quiz.length;i++){
      var q=quiz[i];
      h+='<div class="qitem"><div class="q">'+(i+1)+'. '+esc(q.q)+'</div><div class="opts">';
      for(var j=0;j<q.opts.length;j++){
        h+='<div class="opt'+(qState.answers[i]===j?' chosen':'')+'" data-qi="'+i+'" data-oj="'+j+'">'+'ABCD'[j]+'. '+esc(q.opts[j])+'</div>';
      }
      h+='</div></div>';
    }
    $('qList').innerHTML=h;
  }

  function st(){
    var el=$('qTimer');
    qState.timer=setInterval(function(){
      qState.seconds--;
      var m=Math.floor(qState.seconds/60), s=qState.seconds%60;
      el.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
      if(qState.seconds<60) el.className='timer warn';
      if(qState.seconds<30) el.className='timer danger';
      if(qState.seconds<=0){ clearInterval(qState.timer); sq(true); }
    },1000);
  }

  function sq(timeout){
    if(qState.timer) clearInterval(qState.timer);
    if(qState.submitted) return;   // 防重复提交（计时归零与手动提交同时触发时只结算一次）
    qState.submitted = true;
    $('qSubmit').style.display='none';
    var quiz=QUIZ[qState.sub][qState.kid][Math.min(qState.attempt, QUIZ[qState.sub][qState.kid].length-1)];
    var correct=0;
    var details=[];
    for(var i=0;i<quiz.length;i++){
      var ok=qState.answers[i]===quiz[i].ans;
      if(ok) correct++;
      details.push({ok:ok, idx:i, q:quiz[i], chosen:qState.answers[i]});
    }
    var need=(quiz.length<=3?quiz.length:quiz.length-1);
    var passed=correct>=need;
    var el=$('qResult');
    var kp=null;
    for(var i=0;i<KP_LIB[qState.sub].length;i++) if(KP_LIB[qState.sub][i].id===qState.kid) kp=KP_LIB[qState.sub][i];
    // 记录答题统计（驱动自适应复习间隔）
    recordQuiz(qState.sub, qState.kid, correct, quiz.length);

    if(passed){
      el.className='result pass';
      el.innerHTML='已完成！答对 '+correct+'/'+quiz.length+' 题（+' + PER_KP + '分）';
      var alreadyDone = !!(S.kpDone[qState.sub] && S.kpDone[qState.sub][qState.kid]);
      if(!S.kpDone[qState.sub]) S.kpDone[qState.sub]={};
      S.kpDone[qState.sub][qState.kid]=1;
      if(!alreadyDone){ S.score+=PER_KP; addRec('掌握知识点 +'+PER_KP,PER_KP); }
      S.attempts[qState.sub+':'+qState.kid]=0;
      if(qState.mode==="review"){ markReviewed(qState.sub, qState.kid); recordReview(qState.sub, qState.kid, correct/quiz.length); }
      else if(qState.mode==="wrong"){ /* 错题重练：只清错题，不重复计复习步 */ }
      else { recordLearn(qState.sub, qState.kid); }
      removeWrongFor(qState.sub, qState.kid);   // 通过后移除该知识点全部错题（触发清零奖励）
      $('qRetry').style.display='none';
      // 错误题目仍加入错题本
      for(var i=0;i<details.length;i++){
        if(!details[i].ok) S.wrong.push({sub:qState.sub,kid:qState.kid,qi:details[i].idx,date:dateStr(0)});
      }
      checkDayComplete();
    }else{
      var att=qState.attempt+1;
      S.attempts[qState.sub+':'+qState.kid]=att;
      // 错误题加入错题本
      for(var i=0;i<details.length;i++){
        if(!details[i].ok) S.wrong.push({sub:qState.sub,kid:qState.kid,qi:details[i].idx,date:dateStr(0)});
      }
      if(att>=2){
        el.className='result malicious';
        el.innerHTML='两次未通过（'+correct+'/5）！恶意打卡，扣减 '+PER_KP*2+' 分。请认真复习后明天再来~';
        S.score=Math.max(0,S.score-PER_KP*2);
        addRec('恶意打卡 -'+PER_KP*2,-PER_KP*2);
        S.attempts[qState.sub+':'+qState.kid]=0;
        $('qRetry').style.display='none';
      }else{
        el.className='result fail';
        el.innerHTML='答对 '+correct+'/'+quiz.length+' 题，未通过（需答对'+need+'题）。还有1次机会。';
        $('qRetry').style.display='';
        $('qRetry').textContent='再试一次（第'+(att+1)+'次，共2次机会）';
      }
    }
    // 显示详细结果
    showResultDetail(details);
    saveAll();renderAll();
  }

  function showResultDetail(details){
    var h='<div style="margin-top:10px;font-size:13px;">';
    for(var i=0;i<details.length;i++){
      var d=details[i];
      var q=d.q;
      var col=d.ok?'#7FC8A9':'#FF6B8A';
      var bg=d.ok?'#E5F4EC':'#FFE5EC';
      var ic=d.ok?'&#10003;':'&#10007;';
      h+='<div style="border-radius:12px;padding:10px;margin-bottom:6px;background:'+bg+';border-left:4px solid '+col+';">';
      h+='<div style="font-weight:600;color:'+col+';">'+ic+' '+(i+1)+'. '+esc(q.q)+'</div>';
      if(!d.ok && d.chosen>=0){
        h+='<div style="color:#C0392B;font-size:12px;margin-top:3px;">你的答案：'+'ABCD'[d.chosen]+'. '+esc(q.opts[d.chosen])+'</div>';
      }
      h+='<div style="color:#27AE60;font-size:12px;margin-top:2px;">正确答案：'+'ABCD'[q.ans]+'. '+esc(q.opts[q.ans])+'</div>';
      if(q.exp) h+='<div style="color:var(--ink-3);font-size:11.5px;margin-top:2px;">'+esc(q.exp)+'</div>';
      h+='</div>';
    }
    h+='</div>';
    // 插入 qList 后面
    var ql=$('qList');
    if(ql) ql.innerHTML=h;
  }

  function cq(){
    if(qState&&qState.timer) clearInterval(qState.timer);
    qState=null; $('qOverlay').classList.remove('on'); lockScroll(false);
  }

  document.addEventListener('click',function(e){
    var opt=e.target.closest('.opt');
    if(opt&&qState){ qState.answers[parseInt(opt.getAttribute('data-qi'))]=parseInt(opt.getAttribute('data-oj')); rq(); }
  });
  $('qOverlay').addEventListener('click',function(e){ if(e.target===$('qOverlay')) cq(); });
  $('qClose').addEventListener('click',cq);
  $('qSubmit').addEventListener('click',function(){sq(false);});
  $('qRetry').addEventListener('click',function(){
    qState.answers=[-1,-1,-1,-1,-1]; qState.seconds=QUIZ_TIME; qState.submitted=false;
    qState.attempt++; // 切换到下一套题库
    $('qTimer').textContent='05:00'; $('qTimer').className='timer';
    $('qResult').innerHTML=''; $('qRetry').style.display='none';
    $('qSubmit').style.display=''; $('qSubmit').disabled=false;
    var rq2=QUIZ[qState.sub][qState.kid][Math.min(qState.attempt, QUIZ[qState.sub][qState.kid].length-1)];
    var qn2=rq2.length, qneed2=(qn2<=3?qn2:qn2-1);
    $('qSub').textContent=qState.subName+' · 共'+qn2+'题 · 答对'+qneed2+'题通过 · 第'+(qState.attempt+1)+'次机会（新题库）';
    $('qSubmit').textContent='提交答卷'; rq(); st();
  });
  $('readConfirm').addEventListener('click', confirmRead);
  $('readClose').addEventListener('click', closeRead);
  $('readOverlay').addEventListener('click', function(e){ if(e.target===$('readOverlay')) closeRead(); });

  var qState = null;

  function toggleKp(sub, kid){
    if(S.kpDone[sub] && S.kpDone[sub][kid]){
      delete S.kpDone[sub][kid];
      S.score = Math.max(0, S.score - PER_KP);
      addRec('取消掌握 -'+PER_KP, -PER_KP);
      saveAll(); renderAll();
      return;
    }
    // 未掌握：若该知识点今日是「复习任务」，按复习模式闯关（标记今日已复习 + 复习步+1），
    // 否则按「新学」处理。修复冲刺期复习任务无法被满足的问题。
    var mode = "new";
    var ks = todayKps();
    for(var i=0;i<ks.length;i++){
      if(ks[i].sub===sub && ks[i].kp.id===kid && ks[i].mode==="review"){ mode="review"; break; }
    }
    openQuiz(sub, kid, mode);
  }

  function redeem(id){
    var r = null;
    for(var i=0;i<REWS.length;i++) if(REWS[i].id===id) r=REWS[i];
    if(!r || S.score<r.cost) return;
    if(id==="r3" && S.easyDay===dateStr(0)){ showToast("今天已经开启「轻松一下」啦，明天再来。"); return; }
    S.score -= r.cost;
    S.redeemed.unshift({ name:r.name, date:dateStr(0) });
    addRec("兑换 "+r.name+" -"+r.cost, -r.cost);
    if(id==="r3"){ S.easyDay = dateStr(0); saveAll(); renderAll(); showToast("「轻松一下」已激活！今日只需完成 2 科打卡。"); }
    else{ saveAll(); renderAll(); showToast("已兑换「"+r.name+"」。"); }
  }
