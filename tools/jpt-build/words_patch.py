"""Adds the 단어 (word card) tab. Needs words.json from build3.py.
Usage: python3 -I words_patch.py out.html"""
import sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()
D = open('words.json', encoding='utf8').read().strip()
css = open('words_ui.css', encoding='utf8').read() + open('words_game.css', encoding='utf8').read()
js = open('words_ui.js', encoding='utf8').read() + '\n' + open('words_game.js', encoding='utf8').read() + '\n' + open('words_sync.js', encoding='utf8').read()

def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (old[:70], s.count(old))
    s = s.replace(old, new)

import json
data = json.loads(D)
rep('</style>', css + '</style>')
rep('<div class="reset">', '<div class="sync" id="sync"><h3>기기 옮기기 (PC ↔ 폰)</h3><p>기록은 기기마다 따로 저장돼요. 옮기려면 한쪽에서 ‘기록 복사’, 다른 쪽에서 코드를 아래 칸에 붙여넣고 ‘불러오기’를 누르세요.</p><textarea id="synccode" aria-label="기록 코드" placeholder="여기에 기록 코드(JPT1.…)를 붙여넣기" spellcheck="false"></textarea><div class="syncbtns"><button type="button" id="syncout">기록 복사</button><button type="button" id="syncin">붙여넣은 기록 불러오기</button></div><p class="syncmsg" id="syncmsg" aria-live="polite"></p></div>\n  <div class="reset">')
rep('var DEFAULT_TASKS', 'var WORDS = %s;\nvar QW = %s;\n\nvar DEFAULT_TASKS' % (
    json.dumps(data['words'], ensure_ascii=False, separators=(',', ':')),
    json.dumps(data['qw'], separators=(',', ':'))))
# nav button
rep('  var box = document.getElementById("days");\n  box.innerHTML = h;',
    '''  h += '<button type="button" class="dbtn'+(cur===-1?' cur':'')+'" role="tab" aria-selected="'+(cur===-1)+'" data-day="-1" aria-label="단어 카드"><b>단어</b><i id="wdcnt"></i></button>';
  var box = document.getElementById("days");
  box.innerHTML = h;
  updateWNav();''')
rep('if(n<0||n>DAYS.length) return;', 'if(n<-1||n>DAYS.length) return;')
rep('var hs = n===0 ? "#review" : "#day-"+n;', 'var hs = n===-1 ? "#words" : n===0 ? "#review" : "#day-"+n;')
rep('renderNav(); if(n===0) renderReview(); else renderPanel();', 'renderNav(); renderCur();')
rep('renderNav(); renderProgress(); if(cur===0) renderReview(); else renderPanel();', 'renderNav(); renderProgress(); renderCur();', 2)
rep('function go(n, scroll){', 'function renderCur(){ if(cur!==-1 && gv){ gstop(); gv=null; } if(cur===-1) renderWords(); else if(cur===0) renderReview(); else renderPanel(); }\nfunction go(n, scroll){')
rep('  if(location.hash === "#review") return 0;', '  if(location.hash === "#review") return 0;\n  if(location.hash === "#words") return -1;')
rep('  var t = e.target;\n  if(t.closest("#hidebtn")){', '  if(cur === -1){ wordsClick(e); return; }\n  var t = e.target;\n  if(t.closest("#hidebtn")){')
rep('if(pick===q.a) delete state.wrong[wk]; else state.wrong[wk] = 1;',
    'if(pick===q.a) delete state.wrong[wk]; else state.wrong[wk] = 1;\n    var addedW = (pick===q.a) ? 0 : autoCollect(wk);')
rep('+ q.e + (q.x || "");', '+ q.e + (addedW ? \'<p class="tip">단어 \' + addedW + \'개를 ‘단어’ 탭의 모르는 단어에 넣었어요.</p>\' : "") + (q.x || "");')
# word helpers go right before the first use (after esc/renderNav helpers are defined, plain function declarations are hoisted)
rep('var resetArmed = false;', js + '\nvar resetArmed = false;')
open(p, 'w', encoding='utf8').write(s)
print('words patch ok')
