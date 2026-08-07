  // ---------- 可访问性：弹窗焦点陷阱 + 键盘导航 ----------
  var _trapEl = null;
  function updateFocusTrap(){
    var ov = document.querySelector('.ovl.on') || document.querySelector('.overlay:not(.hidden)');
    if(ov){
      _trapEl = ov;
      var f = ov.querySelector('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if(f && !ov.contains(document.activeElement)){ try{ f.focus({ preventScroll:true }); }catch(e){} }
    } else {
      _trapEl = null;
    }
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Tab' && _trapEl){
      var els = _trapEl.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if(els.length){
        var first = els[0], last = els[els.length-1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }
    // 键盘展开折叠项（回车/空格）
    if(e.key === 'Enter' || e.key === ' '){
      var t = e.target && e.target.closest ? e.target.closest('.kp-row[data-toggle], .kpnav-item.acc, .cal-cell[data-date]') : null;
      if(t){ e.preventDefault(); t.click(); }
    }
  });
