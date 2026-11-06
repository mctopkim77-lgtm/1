import json, os, re, sys
sys.argv = ['furi.py', 'x', 'ov.json']
sys.path.insert(0, '.')
import furi, lemmas as LM
from trdata import TR, PTR, OPTKR
TR.update(json.load(open('tr_extra.json', encoding='utf8')))
PTR.update(json.load(open('ptr_extra.json', encoding='utf8')))
OPTKR.update(json.load(open('optkr_extra.json', encoding='utf8')))
try:
    from optgl import OPTGL
except Exception:
    OPTGL = {}

days = json.load(open('days_new2.json', encoding='utf8'))
auto = json.load(open('lemmas.json', encoding='utf8'))

# glossary
GLOSS = {}
for line in open('gloss.txt', encoding='utf8'):
    line = line.rstrip('\n')
    if not line or '=' not in line: continue
    k, m = line.split('=', 1)
    rd = None
    if '|' in k: k, rd = k.split('|', 1)
    GLOSS[k] = (rd or auto.get(k) or '', m)

# cards -> option meanings
def cores(p):
    out = []
    p = re.sub(r'\s*[(（][^)）]*[)）]', '', p)
    for alt in re.split(r'\s*/\s*|・', p):
        alt = alt.strip()
        if not alt: continue
        if alt.startswith('~'): c = alt[1:]
        else: c = alt.split('~')[0]
        c = c.strip()
        if c: out.append(c)
    return out
CARDMAP = {}
for d in days:
    for c in d['cards']:
        if d['n'] in (24, 25, 26): continue
        for k in cores(c['p']):
            CARDMAP.setdefault(k, (c['m'], c.get('tip', '')))
READING = {}
for c in days[23]['cards']:
    m = re.match(r'(.+?)（(.+?)）', c['p'])
    if m: READING[m.group(2)] = (m.group(1), c['m'])

def strip_tags(s): return re.sub(r'</?u>', '', s)

P5TAGS = ('읽는 법', '표기', '같은 뜻', '같은 용법')
def opt_meaning(opt, day, correct, q=None):
    o = strip_tags(opt)
    tag = (q or {}).get('tag')
    if tag == '읽는 법':
        if not correct: return ''
        return q.get('note') or ('%s — %s' % READING[o] if o in READING else '')
    if tag == '표기':
        if correct and q.get('note'): return q['note']
        if o in GLOSS: return GLOSS[o][1]
        if o in OPTGL: return OPTGL[o]
        return '(일반적으로 쓰지 않는 표기)' if furi.HAS_KANJI.search(o) else '(올바르지 않은 표기)'
    if o in OPTGL: return OPTGL[o]
    if o in OPTKR: return OPTKR[o]
    if o in CARDMAP: return CARDMAP[o][0]
    if o in GLOSS: return GLOSS[o][1]
    if day == 25 and furi.HAS_KANJI.search(o): return '(일반적으로 쓰지 않는 표기)'
    return None

unmatched = {}
USED = {}   # word -> set of day numbers
QW = {}     # 'day-idx' -> main words of that question

def word_items(text):
    text = strip_tags(text)
    text = re.sub(r'^下の[^。]*。\\n', '', text.replace('\n', '\\n'))
    seen, out = set(), []
    for lem, rd in LM.lemmas(text):
        if lem in seen or lem not in GLOSS: continue
        seen.add(lem)
        out.append(lem)
    return out

def ruby_word(lem):
    rd, m = GLOSS[lem]
    if furi.HAS_KANJI.search(lem) and rd:
        return furi.ruby_token(lem, rd)
    return lem

def build_x(d, i, q):
    n = d['n']
    key = '%d.%d' % (n, i)
    ef = '(B)' in q['q']
    parts = []
    ctx = q.get('ctx')
    if ctx:
        for k, v in PTR.items():
            if ctx.startswith(k):
                parts.append('<h5>지문 해석</h5><p>%s</p>' % v); break
    t = TR.get(key)
    if t:
        parts.append('<h5>%s</h5><p>%s</p>' % ('문제 해석' if ctx else '해석', t))
    if not ef:
        lis = []
        for j, o in enumerate(q['opts']):
            mean = opt_meaning(o, n, j == q['a'], q)
            if mean is None:
                unmatched.setdefault(strip_tags(o), []).append(key); mean = ''
            mark = '✓ ' if j == q['a'] else ''
            jp = furi.annotate(o) if (furi.HAS_KANJI.search(o) and q.get('tag') not in P5TAGS) else o
            li = '<li class="%s"><b>(%s)</b> %s%s</li>' % ('ok' if j == q['a'] else '', 'ABCD'[j], mark + jp, (' — ' + mean) if mean else '')
            lis.append(li)
        parts.append('<h5>보기 뜻</h5><ul>%s</ul>' % ''.join(lis))
    # words
    texts = [q['q']] + ([] if ctx else []) + q['opts']
    words = []
    for tx in texts:
        for w in word_items(tx):
            if w not in words: words.append(w)
    if words:
        parts.append('<h5>단어</h5><ul class="wl">%s</ul>' % ''.join('<li><span class="jw">%s</span> %s</li>' % (ruby_word(w), GLOSS[w][1]) for w in words))
    QW['%d-%d' % (n, i)] = list(words)
    for w in words: USED.setdefault(w, set()).add(n)
    if ctx:
        cw = []
        for w in word_items(ctx):
            if w not in words and w not in cw: cw.append(w)
        for w in cw: USED.setdefault(w, set()).add(n)
        if cw:
            parts.append('<details class="wd"><summary>지문 단어</summary><ul class="wl">%s</ul></details>' % ''.join('<li><span class="jw">%s</span> %s</li>' % (ruby_word(w), GLOSS[w][1]) for w in cw))
    # memory point from card of correct option
    if not ef and q.get('tag') not in P5TAGS:
        c = strip_tags(q['opts'][q['a']])
        if c in CARDMAP and CARDMAP[c][1]:
            parts.append('<h5>기억 포인트</h5><p>%s</p>' % furi.annotate(CARDMAP[c][1]))
    return '<div class="xt">%s</div>' % ''.join(parts)

