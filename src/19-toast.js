// AI 教学助手
  // 学科自适应可视化指引（融合自教学提示词源文档的「示意图」描述，按学科特点针对性适配）
  function visGuideFor(sub){
    var head='在完成认知框架后，请判断该知识点是否适合视觉化。原则：不是为了生成图而生成图，只有当图能明显帮助理解时才生成。按知识类型选择：结构问题→概念结构图；过程问题→流程图；关系问题→关系图；规律问题→模型图；比较问题→对照图。\n';
    var bySub={
      pol:'【政治理论】优先生成概念关系图（如 flowchart TD：哲学基本问题→唯物主义 / 唯心主义→物质第一性 / 意识第一性）与理论历史发展图，用于呈现理论发展与思想演变。生成后用一句话说明图在讲什么、对应哪个要点。',
      eng:'【英语二】不要生成复杂图片。重点生成：①长难句结构图（主句↓谓语↓宾语↓修饰成分）；②阅读逻辑图（作者观点↓论据↓转折↓结论），帮助理解句子结构、阅读逻辑与出题方向。生成后说明图对应的句子结构或阅读逻辑。',
      s339:'【植物学 / 农学】结构类知识（种子结构、根尖结构、细胞结构、花药结构、植物组织等）生成 Concept Diagram 概念结构图：教材插图风格、白色背景、简洁线稿、中文标注、箭头指向、标明结构名称，展示「整体结构→组成部分→功能」（如种子标注种皮 / 胚乳 / 子叶 / 胚芽 / 胚根，根尖标注根冠 / 分生区 / 伸长区 / 根毛区），生成后解释每个结构的位置、作用与考点。过程类知识（种子萌发、光合作用、呼吸作用、水分运输、激素调节等）生成 Mermaid 流程图：使用 flowchart TD，最大兼容模式，不使用 subgraph / class / style，节点文字简短（例：A[起点]→B[过程]→C[变化]→D[结果]），生成后解释每一步含义、为何这样变化、考试如何考。【遗传学】遗传关系生成基因关系图与杂交流程图（亲本AA→配子A，亲本aa→配子a，汇合得F1 Aa）；概率规律生成遗传棋盘图与比例关系图，解释基因组合过程、后代表现规律与高频考点。',
      s881:'【作物育种学】适合生成育种流程图（选择亲本→杂交→后代选择→品系稳定→新品种）与世代变化图（F1↓F2↓F3↓稳定品系），解释育种目的、筛选方法与考试重点。'
    };
    if(bySub[sub]) return head+bySub[sub];
    return head+'若属其他学科，请按上述「结构 / 过程 / 关系 / 规律 / 比较」对应图型自行判断最合适的可视化方式。';
  }
  function aiPrompt(sub, kid){
    var kp=null, sn='';
    for(var i=0;i<KP_LIB[sub].length;i++) if(KP_LIB[sub][i].id===kid) kp=KP_LIB[sub][i];
    for(var i=0;i<SUBJECTS.length;i++) if(SUBJECTS[i].id===sub) sn=SUBJECTS[i].name;
    if(!kp) return;
    var text='你现在是一位极有耐心的考研辅导老师，并会根据不同学科特点生成辅助学习图，帮我把抽象或具象知识具象化理解。请像给一位完全没接触过这个专业的大一新生上课一样，带我循序渐进地学懂【'+sn+'】里的知识点——「'+kp.t+'」。\n\n';
    text+='【背景参考（仅供你把握深度，不要直接照读）】\n'+kp.b+'\n\n';
    text+='【上课方式要求——请严格遵循，不要跳步】\n';
    text+='1. 【先建立认知框架】先用清晰、结构化的方式把「'+kp.t+'」的核心概念讲一遍，像老师板书一样分点列出（定义、核心要素、来龙去脉），方便我直接记笔记、形成整体认知。这一步以"讲清楚"为主，让我对这个知识点有个大概的把握。\n';
    text+='2. 【学科自适应可视化】'+visGuideFor(sub)+'\n';
    text+='3. 【再用类比加深】接着用生活中常见的现象打比方来类比，绝不用专业术语解释专业术语。每讲一个要点都说明"它解决什么问题 / 为什么需要它"。\n';
    text+='4. 【点明考法】紧扣考研'+sn+'的考试大纲，明确告诉我会怎么考（选择题常挖的坑、简答可能怎么出）。\n';
    text+='5. 【引导互动】在讲解后穿插 2-3 个即时小问题让我回答，你来点评对错并解释原因，形成真实的师生互动，而不是直接把结论塞给我。\n';
    text+='6. 【循序渐进练习】最后出 3-5 道考研风格练习题。请注意：一道一道出，等我作答后再给出这一道的解析并出下一题，绝不要一次性把所有答案列出来。\n';
    text+='7. 收尾帮我把这个知识点整理成一张"一句话核心 + 2 个易错点"的随身复习小卡片。\n\n';
    text+='核心原则：先讲概念建立框架（可笔记），再做学科自适应可视化（结构认知 + 视觉记忆），然后类比理解，最后引导互动与练习。循序渐进、像真实上课一样带我主动思考，任何环节都不要省略互动。';
    _aiSub=sub; _aiKid=kid;
    var cfg=aiGetConfig();
    $('aiTitle').textContent='让AI教你'+(cfg&&cfg.model?(' · '+cfg.model):' · 一键抄送提示词');
    $('aiText').value=text;
    var askBtn=$("aiAsk"); if(askBtn) askBtn.style.display=(cfg&&cfg.key)?"":"none";
    var res=$("aiResult"); if(res){ res.innerHTML=""; res.classList.add("hidden"); }
    renderAiScripts();
    $('aiOverlay').classList.add('on'); lockScroll(true);
  }
  // ---------- AI 设置（BYO API Key，仅存本机）+ 可保存提示词脚本 ----------
  var _aiSub=null, _aiKid=null;
  function aiGetConfig(){
    try{ var v=localStorage.getItem(KEY+"aiConfig"); return v?JSON.parse(v):null; }catch(e){ return null; }
  }
  function aiSaveConfig(cfg){ try{ localStorage.setItem(KEY+"aiConfig", JSON.stringify(cfg)); }catch(e){} }
  function aiClearConfig(){ try{ localStorage.removeItem(KEY+"aiConfig"); }catch(e){} }
  function aiGetScripts(){
    try{ var v=localStorage.getItem(KEY+"aiScripts"); return v?JSON.parse(v):[]; }catch(e){ return []; }
  }
  function aiSaveScripts(arr){ try{ localStorage.setItem(KEY+"aiScripts", JSON.stringify(arr)); }catch(e){} }
  function fillAiSettingsForm(){
    var cfg=aiGetConfig()||{};
    var u=$("aiBaseUrl"); if(u) u.value=cfg.baseUrl||"https://api.openai.com/v1";
    var m=$("aiModel"); if(m) m.value=cfg.model||"gpt-4o-mini";
    var k=$("aiKey"); if(k) k.value=cfg.key||"";
  }
  function renderAiScripts(){
    var box=$("aiScriptsList"); if(!box) return;
    var arr=aiGetScripts();
    if(!arr.length){ box.innerHTML=""; box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    var h="";
    for(var i=0;i<arr.length;i++){
      h+='<div class="ai-script"><button class="ai-script-load" data-ai-load="'+i+'">'+esc(arr[i].name)+'</button><button class="ai-script-del" data-ai-del="'+i+'" aria-label="删除脚本">×</button></div>';
    }
    box.innerHTML=h;
  }
  function aiAsk(){
    var cfg=aiGetConfig();
    if(!cfg || !cfg.key){ showToast("请先在「我的 → AI 设置」填写 API Key。"); return; }
    var t=$("aiText"); if(!t || !t.value.trim()) return;
    var res=$("aiResult"); if(!res) return;
    res.classList.remove("hidden");
    res.innerHTML='<div class="ai-loading">正在讲解…（请求直接由你的浏览器发起，不经任何中转）</div>';
    var ask=$("aiAsk"); if(ask) ask.disabled=true;
    var body={ model:cfg.model||"gpt-4o-mini", messages:[
      { role:"system", content:"你是一位耐心的考研辅导老师，请始终用中文回复。" },
      { role:"user", content:t.value }
    ]};
    var base=(cfg.baseUrl||"https://api.openai.com/v1").replace(/\/+$/,"");
    fetch(base+"/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+cfg.key },
      body:JSON.stringify(body)
    }).then(function(r){
      return r.json().then(function(j){ return { ok:r.ok, j:j }; });
    }).then(function(o){
      var msg=o.j && o.j.choices && o.j.choices[0] && o.j.choices[0].message && o.j.choices[0].message.content;
      if(!o.ok || !msg){
        var em=(o.j && o.j.error && (o.j.error.message||o.j.error.code)) || ("HTTP "+ (o.j?JSON.stringify(o.j).slice(0,80):"失败"));
        throw new Error(em);
      }
      res.innerHTML='<div class="ai-answer">'+esc(msg).replace(/\n/g,"<br>")+'</div>';
    }).catch(function(e){
      res.innerHTML='<div class="ai-err">请求失败：'+esc(e&&e.message?e.message:e)+'<br>请检查 API Key / Base URL / 网络，或改用「复制提示词」粘贴到任意 AI。</div>';
    }).then(function(){ if(ask) ask.disabled=false; });
  }
  function aiSaveCurrentScript(){
    var t=$("aiText"); if(!t || !t.value.trim()) return;
    var name=prompt("给这份提示词脚本起个名字：", "讲题脚本 "+(aiGetScripts().length+1));
    if(!name) return;
    var arr=aiGetScripts();
    arr.unshift({ name:name, text:t.value });
    if(arr.length>20) arr.length=20;
    aiSaveScripts(arr);
    renderAiScripts();
    showToast("已保存提示词脚本。");
  }
  $("aiAsk").addEventListener("click", aiAsk);
  $("aiSaveScript").addEventListener("click", aiSaveCurrentScript);
  var _aiSbox=$("aiScriptsList");
  if(_aiSbox){
    _aiSbox.addEventListener("click", function(e){
      var ld=e.target.closest("[data-ai-load]");
      if(ld){
        var arr=aiGetScripts(), i=parseInt(ld.getAttribute("data-ai-load"),10);
        if(arr[i]){ $("aiText").value=arr[i].text; showToast("已载入脚本「"+arr[i].name+"」。"); }
        return;
      }
      var dl=e.target.closest("[data-ai-del]");
      if(dl){
        var arr2=aiGetScripts(), j=parseInt(dl.getAttribute("data-ai-del"),10);
        arr2.splice(j,1);
        aiSaveScripts(arr2);
        renderAiScripts();
      }
    });
  }
  $("aiSaveCfg").addEventListener("click", function(){
    var u=$("aiBaseUrl"), m=$("aiModel"), k=$("aiKey");
    var cfg={ baseUrl:(u&&u.value.trim())||"https://api.openai.com/v1", model:(m&&m.value.trim())||"gpt-4o-mini", key:(k&&k.value.trim())||"" };
    if(cfg.key && cfg.key.length<10){ alert("API Key 看起来太短，请检查后重试。"); return; }
    aiSaveConfig(cfg);
    showToast("AI 设置已保存（仅存本机）。");
  });
  $("aiClearCfg").addEventListener("click", function(){
    if(!confirm("确定清除本机的 AI 设置（含 API Key）吗？")) return;
    aiClearConfig();
    fillAiSettingsForm();
    showToast("已清除 AI 设置。");
  });
  $('aiCopy').addEventListener('click',function(){
    var t=$('aiText'); t.select();
    var done=function(){ showToast('提示词已复制，粘到 AI 里就能用。'); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t.value).then(done).catch(function(){
        try{ document.execCommand('copy'); done(); }catch(e){ showToast('复制失败，请手动长按选择复制。'); }
      });
    } else {
      try{ document.execCommand('copy'); done(); }
      catch(e){ showToast('复制失败，请手动长按选择复制。'); }
    }
  });
  $('aiClose').addEventListener('click',function(){ $('aiOverlay').classList.remove('on'); lockScroll(false); });
  $('aiOverlay').addEventListener('click',function(e){ if(e.target===$('aiOverlay')){ $('aiOverlay').classList.remove('on'); lockScroll(false); } });
