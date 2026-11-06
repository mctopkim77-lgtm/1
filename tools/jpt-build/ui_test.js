const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto((process.argv[3] || 'file:///home/user/1/jpt-reading-2weeks.html') + '#day-3');
  await p.waitForTimeout(400);
  const fsOf = async () => p.evaluate(() => ({
    v: getComputedStyle(document.documentElement).getPropertyValue('--fs').trim(),
    ex: parseFloat(getComputedStyle(document.querySelector('.ex, .qt')).fontSize),
    lab: document.querySelector('.fslabel').textContent
  }));
  console.log('start', JSON.stringify(await fsOf()));
  await p.click('.fsfloat .fsup');
  await p.click('.fsfloat .fsup');
  console.log('after +2', JSON.stringify(await fsOf()));
  await p.screenshot({ path: process.argv[2] + '/z130.png' });
  for (let i = 0; i < 5; i++) {
    const dis = await p.evaluate(() => document.querySelector('.fsfloat .fsup').disabled);
    if (!dis) await p.click('.fsfloat .fsup');
  }
  console.log('max', JSON.stringify(await fsOf()), 'upDisabled', await p.evaluate(() => document.querySelector('.fsup').disabled));
  await p.goto((process.argv[3] || 'file:///home/user/1/jpt-reading-2weeks.html') + '#day-12');
  await p.waitForTimeout(400);
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  const qs = await p.$$('.q');
  await qs[3].scrollIntoViewIfNeeded();
  await p.screenshot({ path: process.argv[2] + '/z170.png' });
  console.log('persist after reload', JSON.stringify(await fsOf()), 'scrollWidth', w);
  for (let i = 0; i < 8; i++) {
    const dis = await p.evaluate(() => document.querySelector('.fsfloat .fsdown').disabled);
    if (!dis) await p.click('.fsfloat .fsdown');
  }
  console.log('min', JSON.stringify(await fsOf()));
  console.log('errors', errs.length, errs.join('|'));
  await b.close();
})();
