// node build2.js <output.docx>  — 제2회: 문제지 + 답안지 + 정답표 + 상세 해설 (실제 시험 형식 분석 반영)
const fs = require('fs');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, PageBreak, TabStopType, Footer, PageNumber, VerticalAlign } = D;

const EASY = require('./set2/easy');
const P5 = require('./set2/part5'), P6 = require('./set2/part6');
const P7 = [...require('./set2/part7a'), ...require('./set2/part7b')];
const P8 = [...require('./set2/part8a'), ...require('./set2/part8b')];
const out = process.argv[2] || 'JPT_독해_모의고사_2회.docx';
const TITLE = 'JPT 독해 모의고사 제2회';

const JP = 'MS Mincho', KR = 'Malgun Gothic';
const W = 9906;
const L = 'ABCD';
const GRAY = 'EDEDED', BLUE = '2E48A3', GREEN = '1F7A4D';
const NO = n => `(${100 + n})`;          // 문항 번호 표기 (101)~(200)

// ---------- 문항 ----------
const items = [];
let n = 0;
P5.forEach(q => items.push({ ...q, n: ++n, part: 5 }));
P6.forEach(q => items.push({ ...q, n: ++n, part: 6 }));
P7.forEach(q => items.push({ ...q, n: ++n, part: 7 }));
P8.forEach((p, pi) => p.qs.forEach(q => items.push({ ...q, n: ++n, part: 8, pi })));
if (n !== 100) throw new Error('문항 수 ' + n);

// ---------- 텍스트 도우미 ----------
const strip = s => s.replace(/\[\[([A-D])\|(.*?)\]\]/g, '($1)$2').replace(/\[\[(.*?)\]\]/g, '$1');
function jpRuns(text, size = 22, extra = {}) {
  const runs = [], re = /\[\[(?:([A-D])\|)?(.*?)\]\]/g;
  let last = 0, m;
  const base = { font: { ascii: JP, eastAsia: JP }, size, ...extra };
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push(new TextRun({ ...base, text: text.slice(last, m.index) }));
    if (m[1]) runs.push(new TextRun({ ...base, text: '(' + m[1] + ')', size: size - 4 }));
    runs.push(new TextRun({ ...base, text: m[2], underline: { type: 'single' } }));
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun({ ...base, text: text.slice(last) }));
  return runs;
}
const kr = (text, o = {}) => new TextRun({ font: { ascii: 'Arial', eastAsia: KR }, size: 20, text, ...o });
const para = (children, o = {}) => new Paragraph({ children, spacing: { after: 80, line: 300 }, ...o });
const krPara = (text, o = {}, ro = {}) => para([kr(text, ro)], o);
const pb = () => new Paragraph({ children: [new PageBreak()] });

// 문제·해설 한 덩어리를 쪽 사이에서 갈라지지 않게 담는 한 칸짜리 표 (단락 서식 'keep with next'는 Word에서 검은 네모로 보여 쓰지 않는다)
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NONE, left: NONE, bottom: NONE, right: NONE };
function block(paras, boxed) {
  const bd = { style: BorderStyle.SINGLE, size: 6, color: '666666' };
  const b = boxed ? { top: bd, left: bd, bottom: bd, right: bd } : noBorders;
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: { ...noBorders, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({ width: { size: W, type: WidthType.DXA }, borders: b,
      margins: boxed ? { top: 100, bottom: 100, left: 160, right: 160 } : { top: 0, bottom: 0, left: 0, right: 0 }, children: paras })] })] });
}
const rule = { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 2 } };

