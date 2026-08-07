/* 移动端：禁用双击缩放（避免按钮误触放大），但放行双指捏合缩放（无障碍 WCAG 1.4.4） */
(function(){
  'use strict';
  var lastTouchEnd=0;
  document.addEventListener('touchend',function(e){var n=Date.now();if(n-lastTouchEnd<=300)e.preventDefault();lastTouchEnd=n;},{passive:false});
  var sx=0,sy=0;
  document.addEventListener('touchstart',function(e){if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY;}},{passive:true});
  document.addEventListener('touchmove',function(e){
    if(e.touches.length!==1) return; // 多指捏合缩放放行
    var t=e.target; if(t&&t.closest&&t.closest('.allow-x'))return;
    var dx=Math.abs(e.touches[0].clientX-sx), dy=Math.abs(e.touches[0].clientY-sy);
    if(dx>dy&&dx>8)e.preventDefault();
  },{passive:false});

  /* 纵向橡皮筋兜底：兼容不支持 overscroll-behavior 的旧版微信 WebView。
     仅在 .wrap 已到顶/底、且继续朝同方向拖拽时拦截，中段滚动不受影响。 */
  var scroller = document.querySelector('.wrap');
  if(scroller){
    var _ly = 0;
    scroller.addEventListener('touchstart', function(e){ if(e.touches.length===1) _ly = e.touches[0].clientY; }, { passive:true });
    scroller.addEventListener('touchmove', function(e){
      if(e.touches.length!==1) return;
      var t = e.target;
      if(t && t.closest && (t.closest('.allow-y') || t.closest('.allow-x'))) return;
      var max = scroller.scrollHeight - scroller.clientHeight;
      if(max <= 0){ e.preventDefault(); return; }
      var y = e.touches[0].clientY;
      var atTop = scroller.scrollTop <= 0;
      var atBottom = scroller.scrollTop >= max - 1;
      var movingDown = y > _ly;   // 手指下滑 → 看顶部
      var movingUp   = y < _ly;
      if((atTop && movingDown) || (atBottom && movingUp)) e.preventDefault();
      _ly = y;
    }, { passive:false });
  }
})();
