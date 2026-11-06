import re, sys, json
from sudachipy import dictionary, tokenizer

tk = dictionary.Dictionary().create()
MODE = tokenizer.Tokenizer.SplitMode.A
KANJI = r'一-鿿々〆'
HAS_KANJI = re.compile('[' + KANJI + ']')

def kata2hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

# surface -> reading overrides (applied to a single token surface)
OVERRIDE = json.load(open(sys.argv[2], encoding='utf8')) if len(sys.argv) > 2 else {}
used = {}

def ruby_token(surface, reading):
    # build regex: kanji runs -> capture, other chars -> literal hiragana
    pat = ''
    groups = []
    i = 0
    while i < len(surface):
        c = surface[i]
        if HAS_KANJI.match(c):
            j = i
            while j < len(surface) and HAS_KANJI.match(surface[j]):
                j += 1
            groups.append(surface[i:j])
            pat += '(.+?)'
            i = j
        else:
            pat += re.escape(kata2hira(c))
            i += 1
    m = re.match('^' + pat + '$', reading)
    if not m:
        return '<ruby>%s<rt>%s</rt></ruby>' % (surface, reading)
    out = ''
    gi = 0
    i = 0
    while i < len(surface):
        c = surface[i]
        if HAS_KANJI.match(c):
            j = i
            while j < len(surface) and HAS_KANJI.match(surface[j]):
                j += 1
            out += '<ruby>%s<rt>%s</rt></ruby>' % (surface[i:j], m.group(gi + 1))
            gi += 1
            i = j
        else:
            out += c
            i += 1
    return out

def annotate_plain(text):
    out = ''
    for t in tk.tokenize(text, MODE):
        s = t.surface()
        if not HAS_KANJI.search(s):
            out += s
            continue
        r = OVERRIDE.get(s) or kata2hira(t.reading_form())
        used[s] = r
        out += ruby_token(s, r)
    return out

POST = [
    ('3<ruby>日間<rt>にちかん</rt></ruby>', '<ruby>3日間<rt>みっかかん</rt></ruby>'),
    ('2<ruby>日間<rt>にちかん</rt></ruby>', '<ruby>2日間<rt>ふつかかん</rt></ruby>'),
    ('10<ruby>分<rt>ふん</rt></ruby>', '<ruby>10分<rt>じゅっぷん</rt></ruby>'),
    ('<ruby>御<rt>ご</rt></ruby><ruby>社<rt>しゃ</rt></ruby>', '<ruby>御社<rt>おんしゃ</rt></ruby>'),
]

def annotate_seg(p):
    p = p.replace('(', '\ue000').replace(')', '\ue001')
    out = annotate_plain(p)
    return out.replace('\ue000', '(').replace('\ue001', ')')

def annotate(text):
    parts = re.split(r'(<[^>]+>)', text)
    out = ''.join(p if p.startswith('<') else annotate_seg(p) for p in parts)
    for a, b in POST:
        out = out.replace(a, b)
    return out

def main():
    path = sys.argv[1]
    src = open(path, encoding='utf8').read()
    a = src.index('var DAYS = [')
    b = src.index('var DEFAULT_TASKS')
    region = src[a:b]

    def skip_p(v):
        return re.search('（[ぁ-ん]+）', v) is not None

    def sub_key(m):
        key, val = m.group(1), m.group(2)
        if key == 'p' and skip_p(val):
            return m.group(0)
        if not HAS_KANJI.search(val) or '<ruby>' in val:
            return m.group(0)
        return '%s:"%s"' % (key, annotate(val))

    region = re.sub(r'\b(p|m|ex|tip|ctx|q|e):"([^"]*)"', sub_key, region)

    def sub_opts(m):
        items = re.findall(r'"([^"]*)"', m.group(1))
        new = ['"%s"' % (annotate(v) if HAS_KANJI.search(v) and '<ruby>' not in v else v) for v in items]
        return 'opts:[' + ','.join(new) + ']'

    region = re.sub(r'opts:\[(.*?)\]', sub_opts, region)
    open(path, 'w', encoding='utf8').write(src[:a] + region + src[b:])
    json.dump(used, open(sys.argv[3] if len(sys.argv) > 3 else 'used.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    print(len(used), 'surfaces')

if __name__ == "__main__":
    main()