// ---------- 문제지 ----------
const body = [];
function optionParas(opts) {
  const short = opts.every(o => o.length <= 6 && !o.includes('[['));
  if (short) {
    const kids = [];
    opts.forEach((o, i) => {
      if (i) kids.push(new TextRun({ text: '\t', font: { eastAsia: JP } }));
      kids.push(new TextRun({ text: `(${L[i]}) ${o}`, font: { ascii: JP, eastAsia: JP }, size: 22 }));
    });
    return [new Paragraph({ children: kids, indent: { left: 500 }, spacing: { after: 160 },
      tabStops: [3000, 5500, 8000].map(p => ({ type: TabStopType.LEFT, position: p })) })];
  }
  return opts.map((o, i) => new Paragraph({ children: jpRuns(`(${L[i]}) ${o}`, 22), indent: { left: 700, hanging: 200 },
    spacing: { after: i === 3 ? 160 : 40 } }));
}
function qHead(q, size = 22) {
  return [new TextRun({ text: NO(q.n) + '\t', bold: true, font: { ascii: 'Arial', eastAsia: JP }, size }), ...jpRuns(q.q, size)];
}
function questionParas(q) {
  const out2 = [new Paragraph({ children: qHead(q), indent: { left: 760, hanging: 760 }, tabStops: [{ type: TabStopType.LEFT, position: 760 }],
    spacing: { after: 100, line: 340 } })];
  if (q.part !== 6) out2.push(...optionParas(q.o));
  else out2.push(new Paragraph({ children: [], spacing: { after: 140 } }));
  return out2;
}
function instruction(text, label) {
  return [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 26, font: { ascii: 'Arial', eastAsia: KR }, color: BLUE })],
      spacing: { before: 120, after: 60 }, border: rule }),
    new Paragraph({ children: jpRuns(text, 21), spacing: { after: 160 }, shading: { type: ShadingType.CLEAR, fill: GRAY, color: 'auto' } })];
}
const INST = {
  5: '下の＿＿線の言葉の正しい表現、または同じ意味のはたらきをしている言葉を、(A)から(D)の中で一つ選びなさい。',
  6: '下の＿＿線の(A)、(B)、(C)、(D)の言葉の中で正しくない言葉を一つ選びなさい。',
  7: '下の＿＿線に入る適当な言葉を、(A)から(D)の中で一つ選びなさい。',
  8: '下の文を読んで、後の問いにもっとも適した答えを、(A)から(D)の中で一つ選びなさい。',
};

// 표지
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 100 },
  children: [new TextRun({ text: TITLE, bold: true, size: 44, font: { ascii: 'Arial', eastAsia: KR } })] }));
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
  children: [new TextRun({ text: 'Part 5 ~ Part 8  ·  100문항  ·  50분', size: 26, font: { ascii: 'Arial', eastAsia: KR }, color: '555555' })] }));
const cellB = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const cb = { top: cellB, left: cellB, bottom: cellB, right: cellB };
function cell(text, w, o = {}) {
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders: cb, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    children: [new Paragraph({ alignment: o.align || AlignmentType.CENTER, children: [new TextRun({ text, bold: !!o.bold, size: o.size || 20, font: { ascii: 'Arial', eastAsia: KR } })] })] });
}
const ncols = [1100, 2000, 1000, 5806];
body.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: ncols, rows: [
  new TableRow({ tableHeader: true, children: ['Part', '문제 번호', '문항 수', '내용 (권장 시간 배분은 참고용)'].map((t, i) => cell(t, ncols[i], { bold: true, fill: GRAY })) }),
  ...[['V', '(101) ~ (120)', '20', '정답 찾기: 발음 7 · 한자 3 · 대체표현 6 · 의미·용법 구분 4 (약 10분)'],
      ['VI', '(121) ~ (140)', '20', '오문 정정: 활용·접속 형태·표현 오용 등 (약 10분)'],
      ['VII', '(141) ~ (170)', '30', '공란 메우기: 앞쪽은 쉽게, 뒤쪽은 N2 수준으로 어려워짐 (약 15분)'],
      ['VIII', '(171) ~ (200)', '30', '독해: 지문 8편(3·4·3·4·4·4·4·4문항), 마지막은 격식체 안내문 (약 15분)']]
    .map(r => new TableRow({ children: r.map((t, i) => cell(t, ncols[i], { align: i === 3 ? AlignmentType.LEFT : AlignmentType.CENTER })) })),
] }));
body.push(krPara('', {}));
const notes = ['제1회보다 실제 JPT에 가깝게 만든 연습용 모의고사입니다. 시판 JPT 기출의 형식(문항 구성, 난이도의 상승 곡선, 오답 보기를 만드는 방식, 해설 방식)을 분석해 반영했지만, 문제는 모두 새로 출제한 것이며 실제 기출문제가 아닙니다. 난이도와 분포는 실제와 다를 수 있습니다.',
  '타이머를 50분에 맞추고 뒤쪽 ‘답안지’에 답을 표시하세요. 모르는 문제는 표시만 하고 넘어가 마지막에 돌아오는 연습도 해 보세요.',
  '채점 후 ‘정답표’로 맞춰 보고, ‘상세 해설’에서 틀린 문제의 유형 이름표·해설·해석·단어를 확인하세요. 점수는 정답 수로만 계산하며 JPT 공식 환산 점수와는 다릅니다.',
  '모든 문제에는 후리가나가 없습니다(실제 시험과 같은 조건). 일본어 문장이 어색하거나 정답이 둘로 읽히는 문제가 있으면 알려 주세요.'];
