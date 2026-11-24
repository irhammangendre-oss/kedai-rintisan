// Uji browser. Pakai: node test/smoke.js <folder-screenshot> [folder node_modules berisi gsap, motion, lenis]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '.', libs = process.argv[3];
const map = { 'gsap.min.js': 'gsap/dist/gsap.min.js', 'ScrollTrigger.min.js': 'gsap/dist/ScrollTrigger.min.js', 'motion.js': 'motion/dist/motion.js', 'lenis.min.js': 'lenis/dist/lenis.min.js' };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 800 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, r => { const f = libs && map[r.request().url().split('/').pop()]; f ? r.fulfill({ body: fs.readFileSync(path.join(libs, f)), contentType: 'text/javascript' }) : r.abort(); });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForTimeout(900); await p.screenshot({ path: out + '/start.png' });
  await p.click('button[type=submit]');
  await p.waitForTimeout(1600); await p.screenshot({ path: out + '/home.png' });
  const dismiss = async () => { for (let g = 0; g < 4 && await p.locator('#modal.on').count(); g++) { await p.locator('#modal.on button:not(:disabled)').first().click(); await p.waitForTimeout(30); } };
  const run = async (sel, shot) => {
    await p.click(sel);
    if (await p.locator('#stage.on').count()) { if (shot) { await p.waitForTimeout(shot); await p.screenshot({ path: out + '/stage.png' }); } await p.click('#st-skip'); }
    await dismiss();
  };
  const tabs = ['menu', 'stok', 'outlet', 'pasar', 'uang', 'riset', 'catatan', 'ringkasan'];
  for (const t of tabs) await p.click(`.side [data-id=${t}]`);
  await p.click('.side [data-id=stok]'); await p.click('[data-act=buyall]');
  await run('#next', 3300);
  await p.waitForTimeout(1300); await p.screenshot({ path: out + '/after.png' });
  for (let i = 0; i < 100; i++) {
    await dismiss();
    if (i % 2 === 0) { await p.click('.side [data-id=stok]'); const btn = p.locator('[data-act=buyall]'); if (await btn.isEnabled()) await btn.click(); }
    if (i === 40) { await p.click('.side [data-id=uang]'); await p.click('[data-act=loan]'); await p.click('.side [data-id=riset]'); await p.click('[data-act=research][data-id=r_supplier]'); await p.click('[data-act=research][data-id=r_ojol]'); await p.click('.side [data-id=outlet]'); await p.locator('[data-act=hire]').first().click(); await p.locator('[data-act=dekor]').first().click(); }
    if (i > 60 && i % 10 === 0) { const s = p.locator('[data-act=skip]'); if (await s.isEnabled()) { await run('[data-act=skip]', i === 70 ? 2000 : 0); if (i === 70) fs.renameSync(out + '/stage.png', out + '/stage7.png'); continue; } }
    await run('#next', i === 55 ? 3000 : 0); if (i === 55) fs.renameSync(out + '/stage.png', out + '/stage1.png');
  }
  await dismiss();
  await p.click('.side [data-id=outlet]'); await p.waitForTimeout(1500); await p.screenshot({ path: out + '/outlet.png' });
  const st = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kedai-rintisan-v1')); return { day: s.day, cash: Math.round(s.cash), rep: Math.round(s.rep), loans: s.loans.length, staff: s.outlets[0].staff, libs: [!!window.gsap, !!window.Motion, !!window.Lenis], hidden: [...document.querySelectorAll('#page .card')].filter(e => getComputedStyle(e).opacity === '0' && e.getBoundingClientRect().top < innerHeight).length }; });
  console.log(JSON.stringify(st), 'errors', errs.length ? errs : 'none');
  await b.close();
})();
