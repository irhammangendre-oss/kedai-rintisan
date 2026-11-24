const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 800 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + __dirname + '/../index.html');
  await p.screenshot({ path: process.argv[2] + '/start.png' });
  await p.click('button[type=submit]');
  const tabs = ['menu', 'stok', 'outlet', 'pasar', 'uang', 'riset', 'catatan', 'ringkasan'];
  for (const t of tabs) await p.click(`.side [data-id=${t}]`);
  await p.click('.side [data-id=stok]'); await p.click('[data-act=buyall]');
  await p.click('.side [data-id=menu]'); await p.click('[data-act=price][data-k=kopsus][data-d="500"]');
  let events = 0;
  for (let i = 0; i < 120; i++) {
    for (let g = 0; g < 4 && await p.locator('#modal.on').count(); g++) { events++; await p.locator('#modal.on button:not(:disabled)').first().click(); }
    if (i % 2 === 0) { await p.click('.side [data-id=stok]'); const btn = p.locator('[data-act=buyall]'); if (await btn.isEnabled()) await btn.click(); }
    if (i === 40) { await p.click('.side [data-id=uang]'); await p.click('[data-act=loan]'); await p.click('.side [data-id=riset]'); await p.click('[data-act=research][data-id=r_supplier]'); await p.click('.side [data-id=outlet]'); await p.locator('[data-act=hire]').first().click(); }
    if (i === 60) { for (const t of tabs) await p.click(`.side [data-id=${t}]`); await p.screenshot({ path: process.argv[2] + '/play.png' }); }
    if (i > 60 && i % 10 === 0) { const s = p.locator('[data-act=skip]'); if (await s.isEnabled()) await s.click(); continue; }
    await p.click('#next');
  }
  for (let g = 0; g < 4 && await p.locator('#modal.on').count(); g++) await p.locator('#modal.on button:not(:disabled)').first().click();
  await p.click('.side [data-id=uang]'); await p.screenshot({ path: process.argv[2] + '/uang.png' });
  await p.click('.side [data-id=outlet]'); await p.screenshot({ path: process.argv[2] + '/outlet.png', fullPage: false });
  const st = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kedai-rintisan-v1')); return { day: s.day, cash: s.cash, rep: s.rep, loans: s.loans.length, staff: s.outlets[0].staff }; });
  console.log(JSON.stringify(st), 'events', events, 'errors', errs.length ? errs : 'none');
  await b.close();
})();
