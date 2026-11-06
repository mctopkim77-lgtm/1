// node check.js <setdir>   — 문제 데이터 교정 검사 (보기 번호·인용 일치, ✓ 위치, 괄호·문장부호, 빈칸·밑줄 표시)
const dir = process.argv[2];
const P5 = require(dir + '/part5'), P6 = require(dir + '/part6');
const P7 = [...require(dir + '/part7a'), ...require(dir + '/part7b')];
const P8 = [...require(dir + '/part8a'), ...require(dir + '/part8b')];
const Q8 = P8.flatMap(p => p.qs);
const L = 'ABCD';
const issues = [];
const bad = (n, msg) => issues.push(`${n}: ${msg}`);
const strip = s => String(s).replace(/\[\[(?:[A-D]\|)?(.*?)\]\]/g, '$1');
const bal = (s, o, c) => (s.split(o).length - 1) === (s.split(c).length - 1);
let num = 0;
function common(q, n, kind) {
  for (const [k, v0] of Object.entries({ q: q.q, e: q.e, t: q.t })) {
    if (v0 === undefined) continue;
    const v = k === 'q' ? strip(v0) : v0;
    if (/\s{2,}(?!\()/.test(v.replace(/\n/g, ' ')) && k !== 'e') bad(n, `${k}: 연속 공백`);
    if (!bal(v, '「', '」')) bad(n, `${k}: 「」 짝 안 맞음`);
    if (!bal(v, '(', ')') && !bal(v, '（', '）')) bad(n, `${k}: () 짝 안 맞음 → ${v.slice(0, 40)}`);
    if (!bal(v, '‘', '’')) bad(n, `${k}: ‘’ 짝 안 맞음`);
    if (/。。|、、|\.\.|,,/.test(v)) bad(n, `${k}: 문장부호 중복`);
    if (/undefined|NaN|\[\[|\]\]/.test(v)) bad(n, `${k}: 잔여 표식`);
  }
  if (q.o) {
    if (q.o.length !== 4 || new Set(q.o.map(strip)).size !== 4) bad(n, '보기 4개/중복');
    const okMarks = q.m.map((x, i) => (/✓|\(○\)/.test(x) ? i : -1)).filter(i => i >= 0);
    if (okMarks.length && (okMarks.length !== 1 || okMarks[0] !== q.a)) bad(n, `✓/○ 표시 위치 ${okMarks.map(i => L[i])} ≠ 정답 ${L[q.a]}`);
    if (!okMarks.length && kind !== 5 && kind !== 7) bad(n, '정답 표시(✓/○) 없음');
    // 해설의 「정답은 (X)」
    const m = q.e.match(/정답은 \(([A-D])\)/);
    if (m && m[1] !== L[q.a]) bad(n, `해설 정답 (${m[1]}) ≠ 데이터 정답 (${L[q.a]})`);
    if (!/\(([A-D])\)/.test(q.e) && kind !== 8) bad(n, '해설에 보기 번호 없음');
    // 해설의 「(X)의 「표현」」 인용이 해당 보기와 맞는가
    for (const mm of q.e.matchAll(/\(([A-D])\)의 「([^」]+)」/g)) {
      const i = L.indexOf(mm[1]);
      const quoted = mm[2].replace(/[~～]/g, '');
      const cands = [strip(q.o[i]), q.m[i]].join(' ');
      const core = quoted.replace(/\(.*?\)/g, '').replace(/[~～]/g, '');
      const stem = core.replace(/[ぁ-ん]+$/, '');
      if (!cands.includes(core) && !cands.includes(quoted) && !(stem.length >= 1 && cands.includes(stem))) bad(n, `해설 (${mm[1]})의 「${mm[2]}」 가 보기 (${mm[1]}) 「${strip(q.o[i])}」/뜻과 안 맞음`);
    }
  }
}
P5.forEach((q, i) => { num = 101 + i; common(q, num, 5);
  if (!/\[\[/.test(q.q)) bad(num, '밑줄 표시 없음'); if (!q.lab) bad(num, '이름표 없음'); });
P6.forEach((q, i) => { num = 121 + i;
  const segs = [...q.q.matchAll(/\[\[([A-D])\|(.*?)\]\]/g)];
  if (segs.map(s => s[1]).join('') !== 'ABCD') bad(num, '구간 A~D 아님');
  else if (!segs[q.a][2].includes(q.wr)) bad(num, '틀린 표현이 정답 구간에 없음');
  else { // 고친 문장에서 wr → rt 가 성립하는지(단순 치환) 확인
    const fixed = segs[q.a][2].replace(q.wr, q.rt);
    if (fixed === segs[q.a][2]) bad(num, 'wr/rt 치환 불가');
    // 다른 구간에 rt가 이미 있지 않은지
    segs.forEach((s, j) => { if (j !== q.a && q.wr.length > 1 && s[2].includes(q.wr)) bad(num, `다른 구간 (${L[j]})에도 틀린 표현 포함`); });
  }
  if (!new RegExp('\\(' + L[q.a] + '\\)').test(q.e)) bad(num, '해설에 정답 구간 번호 없음');
  const hm = q.e.match(/\(([A-D])\)의 「([^」]+)」/); if (hm && hm[1] !== L[q.a] && !/(참고|※)/.test(q.e) && hm[2] !== '') {} 
  common({ ...q, o: undefined }, num, 6); });
P7.forEach((q, i) => { num = 141 + i; common(q, num, 7);
  if (!/＿＿＿/.test(q.q)) bad(num, '빈칸 표시 없음'); if (!q.lab) bad(num, '이름표 없음'); });
Q8.forEach((q, i) => { num = 171 + i; common(q, num, 8); });
P8.forEach((p, i) => { if (!p.tr || !p.w || !p.text) bad('지문' + (i + 1), '필드 누락'); p.text.forEach(t => { if (!bal(t, '「', '」')) bad('지문' + (i + 1), '「」 짝: ' + t.slice(0, 20)); }); });
// 어휘 형식
[...P5, ...P6, ...P7].forEach((q, i) => { if (q.w) q.w.split(';').forEach(s => { if (s.split('|').length !== 3) bad(101 + i, '어휘 형식: ' + s); }); });
console.log(issues.length ? issues.join('\n') : 'OK (문제 없음)');
console.log('총 지적', issues.length);
