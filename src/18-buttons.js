// ---------- 反馈 ----------
  function showToast(msg){
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(showToast._t); showToast._t = setTimeout(function(){ t.classList.remove("show"); }, 1800);
  }
  function pawPop(){
    var p = document.createElement("div");
    p.className="paw-float";
    p.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" fill="#FF3B6B" opacity=".85"><circle cx="12" cy="15" r="4.5"/><circle cx="5" cy="9" r="2.5"/><circle cx="19" cy="9" r="2.5"/><circle cx="8" cy="4.5" r="2.2"/><circle cx="16" cy="4.5" r="2.2"/></svg>';
    p.style.left = (Math.random()*60+20)+"vw";
    p.style.top = (window.innerHeight*0.5)+"px";
    p.style.transform = "translateY(0) scale(1)";
    document.body.appendChild(p);
    setTimeout(function(){ p.style.opacity = "0"; p.style.transform = "translateY(-160px) scale(1.4) rotate(20deg)"; }, 10);
    setTimeout(function(){ p.remove(); }, 900);
  }