notes.forEach((t, i) => body.push(new Paragraph({ children: [kr(`${i + 1}. ${t}`, { size: 21 })], indent: { left: 360, hanging: 360 }, spacing: { after: 100, line: 320 } })));
body.push(new Paragraph({ spacing: { before: 500 }, children: [kr('이름: ____________     날짜: __________     소요 시간: ______분     정답 수: _____ / 100', { size: 22 })] }));
body.push(pb());

// Part V/VI/VII
[[5, 'V.  Part 5  정답 찾기  (101 ~ 120)'], [6, 'VI.  Part 6  오문 정정  (121 ~ 140)'], [7, 'VII.  Part 7  공란 메우기  (141 ~ 170)']].forEach(([p, label]) => {
  body.push(...instruction(INST[p], label));
  items.filter(q => q.part === p).forEach(q => body.push(block(questionParas(q))));
  body.push(pb());
});

// Part VIII
body.push(...instruction(INST[8], 'VIII.  Part 8  독해  (171 ~ 200)'));
P8.forEach((p, pi) => {
  const qs = items.filter(q => q.part === 8 && q.pi === pi);
  const gh = new Paragraph({ children: [new TextRun({ text: `${NO(qs[0].n)} ~ ${NO(qs[qs.length - 1].n)}`, bold: true, size: 22, font: { ascii: 'Arial', eastAsia: KR } })], spacing: { after: 80 } });
  body.push(block([gh, ...p.text.map((t, i) => new Paragraph({ children: jpRuns(t, 21), spacing: { after: i === p.text.length - 1 ? 0 : 40, line: 340 } }))], true));
  body.push(new Paragraph({ children: [], spacing: { after: 120 } }));
  qs.forEach(q => {
    body.push(block([
      new Paragraph({ children: qHead(q), indent: { left: 760, hanging: 760 }, tabStops: [{ type: TabStopType.LEFT, position: 760 }], spacing: { after: 80, line: 330 } }),
      ...optionParas(q.o)]));
  });
});
body.push(pb());

// ---------- 답안지 ----------
body.push(new Paragraph({ children: [new TextRun({ text: '답안지 (마킹용)', bold: true, size: 30, font: { ascii: 'Arial', eastAsia: KR } })], spacing: { after: 120 }, border: rule }));
body.push(krPara('선택한 보기의 ○를 ●로 칠하세요. 번호는 (101)~(200)입니다. (이름: ______________   날짜: ____________)', {}, { size: 20 }));
const gw = [560, 400, 400, 400, 400];
const cw = [...gw, ...gw, ...gw, ...gw];
const scale = W / cw.reduce((a, b) => a + b, 0);
const cws = cw.map(x => Math.floor(x * scale));
cws[cws.length - 1] += W - cws.reduce((a, b) => a + b, 0);
const bubble = (t, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: cb, verticalAlign: VerticalAlign.CENTER,
  margins: { top: 40, bottom: 40, left: 20, right: 20 }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, size: o.size || 20, bold: !!o.bold, font: { ascii: 'Arial', eastAsia: KR } })] })] });
const arows = [new TableRow({ tableHeader: true, children: [0, 1, 2, 3].flatMap(g => ['No.', 'A', 'B', 'C', 'D'].map((t, i) => bubble(t, cws[g * 5 + i], { bold: true, fill: GRAY }))) })];
for (let r = 0; r < 25; r++) arows.push(new TableRow({ height: { value: 440, rule: 'atLeast' }, children: [0, 1, 2, 3].flatMap(g => {
  const no = g * 25 + r + 1;
  return [bubble(String(100 + no), cws[g * 5], { bold: true, fill: no % 2 ? undefined : 'F7F7F7' }), ...[1, 2, 3, 4].map(i => bubble('○', cws[g * 5 + i]))];
}) }));
body.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cws, rows: arows }));
body.push(pb());

