/* Kedai Rintisan: mesin simulasi. Tanpa DOM, bisa dijalankan di Node untuk uji keseimbangan. */
const Engine = (() => {
  'use strict';
  const VERSION = 1;
  const JT = 1e6;

  /* ---------- Data ---------- */
  const ING = {
    kopi: { n: 'Biji kopi', u: 'kg', p: 120000, shelf: 60, step: 0.5 },
    susu: { n: 'Susu segar', u: 'liter', p: 18000, shelf: 5, step: 1 },
    gula: { n: 'Gula aren', u: 'kg', p: 30000, shelf: 90, step: 0.5 },
    roti: { n: 'Roti tawar', u: 'porsi', p: 4000, shelf: 3, step: 5 },
    cokelat: { n: 'Cokelat bubuk', u: 'kg', p: 90000, shelf: 120, step: 0.5 },
    cup: { n: 'Gelas & kemasan', u: 'pcs', p: 600, shelf: 9999, step: 50 },
  };
  const GRADES = [
    { n: 'Robusta pasar', m: 1, q: 0 },
    { n: 'Arabika lokal', m: 1.35, q: 7 },
    { n: 'Specialty single origin', m: 1.9, q: 14 },
  ];
  const MENU = {
    tubruk: { n: 'Kopi Tubruk', r: { kopi: 0.012, gula: 0.005, cup: 1 }, ref: 8000, pop: 0.9, t: 'hot' },
    kopsus: { n: 'Kopi Susu', r: { kopi: 0.015, susu: 0.12, gula: 0.01, cup: 1 }, ref: 15000, pop: 1.1, t: 'hot' },
    aren: { n: 'Es Kopi Aren', r: { kopi: 0.015, susu: 0.1, gula: 0.03, cup: 1 }, ref: 18000, pop: 1.0, t: 'cold' },
    roti: { n: 'Roti Bakar', r: { roti: 1, gula: 0.01, cokelat: 0.005 }, ref: 12000, pop: 0.6, t: 'food' },
    moka: { n: 'Moka Cokelat', r: { kopi: 0.015, susu: 0.12, cokelat: 0.02, cup: 1 }, ref: 22000, pop: 0.5, t: 'hot', need: 'r_moka' },
    coldbrew: { n: 'Seduh Dingin', r: { kopi: 0.025, cup: 1 }, ref: 20000, pop: 0.45, t: 'cold', need: 'r_cold' },
    literan: { n: 'Kopi Susu Literan', r: { kopi: 0.06, susu: 0.5, gula: 0.08, cup: 3 }, ref: 65000, pop: 0.16, t: 'cold', need: 'r_liter' },
  };
  const LOCS = {
    gang: { n: 'Gang Kampung', rent: 1.5 * JT, traffic: 115, wtp: 0.85, setup: 8 * JT, equip: 0,
      dow: [1, 1, 1, 1, 1.05, 1.15, 1.1], d: 'Sewa murah, pelanggan tetangga, harga harus ramah.' },
    pasar: { n: 'Dekat Pasar', rent: 3 * JT, traffic: 140, wtp: 0.88, setup: 18 * JT, equip: 0,
      dow: [1, 1, 1, 1, 1.05, 1.2, 1.25], d: 'Ramai tiap hari, paling ramai akhir pekan. Rawan banjir.' },
    kampus: { n: 'Depan Kampus', rent: 4 * JT, traffic: 170, wtp: 0.92, setup: 25 * JT, equip: 0,
      dow: [1.1, 1.1, 1.1, 1.1, 1.05, 0.6, 0.45], d: 'Mahasiswa banyak, tapi sepi saat libur semester.' },
    kantor: { n: 'Kawasan Perkantoran', rent: 14 * JT, traffic: 220, wtp: 1.2, setup: 90 * JT, equip: 1, share: 0.05,
      dow: [1.15, 1.15, 1.15, 1.15, 1.1, 0.4, 0.3], d: 'Pegawai mau bayar lebih. Akhir pekan nyaris kosong. Pengelola gedung memungut 5% omzet.' },
    wisata: { n: 'Kota Wisata', rent: 17 * JT, traffic: 270, wtp: 1.25, setup: 140 * JT, equip: 1, share: 0.06,
      dow: [0.7, 0.7, 0.7, 0.75, 1.1, 1.7, 1.7], d: 'Meledak saat akhir pekan dan musim liburan. Retribusi kawasan 6% omzet.' },
    mall: { n: 'Kios Mal', rent: 32 * JT, traffic: 330, wtp: 1.3, setup: 230 * JT, equip: 1, share: 0.12,
      dow: [0.8, 0.8, 0.8, 0.85, 1.1, 1.5, 1.5], d: 'Sewa paling mahal, pengunjung paling banyak, tidak takut hujan. Mal memungut bagi hasil 12% omzet.' },
  };
  const EQUIP = [
    { n: 'Kompor & saringan', cap: 130, cost: 0 },
    { n: 'Mesin espresso bekas', cap: 280, cost: 12 * JT },
    { n: 'Mesin espresso 2 grup', cap: 520, cost: 35 * JT },
    { n: 'Bar lengkap', cap: 900, cost: 80 * JT },
  ];
  const DEKOR = [
    { n: 'Seadanya', cost: 0 },
    { n: 'Rapi & nyaman', cost: 5 * JT },
    { n: 'Instagramable', cost: 20 * JT },
  ];
  const TRAIN = [0, 3 * JT, 8 * JT, 20 * JT];
  const RES = {
    r_supplier: { n: 'Kontrak pemasok langganan', cost: 1.5 * JT, d: 'Bahan dikirim otomatis tiap pagi sesuai target stok (harga +3%).' },
    r_ojol: { n: 'Kemitraan ojek online', cost: 2 * JT, d: 'Pesanan bertambah sekitar 25%, komisi aplikasi 20% dari pesanan daring.' },
    r_moka: { n: 'Resep Moka Cokelat', cost: 3 * JT, d: 'Menu baru bermargin tinggi.' },
    r_cold: { n: 'Resep Seduh Dingin', cost: 4 * JT, d: 'Menu dingin tanpa susu, laris saat terik.' },
    r_liter: { n: 'Kopi Susu Literan', cost: 5 * JT, d: 'Botol 1 liter untuk pesanan daring.', need: 'r_ojol' },
    r_kulkas: { n: 'Kulkas besar', cost: 6 * JT, d: 'Susu tahan 8 hari, roti tahan 4 hari.' },
    r_pos: { n: 'Kasir digital', cost: 5 * JT, d: 'Menutup selisih kas 2,5% di cabang yang tidak Anda jaga sendiri.' },
    r_cert: { n: 'Sertifikat halal & laik higiene', cost: 4 * JT, d: 'Kualitas +3 dan aman saat sidak dinas.' },
    r_loyal: { n: 'Program kartu pelanggan', cost: 8 * JT, d: 'Lebih banyak pengunjung yang jadi pembeli.' },
    r_roastery: { n: 'Dapur sangrai sendiri', cost: 60 * JT, d: 'Biaya biji kopi turun 25%, kualitas +5.', outlets: 3 },
    r_franchise: { n: 'SOP & legal waralaba', cost: 40 * JT, d: 'Calon mitra waralaba mulai berdatangan.', outlets: 3, rep: 70 },
  };
  const CAMP = {
    brosur: { n: 'Brosur & spanduk', cost: 0.4 * JT, buzz: 0.08 },
    sosmed: { n: 'Iklan media sosial', cost: 1.5 * JT, buzz: 0.2 },
    endorse: { n: 'Endorse selebgram', cost: 6 * JT, buzz: 0.5, rep: 40 },
    baliho: { n: 'Baliho & radio kota', cost: 15 * JT, buzz: 0.9, outlets: 3 },
  };
  const LOAN = {
    kur: { n: 'KUR Mikro', rate: 0.06, max: 100 * JT, minDay: 30, d: 'Bunga 6% setahun, plafon total Rp 100 juta. Syarat: usaha berjalan 30 hari.' },
    bank: { n: 'Kredit usaha bank', rate: 0.12, max: 2000 * JT, minDay: 90, d: 'Bunga 12% setahun, plafon 4x omzet 30 hari terakhir. Syarat: usaha berjalan 90 hari.' },
  };
  const GOALS = [
    { id: 'g_untung', n: 'Tutup bulan dengan laba' },
    { id: 'g_rep50', n: 'Reputasi 50' },
    { id: 'g_cabang', n: 'Buka cabang kedua' },
    { id: 'g_omzet50', n: 'Omzet Rp 50 juta dalam sebulan' },
    { id: 'g_tiga', n: 'Tiga outlet berjalan' },
    { id: 'g_rep75', n: 'Reputasi 75' },
    { id: 'g_mitra', n: 'Mitra waralaba pertama' },
    { id: 'g_lima', n: 'Lima outlet milik sendiri' },
    { id: 'g_valuasi', n: 'Valuasi usaha Rp 5 miliar' },
  ];
  const WX = { cerah: 'Cerah', mendung: 'Mendung', hujan: 'Hujan', terik: 'Terik' };
  const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const TAX_FREE = 500 * JT, UMKM_MAX = 4800 * JT;

  /* ---------- Util ---------- */
  function rnd(s) {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const gauss = s => (rnd(s) + rnd(s) + rnd(s) + rnd(s) - 2) / 0.577;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pick = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
  const R = Math.round;

  function cal(day) {
    const dom = (day - 1) % 30 + 1, month = (Math.floor((day - 1) / 30) + 4) % 12 + 1; /* hari 1 = 1 Mei */
    return { dom, month, year: Math.floor((day - 1) / 360) + 1, wd: (day - 1) % 7 };
  }
  function dateStr(day) {
    const c = cal(day);
    return HARI[c.wd] + ', ' + c.dom + ' ' + BULAN[c.month - 1] + ' tahun ke-' + c.year;
  }
  function seasonTags(day) {
    const c = cal(day), tags = [];
    if ([11, 12, 1, 2, 3].includes(c.month)) tags.push('Musim hujan');
    if (c.month === 3) tags.push('Ramadan');
    if (c.month === 4 && c.dom <= 7) tags.push('Libur Lebaran');
    if (c.month === 7 || (c.month === 8 && c.dom <= 15) || (c.month === 1 && c.dom <= 15)) tags.push('Libur kampus');
    if (c.month === 12 && c.dom >= 18) tags.push('Libur akhir tahun');
    return tags;
  }
  function seasonF(loc, day) {
    const t = seasonTags(day);
    let f = 1;
    if (t.includes('Ramadan')) f *= loc === 'mall' ? 0.9 : 0.72;
    if (t.includes('Libur Lebaran')) f *= ({ kampus: 0.25, kantor: 0.25, gang: 1.2, pasar: 0.8, wisata: 1.9, mall: 1.6 })[loc];
    if (t.includes('Libur kampus') && loc === 'kampus') f *= 0.45;
    if (t.includes('Libur akhir tahun')) f *= ({ wisata: 1.6, mall: 1.45, kantor: 0.7 })[loc] || 1;
    return f;
  }
  function rollWeather(s, day) {
    const rainy = [11, 12, 1, 2, 3].includes(cal(day).month);
    const p = rainy ? [0.2, 0.25, 0.5, 0.05] : [0.5, 0.17, 0.08, 0.25];
    const keys = ['cerah', 'mendung', 'hujan', 'terik'];
    let x = rnd(s);
    for (let i = 0; i < 4; i++) { if (x < p[i]) return keys[i]; x -= p[i]; }
    return 'cerah';
  }

  /* ---------- State ---------- */
  function newMonth() {
    return { rev: 0, royalty: 0, cogs: 0, waste: 0, wages: 0, rent: 0, mkt: 0, fee: 0, interest: 0, tax: 0, owner: 0, ops: 0, other: 0, capex: 0, cust: 0 };
  }
  function monthProfit(m) {
    return m.rev + m.royalty - m.cogs - m.waste - m.wages - m.rent - m.mkt - m.fee - m.interest - m.tax - m.owner - (m.ops || 0) - m.other;
  }
  function newOutlet(s, loc, first) {
    return { id: s.nextId++, loc, opened: s.day, staff: first ? 0 : 1, equip: LOCS[loc].equip, dekor: 0, morale: 60,
      comp: 0, closed: 0, broken: 0, rentMult: 1, known: first ? 0.5 : 0.3, adj: 0, own: !!first, last: null };
  }
  function newGame(opt) {
    opt = opt || {};
    const santai = opt.mode === 'santai';
    const s = {
      v: VERSION, seed: (opt.seed || Math.floor(Math.random() * 2 ** 31)) | 0, mode: santai ? 'santai' : 'realistis',
      brand: (opt.brand || 'Kedai Rintisan').slice(0, 28), day: 1, cash: santai ? 25 * JT : 15 * JT,
      rep: 32, buzz: 0, wagePct: 100, baseWage: 110000, infl: 1, grade: 0, training: 0, nextId: 1,
      prices: {}, active: {}, stock: {}, pidx: {}, use: {}, outlets: [], research: {}, loans: [],
      ojol: false, auto: { on: false, days: 3 }, franchise: [], equity: 0,
      wx: 'cerah', wxNext: 'cerah', wxFc: 'cerah',
      hist: [], months: [], cur: newMonth(), ytdRev: 0, taxDue: 0, wagesDue: 0,
      log: [], last: null, pending: null, eventCd: 4, flags: {}, evLast: {}, goals: {}, negDays: 0, over: null, won: false,
    };
    for (const k in MENU) { s.prices[k] = R(MENU[k].ref * 0.82 / 500) * 500; s.active[k] = true; }
    for (const k in ING) { s.stock[k] = []; s.pidx[k] = 1; s.use[k] = 0; }
    s.outlets.push(newOutlet(s, 'gang', true));
    s.wxNext = rollWeather(s, 2); s.wxFc = s.wxNext;
    const need = forecastNeeds(s);
    for (const k in ING) {
      const q = Math.ceil(need[k] * Math.min(3, ING[k].shelf - 1) / ING[k].step) * ING[k].step;
      s.stock[k].push({ q, age: 0, c: ING[k].p, g: 0 });
      s.use[k] = need[k];
    }
    addLog(s, 'Warung pertama Anda buka di Gang Kampung. Modal ' + rp(s.cash) + '.', 'info');
    return s;
  }
  function rp(x) { return (x < 0 ? '-' : '') + 'Rp ' + Math.abs(R(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function addLog(s, t, kind) {
    s.log.unshift({ d: s.day, t, k: kind || 'info' });
    if (s.log.length > 80) s.log.length = 80;
  }

  /* ---------- Turunan ---------- */
  const stockQty = (s, k) => s.stock[k].reduce((a, b) => a + b.q, 0);
  const stockValue = s => Object.keys(ING).reduce((a, k) => a + s.stock[k].reduce((x, b) => x + b.q * b.c, 0), 0);
  function shelf(s, k) {
    if (k === 'susu' && s.research.r_kulkas) return 8;
    if (k === 'roti' && s.research.r_kulkas) return 4;
    return ING[k].shelf;
  }
  function beanQ(s) {
    const b = s.stock.kopi, tot = stockQty(s, 'kopi');
    return tot > 0 ? b.reduce((a, x) => a + x.q * (x.g || 0), 0) / tot : GRADES[s.grade].q;
  }
  function unitPrice(s, k) {
    let p = ING[k].p * s.infl * s.pidx[k];
    if (k === 'kopi') p *= GRADES[s.grade].m * (s.research.r_roastery ? 0.75 : 1);
    return p;
  }
  function quoteBuy(s, k, q, auto) {
    let cost = unitPrice(s, k) * q;
    let disc = cost >= 10 * JT ? 0.08 : cost >= 2 * JT ? 0.05 : 0;
    if (auto) disc -= 0.03;
    return { cost: R(cost * (1 - disc)), disc };
  }
  function itemCost(s, k) {
    let c = 0;
    for (const i in MENU[k].r) c += MENU[k].r[i] * unitPrice(s, i);
    return c;
  }
  const unlocked = (s, k) => !MENU[k].need || !!s.research[MENU[k].need];
  const wage = s => s.baseWage * s.wagePct / 100;
  function dailyWages(s) {
    let n = 0;
    for (const o of s.outlets) n += o.staff + (o.own ? 0 : 1.5);
    return n * wage(s);
  }
  /* Racikan per outlet: persen takaran kopi, susu, gula. Selera tiap lokasi berbeda dan tidak ditampilkan; pemain menebaknya dari komentar. */
  const IDEAL = { gang: [100, 100, 120], pasar: [110, 100, 120], kampus: [100, 110, 110], kantor: [120, 100, 80], wisata: [100, 110, 100], mall: [110, 120, 100] };
  const mixOf = o => o.mix || { kopi: 100, susu: 100, gula: 100 };
  const mf = (o, i) => (i === 'kopi' || i === 'susu' || i === 'gula') ? mixOf(o)[i] / 100 : 1;
  function tasteDev(s, o) {
    const I = IDEAL[o.loc], m = mixOf(o);
    return { kopi: m.kopi - I[0] - (s.wx === 'hujan' ? 10 : 0), susu: m.susu - I[1] - (s.wx === 'terik' ? 10 : 0), gula: m.gula - I[2] };
  }
  function taste(s, o) { const d = tasteDev(s, o); return clamp(5.5 - 0.2 * (Math.abs(d.kopi) + Math.abs(d.susu) + Math.abs(d.gula)), -10, 5); }
  function comments(fb) {
    const buy = [], lost = [], d = fb.dev, add = (txt, w) => { for (let i = 0; i < Math.max(1, Math.round(w)); i++) buy.push(txt); };
    if (d.kopi <= -10) add('Kopinya kurang nendang', -d.kopi / 10); if (d.kopi >= 10) add('Terlalu pahit', d.kopi / 10);
    if (d.susu <= -10) add('Kurang susu', -d.susu / 10); if (d.susu >= 10) add('Kebanyakan susu', d.susu / 10);
    if (d.gula <= -10) add('Kurang manis', -d.gula / 10); if (d.gula >= 10) add('Kemanisan', d.gula / 10);
    if (fb.ratio > 1.08) add('Kemahalan', (fb.ratio - 1) * 25); else if (fb.ratio < 0.9) add('Murah banget!', 2);
    const off = Math.abs(d.kopi) + Math.abs(d.susu) + Math.abs(d.gula);
    if (off === 0 && fb.ratio <= 1.05) add('Pas banget!', 4); else if (off <= 10) add('Enak!', 2); else if (!buy.length) add('Lumayan', 1);
    if (fb.lostFrac > 0.03) lost.push(fb.short ? 'Yah, habis' : 'Antrenya lama');
    return { buy, lost };
  }
  function quality(s, o) {
    return clamp(34 + beanQ(s) + o.equip * 5 + s.training * 4 + o.dekor * 3 + (o.morale - 50) * 0.12 +
      (s.research.r_roastery ? 4 : 0) + (s.research.r_cert ? 3 : 0) + taste(s, o), 0, 100);
  }
  function capacity(s, o) {
    const staffCap = (o.own ? 70 : 0) + o.staff * 58 * (1 + 0.08 * s.training) * (0.75 + 0.5 * o.morale / 100);
    let cap = Math.min(staffCap, EQUIP[o.equip].cap);
    if (o.broken > 0) cap *= 0.6;
    return cap;
  }
  function opsCost(s) { return s.outlets.reduce((a, o) => a + (o.closed > 0 ? 0.4 : 1) * (30000 + o.equip * 90000) * s.infl, 0) + hqCost(s) / 30; }
  /* Mulai outlet ketiga butuh admin, akunting dan penyelia. */
  function hqCost(s) { return Math.max(0, s.outlets.length - 2) * 10 * JT * s.infl; }
  function rent(s, o) { return R(LOCS[o.loc].rent * s.infl * o.rentMult); }

  /* Harga yang dianggap wajar pelanggan = ref x wtp. */
  function wtpOf(s, o) { return LOCS[o.loc].wtp * s.infl * (1 + (quality(s, o) - 40) / 200); }
  /* Permintaan satu outlet. noise=1 untuk perkiraan. */
  function demand(s, o, noise) {
    const L = LOCS[o.loc], c = cal(s.day);
    if (o.closed > 0) return { vis: 0, units: {}, total: 0, ratio: 1 };
    let wf = 1;
    if (s.wx === 'hujan') wf = o.loc === 'mall' ? 1.05 : 0.72;
    else if (s.wx === 'mendung') wf = 0.96;
    let vis = L.traffic * L.dow[c.wd] * wf * seasonF(o.loc, s.day) * (0.55 + 0.45 * o.known) * (1 + 0.6 * s.buzz) *
      (1 - 0.12 * o.comp) * Math.min(1.2, 1 + 0.02 * s.franchise.length) * [1, 1.04, 1.08][o.dekor] * noise;
    if (s.ojol) vis *= 1.25;
    const conv = 0.2 + 0.42 * s.rep / 100 + (s.research.r_loyal ? 0.04 : 0);
    const wtp = wtpOf(s, o);
    let sumW = 0, sumR = 0, sumP = 0;
    const w = {};
    for (const k in MENU) {
      if (!s.active[k] || !unlocked(s, k)) continue;
      const m = MENU[k];
      if (k === 'literan' && !s.ojol) continue;
      let pop = m.pop;
      if (s.wx === 'terik') pop *= m.t === 'cold' ? 1.3 : m.t === 'hot' ? 0.82 : 1;
      if (s.wx === 'hujan') pop *= m.t === 'hot' ? 1.25 : m.t === 'cold' ? 0.75 : 1.1;
      const ratio = s.prices[k] * (1 + o.adj / 100) / (m.ref * wtp);
      let pf = ratio <= 1 ? Math.min(1.5, Math.pow(ratio, -1.6)) : Math.pow(ratio, -2.6);
      w[k] = pop * pf; sumW += w[k]; sumR += ratio * pop; sumP += pop;
    }
    const units = {};
    if (sumW <= 0) return { vis, units, total: 0, ratio: 1 };
    const buyers = Math.min(vis * 0.62, vis * conv * Math.pow(sumW / 3.2, 0.65));
    let total = 0;
    for (const k in w) { units[k] = buyers * 1.2 * w[k] / sumW; total += units[k]; }
    return { vis, units, total, buyers, ratio: sumR / sumP };
  }
  function forecastNeeds(s) {
    const need = {};
    for (const k in ING) need[k] = 0;
    for (const o of s.outlets) {
      const d = demand(s, o, 1), sc = d.total > 0 ? Math.min(1, capacity(s, o) / d.total) : 0;
      for (const k in d.units) for (const i in MENU[k].r) need[i] += d.units[k] * sc * MENU[k].r[i] * mf(o, i);
    }
    return need;
  }
  function debt(s) { return s.loans.reduce((a, l) => a + l.bal, 0); }
  function rev30(s) { return s.hist.slice(-30).reduce((a, h) => a + h.rev, 0); }
  function loanLimit(s, type) {
    const L = LOAN[type];
    if (s.day < L.minDay) return 0;
    const used = s.loans.filter(l => l.type === type).reduce((a, l) => a + l.bal, 0);
    const cap = type === 'bank' ? Math.min(L.max, 4 * rev30(s)) : L.max;
    return Math.max(0, Math.floor((cap - used) / JT) * JT);
  }
  function valuation(s) {
    let assets = s.cash + stockValue(s);
    for (const o of s.outlets) assets += LOCS[o.loc].setup * 0.4 + EQUIP[o.equip].cost * 0.5 + DEKOR[o.dekor].cost * 0.3;
    const ms = s.months.slice(-3);
    const avg = ms.length ? ms.reduce((a, m) => a + monthProfit(m), 0) / ms.length : 0;
    return Math.max(0, (assets - debt(s) + Math.max(0, avg) * 24) * (1 - s.equity));
  }
  function upcoming(s) {
    const c = cal(s.day), out = [];
    const inDays = dom => (dom - c.dom + 30) % 30;
    out.push({ n: 'Gaji mingguan (Sabtu)', amt: s.wagesDue + dailyWages(s) * ((5 - c.wd + 7) % 7 + 1), d: (5 - c.wd + 7) % 7 });
    out.push({ n: 'Sewa semua outlet', amt: s.outlets.reduce((a, o) => a + rent(s, o), 0), d: inDays(1) || 30 });
    const lp = s.loans.reduce((a, l) => a + l.pay, 0);
    if (lp) out.push({ n: 'Cicilan pinjaman', amt: lp, d: inDays(5) });
    if (s.taxDue > 0) out.push({ n: s.bigTax ? 'Pajak penghasilan badan' : 'PPh final UMKM', amt: s.taxDue, d: inDays(15) });
    out.push({ n: 'Biaya hidup pemilik', amt: 3 * JT * s.infl, d: inDays(25) });
    if ((c.month === 3 && c.dom <= 20) || c.month === 2) out.push({ n: 'THR karyawan', amt: dailyWages(s) * 30, d: (3 - c.month) * 30 + 20 - c.dom });
    return out.filter(b => b.amt > 0).sort((a, b) => a.d - b.d);
  }

  /* ---------- Aksi pemain ---------- */
  const fail = msg => ({ ok: false, msg });
  const ok = msg => ({ ok: true, msg });
  function spend(s, amt, cat) { s.cash -= amt; s.cur[cat] += amt; }
  function buy(s, k, q, auto) {
    q = Math.max(0, q);
    if (!(q > 0)) return fail('Jumlah belum diisi.');
    if (k === 'susu' && s.flags.noSusu > 0) return fail('Pemasok susu sedang tidak bisa mengirim.');
    const { cost } = quoteBuy(s, k, q, auto);
    if (cost > s.cash) return fail('Kas tidak cukup. Butuh ' + rp(cost) + '.');
    s.cash -= cost;
    s.stock[k].push({ q, age: 0, c: cost / q, g: k === 'kopi' ? GRADES[s.grade].q : 0 });
    return ok('Beli ' + q + ' ' + ING[k].u + ' ' + ING[k].n.toLowerCase() + ' seharga ' + rp(cost) + '.');
  }
  function setPrice(s, k, p) { s.prices[k] = clamp(R(p / 500) * 500, 1000, 500000); return ok(); }
  function hire(s, id) {
    const o = s.outlets.find(x => x.id === id), cost = R(0.5 * JT * s.infl);
    if (s.cash < cost) return fail('Biaya rekrut ' + rp(cost) + ', kas tidak cukup.');
    spend(s, cost, 'other'); o.staff++;
    return ok('Satu barista baru bergabung di ' + LOCS[o.loc].n + '.');
  }
  function fire(s, id) {
    const o = s.outlets.find(x => x.id === id), cost = R(1 * JT * s.infl);
    if (o.staff <= (o.own ? 0 : 1)) return fail('Outlet ini butuh minimal satu barista.');
    if (s.cash < cost) return fail('Pesangon ' + rp(cost) + ', kas tidak cukup.');
    spend(s, cost, 'other'); o.staff--; o.morale = Math.max(5, o.morale - 6);
    return ok('Satu barista diberhentikan dengan pesangon ' + rp(cost) + '.');
  }
  function upgradeEquip(s, id) {
    const o = s.outlets.find(x => x.id === id);
    if (o.equip >= 3) return fail('Peralatan sudah paling lengkap.');
    const cost = R(EQUIP[o.equip + 1].cost * s.infl);
    if (s.cash < cost) return fail('Butuh ' + rp(cost) + '.');
    spend(s, cost, 'capex'); o.equip++;
    return ok(LOCS[o.loc].n + ' kini memakai ' + EQUIP[o.equip].n.toLowerCase() + '.');
  }
  function upgradeDekor(s, id) {
    const o = s.outlets.find(x => x.id === id);
    if (o.dekor >= 2) return fail('Dekor sudah maksimal.');
    const cost = R(DEKOR[o.dekor + 1].cost * s.infl);
    if (s.cash < cost) return fail('Butuh ' + rp(cost) + '.');
    spend(s, cost, 'capex'); o.dekor++;
    return ok('Dekor ' + LOCS[o.loc].n + ' ditingkatkan.');
  }
  function setupCost(s, loc) { return R(LOCS[loc].setup * s.infl * (s.flags.deal === loc ? 0.7 : 1)); }
  function openOutlet(s, loc) {
    if (s.outlets.some(o => o.loc === loc)) return fail('Sudah ada outlet di lokasi itu.');
    const cost = setupCost(s, loc);
    if (s.cash < cost) return fail('Butuh ' + rp(cost) + ' untuk buka di sini.');
    spend(s, cost, 'capex');
    if (s.flags.deal === loc) delete s.flags.deal;
    s.outlets.push(newOutlet(s, loc, false));
    addLog(s, 'Outlet baru dibuka di ' + LOCS[loc].n + '.', 'good');
    checkGoals(s);
    return ok('Outlet ' + LOCS[loc].n + ' resmi buka besok pagi dengan satu barista dan satu kepala toko.');
  }
  function closeOutlet(s, id) {
    const o = s.outlets.find(x => x.id === id);
    if (o.own) return fail('Warung pertama tidak bisa ditutup.');
    const back = R(LOCS[o.loc].setup * 0.2);
    s.cash += back; s.cur.other -= back;
    s.outlets = s.outlets.filter(x => x.id !== id);
    addLog(s, 'Outlet ' + LOCS[o.loc].n + ' ditutup. Peralatan terjual ' + rp(back) + '.', 'warn');
    return ok('Outlet ditutup.');
  }
  function trainCost(s) { return s.training >= 3 ? 0 : R(TRAIN[s.training + 1] * s.infl * (1 + 0.5 * (s.outlets.length - 1))); }
  function train(s) {
    if (s.training >= 3) return fail('Pelatihan sudah di tingkat tertinggi.');
    const cost = trainCost(s);
    if (s.cash < cost) return fail('Butuh ' + rp(cost) + '.');
    spend(s, cost, 'other'); s.training++;
    return ok('Seluruh tim naik ke pelatihan tingkat ' + s.training + '.');
  }
  function canResearch(s, id) {
    const r = RES[id];
    if (s.research[id]) return 'Sudah dimiliki';
    if (r.need && !s.research[r.need]) return 'Butuh: ' + RES[r.need].n;
    if (r.outlets && s.outlets.length < r.outlets) return 'Butuh ' + r.outlets + ' outlet';
    if (r.rep && s.rep < r.rep) return 'Butuh reputasi ' + r.rep;
    return '';
  }
  function research(s, id) {
    const why = canResearch(s, id);
    if (why) return fail(why + '.');
    const cost = R(RES[id].cost * s.infl);
    if (s.cash < cost) return fail('Butuh ' + rp(cost) + '.');
    spend(s, cost, 'capex'); s.research[id] = true;
    if (id === 'r_ojol') s.ojol = true;
    if (id === 'r_supplier') s.auto.on = true;
    addLog(s, 'Pengembangan baru: ' + RES[id].n + '.', 'good');
    return ok(RES[id].n + ' aktif.');
  }
  function campCost(s, id) { return R(CAMP[id].cost * s.infl * (0.6 + 0.4 * s.outlets.length)); }
  function campaign(s, id) {
    const c = CAMP[id];
    if (c.rep && s.rep < c.rep) return fail('Butuh reputasi ' + c.rep + '.');
    if (c.outlets && s.outlets.length < c.outlets) return fail('Butuh ' + c.outlets + ' outlet.');
    const cost = campCost(s, id);
    if (s.cash < cost) return fail('Butuh ' + rp(cost) + '.');
    spend(s, cost, 'mkt'); addBuzz(s, c.buzz);
    return ok(c.n + ' berjalan. Keramaian naik dan akan memudar pelan-pelan.');
  }
  function addBuzz(s, b) { s.buzz = clamp(s.buzz + b * (1 - s.buzz), 0, 1); }
  function takeLoan(s, type, amt, months) {
    const L = LOAN[type];
    amt = Math.floor(amt / JT) * JT;
    if (amt < JT) return fail('Minimal pinjaman Rp 1 juta.');
    if (amt > loanLimit(s, type)) return fail('Melebihi plafon yang tersedia.');
    const r = L.rate / 12, pay = R(amt * r / (1 - Math.pow(1 + r, -months)));
    s.loans.push({ type, bal: amt, r, pay, left: months });
    s.cash += amt;
    addLog(s, L.n + ' cair ' + rp(amt) + ', cicilan ' + rp(pay) + ' selama ' + months + ' bulan.', 'info');
    return ok('Pinjaman cair. Cicilan ' + rp(pay) + ' tiap tanggal 5.');
  }
  function repayLoan(s, i) {
    const l = s.loans[i];
    if (!l) return fail('Pinjaman tidak ditemukan.');
    if (s.cash < l.bal) return fail('Butuh ' + rp(l.bal) + ' untuk melunasi.');
    s.cash -= l.bal; s.loans.splice(i, 1);
    return ok('Pinjaman lunas.');
  }

  /* ---------- Kejadian ---------- */
  const outletName = o => LOCS[o.loc].n;
  const ef = s => s.infl * (0.4 + 0.6 * s.outlets.length); /* biaya kejadian ikut ukuran usaha */
  const GAP = { sidak: 150, naikgaji: 120, investor: 240, calonmitra: 20, sewa: 120, viral: 45, selisih: 45, kopinaik: 90, tempat: 90 };
  const EVENTS = {
    selebgram: {
      w: s => s.rep >= 35 ? 1 : 0,
      build: s => ({
        title: 'Selebgram kuliner mampir',
        text: 'Seorang selebgram dengan 80 ribu pengikut duduk di warung Anda dan menawarkan ulasan berbayar.',
        choices: [
          { label: 'Bayar ulasan', hint: rp(2 * JT * s.infl), can: s => s.cash >= 2 * JT * s.infl,
            run: s => { spend(s, R(2 * JT * s.infl), 'mkt'); addBuzz(s, 0.4); return 'Videonya tayang malam ini. Bersiaplah, besok lebih ramai.'; } },
          { label: 'Traktir saja', hint: 'gratis, efek kecil', run: s => { addBuzz(s, 0.1); return 'Ia mengunggah satu foto dengan ucapan terima kasih.'; } },
          { label: 'Tolak dengan sopan', run: () => 'Ia membayar kopinya dan pergi.' },
        ],
      }),
    },
    sidak: {
      w: s => s.day > 40 ? 0.8 : 0,
      build: s => ({
        title: 'Sidak dinas kesehatan',
        text: s.research.r_cert ? 'Petugas memeriksa dapur dan sertifikat Anda. Semuanya lengkap.' :
          'Petugas memeriksa dapur. Anda belum punya sertifikat laik higiene.',
        choices: s.research.r_cert ? [
          { label: 'Terima kasih, Pak', run: s => { s.rep = clamp(s.rep + 2, 0, 100); return 'Stiker "Laik Higiene" ditempel di pintu. Reputasi naik.'; } },
        ] : [
          { label: 'Bayar denda resmi', hint: rp(ef(s) * 1.5 * JT), run: s => { spend(s, R(ef(s) * 1.5 * JT), 'other'); return 'Denda dibayar. Anda diberi waktu untuk mengurus sertifikat.'; } },
          { label: 'Coba "damai" di tempat', hint: rp(ef(s) * 0.5 * JT) + ', berisiko', run: s => {
            spend(s, R(ef(s) * 0.5 * JT), 'other');
            if (rnd(s) < 0.5) { s.rep = clamp(s.rep - 8, 0, 100); return 'Kabar itu bocor ke grup warga. Reputasi turun 8.'; }
            return 'Petugas pergi tanpa catatan. Kali ini lolos.';
          } },
        ],
      }),
    },
    susu: {
      w: s => !s.flags.noSusu ? 0.8 : 0,
      build: s => ({
        title: 'Pemasok susu telat',
        text: 'Truk pemasok susu mogok. Dua hari ke depan tidak ada kiriman susu segar.',
        choices: [
          { label: 'Borong di minimarket', hint: 'harga +40%, ' + rp(2 * (s.use.susu || 5) * unitPrice(s, 'susu') * 1.4), can: s => s.cash >= 2 * (s.use.susu || 5) * unitPrice(s, 'susu') * 1.4,
            run: s => { const q = Math.ceil(2 * (s.use.susu || 5)), c = R(q * unitPrice(s, 'susu') * 1.4); s.cash -= c; s.stock.susu.push({ q, age: 0, c: c / q, g: 0 }); s.flags.noSusu = 2; return 'Anda membeli ' + q + ' liter susu eceran.'; } },
          { label: 'Jalan dengan stok yang ada', run: s => { s.flags.noSusu = 2; return 'Dua hari ini susu tidak bisa dibeli. Menu berbahan susu bisa kosong.'; } },
        ],
      }),
    },
    kopinaik: {
      w: s => s.pidx.kopi < 1.2 ? 0.7 : 0,
      build: s => ({
        title: 'Harga kopi dunia melonjak',
        text: 'Panen gagal di beberapa daerah. Mulai besok harga biji kopi naik sekitar 35% dan baru turun berangsur-angsur.',
        choices: [
          { label: 'Borong stok 30 hari sekarang', hint: rp(quoteBuy(s, 'kopi', Math.ceil((s.use.kopi || 0.5) * 30)).cost),
            can: s => s.cash >= quoteBuy(s, 'kopi', Math.ceil((s.use.kopi || 0.5) * 30)).cost,
            run: s => { const r = buy(s, 'kopi', Math.ceil((s.use.kopi || 0.5) * 30)); s.pidx.kopi += 0.35; return r.msg; } },
          { label: 'Beli seperti biasa', run: s => { s.pidx.kopi += 0.35; return 'Harga beli kopi naik mulai besok.'; } },
        ],
      }),
    },
    naikgaji: {
      w: s => s.outlets.some(o => o.staff > 0) && s.wagePct < 130 ? 0.9 : 0,
      build: s => {
        const n = s.outlets.reduce((a, o) => a + o.staff, 0);
        return {
          title: 'Karyawan minta naik gaji',
          text: 'Para barista menghadap bersama. Harga kebutuhan naik dan mereka minta upah disesuaikan.',
          choices: [
            { label: 'Naikkan upah 10%', hint: 'biaya gaji naik permanen', run: s => { s.wagePct += 10; for (const o of s.outlets) o.morale = clamp(o.morale + 12, 0, 100); return 'Upah naik menjadi ' + s.wagePct + '% dari UMR. Tim bersemangat.'; } },
            { label: 'Beri bonus sekali', hint: rp(n * 0.5 * JT * s.infl), can: s => s.cash >= n * 0.5 * JT * s.infl,
              run: s => { spend(s, R(n * 0.5 * JT * s.infl), 'wages'); for (const o of s.outlets) o.morale = clamp(o.morale + 7, 0, 100); return 'Bonus dibagikan. Suasana membaik untuk sementara.'; } },
            { label: 'Tolak', run: s => { for (const o of s.outlets) o.morale = clamp(o.morale - 15, 0, 100); return 'Mereka kembali bekerja dengan wajah masam. Semangat turun.'; } },
          ],
        };
      },
    },
    resign: {
      w: s => s.outlets.some(o => o.morale < 42 && o.staff > (o.own ? 0 : 1)) ? 1.6 : 0,
      init: s => ({ id: pick(s, s.outlets.filter(o => o.morale < 42 && o.staff > (o.own ? 0 : 1))).id }),
      build: (s, d) => {
        const o = s.outlets.find(x => x.id === d.id) || s.outlets[0];
        return { title: 'Barista mengundurkan diri', text: 'Seorang barista di ' + outletName(o) + ' pamit. Katanya capek dan upahnya tidak sepadan.',
          choices: [
            { label: 'Tahan dengan bonus', hint: rp(0.8 * JT * s.infl), can: s => s.cash >= 0.8 * JT * s.infl, run: s => { spend(s, R(0.8 * JT * s.infl), 'wages'); o.morale = clamp(o.morale + 10, 0, 100); return 'Ia bersedia bertahan.'; } },
            { label: 'Lepaskan', run: () => { if (o.staff > (o.own ? 0 : 1)) o.staff--; return 'Tim di ' + outletName(o) + ' berkurang satu orang.'; } },
          ] };
      },
    },
    padam: {
      w: () => 0.7,
      init: s => ({ id: pick(s, s.outlets).id }),
      build: (s, d) => {
        const o = s.outlets.find(x => x.id === d.id) || s.outlets[0];
        return { title: 'Listrik padam bergilir', text: 'PLN mengumumkan pemadaman seharian di sekitar ' + outletName(o) + '.',
          choices: [
            { label: 'Sewa genset', hint: rp(0.6 * JT * s.infl), can: s => s.cash >= 0.6 * JT * s.infl, run: s => { spend(s, R(0.6 * JT * s.infl), 'other'); return 'Genset menyala. Outlet buka seperti biasa.'; } },
            { label: 'Tutup sehari', run: () => { o.closed = 1; return outletName(o) + ' tutup hari ini.'; } },
          ] };
      },
    },
    pesaing: {
      w: s => s.outlets.some(o => o.comp < 3 && o.known > 0.7) ? 0.9 + 0.3 * s.outlets.length : 0,
      init: s => ({ id: pick(s, s.outlets.filter(o => o.comp < 3 && o.known > 0.7)).id }),
      build: (s, d) => {
        const o = s.outlets.find(x => x.id === d.id) || s.outlets[0];
        return { title: 'Pesaing baru buka', text: 'Kedai kopi baru buka tak jauh dari ' + outletName(o) + ' dengan promo pembukaan besar-besaran.',
          choices: [
            { label: 'Balas dengan promo', hint: rp(2 * JT * s.infl), can: s => s.cash >= 2 * JT * s.infl, run: s => { spend(s, R(2 * JT * s.infl), 'mkt'); addBuzz(s, 0.15); return 'Promo Anda menahan pelanggan. Pesaing tetap ada, tapi dampaknya teredam.'; } },
            { label: 'Fokus ke kualitas', run: () => { o.comp++; return 'Sebagian pelanggan mencoba tempat baru. Pengunjung ' + outletName(o) + ' turun sampai Anda kembali unggul.'; } },
          ] };
      },
    },
    viral: {
      w: s => s.rep >= 60 ? 0.6 : 0,
      build: () => ({ title: 'Viral di media sosial', text: 'Video pelanggan tentang kopi Anda ditonton ratusan ribu kali. Antrean akan memanjang beberapa hari ini.',
        choices: [{ label: 'Siapkan stok!', run: s => { addBuzz(s, 0.6); return 'Keramaian melonjak. Pastikan stok dan barista cukup.'; } }] }),
    },
    ulasan: {
      w: s => s.last && s.last.lost / Math.max(1, s.last.served + s.last.lost) > 0.15 ? 1.5 : 0.2,
      build: s => ({ title: 'Ulasan buruk beredar', text: 'Seorang pelanggan menulis panjang soal antrean lama dan menu kosong. Ulasannya mulai dibagikan orang.',
        choices: [
          { label: 'Minta maaf dan traktir', hint: rp(1 * JT * s.infl), can: s => s.cash >= 1 * JT * s.infl, run: s => { spend(s, R(1 * JT * s.infl), 'mkt'); s.rep = clamp(s.rep - 1, 0, 100); return 'Ia memperbarui ulasannya. Kerusakan nyaris tidak terasa.'; } },
          { label: 'Abaikan', run: s => { s.rep = clamp(s.rep - 6, 0, 100); return 'Ulasan itu bertahan di halaman pertama pencarian. Reputasi turun 6.'; } },
        ] }),
    },
    katering: {
      w: s => s.rep >= 40 ? 0.9 : 0,
      init: s => ({ n: 60 + Math.floor(rnd(s) * 5) * 20 }),
      build: (s, d) => {
        const p = R(s.prices.kopsus * 0.85), r = MENU.kopsus.r;
        const enough = s => Object.keys(r).every(i => stockQty(s, i) >= r[i] * d.n);
        return { title: 'Pesanan katering kantor', text: 'Sebuah kantor memesan ' + d.n + ' gelas Kopi Susu untuk rapat siang ini, dengan harga ' + rp(p) + ' per gelas.',
          choices: [
            { label: 'Terima pesanan', hint: enough(s) ? '+' + rp(p * d.n) : 'stok tidak cukup', can: enough, run: s => {
              let c = 0; for (const i in r) c += consume(s, i, r[i] * d.n);
              s.cash += p * d.n; s.cur.rev += p * d.n; s.cur.cogs += c; s.rep = clamp(s.rep + 1, 0, 100);
              return 'Pesanan terkirim tepat waktu. Masuk ' + rp(p * d.n) + '.';
            } },
            { label: 'Tolak', run: () => 'Mereka memesan ke tempat lain.' },
          ] };
      },
    },
    sewa: {
      w: s => s.outlets.some(o => s.day - o.opened > 300 && o.rentMult < 1.6) ? 0.8 : 0,
      init: s => ({ id: pick(s, s.outlets.filter(o => s.day - o.opened > 300 && o.rentMult < 1.6)).id }),
      build: (s, d) => {
        const o = s.outlets.find(x => x.id === d.id) || s.outlets[0];
        return { title: 'Pemilik ruko menaikkan sewa', text: 'Kontrak ' + outletName(o) + ' diperpanjang. Pemilik minta sewa naik 10%.',
          choices: [
            { label: 'Terima', run: () => { o.rentMult *= 1.1; return 'Sewa naik 10%.'; } },
            { label: 'Tawar', hint: 'bisa lebih baik, bisa lebih buruk', run: s => {
              if (rnd(s) < 0.55) { o.rentMult *= 1.04; return 'Tawar-menawar berhasil. Sewa hanya naik 4%.'; }
              o.rentMult *= 1.13; return 'Pemilik tersinggung. Sewa malah naik 13%.';
            } },
          ] };
      },
    },
    rusak: {
      w: s => s.outlets.some(o => o.equip > 0) ? 0.8 : 0,
      init: s => ({ id: pick(s, s.outlets.filter(o => o.equip > 0)).id }),
      build: (s, d) => {
        const o = s.outlets.find(x => x.id === d.id) || s.outlets[0], cost = R(1.5 * JT * o.equip * s.infl);
        return { title: 'Mesin espresso rusak', text: 'Mesin di ' + outletName(o) + ' bocor dan tekanannya tidak stabil.',
          choices: [
            { label: 'Panggil teknisi hari ini', hint: rp(cost), can: s => s.cash >= cost, run: s => { spend(s, cost, 'other'); return 'Mesin kembali normal sebelum jam buka.'; } },
            { label: 'Tunggu suku cadang murah', hint: 'kapasitas turun 5 hari', run: () => { o.broken = 5; return 'Lima hari ke depan ' + outletName(o) + ' hanya melayani 60% kapasitas.'; } },
          ] };
      },
    },
    banjir: {
      w: s => seasonTags(s.day).includes('Musim hujan') && s.outlets.some(o => o.loc === 'gang' || o.loc === 'pasar') ? 0.7 : 0,
      init: s => ({ id: pick(s, s.outlets.filter(o => o.loc === 'gang' || o.loc === 'pasar')).id }),
      build: (s, d) => {
        const o = s.outlets.find(x => x.id === d.id) || s.outlets[0];
        return { title: 'Banjir semata kaki', text: 'Hujan semalaman membuat air masuk ke ' + outletName(o) + '.',
          choices: [{ label: 'Bersihkan dan keringkan', hint: rp(1.5 * JT * s.infl) + ', tutup 2 hari', run: s => { spend(s, R(1.5 * JT * s.infl), 'other'); o.closed = 2; return outletName(o) + ' tutup dua hari untuk bersih-bersih.'; } }] };
      },
    },
    tempat: {
      w: s => Object.keys(LOCS).some(l => !s.outlets.some(o => o.loc === l)) && !s.flags.deal && s.day > 60 ? 0.6 : 0,
      init: s => ({ loc: pick(s, Object.keys(LOCS).filter(l => !s.outlets.some(o => o.loc === l))) }),
      build: (s, d) => ({ title: 'Tawaran tempat miring', text: 'Kenalan Anda melepas ruko di ' + LOCS[d.loc].n + '. Kalau Anda ambil dalam waktu dekat, biaya buka di sana lebih murah 30%.',
        choices: [{ label: 'Simpan tawarannya', run: s => { s.flags.deal = d.loc; s.flags.dealDays = 30; return 'Diskon 30% berlaku 30 hari untuk ' + LOCS[d.loc].n + '. Lihat di halaman Outlet.'; } }] }),
    },
    bazar: {
      w: () => 0.8,
      build: s => ({ title: 'Bazar komunitas akhir pekan', text: 'Panitia bazar menawarkan satu lapak. Ramai atau tidaknya tergantung cuaca.',
        choices: [
          { label: 'Ambil lapak', hint: rp(1.5 * JT * s.infl), can: s => s.cash >= 1.5 * JT * s.infl, run: s => {
            spend(s, R(1.5 * JT * s.infl), 'mkt');
            const g = R((1.2 + rnd(s) * 3.3) * JT * s.infl * (0.6 + s.rep / 100));
            s.cash += g; s.cur.rev += g * 1.5; s.cur.cogs += g * 0.5; addBuzz(s, 0.12);
            return 'Lapak Anda menghasilkan laba kotor ' + rp(g) + ' dan banyak wajah baru mengenal merek Anda.';
          } },
          { label: 'Lewatkan', run: () => 'Anda memilih fokus di warung.' },
        ] }),
    },
    selisih: {
      w: s => s.outlets.length > 1 && !s.research.r_pos ? 1 : 0,
      build: s => ({ title: 'Kas cabang tidak cocok', text: 'Catatan penjualan dan uang di laci cabang berbeda cukup jauh. Tanpa kasir digital, sulit tahu ke mana uangnya.',
        choices: [{ label: 'Catat sebagai kerugian', run: s => { const x = R(Math.min(3 * JT, Math.max(0, s.cash) * 0.03)); spend(s, x, 'fee'); return 'Hilang ' + rp(x) + '. Kasir digital di halaman Pengembangan mencegah ini.'; } }] }),
    },
    calonmitra: {
      w: s => s.research.r_franchise && s.rep >= 55 && s.franchise.length < s.outlets.length * 2 ? 1.1 : 0,
      init: s => ({ q: 0.25 + rnd(s) * 0.7, name: pick(s, ['Pak Darsono', 'Bu Lestiani', 'Mas Bagaskara', 'Bu Winarti', 'Pak Sihombing', 'Mbak Kinanthi', 'Pak Tanuwijaya', 'Bu Rahmadani']), kota: pick(s, ['Semarang', 'Malang', 'Medan', 'Makassar', 'Pontianak', 'Padang', 'Balikpapan', 'Manado', 'Cirebon', 'Purwokerto']) }),
      build: (s, d) => {
        const fee = R(75 * JT * s.infl);
        const hint = d.q > 0.7 ? 'Berpengalaman mengelola restoran dan modalnya kuat.' : d.q > 0.45 ? 'Belum pernah usaha kuliner, tapi serius dan mau belajar.' : 'Bicaranya besar, tapi enggan ikut pelatihan.';
        return { title: 'Calon mitra waralaba', text: d.name + ' ingin membuka ' + s.brand + ' di ' + d.kota + '. ' + hint,
          choices: [
            { label: 'Terima sebagai mitra', hint: '+' + rp(fee) + ' dan royalti 5%', run: s => {
              s.cash += fee; s.cur.royalty += fee; s.franchise.push({ name: d.name, kota: d.kota, q: d.q, since: s.day });
              addLog(s, d.name + ' menjadi mitra waralaba di ' + d.kota + '.', 'good'); checkGoals(s);
              return 'Kontrak ditandatangani. Biaya lisensi ' + rp(fee) + ' masuk kas.';
            } },
            { label: 'Tolak', run: () => 'Anda menolak dengan halus.' },
          ] };
      },
    },
    mitranakal: {
      w: s => s.franchise.some(f => f.q < 0.5) ? 1.4 : 0,
      init: s => ({ i: s.franchise.findIndex(f => f.q < 0.5) }),
      build: (s, d) => {
        const f = s.franchise[d.i] || s.franchise[0];
        return { title: 'Mitra waralaba bermasalah', text: 'Gerai ' + f.kota + ' milik ' + f.name + ' ketahuan memakai bahan murah dan mengabaikan SOP. Keluhan pelanggan mulai menyebut merek Anda.',
          choices: [
            { label: 'Kirim tim pembina', hint: rp(5 * JT * s.infl), can: s => s.cash >= 5 * JT * s.infl, run: s => { spend(s, R(5 * JT * s.infl), 'other'); f.q = 0.65; return 'Dua minggu pendampingan membuat gerai itu kembali sesuai standar.'; } },
            { label: 'Putus kontrak', run: s => { s.franchise.splice(s.franchise.indexOf(f), 1); s.rep = clamp(s.rep - 2, 0, 100); return 'Kontrak diputus. Royalti dari ' + f.kota + ' berhenti.'; } },
            { label: 'Biarkan', run: s => { s.rep = clamp(s.rep - 6, 0, 100); return 'Keluhan terus berdatangan. Reputasi turun 6.'; } },
          ] };
      },
    },
    investor: {
      w: s => s.outlets.length >= 2 && s.equity === 0 && s.rep >= 55 ? 0.5 : 0,
      init: s => ({ amt: Math.max(100 * JT, R(valuation(s) * 0.2 / (10 * JT)) * 10 * JT) }),
      build: (s, d) => ({ title: 'Tawaran investor', text: 'Seorang investor menawarkan ' + rp(d.amt) + ' untuk 20% kepemilikan. Sebagai gantinya, 20% laba bulanan menjadi haknya untuk seterusnya.',
        choices: [
          { label: 'Terima modalnya', hint: '+' + rp(d.amt), run: s => { s.cash += d.amt; s.equity = 0.2; addLog(s, 'Investor masuk dengan ' + rp(d.amt) + ' untuk 20% saham.', 'info'); return 'Dana masuk. Dividen 20% dari laba dibayar tiap tanggal 10.'; } },
          { label: 'Tetap milik sendiri', run: () => 'Anda memilih tumbuh dengan modal sendiri.' },
        ] }),
    },
  };
  function buildEvent(s) {
    if (!s.pending) return null;
    const e = EVENTS[s.pending.id];
    return e ? e.build(s, s.pending.data || {}) : null;
  }
  function resolveEvent(s, i) {
    const ev = buildEvent(s);
    if (!ev) { s.pending = null; return ok(''); }
    const ch = ev.choices[i];
    if (!ch) return fail('Pilihan tidak ada.');
    if (ch.can && !ch.can(s)) return fail('Pilihan ini belum bisa diambil.');
    const msg = ch.run(s);
    addLog(s, ev.title + ': ' + msg, 'event');
    s.pending = null;
    return ok(msg);
  }
  function rollEvent(s) {
    if (s.eventCd > 0) { s.eventCd--; return; }
    if (rnd(s) > (s.mode === 'santai' ? 0.16 : 0.2)) return;
    let tot = 0;
    const list = [];
    for (const id in EVENTS) {
      if (s.flags.lastEv === id) continue;
      if (s.evLast[id] && s.day - s.evLast[id] < (GAP[id] || 30)) continue;
      const w = EVENTS[id].w(s);
      if (w > 0) { list.push([id, w]); tot += w; }
    }
    if (!list.length) return;
    let x = rnd(s) * tot;
    for (const [id, w] of list) {
      if (x < w) {
        s.pending = { id, data: EVENTS[id].init ? EVENTS[id].init(s) : {} };
        s.flags.lastEv = id; s.evLast[id] = s.day; s.eventCd = 3;
        return;
      }
      x -= w;
    }
  }

  /* ---------- Putaran harian ---------- */
  function consume(s, k, q) {
    let cost = 0;
    const arr = s.stock[k];
    while (q > 1e-9 && arr.length) {
      const b = arr[0], t = Math.min(b.q, q);
      cost += t * b.c; b.q -= t; q -= t;
      if (b.q <= 1e-9) arr.shift();
    }
    return cost;
  }
  function autoRestock(s, notes) {
    if (!s.auto.on || !s.research.r_supplier) return;
    let spent = 0;
    for (const k in ING) {
      if (k === 'susu' && s.flags.noSusu > 0) continue;
      const days = Math.min(s.auto.days, shelf(s, k) - 1);
      let q = s.use[k] * days * 1.1 - stockQty(s, k);
      q = Math.ceil(q / ING[k].step) * ING[k].step;
      if (q <= 0) continue;
      const r = buy(s, k, q, true);
      if (r.ok) spent += quoteBuy(s, k, q, true).cost;
      else { notes.push('Kiriman ' + ING[k].n.toLowerCase() + ' gagal: kas tidak cukup.'); }
    }
    if (spent > 0) notes.push('Pemasok langganan mengirim bahan senilai ' + rp(spent) + '.');
  }
  function checkGoals(s) {
    const done = id => { if (!s.goals[id]) { s.goals[id] = s.day; addLog(s, 'Pencapaian: ' + GOALS.find(g => g.id === id).n + '.', 'good'); } };
    const lastM = s.months[s.months.length - 1];
    if (lastM && monthProfit(lastM) > 0) done('g_untung');
    if (s.rep >= 50) done('g_rep50');
    if (s.outlets.length >= 2) done('g_cabang');
    if (lastM && lastM.rev >= 50 * JT) done('g_omzet50');
    if (s.outlets.length >= 3) done('g_tiga');
    if (s.rep >= 75) done('g_rep75');
    if (s.franchise.length >= 1) done('g_mitra');
    if (s.outlets.length >= 5) done('g_lima');
    if (valuation(s) >= 5000 * JT) { done('g_valuasi'); if (!s.won) { s.won = true; s.flags.justWon = true; } }
  }

  function runDay(s) {
    if (s.over || s.pending) return null;
    const c = cal(s.day), notes = [], bills = [];
    const cashStart = s.cash;
    autoRestock(s, notes);

    /* permintaan dan pelayanan */
    const rows = [], need = {}, needRaw = {};
    for (const k in ING) { need[k] = 0; needRaw[k] = 0; }
    for (const o of s.outlets) {
      const d = demand(s, o, clamp(1 + gauss(s) * 0.07, 0.8, 1.2));
      const cap = capacity(s, o), sc = d.total > 0 ? Math.min(1, cap / d.total) : 0;
      const want = {};
      for (const k in d.units) {
        want[k] = d.units[k] * sc;
        for (const i in MENU[k].r) { need[i] += want[k] * MENU[k].r[i] * mf(o, i); needRaw[i] += want[k] * MENU[k].r[i] * mf(o, i); }
      }
      rows.push({ o, d, cap, want });
    }
    const avail = {};
    for (const k in ING) avail[k] = need[k] > 0 ? Math.min(1, stockQty(s, k) / need[k]) : 1;
    let rev = 0, cogs = 0, served = 0, lost = 0, fee = 0, share = 0, satW = 0, satSum = 0;
    const sold = {}, short = {};
    for (const row of rows) {
      const { o, d, cap, want } = row;
      let oRev = 0, oServed = 0, oShort = false;
      for (const k in want) {
        let f = 1;
        for (const i in MENU[k].r) if (avail[i] < f) { f = avail[i]; }
        if (f < 0.98) for (const i in MENU[k].r) if (avail[i] < 0.98) { short[i] = true; oShort = true; }
        const n = Math.floor(want[k] * f + rnd(s) * 0.999);
        if (n <= 0) continue;
        let got = n;
        for (const i in MENU[k].r) got = Math.min(got, Math.floor(stockQty(s, i) / (MENU[k].r[i] * mf(o, i)) + 1e-6));
        if (got <= 0) continue;
        for (const i in MENU[k].r) cogs += consume(s, i, MENU[k].r[i] * mf(o, i) * got);
        const price = R(s.prices[k] * (1 + o.adj / 100) / 500) * 500;
        oRev += got * price; oServed += got; sold[k] = (sold[k] || 0) + got;
      }
      const oLost = Math.max(0, d.total - oServed);
      const lostFrac = d.total > 0 ? oLost / d.total : 0;
      const util = cap > 0 ? d.total / cap : (d.total > 0 ? 2 : 0);
      const sat = clamp(quality(s, o) + clamp(-30 * (d.ratio - 1), -12, 5) - Math.min(20, 35 * lostFrac), 0, 100);
      if (d.total > 0) { satW += d.total; satSum += sat * d.total; }
      let oFee = 0;
      if (s.ojol) oFee += oRev * 0.2 * (0.25 / 1.25);
      if (!o.own && !s.research.r_pos) oFee += oRev * 0.025;
      const mTarget = 55 + (s.wagePct - 100) * 0.9 - 40 * Math.max(0, util - 0.9) + s.training * 3;
      o.morale = clamp(o.morale + (mTarget - o.morale) * 0.15, 5, 100);
      o.known = Math.min(1, o.known + 0.02 + 0.02 * s.buzz);
      if (o.comp > 0 && s.rep > 70 && rnd(s) < 0.012) o.comp--;
      o.last = { vis: R(d.vis), demand: R(d.total), served: oServed, lost: R(oLost), rev: oRev, util, cap: R(cap), closed: o.closed > 0, sat: R(sat),
        says: comments({ dev: tasteDev(s, o), ratio: d.ratio, lostFrac, short: oShort }) };
      if (o.closed > 0) o.closed--;
      if (o.broken > 0) o.broken--;
      rev += oRev; served += oServed; lost += oLost; fee += oFee; share += oRev * (LOCS[o.loc].share || 0);
    }
    for (const k in ING) s.use[k] = s.use[k] * 0.7 + needRaw[k] * 0.3;
    s.cash += rev - fee;
    s.cur.rev += rev; s.cur.cogs += cogs; s.cur.fee += fee; s.cur.cust += served;
    if (Object.keys(short).length) notes.push('Kehabisan: ' + Object.keys(short).map(k => ING[k].n.toLowerCase()).join(', ') + '.');
    if (lost > served * 0.12 && !Object.keys(short).length) notes.push('Sebagian pelanggan pergi karena antrean terlalu panjang.');

    /* royalti waralaba */
    let royalty = 0;
    if (s.franchise.length) {
      const avgRev = s.outlets.length ? rev / s.outlets.length : 0;
      for (const f of s.franchise) royalty += avgRev * 0.05 * (0.5 + f.q);
      royalty = R(royalty);
      s.cash += royalty; s.cur.royalty += royalty;
    }

    /* reputasi */
    if (satW > 0) {
      let target = satSum / satW;
      for (const f of s.franchise) if (f.q < 0.5) target -= 2;
      s.rep = clamp(s.rep + (target - s.rep) * 0.035, 0, 100);
    }
    s.buzz *= 0.94;

    /* biaya */
    const ops = R(opsCost(s) + rev * 0.06 + share);
    spend(s, ops, 'ops');
    const w = dailyWages(s);
    s.wagesDue += w; s.cur.wages += w;
    if (c.wd === 5) { s.cash -= s.wagesDue; bills.push(['Gaji mingguan', s.wagesDue]); s.wagesDue = 0; }
    if (c.dom === 1 && s.day > 1) {
      let r = 0;
      for (const o of s.outlets) if (o.opened < s.day) r += rent(s, o);
      if (r) { spend(s, r, 'rent'); bills.push(['Sewa outlet', r]); }
    }
    if (c.dom === 5 && s.loans.length) {
      let tot = 0, intr = 0;
      for (const l of s.loans) {
        const i = l.bal * l.r, pay = Math.min(l.pay, l.bal + i);
        intr += i; tot += pay; l.bal -= pay - i; l.left--;
      }
      s.loans = s.loans.filter(l => l.left > 0 && l.bal > 1);
      s.cash -= tot; s.cur.interest += intr; bills.push(['Cicilan pinjaman', tot]);
    }
    if (c.dom === 10 && s.equity > 0) {
      const lm = s.months[s.months.length - 1], div = lm ? Math.max(0, monthProfit(lm)) * s.equity : 0;
      if (div > 0) { spend(s, R(div), 'other'); bills.push(['Dividen investor', R(div)]); }
    }
    if (c.dom === 15 && s.taxDue > 0) { spend(s, s.taxDue, 'tax'); bills.push([s.bigTax ? 'Pajak penghasilan 22% laba' : 'PPh final UMKM 0,5%', s.taxDue]); s.taxDue = 0; }
    if (c.dom === 25) { const x = R(3 * JT * s.infl); spend(s, x, 'owner'); bills.push(['Biaya hidup pemilik', x]); }
    if (c.month === 3 && c.dom === 20) {
      const thr = R(dailyWages(s) * 30);
      if (thr > 0) { spend(s, thr, 'wages'); bills.push(['THR karyawan', thr]); for (const o of s.outlets) o.morale = clamp(o.morale + 8, 0, 100); }
    }

    /* bahan basi */
    let waste = 0;
    const spoiled = [];
    for (const k in ING) {
      const lim = shelf(s, k);
      let q = 0;
      for (const b of s.stock[k]) b.age++;
      s.stock[k] = s.stock[k].filter(b => { if (b.age >= lim) { q += b.q; waste += b.q * b.c; return false; } return true; });
      if (q > 0.01) spoiled.push((R(q * 10) / 10) + ' ' + ING[k].u + ' ' + ING[k].n.toLowerCase());
    }
    s.cur.waste += waste;
    if (spoiled.length) notes.push('Basi dan dibuang: ' + spoiled.join(', ') + ' (' + rp(waste) + ').');

    /* harga bahan bergerak */
    for (const k in ING) s.pidx[k] = clamp(s.pidx[k] + 0.06 * (1 - s.pidx[k]) + gauss(s) * 0.018, 0.7, 1.8);
    if (s.flags.noSusu > 0) s.flags.noSusu--;
    if (s.flags.dealDays > 0 && --s.flags.dealDays === 0) delete s.flags.deal;

    /* kas minus */
    if (s.cash < 0) {
      const pen = R(-s.cash * 0.0015);
      spend(s, pen, 'interest'); s.negDays++;
      const lim = s.mode === 'santai' ? 30 : 14;
      notes.push('Kas minus. Denda keterlambatan ' + rp(pen) + '. Hari ke-' + s.negDays + ' dari batas ' + lim + '.');
      if (s.negDays >= lim) { s.over = 'bangkrut'; addLog(s, 'Kas minus terlalu lama. Usaha dinyatakan bangkrut.', 'bad'); }
    } else s.negDays = 0;

    const profit = rev + royalty - cogs - waste - w - fee - ops - s.outlets.reduce((a, o) => a + rent(s, o), 0) / 30;
    const report = { day: s.day, wx: s.wx, rev, cogs, waste, wages: w, fee, ops, royalty, served, lost: R(lost), profit, bills, notes, sold,
      out: rows.map(x => ({ id: x.o.id, loc: x.o.loc, served: x.o.last.served, lost: x.o.last.lost, vis: x.o.last.vis, closed: x.o.last.closed, says: x.o.last.says })),
      cashDelta: s.cash - cashStart, tags: seasonTags(s.day) };
    s.last = report;
    s.hist.push({ d: s.day, rev, profit: R(profit), cash: R(s.cash), rep: R(s.rep * 10) / 10, cust: served });
    if (s.hist.length > 420) s.hist.shift();

    /* tutup bulan dan tahun */
    if (c.dom === 30) {
      const m = s.cur; m.y = c.year; m.m = c.month;
      s.months.push(m); if (s.months.length > 36) s.months.shift();
      const before = s.ytdRev; s.ytdRev += m.rev;
      const yearRev = s.months.slice(-12).reduce((a, x) => a + x.rev, 0);
      s.bigTax = yearRev > UMKM_MAX;
      s.taxDue = s.bigTax ? R(0.22 * Math.max(0, monthProfit(m))) : R(0.005 * Math.max(0, s.ytdRev - Math.max(before, TAX_FREE)));
      if (s.bigTax && !s.flags.bigTaxTold) { s.flags.bigTaxTold = true; addLog(s, 'Omzet setahun melewati Rp 4,8 miliar. Usaha keluar dari skema UMKM: pajak kini 22% dari laba bulanan.', 'warn'); }
      s.cur = newMonth();
      addLog(s, 'Tutup buku ' + BULAN[c.month - 1] + ': omzet ' + rp(m.rev) + ', laba ' + rp(monthProfit(m)) + '.', monthProfit(m) >= 0 ? 'good' : 'bad');
      if (s.day % 360 === 0) {
        s.infl *= 1.04; s.baseWage *= 1.06; s.ytdRev = 0;
        for (const k in MENU) s.prices[k] = R(s.prices[k] * 1.04 / 500) * 500;
        addLog(s, 'Ulang tahun usaha: UMR naik 6%, harga bahan dan sewa naik 4%. Harga jual Anda ikut disesuaikan 4%.', 'warn');
      }
    }
    checkGoals(s);

    /* hari berikutnya */
    s.day++;
    s.wx = s.wxNext;
    s.wxNext = rollWeather(s, s.day + 1);
    s.wxFc = rnd(s) < 0.8 ? s.wxNext : pick(s, Object.keys(WX));
    if (!s.over) rollEvent(s);
    return report;
  }

  return { VERSION, JT, ING, GRADES, MENU, LOCS, EQUIP, DEKOR, TRAIN, RES, CAMP, LOAN, GOALS, WX, HARI, BULAN, TAX_FREE, UMKM_MAX, hqCost,
    newGame, runDay, cal, dateStr, seasonTags, rp, stockQty, stockValue, shelf, unitPrice, quoteBuy, itemCost, unlocked, wage, dailyWages,
    quality, capacity, rent, opsCost, wtpOf, mixOf, taste, demand, forecastNeeds, debt, rev30, loanLimit, valuation, upcoming, monthProfit,
    buy, setPrice, hire, fire, upgradeEquip, upgradeDekor, setupCost, openOutlet, closeOutlet, trainCost, train, canResearch, research,
    campCost, campaign, takeLoan, repayLoan, buildEvent, resolveEvent, checkGoals };
})();
if (typeof module !== 'undefined') module.exports = Engine;
