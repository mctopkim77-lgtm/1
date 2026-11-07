/* ---- 단어 게임: 오늘의 퀘스트(간격 반복) + 단어 배틀(스피드 퀴즈) ---- */
var gv = null, gtimer = null, gwait = null;
var GQ = 20, GB = 10, GTIME = 6000, GXPLV = 200;
function gs(){ if(!state.g) state.g = {xp: 0, st: 0, last: 0, best: 0, qd: 0, n: 0}; return state.g; }
function glevel(xp){ return 1 + Math.floor(xp / GXPLV); }
function gstreak(){ var g = gs(), T = today(); return (g.last === T || g.last === T - 1) ? g.st : 0; }
function gstop(){ clearInterval(gtimer); clearTimeout(gwait); gtimer = gwait = null; }
function gshuf(a){ for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function gmark(){ var g = gs(), T = today(); if(g.last !== T){ g.st = (g.last === T - 1) ? g.st + 1 : 1; g.last = T; } }
function gxp(n){ var g = gs(); g.xp += n; }

function ghub(){
  var g = gs(), lv = glevel(g.xp), cur = g.xp % GXPLV, qd = g.qd === today();
  return '<div class="ghub"><div class="glv"><b>Lv.' + lv + '</b><div class="gbar"><i style="width:' + (cur / GXPLV * 100) + '%"></i></div><span>' + cur + '/' + GXPLV + '</span></div>'
    + '<p class="gstat">연속 <b>' + gstreak() + '</b>일 · 배틀 최고 <b>' + g.best + '</b>점 · 퀘스트 <b>' + g.n + '</b>회</p>'
    + '<div class="gbtns"><button type="button" class="gbig" data-g="quest">오늘의 퀘스트<small>' + (qd ? '완료 · 한 번 더 하기' : GQ + '단어 · 약 5분') + '</small></button>'
    + '<button type="button" class="gbig alt" data-g="battle">단어 배틀<small>' + GB + '문제 · 하트 3개</small></button></div></div>';
}

/* ---------- 퀘스트 ---------- */
function questPick(){
  var E = ws(), K = state.wk || {}, G = state.wg || {};
  var ids = wlist("due").slice(0, GQ);
  if(ids.length < GQ){
    var pool = [];
    WORDS.forEach(function(x, i){ if(!E[x[0]] && !K[x[0]] && !G[x[0]]) pool.push(i); });
    pool.sort(function(a, b){ return WORDS[b][3].length - WORDS[a][3].length || a - b; });
    ids = ids.concat(pool.slice(0, GQ - ids.length));
  }
  return ids;
}
function startQuest(){
  var ids = questPick();
  if(!ids.length){ gv = {t: "empty"}; renderGame(); return; }
  gv = {t: "quest", ids: ids, i: 0, rev: false, combo: 0, xp: 0, k: 0, h: 0, m: 0, bad: [], lv0: glevel(gs().xp), done: false};
  renderGame();
}
function gtopQ(v){
  return '<div class="gtop"><button type="button" class="gx" data-g="home" aria-label="그만하기">✕</button><span>' + (v.i + 1) + ' / ' + v.ids.length + '</span><span>콤보 ' + v.combo + '</span><span>+' + v.xp + ' XP</span></div>'
    + '<div class="gprog"><i style="width:' + (v.i / v.ids.length * 100) + '%"></i></div>';
}
function questHTML(){
  var v = gv, x = WORDS[v.ids[v.i]], e = ws()[x[0]];
  var h = gtopQ(v) + '<div class="gcard"><span class="gtag">' + (e ? '복습 단어' : '새 단어') + '</span><p class="gw">' + esc(x[0]) + '</p>';
  if(!v.rev){
    h += '<p class="ghint">뜻을 먼저 떠올려 보세요</p><div class="gtime"><i></i></div>'
      + '<button type="button" class="gshow" id="gshow" data-g="show" disabled>생각하는 중…</button>';
  } else {
    h += '<p class="gr">' + (x[1] ? esc(x[1]) : '—') + '</p><p class="gm">' + esc(x[2]) + '</p>'
      + '<div class="grate"><button type="button" class="wno" data-g="r0">몰랐다</button><button type="button" class="gmid" data-g="r1">헷갈렸다</button><button type="button" class="wyes" data-g="r2">알았다</button></div>';
  }
  return h + '</div>';
}
function questRate(r){
  var v = gv, i = v.ids[v.i], w = WORDS[i][0], T = today(), E = ws(), x = E[w], pts;
  if(x){
    if(r === 2){ x.s++; x.l = T; if(x.s >= WINT.length){ delete E[w]; if(!state.wg) state.wg = {}; state.wg[w] = 1; } }
    else if(r === 1){ x.s = Math.max(0, x.s - 1); x.t = T; x.l = T; }
    else { x.s = 0; x.t = T; x.l = T; }
  } else if(r === 2){
    if(!state.wk) state.wk = {}; state.wk[w] = 1;
  } else {
    E[w] = {t: T, s: 0, l: T};
    if(state.wg) delete state.wg[w];
  }
  if(r === 2){ v.combo++; v.k++; pts = 10 + Math.min(v.combo - 1, 4) * 2; }
  else if(r === 1){ v.combo = 0; v.h++; pts = 5; v.bad.push(i); }
  else { v.combo = 0; v.m++; pts = 2; v.bad.push(i); }
  v.xp += pts; gxp(pts);
  v.i++; v.rev = false;
  if(v.i >= v.ids.length){
    var g = gs(), T2 = today();
    v.bonus = (g.qd !== T2) ? 50 : 0;
    gxp(v.bonus); g.qd = T2; g.n++; gmark(); v.done = true;
  }
  save(); updateWNav();
}
function questEndHTML(){
  var v = gv, g = gs(), lv = glevel(g.xp), up = lv > v.lv0;
  var h = '<div class="gcard gend"><span class="gtag">퀘스트 완료</span><p class="gbigt">' + (v.k >= v.ids.length * 0.8 ? '아주 좋아요!' : '수고했어요!') + '</p>'
    + '<p class="gsum">알았다 <b>' + v.k + '</b> · 헷갈렸다 <b>' + v.h + '</b> · 몰랐다 <b>' + v.m + '</b></p>'
    + '<p class="gsum">XP <b>+' + (v.xp + v.bonus) + '</b>' + (v.bonus ? ' (완료 보너스 ' + v.bonus + ' 포함)' : '') + ' · 연속 <b>' + gstreak() + '</b>일</p>'
    + (up ? '<p class="gup">레벨 업! Lv.' + lv + '</p>' : '');
  if(v.bad.length){
    h += '<p class="gnote">틀리거나 헷갈린 ' + v.bad.length + '개는 내일 다시 나와요.</p><ul class="gbad">';
    v.bad.forEach(function(i){ var x = WORDS[i]; h += '<li><b>' + esc(x[0]) + '</b> ' + (x[1] ? '<span>' + esc(x[1]) + '</span> ' : '') + esc(x[2]) + '</li>'; });
    h += '</ul>';
  }
  return h + '<div class="grate"><button type="button" data-g="home">홈으로</button><button type="button" class="wyes" data-g="quest">한 번 더</button></div></div>';
}

/* ---------- 배틀 ---------- */
function battlePick(){
  var E = ws(), ids = wlist("due").slice(0, GB);
  if(ids.length < GB){
    wlist("unk").forEach(function(i){ if(ids.length < GB && ids.indexOf(i) < 0) ids.push(i); });
  }
  if(ids.length < GB){
    var rest = [];
    WORDS.forEach(function(x, i){ if(ids.indexOf(i) < 0) rest.push(i); });
    gshuf(rest);
    ids = ids.concat(rest.slice(0, GB - ids.length));
  }
  return gshuf(ids);
}
function battleOpts(i){
  var m = WORDS[i][2], L = m.length, cand = [], seen = {};
  seen[m] = 1;
  WORDS.forEach(function(x, j){ if(j !== i && !seen[x[2]]) cand.push([Math.abs(x[2].length - L) + Math.random() * 3, x[2]]); });
  cand.sort(function(a, b){ return a[0] - b[0]; });
  var opts = [m];
  for(var k = 0; k < cand.length && opts.length < 4; k++){ if(!seen[cand[k][1]]){ seen[cand[k][1]] = 1; opts.push(cand[k][1]); } }
  gshuf(opts);
  return {opts: opts, ans: opts.indexOf(m)};
}
function startBattle(){
  gv = {t: "battle", ids: battlePick(), i: 0, hearts: 3, score: 0, combo: 0, ok: 0, bad: [], lv0: glevel(gs().xp), done: false};
  battleNext(true);
}
function battleNext(first){
  var v = gv;
  if(!first) v.i++;
  if(v.hearts <= 0 || v.i >= v.ids.length){ battleEnd(); return; }
  var o = battleOpts(v.ids[v.i]);
  v.opts = o.opts; v.ans = o.ans; v.pick = -2; v.left = GTIME;
  renderGame();
}
function gtopB(v){
  var hs = ""; for(var k = 0; k < 3; k++) hs += k < v.hearts ? "♥" : "♡";
  return '<div class="gtop"><button type="button" class="gx" data-g="home" aria-label="그만하기">✕</button><span class="gheart">' + hs + '</span><span>콤보 ' + v.combo + '</span><span>' + v.score + '점</span></div>'
    + '<div class="gprog"><i style="width:' + (v.i / v.ids.length * 100) + '%"></i></div>';
}
function battleHTML(){
  var v = gv, x = WORDS[v.ids[v.i]], locked = v.pick !== -2;
  var h = gtopB(v) + '<div class="gcard"><span class="gtag">' + (v.i + 1) + ' / ' + v.ids.length + '</span><p class="gw">' + esc(x[0]) + '</p>'
    + (locked ? '<p class="gr">' + (x[1] ? esc(x[1]) : '—') + '</p>' : '<p class="gr">&nbsp;</p>')
    + '<div class="gtimer"><i id="gbar"></i></div><div class="gopts">';
  v.opts.forEach(function(t, k){
    var c = "gopt";
    if(locked){ if(k === v.ans) c += " ok"; else if(k === v.pick) c += " bad"; }
    h += '<button type="button" class="' + c + '" data-g="o' + k + '"' + (locked ? ' disabled' : '') + '>' + esc(t) + '</button>';
  });
  h += '</div>';
  if(locked) h += '<p class="gfb ' + (v.pick === v.ans ? 'ok' : 'bad') + '">' + (v.pick === v.ans ? '정답!' : (v.pick === -1 ? '시간 초과' : '아쉬워요')) + '</p>';
  return h + '</div>';
}
function battleTick(){
  var v = gv, bar = document.getElementById("gbar");
  if(!v || v.t !== "battle" || cur !== -1 || !bar || v.pick !== -2){ gstop(); if(cur !== -1) gv = null; return; }
  v.left -= 100;
  bar.style.width = Math.max(0, v.left / GTIME * 100) + "%";
  if(v.left <= 3000) bar.classList.add("low");
  if(v.left <= 0) battleAnswer(-1);
}
function battleAnswer(k){
  var v = gv; if(!v || v.pick !== -2) return;
  gstop();
  var i = v.ids[v.i], w = WORDS[i][0], T = today(), E = ws();
  v.pick = k;
  if(k === v.ans){
    v.combo++; v.ok++;
    var pts = 10 + Math.min(v.combo - 1, 4) * 5;
    v.score += pts; gxp(pts);
  } else {
    v.hearts--; v.combo = 0; v.bad.push(i);
    if(!E[w]){ E[w] = {t: T, s: 0, l: T}; if(state.wg) delete state.wg[w]; }
  }
  save(); updateWNav();
  renderGame();
  gwait = setTimeout(function(){ if(gv === v && cur === -1) battleNext(false); }, k === v.ans ? 700 : 1600);
}
function battleEnd(){
  var v = gv, g = gs();
  v.bonus = (v.hearts > 0 && v.ok === v.ids.length) ? 20 : 0;
  if(v.bonus){ v.score += v.bonus; gxp(v.bonus); }
  v.newBest = v.score > g.best;
  if(v.newBest) g.best = v.score;
  gmark(); v.done = true;
  save(); updateWNav();
  renderGame();
}
function battleEndHTML(){
  var v = gv, g = gs(), lv = glevel(g.xp), up = lv > v.lv0;
  var h = '<div class="gcard gend"><span class="gtag">' + (v.hearts > 0 ? '배틀 클리어' : '게임 오버') + '</span><p class="gbigt">' + v.score + '점</p>'
    + '<p class="gsum">맞힌 문제 <b>' + v.ok + '</b> / ' + v.ids.length + (v.bonus ? ' · 올 클리어 보너스 ' + v.bonus : '') + '</p>'
    + (v.newBest ? '<p class="gup">최고 기록!</p>' : '<p class="gsum">최고 기록 <b>' + g.best + '</b>점</p>')
    + (up ? '<p class="gup">레벨 업! Lv.' + lv + '</p>' : '');
  if(v.bad.length){
    h += '<p class="gnote">틀린 ' + v.bad.length + '개는 단어 복습에 들어갔어요.</p><ul class="gbad">';
    v.bad.forEach(function(i){ var x = WORDS[i]; h += '<li><b>' + esc(x[0]) + '</b> ' + (x[1] ? '<span>' + esc(x[1]) + '</span> ' : '') + esc(x[2]) + '</li>'; });
    h += '</ul>';
  }
  return h + '<div class="grate"><button type="button" data-g="home">홈으로</button><button type="button" class="wyes" data-g="battle">다시 도전</button></div></div>';
}

/* ---------- 공통 ---------- */
function renderGame(){
  var v = gv, h = "";
  gstop();
  if(v.t === "empty") h = '<div class="gcard gend"><p class="gbigt">오늘 할 단어가 없어요</p><p class="gnote">모든 단어를 이미 알고 있어요. 배틀로 실력을 확인해 보세요.</p><div class="grate"><button type="button" data-g="home">홈으로</button><button type="button" class="wyes" data-g="battle">단어 배틀</button></div></div>';
  else if(v.t === "quest") h = v.done ? questEndHTML() : questHTML();
  else h = v.done ? battleEndHTML() : battleHTML();
  document.getElementById("panel").innerHTML = '<div class="gwrap">' + h + '</div>';
  if(v.t === "quest" && !v.done && !v.rev){
    gwait = setTimeout(function(){
      var b = document.getElementById("gshow");
      if(b){ b.disabled = false; b.textContent = "정답 보기"; }
    }, 2000);
  } else if(v.t === "battle" && !v.done && v.pick === -2){
    gtimer = setInterval(battleTick, 100);
  }
  var r = document.getElementById("panel").getBoundingClientRect();
  if(r.top > 160 || r.top < 0) window.scrollTo(0, Math.max(0, window.scrollY + r.top - 12));
}
function gameClick(e){
  var b = e.target.closest("[data-g]");
  if(!gv){ if(!b) return false; gameStart(b.dataset.g); return true; }
  if(!b) return true;
  var k = b.dataset.g;
  if(k === "home"){ gstop(); gv = null; wmode = null; renderWords(); return true; }
  if(k === "quest" || k === "battle"){ gameStart(k); return true; }
  if(gv.t === "quest"){
    if(k === "show" && !b.disabled){ gv.rev = true; renderGame(); }
    else if(/^r[012]$/.test(k) && gv.rev){ questRate(+k.charAt(1)); renderGame(); }
  } else if(gv.t === "battle" && /^o[0-3]$/.test(k)){
    battleAnswer(+k.charAt(1));
  }
  return true;
}
function gameStart(k){ if(k === "quest") startQuest(); else if(k === "battle") startBattle(); }
