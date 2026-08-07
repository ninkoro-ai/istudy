  // ---------- 数据二级存储与加密备份 ----------
  // IndexedDB 作为 localStorage 的大容量镜像：防清缓存丢数据、可跨设备恢复；加密备份用 Web Crypto（AES-256-GCM + PBKDF2）
  var IDB_NAME = "istudy-store";
  var IDB_STORE = "state";
  var IDB_ITER = 150000;

  function idbOpen(){
    return new Promise(function(resolve, reject){
      try{
        var req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function(){
          var db = req.result;
          if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        req.onsuccess = function(){ resolve(req.result); };
        req.onerror = function(){ reject(req.error); };
      }catch(e){ reject(e); }
    });
  }
  function idbPut(snapshot){
    return idbOpen().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(snapshot, "snapshot");
        tx.oncomplete = function(){ db.close(); resolve(); };
        tx.onerror = function(){ db.close(); reject(tx.error); };
      });
    }).catch(function(){ /* IndexedDB 不可用不阻断主流程 */ });
  }
  function idbGet(){
    return idbOpen().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, "readonly");
        var req = tx.objectStore(IDB_STORE).get("snapshot");
        req.onsuccess = function(){ db.close(); resolve(req.result); };
        req.onerror = function(){ db.close(); reject(req.error); };
      });
    }).catch(function(){ return null; });
  }
  function idbClear(){
    if(typeof indexedDB === "undefined") return;
    try{ indexedDB.deleteDatabase(IDB_NAME); }catch(e){}
  }
  function snapshotS(){
    return {
      startDay:S.startDay, done:S.done, kpDone:S.kpDone, score:S.score, records:S.records,
      redeemed:S.redeemed, curSub:S.curSub, attempts:S.attempts, wrong:S.wrong,
      easyDay:S.easyDay, periodUsed:S.periodUsed, periodMonth:S.periodMonth, periodToday:S.periodToday,
      notes:S.notes, reviewed:S.reviewed, studyDays:S.studyDays, lastStudy:S.lastStudy,
      lastReview:S.lastReview, revStep:S.revStep, mastery:S.mastery, qStats:S.qStats,
      milestones:S.milestones,
      prepDate:S.prepDate, prepTriggered:S.prepTriggered, prepShown:S.prepShown,
      _type:"kaoyan-workbench-v2", _v:2
    };
  }
  var _idbTimer = null;
  function idbMirror(){
    if(typeof indexedDB === "undefined") return;
    clearTimeout(_idbTimer);
    _idbTimer = setTimeout(function(){ idbPut(snapshotS()); }, 600);
  }
  function idbFlushNow(){
    clearTimeout(_idbTimer);
    if(typeof indexedDB === "undefined") return;
    idbPut(snapshotS());
  }
  // 新设备 / 清缓存后：localStorage 为空但 IndexedDB 有快照 → 自动恢复
  function idbRestoreIfEmpty(){
    if(typeof indexedDB === "undefined") return Promise.resolve(false);
    var hasLocal = false;
    try{ hasLocal = !!localStorage.getItem(KEY+"startDay") && !!localStorage.getItem(KEY+"kpDone"); }catch(e){}
    if(hasLocal) return Promise.resolve(false);
    return idbGet().then(function(snap){
      if(!snap || snap._type !== "kaoyan-workbench-v2" || typeof snap.done !== "object") return false;
      S = sanitizeImport(snap);
      saveAll();
      renderAll();
      showToast("已从本地数据库恢复学习进度。");
      return true;
    }).catch(function(){ return false; });
  }

  // ---------- 加密备份（AES-GCM + PBKDF2，口令本地派生、不上传） ----------
  function b64(bytes){
    var s = "";
    for(var i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(str){
    var s = atob(str), u = new Uint8Array(s.length);
    for(var i=0;i<s.length;i++) u[i] = s.charCodeAt(i);
    return u;
  }
  function pbkdf2Key(pass, salt, iter){
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"])
      .then(function(base){
        return crypto.subtle.deriveKey(
          { name:"PBKDF2", salt:salt, iterations:iter, hash:"SHA-256" },
          base, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
        );
      });
  }
  function downloadBlob(blob, name){
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
  }
  function exportEncrypted(){
    if(typeof crypto === "undefined" || !crypto.subtle){ showToast("当前浏览器不支持加密，请使用现代浏览器。"); return; }
    var pass = prompt("设置备份口令（请牢记，忘记将无法恢复）：");
    if(!pass) return;
    if(pass.length < 6){ alert("口令至少 6 位。"); return; }
    var pass2 = prompt("再次输入口令确认：");
    if(pass2 !== pass){ alert("两次输入不一致，已取消。"); return; }
    var payload = JSON.stringify(snapshotS(), null, 2);
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    pbkdf2Key(pass, salt, IDB_ITER)
      .then(function(key){
        return crypto.subtle.encrypt({ name:"AES-GCM", iv:iv }, key, new TextEncoder().encode(payload));
      })
      .then(function(ct){
        var file = {
          _type:"istudy-backup-encrypted", _v:1,
          kdf:"PBKDF2-SHA256", cipher:"AES-GCM", iter:IDB_ITER,
          salt:b64(salt), iv:b64(iv), data:b64(new Uint8Array(ct))
        };
        downloadBlob(new Blob([JSON.stringify(file, null, 2)], { type:"application/json" }), "我ai学习加密备份-"+dateStr(0)+".istudy");
        showToast("已导出加密备份，请牢记口令。");
      })
      .catch(function(e){ alert("加密失败：" + (e && e.message ? e.message : e)); });
  }
  function importEncryptedData(d){
    if(!d || d._type !== "istudy-backup-encrypted") return false;
    if(typeof crypto === "undefined" || !crypto.subtle){ showToast("当前浏览器不支持解密，请使用现代浏览器。"); return true; }
    var pass = prompt("请输入备份口令：");
    if(!pass) return true;
    pbkdf2Key(pass, unb64(d.salt), d.iter || IDB_ITER)
      .then(function(key){ return crypto.subtle.decrypt({ name:"AES-GCM", iv:unb64(d.iv) }, key, unb64(d.data)); })
      .then(function(pt){
        var data = JSON.parse(new TextDecoder().decode(pt));
        if(!data || data._type !== "kaoyan-workbench-v2"){ alert("解密成功但内容格式不正确。"); return; }
        S = sanitizeImport(data);
        saveAll();
        renderAll();
        showToast("加密备份导入成功！");
      })
      .catch(function(){ alert("解密失败：口令错误或文件已损坏。"); });
    return true;
  }

  $("btnExportEnc").addEventListener("click", exportEncrypted);
