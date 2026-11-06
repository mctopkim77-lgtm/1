// usage: node words_test.js <screenshot-dir> [file:///path/page.html]
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[3] || 'file:///home/user/1/tools/jpt-build/out.html';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  const ok = (n, c, x) => console.log(c ? 'PASS' : 'FAIL', n, x === undefined ? '' : JSON.stringify(x));
  await p.goto(url + '#day-1'); await p.waitForTimeout(300);
  // wrong answer on Q1 -> words auto collected
  const q = await p.evaluate(() => ({ a: DAYS[0].quiz[0].a }));
  const wrongIdx = (q.a + 1) % 4;
  await p.click('.q[data-qi="0"] .opt[data-o="' + wrongIdx + '"]');
  const msg = await p.evaluate(() => (document.querySelector('.q .exp .tip') || {}).textContent);
  ok('auto-collect message', /모르는 단어에 넣었어요/.test(msg || ''), msg);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('jpt14-v1')));
  ok('saved words', Object.keys(st.words || {}).length > 0, Object.keys(st.words || {}));
  ok('keys kept', 'wrong' in st && 'done' in st);
  await p.click('.dbtn[data-day="-1"]'); await p.waitForTimeout(200);
  ok('hash', await p.evaluate(() => location.hash) === '#words');
  const stat = await p.evaluate(() => document.querySelector('.wstat').textContent);
  ok('stat', /모르는 단어 \d+/.test(stat), stat);
  // mode should default to unk (nothing due yet)
  ok('default mode unk', await p.evaluate(() => wmode) === 'unk');
  // reveal reading
  const hidden = await p.evaluate(() => document.querySelectorAll('#wlist .wc .wr.wh:not(.shown)').length);
  await p.click('#wlist .wc .wr');
  const hidden2 = await p.evaluate(() => document.querySelectorAll('#wlist .wc .wr.wh:not(.shown)').length);
  ok('reveal reading', hidden2 === hidden - 1, [hidden, hidden2]);
  await p.screenshot({ path: process.argv[2] + '/words-unk.png' });
  // SRS: simulate 1 day later
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('jpt14-v1')); Object.values(s.words).forEach(e => e.t -= 1); localStorage.setItem('jpt14-v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(300);
  const dueN = await p.evaluate(() => wlist('due').length);
  ok('due after 1 day', dueN > 0, dueN);
  ok('nav badge', /복습/.test(await p.textContent('#wdcnt')), await p.textContent('#wdcnt'));
  await p.click('.dbtn[data-day="-1"]'); await p.waitForTimeout(100);
  ok('default mode due', await p.evaluate(() => wmode) === 'due');
  await p.click('#wlist .wc .wyes');
  const after = await p.evaluate(() => ({ due: wlist('due').length, st: JSON.parse(localStorage.getItem('jpt14-v1')) }));
  ok('yes removes from due', after.due === dueN - 1, after.due);
  const stage = Object.values(after.st.words).filter(e => e.s === 1).length;
  ok('stage advanced to 2 (3-day)', stage === 1, stage);
  await p.click('#wlist .wc .wno');
  const reset = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('jpt14-v1')).words).filter(e => e.s === 0 && e.l === today()).length);
  ok('no resets stage', reset === 1, reset);
  // graduation
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('jpt14-v1')); const k = Object.keys(s.words)[2]; s.words[k] = { t: today() - 7, s: 2 }; localStorage.setItem('jpt14-v1', JSON.stringify(s)); });
  await p.reload(); await p.click('.dbtn[data-day="-1"]');
  const grad = await p.evaluate(() => { const w = Object.keys(JSON.parse(localStorage.getItem('jpt14-v1')).words)[2]; return w; });
  // all mode, more, day filter
  await p.click('[data-wm="all"]');
  const n1 = await p.evaluate(() => document.querySelectorAll('#wlist .wc').length);
  ok('all mode paginated', n1 === 40, n1);
  await p.click('#wmore');
  ok('more', (await p.evaluate(() => document.querySelectorAll('#wlist .wc').length)) === 80);
  await p.selectOption('#wday', '15');
  ok('day filter', (await p.evaluate(() => document.querySelectorAll('#wlist .wc').length)) > 0);
  await p.click('#wtm'); ok('toggle meaning shown', await p.evaluate(() => document.querySelectorAll('#wlist .wm.wh').length) === 0);
  // scroll width, other tabs still fine
  for (const h of ['#words', '#review', '#day-3', '#day-33']) {
    await p.goto(url + h); await p.waitForTimeout(250);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok('no h-scroll ' + h, w <= 400, w);
  }
  await p.goto(url + '#words'); await p.click('[data-wm="all"]');
  await p.click('.fsfloat .fsup'); await p.click('.fsfloat .fsup');
  ok('font size affects words', (await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ww')).fontSize))) > 30);
  ok('no h-scroll at 130%', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 400);
  await p.screenshot({ path: process.argv[2] + '/words-all.png' });
  await p.click('#furibtn').catch(() => {});
  ok('errors', errs.length === 0, errs);
  await b.close();
})();
