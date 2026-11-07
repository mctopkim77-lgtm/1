
/* ---- 기기 옮기기: 기록 복사 / 붙여넣기 ---- */
var SYNC_PRE = "JPT1.";
function syncEncode(){
  var o = {t: Date.now(), s: state};
  return SYNC_PRE + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
function syncDecode(txt){
  txt = (txt || "").replace(/\s+/g, "");
  var i = txt.indexOf(SYNC_PRE); if(i < 0) return null;
  try{
    var o = JSON.parse(decodeURIComponent(escape(atob(txt.slice(i + SYNC_PRE.length)))));
    if(!o || !o.s || typeof o.s.done !== "object" || typeof o.s.wrong !== "object") return null;
    return o;
  }catch(e){ return null; }
}
function syncSummary(s){
  var g = s.g || {};
  return "완료 체크 " + Object.keys(s.done || {}).length + "개 · 오답 " + Object.keys(s.wrong || {}).length + "개 · 모르는 단어 " + Object.keys(s.words || {}).length + "개 · 레벨 " + (1 + Math.floor((g.xp || 0) / 200));
}
(function(){
  var box = document.getElementById("sync"); if(!box) return;
  var ta = document.getElementById("synccode"), msg = document.getElementById("syncmsg"), armed = null;
  function say(t, bad){ msg.textContent = t; msg.className = "syncmsg" + (bad ? " bad" : ""); }
  box.addEventListener("click", function(e){
    var b = e.target.closest("button"); if(!b) return;
    if(b.id === "syncout"){
      armed = null; document.getElementById("syncin").textContent = "붙여넣은 기록 불러오기";
      ta.value = syncEncode(); ta.focus(); ta.select();
      var done = function(){ say("복사했어요. 다른 기기에서 ‘붙여넣은 기록 불러오기’를 누르세요. (" + syncSummary(state) + ")"); };
      var fail = function(){ say("자동 복사가 막혀 있어요. 위 칸의 글자를 길게 눌러 ‘복사’를 누르세요."); };
      try{
        if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function(){ try{ document.execCommand("copy") ? done() : fail(); }catch(x){ fail(); } });
        else { document.execCommand("copy") ? done() : fail(); }
      }catch(x){ fail(); }
    } else if(b.id === "syncin"){
      var o = syncDecode(ta.value);
      if(!o){ armed = null; b.textContent = "붙여넣은 기록 불러오기"; say("위 칸에 복사한 기록 코드를 붙여넣은 뒤 다시 눌러 주세요. (JPT1.으로 시작하는 글자)", true); return; }
      if(armed !== ta.value){
        armed = ta.value; b.textContent = "정말 덮어쓸까요? 한 번 더 누르세요";
        var d = new Date(o.t);
        say("가져올 기록(" + (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + " 저장): " + syncSummary(o.s) + ". 지금 기기의 기록은 이 내용으로 바뀝니다.");
        return;
      }
      state = o.s; if(!state.done) state.done = {}; if(!state.wrong) state.wrong = {};
      save(); armed = null; b.textContent = "붙여넣은 기록 불러오기"; ta.value = "";
      say("불러왔어요. 화면을 다시 불러옵니다.");
      setTimeout(function(){ location.reload(); }, 400);
    }
  });
})();
