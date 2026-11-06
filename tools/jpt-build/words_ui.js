/* ---- 단어 탭: 카드, 가리기, 모르는 단어 자동 수집, 1·3·7일 복습 ---- */
var WINT = [1, 3, 7];
var wmode = null, wshown = 40, wday = 0;
function today(){ return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
function ws(){ if(!state.words) state.words = {}; return state.words; }
function wdue(e){ return e.t + WINT[e.s]; }
function wlist(kind){
  var T = today(), E = ws(), out = [];
  WORDS.forEach(function(x, i){
    var e = E[x[0]];
    if(kind === "due" && e && wdue(e) <= T && e.l !== T) out.push(i);
    else if(kind === "unk" && e) out.push(i);
    else if(kind === "all" && (!wday || x[3].indexOf(wday) >= 0)) out.push(i);
  });
  if(kind !== "all") out.sort(function(a, b){ return wdue(E[WORDS[a][0]]) - wdue(E[WORDS[b][0]]) || a - b; });
  return out;
}
function updateWNav(){
  var el = document.getElementById("wdcnt"); if(!el) return;
  var d = wlist("due").length, u = wlist("unk").length;
  el.textContent = d ? "복습 " + d : u + "개";
}
function autoCollect(wk){
  var ids = QW[wk] || [], n = 0, T = today(), E = ws();
  ids.forEach(function(i){
    var w = WORDS[i][0];
    if(!E[w]){ E[w] = {t: T, s: 0}; n++; if(state.wg) delete state.wg[w]; }
  });
  if(n){ save(); updateWNav(); }
  return n;
}
function whead(){
  var d = wlist("due").length, u = wlist("unk").length, g = Object.keys(state.wg || {}).length;
  function b(k, t){ return '<button type="button" class="tog" data-wm="' + k + '" aria-pressed="' + (wmode === k) + '">' + t + '</button>'; }
  return '<p class="wstat">모르는 단어 <b>' + u + '</b> · 오늘 복습 <b>' + d + '</b> · 졸업 <b>' + g + '</b></p>'
    + '<div class="wmodes">' + b("due", "오늘 복습<br>" + d) + b("unk", "모르는 단어<br>" + u) + b("all", "전체<br>" + WORDS.length) + '</div>';
}
function wcard(i){
  var x = WORDS[i], e = ws()[x[0]], T = today();
  var hr = state.wr !== false, hm = state.wm !== false;
  var badge = "";
  if(e){ var dd = wdue(e) - T; badge = '<em>' + (dd <= 0 ? '복습 차례' : dd + '일 뒤 복습') + ' · ' + (e.s + 1) + '/3단계</em>'; }
  var days = x[3].map(function(n){ return '<a href="#day-' + n + '">' + n + '</a>'; }).join(" ");
  return '<div class="wc' + (e ? ' unk' : '') + '" data-i="' + i + '"><p class="ww">' + esc(x[0]) + '</p>'
    + '<p class="wr' + (hr ? ' wh' : '') + '">' + (x[1] ? esc(x[1]) : '—') + '</p>'
    + '<p class="wm' + (hm ? ' wh' : '') + '">' + esc(x[2]) + '</p>'
    + '<p class="wd">나온 일차' + days + badge + '</p>'
    + '<div class="wbtn"><button type="button" class="wno" data-a="no">몰라요</button><button type="button" class="wyes" data-a="yes">알아요</button></div></div>';
}
function renderWList(){
  var ids = wlist(wmode), h = "";
  if(!ids.length){
    h = '<p class="hint" style="margin-top:14px">' + (wmode === "due"
      ? '오늘 복습할 단어가 없어요. 퀴즈에서 틀리거나 카드에서 ‘몰라요’를 누르면 1·3·7일 뒤에 여기로 돌아옵니다.'
      : wmode === "unk" ? '아직 모르는 단어가 없어요. 퀴즈에서 틀리면 그 문제의 단어가 자동으로 모입니다.' : '해당 일차에 단어가 없어요.') + '</p>';
  } else {
    ids.slice(0, wshown).forEach(function(i){ h += wcard(i); });
    if(ids.length > wshown) h += '<button type="button" class="wmore" id="wmore">더 보기 (' + (ids.length - wshown) + '개 남음)</button>';
  }
  document.getElementById("wlist").innerHTML = h;
}
function renderWords(){
  if(wmode === null) wmode = wlist("due").length ? "due" : wlist("unk").length ? "unk" : "all";
  var h = '<section class="dhead"><span class="tag">단어</span><span class="min">한자 · 읽기 · 뜻</span><h2>단어 카드</h2>'
    + '<p class="goal">퀴즈에서 틀린 문제의 단어는 자동으로 모아져요. 모르는 단어는 1일·3일·7일 뒤에 다시 보여 줍니다.</p></section>'
    + '<div id="whead">' + whead() + '</div>'
    + '<div class="wtools"><button type="button" class="tog" id="wtr" aria-pressed="' + (state.wr !== false) + '">읽기 가리기</button>'
    + '<button type="button" class="tog" id="wtm" aria-pressed="' + (state.wm !== false) + '">뜻 가리기</button>';
  var ds = {}; WORDS.forEach(function(x){ x[3].forEach(function(n){ ds[n] = 1; }); });
  h += '<select id="wday" aria-label="일차 고르기"><option value="0">전체 일차</option>';
  Object.keys(ds).map(Number).sort(function(a, b){ return a - b; }).forEach(function(n){ h += '<option value="' + n + '"' + (wday === n ? ' selected' : '') + '>' + n + '일차 단어</option>'; });
  h += '</select></div><p class="hint">가린 칸이나 큰 글자를 탭하면 보여요.</p><div id="wlist"></div>';
  document.getElementById("panel").innerHTML = h;
  renderWList();
}
function wordsClick(e){
  var t = e.target, el;
  if((el = t.closest("[data-wm]"))){ wmode = el.dataset.wm; wshown = 40; renderWords(); return; }
  if(t.closest("#wtr")){ state.wr = (state.wr === false); save(); renderWords(); return; }
  if(t.closest("#wtm")){ state.wm = (state.wm === false); save(); renderWords(); return; }
  if(t.closest("#wmore")){ wshown += 40; renderWList(); return; }
  var card = t.closest(".wc"); if(!card) return;
  var i = +card.dataset.i;
  if((el = t.closest("[data-a]"))){
    var w = WORDS[i][0], T = today(), E = ws(), x = E[w], gone = false;
    if(wmode === "due" && x){
      if(el.dataset.a === "yes"){
        x.s++; x.l = T;
        if(x.s >= WINT.length){ delete E[w]; if(!state.wg) state.wg = {}; state.wg[w] = 1; }
      } else { x.t = T; x.s = 0; x.l = T; }
      gone = true;
    } else if(el.dataset.a === "no"){
      if(!x){ E[w] = {t: T, s: 0}; if(state.wg) delete state.wg[w]; }
    } else if(x){ delete E[w]; gone = (wmode === "unk"); }
    save(); updateWNav();
    document.getElementById("whead").innerHTML = whead();
    if(gone){ card.remove(); if(!document.querySelector("#wlist .wc")) renderWList(); }
    else card.outerHTML = wcard(i);
    return;
  }
  if(t.closest(".ww")){ card.querySelectorAll(".wr,.wm").forEach(function(p){ p.classList.add("shown"); }); return; }
  if((el = t.closest(".wr,.wm"))) el.classList.toggle("shown");
}
document.getElementById("panel").addEventListener("change", function(e){
  if(e.target.id === "wday"){ wday = +e.target.value; wshown = 40; renderWList(); }
});