// ---------- 정답표 ----------
body.push(new Paragraph({ children: [new TextRun({ text: '정답표', bold: true, size: 30, font: { ascii: 'Arial', eastAsia: KR } })], spacing: { after: 160 }, border: rule }));
const kw = Array(10).fill(0).map((_, i) => i % 2 === 0 ? 900 : 1080);
kw[9] += W - kw.reduce((a, b) => a + b, 0);
const krow = [new TableRow({ children: [0, 1, 2, 3, 4].flatMap(g => ['No.', '정답'].map((t, i) => cell(t, kw[g * 2 + i], { bold: true, fill: GRAY }))) })];
for (let r = 0; r < 20; r++) krow.push(new TableRow({ children: [0, 1, 2, 3, 4].flatMap(g => {
  const q = items[g * 20 + r];
  return [cell(String(100 + q.n), kw[g * 2], { bold: true }), cell(`(${L[q.a]})`, kw[g * 2 + 1], { fill: g % 2 ? 'F7F7F7' : undefined })];
}) }));
body.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: kw, rows: krow }));
body.push(krPara('', {}));
const dist = [5, 6, 7, 8].map(p => { const c = [0, 0, 0, 0]; items.filter(q => q.part === p).forEach(q => c[q.a]++); return `Part ${p}: A ${c[0]} · B ${c[1]} · C ${c[2]} · D ${c[3]}`; });
body.push(krPara('정답 분포 — ' + dist.join(' / '), {}, { size: 18, color: '666666' }));
body.push(krPara('정답 수  Part 5: __/20   Part 6: __/20   Part 7: __/30   Part 8: __/30   합계: __/100', { spacing: { before: 200, after: 80 } }, { size: 21 }));
body.push(pb());

