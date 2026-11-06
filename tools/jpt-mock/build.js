// node build.js <output.docx>  — 100문항 JPT 독해 모의고사(문제지 + 답안지 + 정답표 + 상세 해설)
const fs = require('fs');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, PageBreak, TabStopType, Footer, PageNumber, VerticalAlign } = D;

const EASY = require('./set1easy');
const P5 = require('./part5'), P6 = require('./part6');
const P7 = [...require('./part7a'), ...require('./part7b')];
const P8 = [...require('./part8a'), ...require('./part8b')];
const out = process.argv[2] || 'JPT_독해_모의고사_1회.docx';

const JP = 'MS Mincho', KR = 'Malgun Gothic';
const W = 9906;                       // 본문 폭(DXA)
const L = 'ABCD';
const GRAY = 'EDEDED', BLUE = '2E48A3', RED = 'B3322B', GREEN = '1F7A4D';

// ---------- 문제 번호 부여 ----------
const items = [];                     // {n, part, q, ...}
let n = 0;
P5.forEach(q => items.push({ ...q, n: ++n, part: 5 }));
P6.forEach(q => items.push({ ...q, n: ++n, part: 6 }));
P7.forEach(q => items.push({ ...q, n: ++n, part: 7 }));
P8.forEach((p, pi) => p.qs.forEach(q => items.push({ ...q, n: ++n, part: 8, pi })));
if (n !== 100) throw new Error('문항 수 ' + n);

// ---------- 텍스트 도우미 ----------
const strip = s => s.replace(/\[\[([A-D])\|(.*?)\]\]/g, '($1)$2').replace(/\[\[(.*?)\]\]/g, '$1');
function jpRuns(text, size = 22, extra = {}) {   // [[밑줄]], [[A|밑줄]] 처리
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
// ---------- 문제지 ----------
const body = [];
const num = q => String(q.n) + '.';
function optionParas(opts) {
  const short = opts.every(o => o.length <= 6);
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
function questionParas(q, withInst) {
  const out = [];
  out.push(new Paragraph({ children: [new TextRun({ text: num(q) + '\t', bold: true, font: { ascii: 'Arial', eastAsia: JP }, size: 22 }), ...jpRuns(q.q, 22)],
    indent: { left: 500, hanging: 500 }, tabStops: [{ type: TabStopType.LEFT, position: 500 }], spacing: { after: 100, line: 340 } }));
  if (q.part !== 6) out.push(...optionParas(q.o));
  else out.push(new Paragraph({ children: [], spacing: { after: 140 } }));
  return out;
}
function instruction(text, label) {
  return [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 26, font: { ascii: 'Arial', eastAsia: KR }, color: BLUE })],
      spacing: { before: 120, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 2 } } }),
    new Paragraph({ children: jpRuns(text, 21, { italics: false }), spacing: { after: 160 }, shading: { type: ShadingType.CLEAR, fill: GRAY, color: 'auto' } })];
}

// 표지
body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 100 },
  children: [new TextRun({ text: 'JPT 독해 모의고사 제1회', bold: true, size: 44, font: { ascii: 'Arial', eastAsia: KR } })] }));
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
const ncols = [1400, 2200, 1200, 5106];
body.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: ncols, rows: [
  new TableRow({ tableHeader: true, children: ['Part', '문제 번호', '문항 수', '내용 (권장 시간 배분은 참고용)'].map((t, i) => cell(t, ncols[i], { bold: true, fill: GRAY })) }),
  ...[['Part 5', '1 ~ 20', '20', '정답 찾기: 한자 읽기·표기, 같은 뜻, 같은 용법 (약 10분)'],
      ['Part 6', '21 ~ 40', '20', '오문 정정: 조사·자타동사·호응·경어·표기 (약 10분)'],
      ['Part 7', '41 ~ 70', '30', '공란 메우기: 문법·어휘·접속사·부사·의태어·관용·조수사 (약 15분)'],
      ['Part 8', '71 ~ 100', '30', '독해: 지문 9편, 지문당 3~4문제 (약 15분)']]
    .map(r => new TableRow({ children: r.map((t, i) => cell(t, ncols[i], { align: i === 3 ? AlignmentType.LEFT : AlignmentType.CENTER })) })),
] }));
body.push(krPara('', {}));
const notes = ['이 시험지는 실제 JPT 독해(100문항 50분)의 형식과 시간 감각을 익히기 위해 새로 출제한 연습용입니다. 실제 기출문제가 아니며 난이도와 문제 분포는 실제와 다를 수 있습니다.',
  '타이머를 50분에 맞추고, 답은 뒤쪽 ‘답안지’에 표시하세요. 모르는 문제는 표시만 하고 넘어가 마지막에 돌아오는 연습도 해 보세요.',
  '채점 후 ‘정답표’로 맞춰 보고, ‘상세 해설’에서 틀린 문제의 해설·해석·단어를 확인하세요. 점수는 정답 수로만 계산하며 JPT 공식 환산 점수와는 다릅니다.',
  '모든 문제에는 후리가나가 없습니다(실제 시험과 같은 조건). 해설의 단어 칸에서 읽기를 확인하세요.'];
