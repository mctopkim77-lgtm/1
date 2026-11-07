// usage: node words_game_test.js <screenshot-dir> [file:///path/page.html]
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[3] || 'file:///home/user/1/tools/jpt-build/out.html';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  let fails = 0;
  const ok = (n, c, x) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, x === undefined ? '' : JSON.stringify(x)); };
  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('jpt14-v1')));
  await p.goto(url + '#words'); await p.waitForTimeout(300);
  ok('hub visible', await p.locator('.ghub').count() === 1);
  await p.screenshot({ path: process.argv[2] + '/game-hub.png' });
  // ---- quest ----
  await p.click('[data-g="quest"]');
  ok('quest card', await p.locator('.gcard .gw').count() === 1);
  ok('show disabled first', await p.locator('#gshow').isDisabled());
  await p.waitForTimeout(2200);
  ok('show enabled after 2s', !(await p.locator('#gshow').isDisabled()));
  await p.screenshot({ path: process.argv[2] + '/game-quest1.png' });
  const total = await p.evaluate(() => gv.ids.length);
  ok('20 words', total === 20, total);
  // rate: 18 known, 1 confused, 1 unknown
  for (let n = 0; n < total; n++) {
    await p.waitForTimeout(n === 0 ? 0 : 2100);
    await p.click('#gshow');
    if (n === 0) await p.screenshot({ path: process.argv[2] + '/game-quest2.png' });
    const r = n === total - 2 ? 'r1' : n === total - 1 ? 'r0' : 'r2';
    await p.click('[data-g="' + r + '"]');
  }
  ok('end screen', await p.locator('.gend .gbigt').count() === 1);
  await p.screenshot({ path: process.argv[2] + '/game-quest-end.png' });
  let st = await S();
  ok('known stored', Object.keys(st.wk || {}).length === 18, Object.keys(st.wk || {}).length);
  ok('review stored', Object.keys(st.words || {}).length === 2, Object.keys(st.words || {}));
  ok('xp gained', st.g.xp > 200, st.g.xp);
  ok('streak 1', st.g.st === 1 && st.g.n === 1, st.g);
  ok('quest done today', st.g.qd > 0);
  // home shows completed
  await p.click('[data-g="home"]');
  ok('home hub', /완료/.test(await p.textContent('[data-g="quest"]')));
  // next-day SRS: shift entries 1 day
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('jpt14-v1')); Object.values(s.words).forEach(e => { e.t -= 1; e.l -= 1; }); s.g.last -= 1; s.g.qd -= 1; localStorage.setItem('jpt14-v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(300);
  ok('streak survives 1 day', await p.evaluate(() => gstreak()) === 1);
  await p.click('[data-g="quest"]');
  const first2 = await p.evaluate(() => gv.ids.slice(0, 2).map(i => WORDS[i][0]));
  const dueWords = Object.keys((await S()).words);
  ok('due words come first', first2.every(w => dueWords.includes(w)), [first2, dueWords]);
  await p.waitForTimeout(2100); await p.click('#gshow'); await p.click('[data-g="r2"]');
  st = await S();
  ok('due known advances stage', Object.values(st.words).some(e => e.s === 1), st.words);
  await p.click('[data-g="home"]');
  // ---- battle ----
  await p.click('[data-g="battle"]');
  ok('battle 4 options', await p.locator('.gopt').count() === 4);
  const o = await p.evaluate(() => { const m = WORDS[gv.ids[gv.i]][2]; return { m, opts: gv.opts, ans: gv.ans }; });
  ok('answer in options', o.opts[o.ans] === o.m && new Set(o.opts).size === 4, o);
  await p.screenshot({ path: process.argv[2] + '/game-battle.png' });
  await p.click('[data-g="o' + o.ans + '"]');
  ok('correct highlighted', await p.locator('.gopt.ok').count() === 1);
  await p.screenshot({ path: process.argv[2] + '/game-battle-ok.png' });
  await p.waitForTimeout(900);
  ok('advanced to q2', await p.evaluate(() => gv.i) === 1);
  // wrong answer x3 -> game over
  for (let n = 0; n < 3; n++) {
    const w = await p.evaluate(() => (gv.ans + 1) % 4);
    await p.click('[data-g="o' + w + '"]');
    await p.waitForTimeout(1800);
  }
  ok('game over', await p.evaluate(() => gv.done && gv.hearts === 0));
  await p.screenshot({ path: process.argv[2] + '/game-battle-end.png' });
  st = await S();
  ok('wrong words saved', Object.keys(st.words).length >= 3, Object.keys(st.words).length);
  ok('best saved', st.g.best > 0, st.g.best);
  // timeout test
  await p.click('[data-g="battle"]');
  await p.waitForTimeout(6600);
  ok('timeout costs heart', await p.evaluate(() => gv.hearts) === 2);
  // leaving tab abandons game and stops timers
  await p.click('.dbtn[data-day="3"]'); await p.waitForTimeout(300);
  ok('game cleared on leave', await p.evaluate(() => gv === null && gtimer === null));
  await p.click('.dbtn[data-day="-1"]');
  ok('back to hub', await p.locator('.ghub').count() === 1);
  // layout
  for (const h of ['#words']) {
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok('no h-scroll', w <= 400, w);
  }
  ok('errors', errs.length === 0, errs);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await b.close();
})();