// ---------- 상세 해설 ----------
const H = (text, size = 30, o = {}) => new Paragraph({ children: [new TextRun({ text, bold: true, size, font: { ascii: 'Arial', eastAsia: KR }, color: o.color })], spacing: { before: o.before || 0, after: 120 }, border: rule });
body.push(H('상세 해설'));
body.push(krPara('문제마다 유형 이름표가 붙어 있습니다. ○ = 맞는 표현·정답 쪽, 단어는 「한자(읽기) 뜻」 순서입니다.', {}, { size: 19, color: '666666' }));
const wordLine = w => w.split(';').map(s => { const [a, b, c] = s.split('|'); return (b && b !== a) ? `${a}(${b}) ${c}` : `${a} ${c}`; }).join('  /  ');
function opt(i, q) {
  const ok = i === q.a;
  return new Paragraph({ indent: { left: 360, hanging: 360 }, spacing: { after: 20, line: 280 },
    children: [new TextRun({ text: `(${L[i]}) `, bold: ok, color: ok ? GREEN : undefined, size: 20, font: { ascii: 'Arial', eastAsia: KR } }),
      ...jpRuns(q.o[i], 20, { bold: ok, color: ok ? GREEN : undefined }),
      new TextRun({ text: `  —  ${String(q.m[i]).replace(/\s*✓$/, '')}${ok ? '  ✓' : ''}`, bold: ok, size: 19, font: { ascii: 'Arial', eastAsia: KR }, color: ok ? GREEN : '444444' })] });
}
function head(q, ans, extra) {
  const kids = [new TextRun({ text: `${NO(q.n)}  `, bold: true, size: 22, font: { ascii: 'Arial', eastAsia: KR } })];
  if (q.lab) kids.push(new TextRun({ text: q.lab + '  ', bold: true, size: 21, font: { ascii: 'Arial', eastAsia: KR }, color: BLUE }));
  if (extra) kids.push(new TextRun({ text: extra + '  ', bold: true, size: 21, font: { ascii: JP, eastAsia: JP } }));
  kids.push(new TextRun({ text: '정답 ', bold: true, size: 21, font: { ascii: 'Arial', eastAsia: KR } }), new TextRun({ text: ans, bold: true, size: 21, color: BLUE, font: { ascii: JP, eastAsia: JP } }));
  return new Paragraph({ shading: { type: ShadingType.CLEAR, fill: GRAY, color: 'auto' }, spacing: { before: 220, after: 60 }, children: kids });
}
const label = (t, c = BLUE) => kr(t + '  ', { bold: true, color: c, size: 20 });
function explain(q) {
  const out2 = [];
  if (q.part === 6) {
    out2.push(head(q, `(${L[q.a]})`, `(${L[q.a]}) ${q.wr} → ${q.rt}`));
    out2.push(new Paragraph({ children: jpRuns(strip(q.q), 20), spacing: { after: 40, line: 280 } }));
    out2.push(new Paragraph({ children: [label('해석'), kr(q.t + '  (고친 문장 기준)', { size: 20 })], spacing: { after: 40, line: 290 } }));
    out2.push(new Paragraph({ children: [label('해설'), kr(q.e, { size: 20 })], spacing: { after: 40, line: 290 } }));
  } else if (q.part === 8) {
    out2.push(head(q, `(${L[q.a]})  ${strip(q.o[q.a])}`));
    out2.push(new Paragraph({ children: jpRuns(q.q, 20), spacing: { after: 40, line: 280 } }));
    out2.push(new Paragraph({ children: [label('해석'), kr(q.t, { size: 20 })], spacing: { after: 40, line: 290 } }));
    out2.push(new Paragraph({ children: [label('해설'), kr(q.e, { size: 20 })], spacing: { after: 40, line: 290 } }));
    out2.push(new Paragraph({ children: [kr('보기 뜻', { bold: true, color: BLUE, size: 20 })], spacing: { after: 20 } }));
    for (let i = 0; i < 4; i++) out2.push(opt(i, q));
  } else {
    out2.push(head(q, `(${L[q.a]})  ${strip(q.o[q.a])}`));
    out2.push(new Paragraph({ children: jpRuns(strip(q.q), 20), spacing: { after: 40, line: 280 } }));
    out2.push(new Paragraph({ children: [label('해석'), kr(q.t, { size: 20 })], spacing: { after: 40, line: 290 } }));
    out2.push(new Paragraph({ children: [label('해설'), kr(q.e, { size: 20 })], spacing: { after: 40, line: 290 } }));
    out2.push(new Paragraph({ children: [kr('보기 뜻', { bold: true, color: BLUE, size: 20 })], spacing: { after: 20 } }));
    for (let i = 0; i < 4; i++) out2.push(opt(i, q));
  }
  if (EASY[100 + q.n]) {
    out2.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: 'FFF8E1', color: 'auto' }, spacing: { before: 50, after: 20, line: 290 },
      children: [label('쉽게 말하면', 'B45F06'), kr(EASY[100 + q.n][0], { size: 20 })] }));
    out2.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: 'FFF8E1', color: 'auto' }, spacing: { after: 40, line: 290 },
      children: [label('헷갈리는 점', 'B45F06'), kr(EASY[100 + q.n][1], { size: 20 })] }));
  }
  if (q.w) out2.push(new Paragraph({ children: [label('어휘', BLUE), new TextRun({ text: wordLine(q.w), size: 19, font: { ascii: JP, eastAsia: KR } })], spacing: { before: 40, after: 40, line: 280 } }));
  return out2;
}
[[5, 'V.  Part 5  정답 찾기 해설'], [6, 'VI.  Part 6  오문 정정 해설'], [7, 'VII.  Part 7  공란 메우기 해설']].forEach(([p, lab]) => {
  body.push(H(lab, 26, { before: 260 }));
  items.filter(q => q.part === p).forEach(q => body.push(block(explain(q))));
});
body.push(H('VIII.  Part 8  독해 해설', 26, { before: 260 }));
P8.forEach((p, pi) => {
  const qs = items.filter(q => q.part === 8 && q.pi === pi);
  body.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: 'DDE4FA', color: 'auto' }, spacing: { before: 260, after: 60 },
    children: [new TextRun({ text: `${NO(qs[0].n)} ~ ${NO(qs[qs.length - 1].n)}  ${p.kind}`, bold: true, size: 22, font: { ascii: 'Arial', eastAsia: KR } })] }));
  body.push(block([
    new Paragraph({ children: [label('지문 해석'), kr(p.tr, { size: 20 })], spacing: { after: 60, line: 300 } }),
    new Paragraph({ children: [label('어휘', BLUE), new TextRun({ text: wordLine(p.w), size: 19, font: { ascii: JP, eastAsia: KR } })], spacing: { after: 40, line: 280 } })]));
  qs.forEach(q => body.push(block(explain(q))));
});

// ---------- 문서 ----------
const doc = new Document({
  creator: 'JPT mock', title: TITLE,
  styles: { default: { document: { run: { font: { ascii: 'Arial', eastAsia: KR }, size: 21 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: TITLE + '  -  ', size: 16, color: '777777', font: { ascii: 'Arial', eastAsia: KR } }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '777777' })] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('written', out, b.length, 'bytes'); });