notes.forEach((t, i) => body.push(new Paragraph({ children: [kr(`${i + 1}. ${t}`, { size: 21 })], indent: { left: 360, hanging: 360 }, spacing: { after: 100, line: 320 } })));
body.push(new Paragraph({ spacing: { before: 500 }, children: [kr('이름: ____________     날짜: __________     소요 시간: ______분     정답 수: _____ / 100', { size: 22 })] }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// Part 5 / 6 / 7
const INST = {
  5: '下の＿＿＿線の言葉の正しい表現、または同じ意味のはたらきをしている言葉を、(A)から(D)の中で一つ選びなさい。',
  6: '下の＿＿＿線の(A)、(B)、(C)、(D)の言葉の中で正しくない言葉を一つ選びなさい。',
  7: '下の＿＿＿＿に入れるのにもっとも適した言葉を、(A)から(D)の中で一つ選びなさい。',
  8: '下の文を読んで、後の問いにもっとも適した答えを、(A)から(D)の中で一つ選びなさい。',
};
[[5, 'Part 5  정답 찾기 (1 ~ 20)'], [6, 'Part 6  오문 정정 (21 ~ 40)'], [7, 'Part 7  공란 메우기 (41 ~ 70)']].forEach(([p, label]) => {
  body.push(...instruction(INST[p], label));
  items.filter(q => q.part === p).forEach(q => body.push(block(questionParas(q))));
  body.push(new Paragraph({ children: [new PageBreak()] }));
});

// Part 8
body.push(...instruction(INST[8], 'Part 8  독해 (71 ~ 100)'));
P8.forEach((p, pi) => {
  const qs = items.filter(q => q.part === 8 && q.pi === pi);
  const gh = new Paragraph({ children: [new TextRun({ text: `問 ${qs[0].n} ~ ${qs[qs.length - 1].n}`, bold: true, size: 22, font: { ascii: 'Arial', eastAsia: KR } })], spacing: { after: 80 } });
  const tp = p.text.map((t, i) => new Paragraph({ children: jpRuns(t, 21), spacing: { after: i === p.text.length - 1 ? 0 : 0, line: 340 } }));
  body.push(block([gh, ...tp], true));
  body.push(new Paragraph({ children: [], spacing: { after: 120 } }));
  qs.forEach(q => {
    body.push(block([new Paragraph({ children: [new TextRun({ text: num(q) + '\t', bold: true, size: 22, font: { ascii: 'Arial', eastAsia: JP } }), ...jpRuns(q.q, 22)],
      indent: { left: 500, hanging: 500 }, tabStops: [{ type: TabStopType.LEFT, position: 500 }], spacing: { after: 80, line: 330 } }), ...optionParas(q.o)]));
  });
});
body.push(new Paragraph({ children: [new PageBreak()] }));

// ---------- 답안지 ----------
body.push(new Paragraph({ children: [new TextRun({ text: '답안지 (마킹용)', bold: true, size: 30, font: { ascii: 'Arial', eastAsia: KR } })], spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 2 } } }));
body.push(krPara('선택한 보기의 ○를 ●로 칠하세요. (이름: ______________   날짜: ____________)', {}, { size: 20 }));
const gw = [520, 400, 400, 400, 400];                       // 한 묶음(5열)
const cw = [...gw, ...gw, ...gw, ...gw];                    // 20열
const scale = W / cw.reduce((a, b) => a + b, 0);
const cws = cw.map(x => Math.floor(x * scale));
cws[cws.length - 1] += W - cws.reduce((a, b) => a + b, 0);
const bubble = (t, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: cb, verticalAlign: VerticalAlign.CENTER,
  margins: { top: 40, bottom: 40, left: 20, right: 20 }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, size: o.size || 20, bold: !!o.bold, font: { ascii: 'Arial', eastAsia: KR } })] })] });
