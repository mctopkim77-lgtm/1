const { chromium } = require('playwright');
(async () => {
  const url = 'file:///home/user/1/jpt-reading-2weeks.html';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  let fails = 0;
  const ok = (n, c, x) => { if (!c) fails++; console.log(c ? 'PASS' : 'FAIL', n, x === undefined ? '' : JSON.stringify(x)); };
  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('jpt14-v1') || '{}'));
  await p.goto(url + '#day-1'); await p.waitForTimeout(300);
  // 1) checklist
  const boxes = p.locator('input[type=checkbox][data-k]');
  const nb = await boxes.count();
  await boxes.nth(0).check(); await boxes.nth(1).check();
  // 2) quiz: right + wrong
  const q = await p.evaluate(() => DAYS[0].quiz.slice(0, 2).map(x => x.a));
  await p.click('.q[data-qi="0"] .opt[data-o="' + q[0] + '"]');
  await p.click('.q[data-qi="1"] .opt[data-o="' + ((q[1] + 1) % 4) + '"]');
  // 3) settings
  await p.click('#furibtn'); await p.click('.fsfloat .fsup');
  const before = await S();
  ok('saved to storage', Object.keys(before.done || {}).length === 2 && Object.keys(before.wrong || {}).length === 1, { done: before.done, wrong: before.wrong, furi: before.furi, fs: before.fs });
  // 4) reload
  await p.reload(); await p.waitForTimeout(400);
  ok('checkbox restored', await boxes.nth(0).isChecked() && await boxes.nth(1).isChecked() && !(await boxes.nth(2).isChecked()), nb);
  const after = await S();
  ok('wrong kept', JSON.stringify(after.wrong) === JSON.stringify(before.wrong));
  ok('furi/fs kept', after.furi === before.furi && after.fs === before.fs, [after.furi, after.fs]);
  await p.click('.dbtn[data-day="0"]'); await p.waitForTimeout(200);
  ok('review shows wrong q', (await p.locator('#panel .q').count()) >= 1, await p.locator('#panel .q').count());
  // progress bar
  await p.goto(url + '#day-1'); await p.waitForTimeout(300);
  // complete all tasks of day 1 -> progress + done mark
  const n = await boxes.count(); for (let i = 0; i < n; i++) await boxes.nth(i).check();
  await p.reload(); await p.waitForTimeout(300);
  ok('day marked done after reload', await p.locator('.dbtn[data-day="1"].done').count() === 1);
  ok('progress text', /1 \/ 14/.test(await p.textContent('body')), (await p.textContent('#progtxt, .progress, body')).match(/\d+ \/ 14/));
  // 5) words & game data persist
  await p.goto(url + '#words'); await p.waitForTimeout(200);
  await p.click('[data-g="battle"]');
  const a = await p.evaluate(() => gv.ans); await p.click('[data-g="o' + a + '"]');
  await p.reload(); await p.waitForTimeout(300);
  const g = await S();
  ok('game xp persisted', g.g && g.g.xp > 0, g.g);
  ok('study data intact after game', Object.keys(g.done).length > 2 && Object.keys(g.wrong).length === 1);
  // 6) reset button wipes
  await p.goto(url); await p.waitForTimeout(200);
  await p.click('#reset'); await p.click('#reset');
  const r = await S();
  ok('reset clears', Object.keys(r.done).length === 0 && Object.keys(r.wrong).length === 0);
  // 7) storage blocked -> no crash
  const c2 = await b.newContext({ viewport: { width: 400, height: 800 } });
  await c2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const p2 = await c2.newPage(); const e2 = [];
  p2.on('pageerror', e => e2.push(String(e)));
  await p2.goto(url + '#day-1'); await p2.waitForTimeout(300);
  await p2.locator('input[type=checkbox][data-k]').nth(0).check().catch(() => {});
  await p2.click('.dbtn[data-day="-1"]'); await p2.click('[data-g="battle"]').catch(() => {});
  ok('no crash when storage blocked', e2.length === 0, e2);
  ok('errors', errs.length === 0, errs);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await b.close();
})();
