import json, re, sys
from sudachipy import dictionary, tokenizer
tk = dictionary.Dictionary().create()
M = tokenizer.Tokenizer.SplitMode.B
K = re.compile('[一-鿿々〆]')
def k2h(s): return ''.join(chr(ord(c)-0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)
SKIP = {'助詞','助動詞','補助記号','記号','空白'}
def lemmas(text):
    text = re.sub(r'<[^>]+>', '', text).replace('\\n', ' ')
    out = []
    for t in tk.tokenize(text, M):
        if t.part_of_speech()[0] in SKIP: continue
        lem = t.dictionary_form()
        if not K.search(lem): continue
        r = ''.join(k2h(x.reading_form()) for x in tk.tokenize(lem, tokenizer.Tokenizer.SplitMode.A))
        out.append((lem, r))
    return out
if __name__ == '__main__':
    days = json.load(open('days_new2.json', encoding='utf8'))
    allv = {}
    for d in days:
        for q in d['quiz']:
            for f in [q['q'], q.get('ctx', '')] + q['opts']:
                for l, r in lemmas(f): allv.setdefault(l, r)
    json.dump(allv, open('lemmas.json', 'w', encoding='utf8'), ensure_ascii=False)
    print(len(allv))
    print(' '.join('%s=%s' % (k, v) for k, v in allv.items()))