const arows = [new TableRow({ tableHeader: true, children: [0, 1, 2, 3].flatMap(g => ['No.', 'A', 'B', 'C', 'D'].map((t, i) => bubble(t, cws[g * 5 + i], { bold: true, fill: GRAY }))) })];
for (let r = 0; r < 25; r++) arows.push(new TableRow({ height: { value: 440, rule: 'atLeast' }, children: [0, 1, 2, 3].flatMap(g => {
  const no = g * 25 + r + 1;
  return [bubble(String(no), cws[g * 5], { bold: true, fill: no % 2 ? undefined : 'F7F7F7' }), ...[1, 2, 3, 4].map(i => bubble('○', cws[g * 5 + i]))];
}) }));
body.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cws, rows: arows }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// ---------- 정답표 ----------
body.push(new Paragraph({ children: [new TextRun({ text: '정답표', bold: true, size: 30, font: { ascii: 'Arial', eastAsia: KR } })], spacing: { after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 2 } } }));
const kw = Array(10).fill(0).map((_, i) => i % 2 === 0 ? 900 : 1080);
const ksum = kw.reduce((a, b) => a + b, 0); kw[9] += W - ksum;
const krow = [new TableRow({ children: [0, 1, 2, 3, 4].flatMap(g => ['No.', '정답'].map((t, i) => cell(t, kw[g * 2 + i], { bold: true, fill: GRAY }))) })];
for (let r = 0; r < 20; r++) krow.push(new TableRow({ children: [0, 1, 2, 3, 4].flatMap(g => {
  const q = items[g * 20 + r];
  return [cell(String(q.n), kw[g * 2], { bold: true }), cell(`(${L[q.a]})`, kw[g * 2 + 1], { fill: g % 2 ? 'F7F7F7' : undefined })];
}) }));
body.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: kw, rows: krow }));
body.push(krPara('', {}));
const dist = [5, 6, 7, 8].map(p => { const c = [0, 0, 0, 0]; items.filter(q => q.part === p).forEach(q => c[q.a]++); return `Part ${p}: A ${c[0]} · B ${c[1]} · C ${c[2]} · D ${c[3]}`; });
body.push(krPara('정답 분포 — ' + dist.join(' / '), {}, { size: 18, color: '666666' }));
body.push(krPara('정답 수  Part 5: __/20   Part 6: __/20   Part 7: __/30   Part 8: __/30   합계: __/100', { spacing: { before: 200, after: 80 } }, { size: 21 }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// ---------- 상세 해설 ----------
const H = (text, size = 30, o = {}) => new Paragraph({ children: [new TextRun({ text, bold: true, size, font: { ascii: 'Arial', eastAsia: KR }, color: o.color })], spacing: { before: o.before || 0, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 2 } } });
body.push(H('상세 해설'));
body.push(krPara('○ = 맞는 표현, × = 틀린 표현. 단어는 「한자(읽기) 뜻」 순서입니다.', {}, { size: 19, color: '666666' }));
const wordLine = w => w.split(';').map(s => { const [a, b, c] = s.split('|'); return (b && b !== a) ? `${a}(${b}) ${c}` : `${a} ${c}`; }).join('  /  ');
function opt(i, q) {   // 보기 한 줄 (Part 6 은 구간 텍스트)
  let label;
  if (q.part === 6) { const segs = [...q.q.matchAll(/\[\[([A-D])\|(.*?)\]\]/g)]; label = segs[i][2]; } else label = q.o[i];
  const ok = i === q.a;
  return new Paragraph({ indent: { left: 360, hanging: 360 }, spacing: { after: 20, line: 280 },
    children: [new TextRun({ text: `(${L[i]}) `, bold: ok, color: ok ? GREEN : undefined, size: 20, font: { ascii: 'Arial', eastAsia: KR } }),
      new TextRun({ text: label, bold: ok, size: 20, font: { ascii: JP, eastAsia: JP }, color: ok ? GREEN : undefined }),
      new TextRun({ text: `  —  ${q.m[i]}${ok ? '  ✓' : ''}`, bold: ok, size: 19, font: { ascii: 'Arial', eastAsia: KR }, color: ok ? GREEN : '444444' })] });
}
function explain(q) {
  const ans = q.part === 6 ? `(${L[q.a]})` : `(${L[q.a]}) ${q.o[q.a]}`;
  const out = [];
  out.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: GRAY, color: 'auto' }, spacing: { before: 220, after: 60 },
    children: [new TextRun({ text: `${q.n}번   정답 `, bold: true, size: 22, font: { ascii: 'Arial', eastAsia: KR } }),
      new TextRun({ text: ans, bold: true, size: 22, color: BLUE, font: { ascii: JP, eastAsia: JP } })] }));
  out.push(new Paragraph({ children: jpRuns(strip(q.q).replace(/＿＿＿＿/, '＿＿＿＿'), 20), spacing: { after: 40, line: 280 } }));
  out.push(new Paragraph({ children: [kr('해설  ', { bold: true, color: BLUE, size: 20 }), kr(q.e, { size: 20 })], spacing: { after: 40, line: 290 } }));
  out.push(new Paragraph({ children: [kr('해석  ', { bold: true, color: BLUE, size: 20 }), kr(q.t, { size: 20 })], spacing: { after: 40, line: 290 } }));
  if (q.part === 6) out.push(new Paragraph({ children: [kr('각 구간  ', { bold: true, color: BLUE, size: 20 })], spacing: { after: 20 } }));
  else out.push(new Paragraph({ children: [kr('보기 뜻', { bold: true, color: BLUE, size: 20 })], spacing: { after: 20 } }));
  for (let i = 0; i < 4; i++) out.push(opt(i, q));
  if (EASY[q.n]) {
    out.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: 'FFF8E1', color: 'auto' }, spacing: { before: 50, after: 20, line: 290 },
      children: [kr('쉽게 말하면  ', { bold: true, color: 'B45F06', size: 20 }), kr(EASY[q.n][0], { size: 20 })] }));
    out.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: 'FFF8E1', color: 'auto' }, spacing: { after: 40, line: 290 },
      children: [kr('헷갈리는 점  ', { bold: true, color: 'B45F06', size: 20 }), kr(EASY[q.n][1], { size: 20 })] }));
  }
  if (q.w) out.push(new Paragraph({ children: [kr('단어  ', { bold: true, color: BLUE, size: 19 }), new TextRun({ text: wordLine(q.w), size: 19, font: { ascii: JP, eastAsia: KR } })], spacing: { before: 40, after: 40, line: 280 } }));
  return out;
}
[[5, 'Part 5  정답 찾기 해설'], [6, 'Part 6  오문 정정 해설'], [7, 'Part 7  공란 메우기 해설']].forEach(([p, label]) => {
  body.push(H(label, 26, { before: 260 }));
  items.filter(q => q.part === p).forEach(q => body.push(block(explain(q))));
});
body.push(H('Part 8  독해 해설', 26, { before: 260 }));
P8.forEach((p, pi) => {
  const qs = items.filter(q => q.part === 8 && q.pi === pi);
  body.push(new Paragraph({ shading: { type: ShadingType.CLEAR, fill: 'DDE4FA', color: 'auto' }, spacing: { before: 260, after: 60 },
    children: [new TextRun({ text: `지문 ${pi + 1}  「${p.ttl}」  (${qs[0].n} ~ ${qs[qs.length - 1].n}번)`, bold: true, size: 22, font: { ascii: 'Arial', eastAsia: KR } })] }));
  body.push(block([
    new Paragraph({ children: [kr('지문 해석  ', { bold: true, color: BLUE, size: 20 }), kr(p.tr, { size: 20 })], spacing: { after: 60, line: 300 } }),
    new Paragraph({ children: [kr('단어  ', { bold: true, color: BLUE, size: 19 }), new TextRun({ text: wordLine(p.w), size: 19, font: { ascii: JP, eastAsia: KR } })], spacing: { after: 40, line: 280 } })]));
  qs.forEach(q => body.push(block(explain({ ...q, w: null }))));
});

// ---------- 문서 ----------
const doc = new Document({
  creator: 'JPT mock', title: 'JPT 독해 모의고사 제1회',
  styles: { default: { document: { run: { font: { ascii: 'Arial', eastAsia: KR }, size: 21 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'JPT 독해 모의고사 제1회  -  ', size: 16, color: '777777', font: { ascii: 'Arial', eastAsia: KR } }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '777777' })] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('written', out, b.length, 'bytes'); });
