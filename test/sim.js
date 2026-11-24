// Uji keseimbangan: bot memainkan game beberapa tahun.
const E = require('../src/engine.js');
const JT = E.JT;
function restock(s, days) {
  const need = E.forecastNeeds(s);
  for (const k in E.ING) {
    const d = Math.min(days, E.shelf(s, k) - 1);
    let q = Math.max(need[k], s.use[k]) * d * 1.15 - E.stockQty(s, k);
    q = Math.ceil(q / E.ING[k].step) * E.ING[k].step;
    if (q > 0) E.buy(s, k, q);
  }
}
const bots = {
  pasif(s) { restock(s, 3); },
  wajar(s) {
    if (!s.research.r_supplier) restock(s, 3);
    const fixed = E.dailyWages(s) * 30 + s.outlets.reduce((a, o) => a + E.rent(s, o), 0);
    const reserve = 5 * JT + fixed * 1.3;
    if (s.cash < 2 * JT) { for (const ty of ['kur', 'bank']) { const lim = E.loanLimit(s, ty); if (lim >= 5 * JT) { E.takeLoan(s, ty, Math.min(lim, Math.max(10 * JT, fixed)), 24); break; } } }
    for (const o of s.outlets) {
      if (o.last && o.last.util > 0.92) {
        const staffCap = E.capacity(s, o);
        if (staffCap >= E.EQUIP[o.equip].cap * 0.95) { if (s.cash > reserve + E.EQUIP[Math.min(3, o.equip + 1)].cost) E.upgradeEquip(s, o.id); }
        else if (s.cash > reserve) E.hire(s, o.id);
      }
    }
    const order = ['r_cert', 'r_supplier', 'r_ojol', 'r_pos', 'r_moka', 'r_kulkas', 'r_cold', 'r_loyal', 'r_liter', 'r_franchise', 'r_roastery'];
    for (const r of order) if (!s.research[r] && !E.canResearch(s, r) && s.cash > reserve + E.RES[r].cost * 1.5) { E.research(s, r); break; }
    if (s.day % 14 === 0 && s.cash > reserve + 6 * JT) E.campaign(s, s.cash > 60 * JT && s.rep >= 40 ? 'endorse' : 'sosmed');
    if (s.training < 3 && s.cash > reserve + E.trainCost(s) * 2) E.train(s);
    if (s.grade < 2 && s.rep > 45 + s.grade * 12 && s.cash > reserve) s.grade++;
    for (const o of s.outlets) if (o.dekor < 2 && s.cash > reserve + E.DEKOR[o.dekor + 1].cost * 3) E.upgradeDekor(s, o.id);
    const wmin = Math.min(...s.outlets.map(o => E.wtpOf(s, o)));
    for (const k in E.MENU) E.setPrice(s, k, E.MENU[k].ref * wmin);
    for (const o of s.outlets) { o.adj = Math.min(60, Math.round((E.wtpOf(s, o) / wmin - 1) * 20) * 5);
      if (o.last && o.last.util < 0.5 && o.staff > (o.own ? 0 : 1) && s.day % 10 === 0) E.fire(s, o.id); }
    const next = ['kampus', 'pasar', 'kantor', 'wisata', 'mall'].find(l => !s.outlets.some(o => o.loc === l));
    if (next && s.rep >= 50 && s.months.length && E.monthProfit(s.months[s.months.length-1]) > 0) {
      const cost = E.setupCost(s, next);
      if (s.cash < cost + reserve && s.day >= 30 && E.debt(s) < 20 * JT) {
        const lim = Math.max(E.loanLimit(s, 'kur'), 0);
        const want = Math.min(lim, cost);
        if (want >= 10 * JT && E.rev30(s) > want * 0.25) E.takeLoan(s, 'kur', want, 24);
      }
      if (s.cash > cost + reserve) E.openOutlet(s, next);
    }
  },
};
function play(name, seed, days, mode) {
  const s = E.newGame({ seed, mode });
  const marks = [30, 90, 180, 360, 720, 1080, 1440], out = [];
  let events = 0;
  for (let i = 0; i < days && !s.over; i++) {
    while (s.pending) {
      events++;
      const ev = E.buildEvent(s);
      let idx = ev.choices.findIndex(c => !c.can || c.can(s));
      if (/naik gaji/.test(ev.title)) idx = s.wagePct >= 110 ? 2 : 0;
      if (name === 'pasif') idx = ev.choices.length - 1;
      E.resolveEvent(s, idx);
    }
    bots[name](s);
    E.runDay(s);
    if (marks.includes(s.day - 1)) {
      const m = s.months[s.months.length - 1];
      out.push(`  hari ${String(s.day - 1).padStart(4)}: kas ${(s.cash / JT).toFixed(1).padStart(8)}jt rep ${s.rep.toFixed(0).padStart(3)} outlet ${s.outlets.length} mitra ${s.franchise.length} omzet/bln ${(m ? m.rev / JT : 0).toFixed(1).padStart(7)}jt laba/bln ${(m ? E.monthProfit(m) / JT : 0).toFixed(1).padStart(7)}jt utang ${(E.debt(s) / JT).toFixed(0)}jt valuasi ${(E.valuation(s) / JT).toFixed(0)}jt`);
    }
  }
  console.log(`${name} seed=${seed} ${mode || 'realistis'} ${s.over ? 'BANGKRUT hari ' + s.day : ''} kejadian=${events} goals=${Object.entries(s.goals).map(([k, d]) => k.slice(2) + '@' + d).join(' ')}`);
  console.log(out.join('\n'));
  return s;
}
const days = +process.argv[2] || 1440;
for (const seed of [11, 22, 33]) play('wajar', seed, days);
play('pasif', 11, 720);
play('pasif', 22, 720);
if (process.argv[3]) { const s = play('wajar', 22, 800); console.log(s.months.map(m => JSON.stringify(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v / 1000)])))).join('\n')); console.log(s.outlets, s.grade, s.training, s.research, s.wagePct); }
