#!/usr/bin/env python3
"""mkset.py <setdir> <data.py> <seed>
data.py 는 P5, P6, P7, P8 을 정의한다.
 - P5/P7 항목: dict(lab,q,c=[정답,오답1,오답2,오답3],e,t,m=[정답뜻✓,오답뜻...],w)
 - P8: 지문 dict(kind,text,tr,w,qs=[dict(q,c,e,t,m)])
 - e/m 안의 (@0)~(@3) 은 canonical 보기 번호 → 실제 (A)~(D) 로 치환된다.
 - P6: dict(lab,q,a,wr,rt,t,e,w)  (수동 배치)
정답 위치는 seed 로 분산(B 많게, 3연속 금지)해서 보기를 재배치한다.
"""
import sys, json, random, re, importlib.util, os
L = 'ABCD'
def plan(n, rnd, prev=''):
    w = [0.20, 0.38, 0.20, 0.22]
    seq = list(prev[-2:])
    out = []
    for _ in range(n):
        while True:
            x = rnd.choices(range(4), w)[0]
            if len(seq) >= 2 and seq[-1] == seq[-2] == x: continue
            break
        seq.append(x); out.append(x)
    return out
def place(it, tgt):
    c = it['c']; order = [None]*4; order[tgt] = 0
    rest = iter(range(1, 4))
    for i in range(4):
        if order[i] is None: order[i] = next(rest)
    # order[i] = canonical index placed at position i
    pos = {canon: i for i, canon in enumerate(order)}
    sub = lambda s: re.sub(r'\(@(\d)\)', lambda m: '(' + L[pos[int(m.group(1))]] + ')', s)
    o = [c[order[i]] for i in range(4)]
    m = [it['m'][order[i]] for i in range(4)]
    d = {k: v for k, v in it.items() if k not in ('c', 'm', 'e')}
    d.update(o=o, a=tgt, m=m, e=sub(it['e']))
    if 'e' not in it: d.pop('e')
    return d
def main():
    sd, data, seed = sys.argv[1], sys.argv[2], int(sys.argv[3])
    spec = importlib.util.spec_from_file_location('d', data); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    rnd = random.Random(seed)
    os.makedirs(sd, exist_ok=True)
    def dump(name, obj, head):
        open(os.path.join(sd, name + '.js'), 'w').write('// ' + head + '\nmodule.exports = ' + json.dumps(obj, ensure_ascii=False, indent=0) + ';\n')
    p5 = [place(it, t) for it, t in zip(mod.P5, plan(len(mod.P5), rnd))]
    dump('part5', p5, 'Part 5')
    dump('part6', mod.P6, 'Part 6')
    p7 = [place(it, t) for it, t in zip(mod.P7, plan(len(mod.P7), rnd, ''.join('x' for _ in ''))) ]
    dump('part7a', p7[:15], 'Part 7a'); dump('part7b', p7[15:], 'Part 7b')
    nq = sum(len(p['qs']) for p in mod.P8)
    pl = plan(nq, rnd); k = 0; p8 = []
    for p in mod.P8:
        qs = []
        for q in p['qs']:
            qs.append(place(q, pl[k])); k += 1
        d = dict(p); d['qs'] = qs; p8.append(d)
    dump('part8a', p8[:4], 'Part 8a'); dump('part8b', p8[4:], 'Part 8b')
    s = ''.join(L[x['a']] for x in p5) + ''.join(L[x['a']] for x in mod.P6) + ''.join(L[x['a']] for x in p7) + ''.join(L[q['a']] for p in p8 for q in p['qs'])
    from collections import Counter
    print(len(s), dict(Counter(s)), 'triples:', re.findall(r'(.)\1\1', s))
main()