NORUBY_Q = {24, 25, 26}
def skip_p(v): return re.search('（[ぁ-ん]+）', v) is not None
def ann(v): return furi.annotate(v) if furi.HAS_KANJI.search(v) else v

for d in days:
    for q in d['quiz']:
        if q['q'].startswith('下の') and '\n' in q['q'] and not q.get('inst'):
            first, rest = q['q'].split('\n', 1)
            q['inst'], q['q'] = first, rest
# build x from plain data first
for d in days:
    for i, q in enumerate(d['quiz']):
        q['x'] = build_x(d, i, q)

# ---- word-card data (for the 단어 tab) ----
WL = {}
for w, ds in USED.items():
    WL[w] = [GLOSS[w][0], GLOSS[w][1], set(ds)]
for d in days:
    for c in d['cards']:
        m = re.fullmatch(r'([^（]+)（([ぁ-ん]+)）', strip_tags(c['p']).strip())
        if m and furi.HAS_KANJI.search(m.group(1)):
            w = m.group(1)
            if w in WL: WL[w][2].add(d['n'])
            else: WL[w] = [m.group(2), c['m'], {d['n']}]
order = sorted(WL, key=lambda w: (min(WL[w][2]), w))
idx = {w: i for i, w in enumerate(order)}
json.dump({'words': [[w, WL[w][0], WL[w][1], sorted(WL[w][2])] for w in order],
           'qw': {k: [idx[w] for w in v if w in idx] for k, v in QW.items() if v}},
          open('words.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('word cards:', len(order), 'without reading:', [w for w in order if not WL[w][0]])
print('unmatched options:', len(unmatched), json.dumps(unmatched, ensure_ascii=False))
json.dump(days, open('days_new3.json', 'w', encoding='utf8'), ensure_ascii=False)

for d in days:
    for c in d['cards']:
        for k in ('p', 'm', 'ex', 'tip'):
            if k in c:
                if k == 'p' and (skip_p(c[k]) or d['n'] in NORUBY_Q): continue
                c[k] = ann(c[k])
    for q in d['quiz']:
        if q.get('tag') in P5TAGS:
            q['e'] = ann(q['e']); continue
        for k in ('q', 'ctx', 'e', 'inst'):
            if k in q: q[k] = ann(q[k])
        q['opts'] = [ann(o) for o in q['opts']]

path = os.environ.get('JPT_OUT', 'out.html')
src = open(path, encoding='utf8').read()
a = src.index('var DAYS = [')
b = src.index('var DEFAULT_TASKS')
src = src[:a] + 'var DAYS = ' + json.dumps(days, ensure_ascii=False, indent=1) + ';\n\n' + src[b:]

def rep(old, new):
    global src
    assert src.count(old) == 1, (old[:60], src.count(old))
    src = src.replace(old, new)

rep('ex.innerHTML = (pick===q.a ? "<b>정답!</b> " : "<b>오답.</b> ") + q.e;',
    'ex.innerHTML = (pick===q.a ? "<b>정답!</b> " : "<b>오답.</b> ") + q.e + (q.x || "");')
rep(".ol{font-family", """.xt{margin-top:10px;padding-top:6px;border-top:1px solid var(--line)}
.xt h5{margin:12px 0 4px;font-size:12px;letter-spacing:.04em;color:var(--muted);font-weight:700}
.xt p{margin:0;font-size:13.5px;line-height:1.7}
.xt ul{margin:0;padding:0;list-style:none;display:grid;gap:5px}
.xt li{font-size:13.5px;line-height:1.9;font-family:var(--f-jp)}
.xt li.ok{color:var(--ok);font-weight:700}
.xt .jw{font-weight:700;font-family:var(--f-jp);margin-right:.35em}
.xt .wl li{display:block}
.xt details{margin-top:12px}
.xt summary{cursor:pointer;font-size:12.5px;color:var(--accent);font-weight:700}
.ol{font-family""")

rep("""  var h = '<div class="q" data-qi="'+i+'" data-day="'+dn+'"><p class="qn">'+label+'</p>';
  if(q.ctx) h += '<p class="ctx">'+q.ctx+'</p>';
  h += '<p class="qt">'+String(q.q).replace(/\\n/g,"<br>")+'</p><div class="opts">';""",
"""  var h = '<div class="q" data-qi="'+i+'" data-day="'+dn+'"><p class="qn">'+label+(q.tag ? ' · '+q.tag : '')+'</p>';
  var qs = String(q.q), inst = q.inst || '', mm = /^(下の[^\\n]*)\\n/.exec(qs);
  if(mm){ inst = mm[1]; qs = qs.slice(mm[0].length); }
  if(inst) h += '<p class="inst">'+inst+'</p>';
  if(q.ctx) h += '<p class="ctx">'+q.ctx+'</p>';
  h += '<p class="qt">'+qs.replace(/\\n/g,"<br>")+'</p><div class="opts">';""")
rep(".ol{font-family", ".inst{margin:0 0 8px;font-family:var(--f-jp);font-size:12.5px;line-height:1.8;color:var(--muted)}\n.ol{font-family")
rep('<li><span>Part 5</span>24~26일 정답 찾기(한자 읽기·표기·같은 뜻·용법), 27일 공란 메우기 고급 문법</li>',
    '<li><span>Part 5</span>24~26일 정답 찾기(한자 읽기·표기·같은 뜻·용법)</li>\n        <li><span>Part 7</span>27일 고급 문법, 28일 활용형·의태어 (실제 기출은 이 코스보다 어휘 수준이 높습니다)</li>')
rep('["수","오답 유형별 보강","어휘·문법 카드 재암기"]',
    '["수","<a href=\\"#day-27\\">27일차</a>·<a href=\\"#day-28\\">28일차</a> 고급 문법·활용형","오답 유형별 보강, 카드 재암기"]')
rep('<details class="ov">\n      <summary>2주 전체 일정 보기</summary>', """<details class="ov">
      <summary>실제 시험 구조와 이 코스의 대응</summary>
      <ul>
        <li><span>독해 전체</span>100문항 · 50분 (문항당 약 30초)</li>
        <li><span>Part 5</span>정답 찾기 20문항: 한자 읽기·표기, 같은 뜻, 용법 → 24~26, 31, 32일차와 각 일차 1~3번</li>
        <li><span>Part 6</span>오문 정정 20문항: 조사·자타동사·가타카나·문법표현 오용 → 8, 20, 29~31일차와 각 일차 4~6번</li>
        <li><span>Part 7</span>공란 메우기 30문항: 문법·어휘·접속사·부사·의태어·관용표현·조수사 → 1~7, 9~11, 15, 17~19, 27, 28, 32일차</li>
        <li><span>Part 8</span>독해 30문항: 지문 하나에 3~4문제(인물 소개·일상·설명문) → 12, 13, 16, 22, 33일차</li>
      </ul>
      <p>이 구조는 수험서·강좌 소개 같은 2차 자료 기준이고, 파트별 출제 비중 통계와 실제 기출 문항은 확인하지 못했습니다. 최종 확인은 JPT 공식 사이트에서 해 주세요.</p>
    </details>
    <details class="ov">
      <summary>2주 전체 일정 보기</summary>""")
rep('["월","<a href=\\"#day-17\\">17일차</a> 어휘 2","문제집 약한 파트"]', '["월","<a href=\\"#day-17\\">17일차</a> 어휘 2 + <a href=\\"#day-29\\">29일차</a> 조사 오용","문제집 약한 파트"]')
rep('["화","<a href=\\"#day-18\\">18일차</a> 어휘 3","문제집 약한 파트"]', '["화","<a href=\\"#day-18\\">18일차</a> 어휘 3 + <a href=\\"#day-30\\">30일차</a> 자·타동사","문제집 약한 파트"]')
rep('["수","<a href=\\"#day-19\\">19일차</a> 추가 문법","문제집 Part 5~6"]', '["수","<a href=\\"#day-19\\">19일차</a> 추가 문법 + <a href=\\"#day-31\\">31일차</a> 가타카나어","문제집 Part 5~6"]')
rep('<a href=\\"#day-27\\">27일차</a>·<a href=\\"#day-28\\">28일차</a> 고급 문법·활용형', '<a href=\\"#day-27\\">27일차</a>·<a href=\\"#day-28\\">28일차</a>·<a href=\\"#day-32\\">32일차</a>·<a href=\\"#day-33\\">33일차</a> 고급 문법·관용·독해')
rep('if(!state.wrong) state.wrong = {}; }', 'if(!state.wrong) state.wrong = {};\n  if(state.ver !== 3){ var MIXED = [1,2,3,4,5,6,7,9,10,11,14,19,21,23]; Object.keys(state.wrong).forEach(function(k){ var p = k.split("-"); if(MIXED.indexOf(+p[0]) >= 0) delete state.wrong[k]; }); state.ver = 3; save(); }\n}')
open(path, 'w', encoding='utf8').write(src)
print('written')
