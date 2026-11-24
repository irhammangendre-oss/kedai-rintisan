/* Kedai Rintisan: antarmuka. */
(() => {
  'use strict';
  const E = Engine, JT = E.JT;
  const $ = q => document.querySelector(q);
  const KEY = 'kedai-rintisan-v1';
  let S = null, tab = 'ringkasan', dialog = null, toastT = 0, fx = null, busy = false, justRan = false, prevCash = null, lastDlg = null;
  const P = Sound.prefs, G = window.gsap || null;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ambient = Scene.create();
  const cloud = { db: null, uid: null, busy: false, dirty: false, status: 'Tersimpan di peramban ini' };
  const draft = { loanType: 'kur', loanAmt: 10, loanMonths: 24, buy: {}, io: '' };

  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const rp = E.rp;
  const dec = (x, d) => x.toFixed(d).replace('.', ',');
  function jt(x) {
    const a = Math.abs(x), s = x < 0 ? '-' : '';
    if (a >= 1e9) return s + 'Rp ' + dec(a / 1e9, 2) + ' M';
    if (a >= 1e6) return s + 'Rp ' + dec(a / 1e6, a >= 1e8 ? 0 : 1) + ' jt';
    return rp(x);
  }
  const qty = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
  const pct = x => Math.round(x * 100) + '%';
  const tone = (x, lo, hi) => x >= hi ? 'good' : x >= lo ? 'warn' : 'bad';
  function toast(msg) {
    if (!msg) return;
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
  }

  /* ---------- Simpan & muat ---------- */
  function save() {
    if (!S) return;
    S.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* penyimpanan lokal tidak tersedia */ }
    cloud.dirty = true; pushCloud();
  }
  async function pushCloud() {
    if (!cloud.db || !cloud.uid || cloud.busy || !cloud.dirty || !S) return;
    cloud.busy = true; cloud.dirty = false;
    try {
      await cloud.db.collection('data/users/' + cloud.uid).doc('save').set({ json: JSON.stringify(S), day: S.day, savedAt: S.savedAt });
      cloud.status = 'Tersimpan di akun Claude Anda';
    } catch (e) { cloud.status = 'Tersimpan di peramban ini (simpanan akun gagal)'; }
    cloud.busy = false;
    const el = $('#savestat'); if (el) el.textContent = cloud.status;
    if (cloud.dirty) setTimeout(pushCloud, 4000);
  }
  async function initCloud() {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      cloud.db = db; cloud.uid = uid;
      const snap = await db.collection('data/users/' + uid).doc('save').get();
      const data = snap && (typeof snap.data === 'function' ? snap.data() : snap.data || snap);
      if (data && data.json && (!S || (data.savedAt || 0) > (S.savedAt || 0) + 5000)) {
        const st = valid(JSON.parse(data.json));
        if (st) { S = st; toast('Simpanan dari akun Anda dimuat: hari ke-' + S.day + '.'); render(); }
      }
      cloud.status = 'Tersimpan di akun Claude Anda';
      if (S) { cloud.dirty = true; pushCloud(); }
    } catch (e) { /* tanpa simpanan akun, game tetap jalan */ }
  }
  function valid(st) {
    if (!st || st.v !== E.VERSION || !Array.isArray(st.outlets) || !st.outlets.length || typeof st.cash !== 'number') return null;
    st.evLast = st.evLast || {}; st.flags = st.flags || {};
    return st;
  }
  function loadLocal() {
    try { return valid(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return null; }
  }

  /* ---------- Bantuan hitung ---------- */
  function needPerDay(k) { const f = E.forecastNeeds(S)[k]; return Math.max(f, S.use[k] || 0); }
  function coverQty(k, days) {
    const d = Math.min(days, E.shelf(S, k) - 1), step = E.ING[k].step;
    return Math.max(0, Math.ceil((needPerDay(k) * d * 1.1 - E.stockQty(S, k)) / step) * step);
  }
  function fairRange(k) {
    const w = S.outlets.map(o => E.wtpOf(S, o) / (1 + o.adj / 100));
    const r = x => Math.round(E.MENU[k].ref * x / 500) * 500;
    return [r(Math.min(...w)), r(Math.max(...w))];
  }
  function locEstimate(loc) {
    const fake = { id: -1, loc, opened: S.day, staff: 3, equip: E.LOCS[loc].equip, dekor: 0, morale: 60, comp: 0, closed: 0, broken: 0, rentMult: 1, known: 1, adj: 0, own: false };
    const w = E.wtpOf(S, fake), prices = {};
    for (const k in E.MENU) prices[k] = E.MENU[k].ref * w;
    const s2 = Object.assign({}, S, { prices, wx: 'cerah', buzz: 0 });
    let rev = 0;
    for (let wd = 0; wd < 7; wd++) {
      s2.day = S.day - ((S.day - 1) % 7) + wd;
      const d = E.demand(s2, fake, 1), sc = d.total > 0 ? Math.min(1, E.capacity(S, fake) / d.total) : 0;
      for (const k in d.units) rev += d.units[k] * sc * prices[k];
    }
    const fixed = E.LOCS[loc].rent * S.infl + (1.5 + 3) * E.wage(S) * 30;
    return { rev: rev / 7, fixed };
  }

  /* ---------- Grafik ---------- */
  function chart() {
    const h = S.hist.slice(-60);
    if (h.length < 2) return '<p class="muted small">Grafik muncul setelah dua hari berjalan.</p>';
    const W = 720, H = 190, L = 58, Rr = 8, T = 10, B = 22, iw = W - L - Rr, ih = H - T - B;
    const cs = h.map(x => x.cash), ps = h.map(x => x.profit);
    let lo = Math.min(0, ...cs), hi = Math.max(...cs, 1); const pad = (hi - lo) * 0.08; hi += pad; if (lo < 0) lo -= pad;
    const x = i => L + iw * i / (h.length - 1), y = v => T + ih * (1 - (v - lo) / (hi - lo));
    const pm = Math.max(...ps.map(Math.abs), 1), bh = ih * 0.32, by = T + ih;
    const line = h.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.cash).toFixed(1)).join('');
    const ticks = [lo < 0 ? lo : 0, (lo + hi) / 2, hi - pad].map(v => `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${esc(jt(v).replace('Rp ', ''))}</text>`).join('');
    const bars = h.map((p, i) => { const v = p.profit / pm * bh; return `<rect x="${(x(i) - 3).toFixed(1)}" y="${(v >= 0 ? by - v : by).toFixed(1)}" width="6" height="${Math.max(1, Math.abs(v)).toFixed(1)}" fill="var(${p.profit >= 0 ? '--good' : '--bad'})" opacity=".55"/>`; }).join('');
    const last = h[h.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik kas dan laba harian 60 hari terakhir" style="width:100%;height:auto">
      ${ticks}${bars}
      <path d="${line}L${x(h.length - 1)} ${T + ih}L${L} ${T + ih}Z" fill="var(--accent)" opacity=".1"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <circle cx="${x(h.length - 1)}" cy="${y(last.cash)}" r="4" fill="var(--accent)"/>
      <text x="${L}" y="${H - 6}">hari ${h[0].d}</text><text x="${W - Rr}" y="${H - 6}" text-anchor="end">hari ${last.d}</text>
    </svg><p class="small muted">Garis: saldo kas. Batang: laba harian (hijau untung, merah rugi).</p>`;
  }

  /* ---------- Halaman ---------- */
  const TABS = [['ringkasan', 'Ringkasan'], ['menu', 'Menu & harga'], ['stok', 'Stok & belanja'], ['outlet', 'Outlet & tim'],
    ['pasar', 'Pemasaran'], ['uang', 'Keuangan'], ['riset', 'Pengembangan'], ['catatan', 'Pencapaian & simpanan']];

  function alerts() {
    const a = [], need = E.forecastNeeds(S);
    if (S.cash < 0) a.push(['bad', 'Kas minus ' + S.negDays + ' hari. Batasnya ' + (S.mode === 'santai' ? 30 : 14) + ' hari sebelum bangkrut. Ambil pinjaman di halaman Keuangan atau pangkas biaya.']);
    const short = Object.keys(E.ING).filter(k => need[k] > 0 && E.stockQty(S, k) < need[k] * 0.98);
    if (short.length && !(S.auto.on && S.research.r_supplier)) a.push(['warn', 'Stok hari ini kurang: ' + short.map(k => E.ING[k].n.toLowerCase()).join(', ') + '. Belanja dulu di halaman Stok.']);
    for (const o of S.outlets) {
      if (o.last && o.last.util > 1.05) a.push(['warn', E.LOCS[o.loc].n + ' kewalahan: permintaan ' + pct(o.last.util) + ' dari kapasitas. Tambah barista atau tingkatkan peralatan.']);
      if (o.morale < 42 && (o.staff > 0)) a.push(['warn', 'Semangat tim ' + E.LOCS[o.loc].n + ' rendah (' + Math.round(o.morale) + '). Karyawan bisa keluar.']);
      if (o.comp > 0) a.push(['info', E.LOCS[o.loc].n + ' punya ' + o.comp + ' pesaing dekat. Pengunjung berkurang ' + o.comp * 12 + '%.']);
    }
    const bills = E.upcoming(S).filter(b => b.d <= 3 && b.amt > Math.max(0, S.cash));
    for (const b of bills) a.push(['bad', b.n + ' ' + rp(b.amt) + ' jatuh tempo ' + (b.d === 0 ? 'hari ini' : b.d + ' hari lagi') + ', kas belum cukup.']);
    if (S.flags.deal) a.push(['good', 'Tawaran tempat: buka di ' + E.LOCS[S.flags.deal].n + ' diskon 30%, sisa ' + S.flags.dealDays + ' hari.']);
    if (S.day <= 3) a.push(['info', 'Mulai dari sini: cek harga di Menu, belanja bahan di Stok, lalu tekan "Jalankan hari". Perhatikan komentar pelanggan, lalu setel racikan di halaman Outlet.']);
    return a.map(([k, t]) => `<div class="alert ${k}">${esc(t)}</div>`).join('');
  }
  function struk() {
    const r = S.last;
    if (!r) return `<div class="struk"><h3>${esc(S.brand)}</h3><p class="c">Belum ada penjualan.</p><hr><p class="c">Struk hari pertama muncul di sini.</p></div>`;
    const l = (a, b, cls) => `<div class="l ${cls || ''}"><span>${esc(a)}</span><b>${esc(b)}</b></div>`;
    const rentDay = S.outlets.reduce((a, o) => a + E.rent(S, o), 0) / 30;
    const sold = Object.keys(r.sold).map(k => l(E.MENU[k].n, r.sold[k] + ' porsi')).join('');
    return `<div class="struk"><h3>${esc(S.brand)}</h3>
      <p class="c">Hari ke-${r.day} · ${esc(E.WX[r.wx])}${r.tags.length ? ' · ' + esc(r.tags.join(', ')) : ''}</p><hr>
      ${sold || '<p class="c">Tidak ada yang terjual.</p>'}<hr>
      ${l('Penjualan', rp(r.rev))}${r.royalty ? l('Royalti waralaba', rp(r.royalty)) : ''}
      ${l('Bahan terpakai', rp(-r.cogs))}${r.waste > 0 ? l('Bahan basi', rp(-r.waste), 'neg') : ''}
      ${l('Gaji (jatah harian)', rp(-r.wages))}${l('Sewa (jatah harian)', rp(-rentDay))}
      ${l('Listrik, air, lain-lain', rp(-r.ops))}${r.fee > 0 ? l('Komisi & selisih kas', rp(-r.fee)) : ''}<hr>
      <div class="l tot ${r.profit >= 0 ? 'pos' : 'neg'}"><span>LABA HARI INI</span><b>${rp(r.profit)}</b></div>
      ${l('Terlayani / pergi', r.served + ' / ' + r.lost)}
      ${r.bills.length ? '<hr>' + r.bills.map(b => l('Dibayar: ' + b[0], rp(-b[1]), 'neg')).join('') : ''}
      ${r.notes.map(n => `<p class="note">* ${esc(n)}</p>`).join('')}
      <hr><p class="c">Terima kasih, datang lagi ya.</p></div>`;
  }
  function vRingkasan() {
    const up = E.upcoming(S).slice(0, 6);
    const outs = S.outlets.map(o => {
      const x = o.last;
      if (!x) return `<tr><td>${esc(E.LOCS[o.loc].n)}</td><td colspan="5" class="muted">Baru buka, belum ada data.</td></tr>`;
      if (x.closed) return `<tr><td>${esc(E.LOCS[o.loc].n)}</td><td colspan="5" class="warn">Tutup kemarin.</td></tr>`;
      const u = Math.min(1.3, x.util);
      return `<tr><td>${esc(E.LOCS[o.loc].n)}</td><td class="n">${x.vis}</td><td class="n">${x.served}</td><td class="n ${x.lost > x.served * 0.1 ? 'bad' : ''}">${x.lost}</td>
        <td class="n">${rp(x.rev)}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="bar ${u > 1 ? 'bad' : u > 0.85 ? 'warn' : 'good'}" style="flex:1"><i style="width:${Math.min(100, u * 100)}%"></i></div><span class="num small">${pct(x.util)}</span></div></td></tr>`;
    }).join('');
    return `<div class="wrap"><figure class="street"><canvas id="street" aria-label="Gambar suasana outlet Anda hari ini: toko, cuaca, dan pelanggan yang lalu-lalang"></canvas>
        <figcaption>${esc(E.WX[S.wx])} · ${S.outlets.length} outlet${S.last ? ' · kemarin ' + S.last.served + ' pelanggan terlayani' : ''}</figcaption></figure>
      <div class="cols"><div class="wrap">
      ${alerts()}
      <section class="card"><header><h3>Outlet kemarin</h3><span class="small muted">Kapasitas terpakai di atas 100% berarti pelanggan pergi</span></header>
        <div class="tablewrap"><table><thead><tr><th>Outlet</th><th class="n">Pengunjung</th><th class="n">Terlayani</th><th class="n">Pergi</th><th class="n">Omzet</th><th>Kapasitas terpakai</th></tr></thead><tbody>${outs}</tbody></table></div></section>
      <section class="card"><header><h3>Kas dan laba, 60 hari terakhir</h3></header>${chart()}</section>
      <section class="card"><header><h3>Tagihan mendatang</h3></header>
        <div class="tablewrap"><table><tbody>${up.map(b => `<tr><td>${esc(b.n)}</td><td class="n">${rp(b.amt)}</td><td class="n muted">${b.d === 0 ? 'hari ini' : b.d + ' hari lagi'}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="card"><header><h3>Catatan terbaru</h3></header>${logList(8)}</section>
    </div><div class="wrap">${struk()}</div></div></div>`;
  }
  function logList(n) {
    return `<ul class="log">${S.log.slice(0, n).map(l => `<li><time>hari ${l.d}</time><span class="${l.k === 'good' || l.k === 'bad' || l.k === 'warn' ? l.k : ''}">${esc(l.t)}</span></li>`).join('')}</ul>`;
  }
  function vMenu() {
    const rows = Object.keys(E.MENU).map(k => {
      const m = E.MENU[k], c = E.itemCost(S, k), p = S.prices[k];
      if (!E.unlocked(S, k)) return `<tr class="muted"><td>${esc(m.n)}</td><td colspan="6">Belum dimiliki. Buka resepnya di halaman Pengembangan.</td></tr>`;
      const fr = fairRange(k), sold = S.last && S.last.sold[k] || 0, mg = (p - c) / p;
      const note = k === 'literan' && !S.ojol ? '<br><span class="small muted">Hanya laku lewat ojek online</span>' : '';
      return `<tr><td><b>${esc(m.n)}</b>${note}</td><td class="n">${rp(c)}</td>
        <td class="n"><span class="stepper"><button class="mini" data-act="price" data-k="${k}" data-d="-500" aria-label="Turunkan harga ${esc(m.n)}">−</button>
          <input type="number" id="price-${k}" step="500" min="1000" value="${p}" data-chg="price" data-k="${k}" aria-label="Harga ${esc(m.n)}">
          <button class="mini" data-act="price" data-k="${k}" data-d="500" aria-label="Naikkan harga ${esc(m.n)}">+</button></span></td>
        <td class="n ${tone(mg, 0.4, 0.55)}">${pct(mg)}</td>
        <td class="n">${fr[0] === fr[1] ? rp(fr[0]) : rp(fr[0]) + ' – ' + rp(fr[1])}</td>
        <td class="n">${sold}</td>
        <td><label class="row" style="gap:6px"><input type="checkbox" id="act-${k}" data-chg="active" data-k="${k}" ${S.active[k] ? 'checked' : ''}> dijual</label></td></tr>`;
    }).join('');
    return `<div class="wrap"><section class="card"><header><h2>Menu & harga</h2></header>
      <p class="muted" style="max-width:70ch">Harga dasar berlaku di semua outlet. "Harga wajar" adalah harga yang masih dianggap pantas oleh pelanggan, tergantung lokasi dan kualitas. Di atasnya pembeli cepat berkurang dan reputasi turun; di bawahnya warung lebih ramai tapi margin tipis. Outlet di lokasi mahal bisa diberi penyesuaian harga di halaman Outlet.</p>
      <div class="tablewrap"><table><thead><tr><th>Menu</th><th class="n">Modal bahan</th><th class="n">Harga jual</th><th class="n">Margin</th><th class="n">Harga wajar</th><th class="n">Terjual kemarin</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </section></div>`;
  }
  function vStok() {
    const auto = S.research.r_supplier;
    let tot3 = 0;
    const rows = Object.keys(E.ING).map(k => {
      const g = E.ING[k], q = E.stockQty(S, k), n = needPerDay(k), days = n > 0 ? q / n : 99, up = E.unitPrice(S, k), idx = S.pidx[k];
      const old = S.stock[k].filter(b => E.shelf(S, k) - b.age <= 1).reduce((a, b) => a + b.q, 0);
      const q3 = coverQty(k, 3); tot3 += q3 > 0 ? E.quoteBuy(S, k, q3).cost : 0;
      const d = draft.buy[k] != null ? draft.buy[k] : q3;
      const cost = d > 0 ? E.quoteBuy(S, k, d).cost : 0;
      const blocked = k === 'susu' && S.flags.noSusu > 0;
      return `<tr><td><b>${esc(g.n)}</b><br><span class="small muted">${g.shelf > 900 ? 'tidak basi' : 'tahan ' + E.shelf(S, k) + ' hari'}</span></td>
        <td class="n">${qty(q)} ${g.u}${old > 0.01 ? `<br><span class="small warn">${qty(old)} basi besok</span>` : ''}</td>
        <td class="n ${tone(days, 1, 2)}">${n > 0 ? '±' + dec(Math.min(99, days), 1) + ' hari' : '–'}</td>
        <td class="n">${rp(up)}<br><span class="small ${idx > 1.08 ? 'bad' : idx < 0.94 ? 'good' : 'muted'}">${idx > 1.02 ? 'naik ' : idx < 0.98 ? 'turun ' : ''}${Math.abs(Math.round((idx - 1) * 100))}% dari normal</span></td>
        <td class="n">${blocked ? '<span class="warn small">Pemasok tidak bisa kirim</span>' : `<span class="stepper">
          <button class="mini" data-act="fill" data-k="${k}" data-d="1">1 hr</button><button class="mini" data-act="fill" data-k="${k}" data-d="3">3 hr</button><button class="mini" data-act="fill" data-k="${k}" data-d="7">7 hr</button>
          <input type="number" id="buy-${k}" min="0" step="${g.step}" value="${d}" data-chg="buyqty" data-k="${k}" aria-label="Jumlah beli ${esc(g.n)}"></span>`}</td>
        <td class="n">${rp(cost)}</td>
        <td><button data-act="buy" data-k="${k}" ${blocked || !(d > 0) || cost > S.cash ? 'disabled' : ''}>Beli</button></td></tr>`;
    }).join('');
    return `<div class="wrap">
      <section class="card"><header><h2>Stok & belanja</h2><button class="primary" data-act="buyall" ${tot3 > 0 && tot3 <= S.cash ? '' : 'disabled'}>Belanja semua untuk 3 hari · ${rp(tot3)}</button></header>
      <p class="muted" style="max-width:70ch">Gudang dipakai bersama semua outlet. Bahan dibeli pagi ini dan langsung bisa dipakai. Beli terlalu banyak, bahan basi; terlalu sedikit, pelanggan pulang kecewa. Belanja Rp 2 juta ke atas per bahan dapat potongan 5%, Rp 10 juta ke atas 8%.</p>
      <div class="tablewrap"><table><thead><tr><th>Bahan</th><th class="n">Stok</th><th class="n">Cukup untuk</th><th class="n">Harga hari ini</th><th class="n">Beli (isi sampai / jumlah)</th><th class="n">Biaya</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>
      <div class="grid">
      <section class="card"><header><h3>Mutu biji kopi</h3></header>
        <label for="grade" class="small muted">Berlaku untuk pembelian berikutnya. Mutu rasa dihitung dari campuran stok di gudang.</label>
        <select id="grade" data-chg="grade">${E.GRADES.map((g, i) => `<option value="${i}" ${S.grade === i ? 'selected' : ''}>${esc(g.n)} · harga x${dec(g.m, 2)} · kualitas +${g.q}</option>`).join('')}</select></section>
      <section class="card"><header><h3>Pemasok langganan</h3><span class="chip ${auto ? 'good' : ''}">${auto ? 'Aktif tersedia' : 'Belum dimiliki'}</span></header>
        ${auto ? `<label class="row"><input type="checkbox" id="auto-on" data-chg="auto" ${S.auto.on ? 'checked' : ''}> Kirim otomatis tiap pagi</label>
          <label class="row" for="auto-days">Jaga stok untuk <select id="auto-days" data-chg="autodays">${[2, 3, 4, 5, 7].map(d => `<option ${S.auto.days === d ? 'selected' : ''}>${d}</option>`).join('')}</select> hari</label>
          <p class="small muted">Harga 3% lebih mahal dari belanja sendiri. Bahan cepat basi dibatasi sesuai umur simpannya.</p>`
      : '<p class="small muted">Dengan kontrak pemasok (halaman Pengembangan), bahan dikirim otomatis dan Anda bisa melompat 7 hari sekaligus.</p>'}</section>
      </div></div>`;
  }
  function says(o) {
    const sy = o.last && o.last.says;
    if (!sy) return '<p class="small muted">Komentar pelanggan muncul setelah outlet ini melewati satu hari.</p>';
    const count = {}; for (const x of sy.buy.concat(sy.lost)) count[x] = (count[x] || 0) + 1;
    const top = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 4);
    return `<div class="row" style="gap:6px"><span class="small muted">Kata pelanggan kemarin:</span>${top.map(x => `<span class="chip ${/Pas|Enak|Murah/.test(x) ? 'good' : /Lumayan/.test(x) ? '' : 'warn'}">${esc(x)}</span>`).join('')}</div>`;
  }
  function vOutlet() {
    const cards = S.outlets.map(o => {
      const L = E.LOCS[o.loc], cap = Math.round(E.capacity(S, o)), q = Math.round(E.quality(S, o)), x = o.last, min = o.own ? 0 : 1;
      const eq = o.equip < 3 ? E.EQUIP[o.equip + 1] : null, dk = o.dekor < 2 ? E.DEKOR[o.dekor + 1] : null;
      return `<section class="card"><canvas class="shoppic" data-shop="${o.id}" aria-hidden="true"></canvas><header><h3>${esc(L.n)}</h3><span class="row" style="gap:6px">${o.own ? '<span class="chip">Anda jaga sendiri</span>' : '<span class="chip">Kepala toko</span>'}${o.closed > 0 ? '<span class="chip bad">Tutup ' + o.closed + ' hari</span>' : ''}${o.broken > 0 ? '<span class="chip warn">Mesin rusak</span>' : ''}</span></header>
        <dl class="kv">
          <dt>Dikenal warga sekitar</dt><dd>${pct(o.known)}</dd>
          <dt>Kualitas di mata pelanggan</dt><dd class="${tone(q, 45, 65)}">${q}</dd>
          <dt>Semangat tim</dt><dd class="${tone(o.morale, 42, 60)}">${Math.round(o.morale)}</dd>
          <dt>Kapasitas layanan</dt><dd>${cap} porsi/hari</dd>
          <dt>Permintaan kemarin</dt><dd>${x ? x.demand + ' porsi' : '–'}</dd>
          <dt>Sewa${L.share ? ' + bagi hasil ' + pct(L.share) : ''}</dt><dd>${rp(E.rent(S, o))}/bln</dd>
          <dt>Pesaing dekat</dt><dd>${o.comp}</dd></dl>
        <div class="row spread"><span>Barista: <b class="num">${o.staff}</b></span><span class="stepper">
          <button class="mini" data-act="fire" data-id="${o.id}" ${o.staff <= min ? 'disabled' : ''} title="Pesangon ${rp(JT * S.infl)}">− Kurangi</button>
          <button class="mini" data-act="hire" data-id="${o.id}" title="Biaya rekrut ${rp(0.5 * JT * S.infl)}">+ Rekrut</button></span></div>
        <div class="row spread"><span>Peralatan: <b>${esc(E.EQUIP[o.equip].n)}</b><br><span class="small muted">maks. ${E.EQUIP[o.equip].cap} porsi/hari</span></span>
          ${eq ? `<button class="mini" data-act="equip" data-id="${o.id}" ${S.cash < eq.cost * S.infl ? 'disabled' : ''}>${esc(eq.n)} · ${jt(eq.cost * S.infl)}</button>` : '<span class="chip good">Terlengkap</span>'}</div>
        <div class="row spread"><span>Dekor: <b>${esc(E.DEKOR[o.dekor].n)}</b></span>
          ${dk ? `<button class="mini" data-act="dekor" data-id="${o.id}" ${S.cash < dk.cost * S.infl ? 'disabled' : ''}>${esc(dk.n)} · ${jt(dk.cost * S.infl)}</button>` : '<span class="chip good">Maksimal</span>'}</div>
        <label class="row spread" for="adj-${o.id}"><span>Penyesuaian harga di sini</span><select id="adj-${o.id}" data-chg="adj" data-id="${o.id}">${[-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70].map(a => `<option value="${a}" ${o.adj === a ? 'selected' : ''}>${a > 0 ? '+' : ''}${a}%</option>`).join('')}</select></label>
        <div class="mix"><div class="row spread"><b>Racikan di sini</b><span class="small muted">100% = takaran standar</span></div>
          ${[['kopi', 'Kopi'], ['susu', 'Susu'], ['gula', 'Gula aren']].map(([k, n]) => `<label class="row" for="mix-${k}-${o.id}"><span class="mixn">${n}</span><input type="range" id="mix-${k}-${o.id}" min="70" max="140" step="10" value="${E.mixOf(o)[k]}" data-chg="mix" data-id="${o.id}" data-k="${k}"><b class="num">${E.mixOf(o)[k]}%</b></label>`).join('')}
          ${says(o)}</div>
        ${o.own ? '' : `<div class="row"><button class="mini ghost" data-act="askclose" data-id="${o.id}">Tutup outlet ini</button></div>`}
      </section>`;
    }).join('');
    const news = Object.keys(E.LOCS).filter(l => !S.outlets.some(o => o.loc === l)).map(l => {
      const L = E.LOCS[l], cost = E.setupCost(S, l), est = locEstimate(l), deal = S.flags.deal === l;
      return `<section class="card"><canvas class="shoppic soon" data-loc="${l}" aria-hidden="true"></canvas><header><h3>${esc(L.n)}</h3>${deal ? '<span class="chip good">Diskon 30%</span>' : ''}</header>
        <p class="small muted">${esc(L.d)}</p>
        <dl class="kv"><dt>Biaya buka</dt><dd>${rp(cost)}</dd><dt>Sewa per bulan</dt><dd>${rp(L.rent * S.infl)}</dd>
          <dt>Orang lewat per hari</dt><dd>±${L.traffic}</dd>
          <dt>Perkiraan omzet saat sudah dikenal</dt><dd>${jt(est.rev * 30)}/bln</dd>
          <dt>Biaya tetap (sewa, kepala toko, 3 barista)</dt><dd>${jt(est.fixed)}/bln</dd></dl>
        <button data-act="open" data-loc="${l}" ${S.cash < cost ? 'disabled' : ''}>${S.cash < cost ? 'Kas belum cukup' : 'Buka outlet di sini'}</button></section>`;
    }).join('');
    const tc = E.trainCost(S), staffN = S.outlets.reduce((a, o) => a + o.staff, 0);
    return `<div class="wrap"><h2>Outlet & tim</h2>
      <section class="card"><header><h3>Kebijakan tim</h3><span class="small muted">${staffN} barista, ${S.outlets.length - 1} kepala toko · gaji ${rp(E.dailyWages(S) * 30)}/bln</span></header>
        <div class="row"><label for="wage">Upah barista</label><input type="range" id="wage" min="90" max="150" step="5" value="${S.wagePct}" data-chg="wage">
          <b class="num">${S.wagePct}% UMR</b><span class="muted small">${rp(E.wage(S))}/hari per barista. Upah di bawah UMR menurunkan semangat, di atasnya menaikkan.</span></div>
        <div class="row spread"><span>Pelatihan tim: <b>tingkat ${S.training} dari 3</b> <span class="small muted">· tiap tingkat menambah kualitas +4 dan kecepatan layanan 8%</span></span>
          ${S.training < 3 ? `<button data-act="train" ${S.cash < tc ? 'disabled' : ''}>Latih ke tingkat ${S.training + 1} · ${jt(tc)}</button>` : '<span class="chip good">Tuntas</span>'}</div>
        ${E.hqCost(S) > 0 ? `<p class="small muted">Kantor pusat (admin, akunting, penyelia) untuk ${S.outlets.length} outlet: ${rp(E.hqCost(S))}/bln.</p>` : ''}
      </section>
      <div class="grid">${cards}</div>
      <p class="muted small" style="max-width:70ch">Selera tiap lokasi berbeda dan berubah sedikit mengikuti cuaca: saat hujan orang ingin kopi lebih kuat, saat terik lebih banyak susu. Dengarkan komentar pelanggan saat hari berjalan, lalu setel racikan. Racikan yang pas menaikkan kualitas sampai +5; yang meleset menurunkannya sampai -10. Takaran lebih besar berarti bahan lebih boros.</p>
      ${news ? `<h3>Lokasi yang bisa dibuka</h3><p class="muted small" style="max-width:70ch">Outlet baru butuh sekitar sebulan sampai dikenal. Pastikan ada cadangan kas untuk sewa dan gaji selama masa itu. Mulai outlet ketiga, ada biaya kantor pusat Rp 10 juta per outlet tambahan tiap bulan.</p><div class="grid">${news}</div>` : ''}
    </div>`;
  }
  function vPasar() {
    const camps = Object.keys(E.CAMP).map(id => {
      const c = E.CAMP[id], cost = E.campCost(S, id);
      const lock = c.rep && S.rep < c.rep ? 'Butuh reputasi ' + c.rep : c.outlets && S.outlets.length < c.outlets ? 'Butuh ' + c.outlets + ' outlet' : '';
      return `<section class="card"><header><h3>${esc(c.n)}</h3><span class="num">${rp(cost)}</span></header>
        <p class="small muted">Menambah keramaian sekitar ${pct(c.buzz * 0.6)} pengunjung, lalu memudar 6% per hari.</p>
        <button data-act="camp" data-id="${id}" ${lock || S.cash < cost ? 'disabled' : ''}>${lock || 'Jalankan'}</button></section>`;
    }).join('');
    return `<div class="wrap"><h2>Pemasaran</h2>
      <section class="card"><header><h3>Keramaian saat ini</h3><b class="num">+${pct(S.buzz * 0.6)} pengunjung</b></header>
        <div class="bar"><i style="width:${Math.min(100, S.buzz * 100)}%"></i></div>
        <p class="small muted" style="max-width:70ch">Promosi mendatangkan orang, tetapi yang membuat mereka kembali adalah reputasi. Promosi besar saat stok atau barista kurang justru merusak reputasi.</p></section>
      <div class="grid">${camps}</div>
      <section class="card"><header><h3>Ojek online</h3><span class="chip ${S.research.r_ojol ? 'good' : ''}">${S.research.r_ojol ? 'Bermitra' : 'Belum bermitra'}</span></header>
        ${S.research.r_ojol ? `<label class="row"><input type="checkbox" id="ojol" data-chg="ojol" ${S.ojol ? 'checked' : ''}> Terima pesanan daring (pesanan +25%, komisi 20% dari pesanan daring)</label>` : '<p class="small muted">Daftarkan usaha di halaman Pengembangan.</p>'}</section>
    </div>`;
  }
  function vUang() {
    const ms = S.months.slice(-5).concat([Object.assign({ now: true }, S.cur)]);
    const cats = [['rev', 'Penjualan', 1], ['royalty', 'Waralaba', 1], ['cogs', 'Bahan terpakai', -1], ['waste', 'Bahan basi', -1], ['wages', 'Gaji & THR', -1], ['rent', 'Sewa', -1],
      ['ops', 'Listrik, air, operasional', -1], ['mkt', 'Pemasaran', -1], ['fee', 'Komisi & selisih kas', -1], ['interest', 'Bunga & denda', -1], ['tax', 'Pajak', -1], ['owner', 'Biaya hidup pemilik', -1], ['other', 'Lain-lain', -1]];
    const head = ms.map(m => `<th class="n">${m.now ? 'Bulan ini' : esc(E.BULAN[m.m - 1].slice(0, 3)) + ' th-' + m.y}</th>`).join('');
    const body = cats.filter(c => ms.some(m => Math.abs(m[c[0]] || 0) > 0.5)).map(c => `<tr><td>${c[1]}</td>${ms.map(m => `<td class="n">${jt((m[c[0]] || 0) * c[2])}</td>`).join('')}</tr>`).join('');
    const tot = `<tr class="total"><td>Laba bersih</td>${ms.map(m => { const p = E.monthProfit(m); return `<td class="n ${p >= 0 ? 'good' : 'bad'}">${jt(p)}</td>`; }).join('')}</tr>
      <tr><td class="muted">Investasi (outlet, alat, riset)</td>${ms.map(m => `<td class="n muted">${jt(m.capex || 0)}</td>`).join('')}</tr>`;
    const L = E.LOAN[draft.loanType], lim = E.loanLimit(S, draft.loanType), r = L.rate / 12;
    const amt = Math.min(draft.loanAmt * JT, lim), pay = amt > 0 ? Math.round(amt * r / (1 - Math.pow(1 + r, -draft.loanMonths))) : 0;
    const loans = S.loans.map((l, i) => `<tr><td>${esc(E.LOAN[l.type].n)}</td><td class="n">${rp(l.bal)}</td><td class="n">${rp(l.pay)}/bln</td><td class="n">${l.left} bln lagi</td><td><button class="mini" data-act="repay" data-i="${i}" ${S.cash < l.bal ? 'disabled' : ''}>Lunasi</button></td></tr>`).join('');
    const y12 = S.months.slice(-12).reduce((a, m) => a + m.rev, 0);
    return `<div class="wrap"><h2>Keuangan</h2>
      <div class="grid">
        <section class="card"><header><h3>Posisi usaha</h3></header><dl class="kv">
          <dt>Kas</dt><dd>${rp(S.cash)}</dd><dt>Nilai stok bahan</dt><dd>${rp(E.stockValue(S))}</dd><dt>Total utang</dt><dd>${rp(E.debt(S))}</dd>
          <dt>Valuasi usaha (milik Anda ${pct(1 - S.equity)})</dt><dd><b>${jt(E.valuation(S))}</b></dd></dl>
          <p class="small muted">Valuasi = aset bersih + 24 kali rata-rata laba tiga bulan terakhir.</p></section>
        <section class="card"><header><h3>Pajak</h3><span class="chip">${S.bigTax ? 'Pajak badan 22% laba' : 'PPh final UMKM 0,5%'}</span></header><dl class="kv">
          <dt>Omzet tahun berjalan</dt><dd>${jt(S.ytdRev + S.cur.rev)}</dd><dt>Bebas pajak sampai</dt><dd>${jt(E.TAX_FREE)}</dd>
          <dt>Omzet 12 bulan terakhir</dt><dd>${jt(y12)}</dd><dt>Batas skema UMKM</dt><dd>${jt(E.UMKM_MAX)}</dd><dt>Terutang tanggal 15</dt><dd>${rp(S.taxDue)}</dd></dl>
          <p class="small muted">Omzet sampai Rp 500 juta setahun bebas pajak. Di atasnya kena 0,5% dari omzet. Lewat Rp 4,8 miliar, pajak menjadi 22% dari laba.</p></section>
      </div>
      <section class="card"><header><h3>Laba rugi bulanan</h3></header><div class="tablewrap"><table><thead><tr><th></th>${head}</tr></thead><tbody>${body}${tot}</tbody></table></div></section>
      <section class="card"><header><h3>Pinjaman</h3></header>
        ${loans ? `<div class="tablewrap"><table><thead><tr><th>Jenis</th><th class="n">Sisa pokok</th><th class="n">Cicilan</th><th class="n">Tenor</th><th></th></tr></thead><tbody>${loans}</tbody></table></div>` : '<p class="muted small">Belum ada pinjaman.</p>'}
        <div class="row">
          <label for="loan-type">Jenis</label><select id="loan-type" data-chg="loantype">${Object.keys(E.LOAN).map(k => `<option value="${k}" ${draft.loanType === k ? 'selected' : ''}>${esc(E.LOAN[k].n)}</option>`).join('')}</select>
          <label for="loan-amt">Jumlah (juta)</label><input type="number" id="loan-amt" min="1" step="1" value="${draft.loanAmt}" data-chg="loanamt">
          <label for="loan-mo">Tenor</label><select id="loan-mo" data-chg="loanmo">${[12, 24, 36].map(m => `<option value="${m}" ${draft.loanMonths === m ? 'selected' : ''}>${m} bulan</option>`).join('')}</select>
          <button class="primary" data-act="loan" ${amt >= JT ? '' : 'disabled'}>Ajukan ${jt(amt)}</button></div>
        <p class="small muted">${esc(L.d)} Plafon tersedia sekarang: <b>${jt(lim)}</b>.${amt >= JT ? ' Cicilan ' + rp(pay) + ' tiap tanggal 5.' : ''}</p></section>
    </div>`;
  }
  function vRiset() {
    const cards = Object.keys(E.RES).map(id => {
      const r = E.RES[id], why = E.canResearch(S, id), cost = Math.round(r.cost * S.infl), have = S.research[id];
      return `<section class="card"><header><h3>${esc(r.n)}</h3>${have ? '<span class="chip good">Dimiliki</span>' : `<span class="num">${rp(cost)}</span>`}</header>
        <p class="small muted">${esc(r.d)}</p>
        ${have ? '' : `<button data-act="research" data-id="${id}" ${why || S.cash < cost ? 'disabled' : ''}>${why || (S.cash < cost ? 'Kas belum cukup' : 'Ambil')}</button>`}</section>`;
    }).join('');
    const fr = S.franchise.map(f => `<tr><td>${esc(f.name)}</td><td>${esc(f.kota)}</td><td class="n">hari ${f.since}</td><td><span class="chip ${f.q > 0.7 ? 'good' : f.q > 0.5 ? '' : 'bad'}">${f.q > 0.7 ? 'Teladan' : f.q > 0.5 ? 'Patuh SOP' : 'Bermasalah'}</span></td></tr>`).join('');
    return `<div class="wrap"><h2>Pengembangan</h2><div class="grid">${cards}</div>
      <section class="card"><header><h3>Mitra waralaba</h3><span class="small muted">Royalti 5% dari omzet tiap gerai mitra</span></header>
        ${fr ? `<div class="tablewrap"><table><thead><tr><th>Mitra</th><th>Kota</th><th class="n">Bergabung</th><th>Kondisi</th></tr></thead><tbody>${fr}</tbody></table></div>` :
      '<p class="small muted">Setelah punya tiga outlet, reputasi 70, dan SOP waralaba, calon mitra akan datang menawarkan diri. Pilih mitra dengan cermat: mitra yang buruk merusak reputasi merek.</p>'}</section></div>`;
  }
  function vCatatan() {
    const goals = E.GOALS.map(g => `<li class="${S.goals[g.id] ? 'done' : ''}"><span class="box"></span><span>${esc(g.n)}${S.goals[g.id] ? ' <span class="small">· hari ke-' + S.goals[g.id] + '</span>' : ''}</span></li>`).join('');
    return `<div class="wrap"><h2>Pencapaian & simpanan</h2><div class="grid">
      <section class="card"><header><h3>Tangga usaha</h3></header><ul class="goals">${goals}</ul>
        <p class="small muted">Tidak ada batas waktu. Setelah valuasi Rp 5 miliar tercapai, permainan tetap bisa dilanjutkan.</p></section>
      <section class="card"><header><h3>Simpanan</h3></header>
        <p class="small" id="savestat">${esc(cloud.status)}</p>
        <p class="small muted">Permainan disimpan otomatis tiap hari berjalan. Untuk cadangan atau pindah perangkat, salin teks simpanan di bawah, lalu tempel di perangkat lain.</p>
        <textarea id="io" rows="4" data-lenis-prevent data-chg="io" aria-label="Teks simpanan" placeholder="Tempel teks simpanan di sini untuk memuat"></textarea>
        <div class="row"><button data-act="export">Salin simpanan</button><button data-act="import">Muat dari teks</button><button class="ghost" data-act="asknew">Mulai usaha baru</button></div></section>
    </div><section class="card"><header><h3>Buku catatan</h3></header>${logList(80)}</section></div>`;
  }
  const VIEWS = { ringkasan: vRingkasan, menu: vMenu, stok: vStok, outlet: vOutlet, pasar: vPasar, uang: vUang, riset: vRiset, catatan: vCatatan };

  function vStart() {
    return `<div class="start">
      <p class="chip" style="align-self:flex-start">Simulasi bisnis · giliran harian</p>
      <h1>Kedai Rintisan</h1>
      <p class="lede">Anda punya satu warung kopi di mulut gang dan tabungan secukupnya. Atur harga, belanja bahan sebelum basi, gaji barista, hadapi musim hujan, Ramadan, THR, pajak, dan cicilan. Tumbuhkan warung itu menjadi jaringan waralaba senilai Rp 5 miliar.</p>
      <div class="struk" style="max-width:340px"><h3>Struk pembuka</h3><hr>
        <div class="l"><span>1 warung, Gang Kampung</span><b>milik Anda</b></div><div class="l"><span>Bahan untuk 3 hari</span><b>tersedia</b></div>
        <div class="l"><span>Sewa per bulan</span><b>Rp 1.500.000</b></div><div class="l"><span>Biaya hidup per bulan</span><b>Rp 3.000.000</b></div><hr><p class="c">Tidak ada batas waktu.</p></div>
      <form id="newgame" class="wrap" style="gap:12px">
        <label for="brand">Nama usaha Anda</label>
        <input id="brand" maxlength="28" value="Kopi Tanjakan" style="max-width:340px;font-size:17px">
        <div class="modes" role="radiogroup" aria-label="Tingkat kesulitan">
          <label><input type="radio" name="mode" id="mode-r" value="realistis" checked><b>Realistis</b><span class="small muted">Modal Rp 15 juta. Kas minus 14 hari berturut-turut berarti bangkrut.</span></label>
          <label><input type="radio" name="mode" id="mode-s" value="santai"><b>Santai</b><span class="small muted">Modal Rp 25 juta, kejadian lebih jarang, batas kas minus 30 hari.</span></label>
        </div>
        <div class="row"><button class="primary" type="submit" style="padding:10px 20px;font-size:16px">Buka warung</button>
          ${loadLocal() ? '<button type="button" data-act="continue">Lanjutkan simpanan</button>' : ''}</div>
      </form></div>`;
  }

  /* ---------- Render ---------- */
  function shell() {
    const app = $('#app');
    if (app.dataset.ready) return;
    app.dataset.ready = '1';
    app.innerHTML = '<header class="top" id="top"></header><nav class="side" id="side" aria-label="Halaman"></nav><main id="view"><div id="page"></div></main>';
    if (window.MotionKit) fx = MotionKit.init({ scroller: $('#view'), headings: '#page h1, #page h2', cards: '#page .card, #page .street, #page .alert', hover: '#page .grid > .card' });
  }
  function settingsHtml() {
    const tg = (k, label) => `<button class="mini tog" data-act="pref" data-k="${k}" aria-pressed="${P[k] ? 'true' : 'false'}">${label}: ${P[k] ? 'nyala' : 'mati'}</button>`;
    return `<div class="prefs">${tg('music', 'Musik')}${tg('sfx', 'Efek suara')}
      <label for="vol" class="small">Volume</label><input type="range" id="vol" min="0" max="1" step="0.05" value="${P.vol}" data-chg="vol" data-inp="vol">
      <label for="anim" class="small">Animasi hari</label><select id="anim" data-chg="anim">${['penuh', 'cepat', 'mati'].map(a => `<option ${P.anim === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>`;
  }
  function sceneData() {
    return { brand: S.brand, wx: S.wx, ojol: S.ojol, outlets: S.outlets.map(o => ({ loc: o.loc, equip: o.equip, dekor: o.dekor, staff: o.staff, own: o.own, closed: o.closed > 0, served: o.last ? o.last.served : 20, says: o.last && o.last.says })) };
  }
  function paint() {
    const st = $('#street');
    if (st) { ambient.attach(st); ambient.setData(sceneData(), 'ambient'); ambient.time = 0.36; if (reduce) ambient.still(); else ambient.start(); } else ambient.stop();
    document.querySelectorAll('canvas.shoppic').forEach(cv => {
      const o = cv.dataset.shop ? S.outlets.find(x => x.id === +cv.dataset.shop) : { loc: cv.dataset.loc, equip: E.LOCS[cv.dataset.loc].equip, dekor: 0, staff: 1, own: false, closed: 0 };
      if (o) Scene.thumb(cv, { loc: o.loc, equip: o.equip, dekor: o.dekor, staff: o.staff, own: o.own, closed: o.closed > 0 }, S.brand, S.wx);
    });
  }
  function render() {
    shell();
    const app = $('#app'), page = $('#page');
    if (!S) { app.classList.add('intro'); ambient.stop(); page.innerHTML = vStart(); if (fx) fx.refresh('start'); renderDialog(); return; }
    app.classList.remove('intro');
    const tags = E.seasonTags(S.day), canSkip = S.auto.on && S.research.r_supplier;
    const lastM = S.months[S.months.length - 1];
    const focus = document.activeElement && document.activeElement.id;
    $('#top').innerHTML = `
      <div class="brand">${esc(S.brand)}<small>${esc(E.dateStr(S.day))} · hari ke-${S.day}</small></div>
      <div class="kpis">
        <div class="kpi"><b class="${S.cash < 0 ? 'bad' : ''}" id="kpi-cash">${rp(S.cash)}</b><span>Kas</span></div>
        <div class="kpi"><b class="${tone(S.rep, 40, 65)}">${Math.round(S.rep)}<span class="small muted" style="font-size:12px"> /100</span></b><span>Reputasi</span></div>
        <div class="kpi"><b>${lastM ? jt(E.monthProfit(lastM)) : '–'}</b><span>Laba bulan lalu</span></div>
        <div class="kpi"><b>${esc(E.WX[S.wx])}</b><span>Cuaca hari ini · besok ${esc(E.WX[S.wxFc].toLowerCase())}</span></div>
        ${tags.map(t => `<span class="chip" style="align-self:center">${esc(t)}</span>`).join('')}
      </div>
      <div class="go"><button data-act="skip" ${canSkip ? '' : 'disabled'} title="${canSkip ? 'Berhenti otomatis bila ada kejadian' : 'Butuh pemasok langganan aktif'}">Lompat 7 hari</button>
        <button class="primary" data-act="next" id="next">Jalankan hari ▸</button></div>`;
    $('#side').innerHTML = `${TABS.map(([id, n]) => `<button data-act="tab" data-id="${id}" ${tab === id ? 'aria-current="page"' : ''}>${n}</button>`).join('')}
      <div class="foot">${settingsHtml()}<p>Mode ${esc(S.mode)} · ${S.outlets.length} outlet · ${S.franchise.length} mitra<br>Tombol spasi: jalankan hari</p></div>`;
    page.innerHTML = VIEWS[tab]();
    if (focus) { const el = document.getElementById(focus); if (el) el.focus(); }
    paint();
    if (fx) fx.refresh(tab);
    /* angka kas bergulir */
    const kc = $('#kpi-cash');
    if (G && !reduce && kc && prevCash != null && prevCash !== S.cash) { const o = { v: prevCash }; kc.textContent = rp(o.v); G.to(o, { v: S.cash, duration: 0.7, ease: 'power2.out', onUpdate: () => { if (kc.isConnected) kc.textContent = rp(o.v); } }); }
    prevCash = S.cash;
    /* struk tercetak */
    if (justRan) { justRan = false; const sk = $('.struk'); if (sk && tab === 'ringkasan') { Sound.sfx('print'); if (G && !reduce) G.from(sk, { clipPath: 'inset(0 0 100% 0)', y: -14, duration: 0.95, ease: 'power2.out', clearProps: 'clipPath,transform' }); } }
    renderDialog();
  }
  function renderDialog() {
    const m = $('#modal');
    if (!dialog && S && S.pending) {
      const ev = E.buildEvent(S);
      if (ev) dialog = { eyebrow: 'Kejadian · hari ke-' + S.day, title: ev.title, text: ev.text,
        choices: ev.choices.map((c, i) => ({ label: c.label, hint: c.hint || '', dis: c.can && !c.can(S), act: 'choice', i })) };
      else S.pending = null;
    }
    if (!dialog) { m.classList.remove('on'); m.innerHTML = ''; lastDlg = null; return; }
    if (dialog !== lastDlg) { lastDlg = dialog; Sound.sfx(dialog.sfx || 'event'); }
    m.classList.add('on');
    m.innerHTML = `<div class="dialog" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="dlg-t">
      <span class="eyebrow">${esc(dialog.eyebrow || '')}</span><h2 id="dlg-t">${esc(dialog.title)}</h2><p>${esc(dialog.text)}</p>
      <div class="choices">${dialog.choices.map(c => `<button data-act="${c.act}" data-i="${c.i != null ? c.i : ''}" ${c.dis ? 'disabled' : ''} ${c.primary ? 'class="primary"' : ''}><b>${esc(c.label)}</b><span>${esc(c.hint || '')}</span></button>`).join('')}</div></div>`;
    const b = m.querySelector('button:not(:disabled)'); if (b) b.focus();
  }
  function info(eyebrow, title, text, then) {
    dialog = { eyebrow, title, text, choices: [{ label: 'Lanjut', act: 'close', primary: true }] }; dialog.then = then;
  }

  /* ---------- Aksi ---------- */
  function done(r) { if (r && r.msg) toast(r.msg); save(); render(); }
  function afterDay(goalsBefore) {
    if (S.over) { dialog = { sfx: 'lose', eyebrow: 'Hari ke-' + S.day, title: 'Usaha bangkrut', text: 'Kas minus terlalu lama dan para penagih menutup warung. ' + S.brand + ' bertahan ' + (S.day - 1) + ' hari dengan ' + S.outlets.length + ' outlet. Tiap pengusaha punya cerita gagal pertama.',
      choices: [{ label: 'Mulai usaha baru', act: 'newgame', primary: true }, { label: 'Lihat pembukuan terakhir', act: 'close' }] }; }
    else if (S.flags.justWon) { delete S.flags.justWon; info('Pencapaian puncak', 'Valuasi Rp 5 miliar', S.brand + ' kini bernilai lebih dari Rp 5 miliar, dibangun dari satu warung di mulut gang dalam ' + (S.day - 1) + ' hari. Anda boleh terus bermain selama yang Anda mau.'); dialog.sfx = 'win'; }
    else if (Object.keys(S.goals).length > goalsBefore) Sound.sfx('win');
  }
  /* Panggung: hari berjalan sebagai animasi. days = [{r, snap}] */
  let stageSkip = null;
  function playStage(days, daySec) {
    return new Promise(resolve => {
      const el = $('#stage'), many = days.length > 1;
      el.innerHTML = `<div class="stagebox"><canvas id="stagecv"></canvas>
        <div class="hud"><div class="clock num" id="st-clock">07.00</div><div class="hud-day" id="st-day"></div>
          <div class="hud-n"><b class="num" id="st-served">0</b><span>terlayani</span></div><div class="hud-n"><b class="num bad" id="st-lost">0</b><span>pergi</span></div>
          <div class="hud-n wide"><b class="num" id="st-rev">Rp 0</b><span>omzet</span></div>
          <div class="hud-n wide" id="st-profit-box" style="visibility:hidden"><b class="num" id="st-profit"></b><span>laba hari ini</span></div>
          <button data-act="skipanim" id="st-skip">Lewati ▸▸</button></div>
        <div class="prog"><i id="st-prog"></i></div></div>`;
      el.classList.add('on');
      const sc = Scene.create(); sc.attach($('#stagecv')); sc.onSale = () => Sound.sfx('ching');
      Sound.setIntensity(1);
      let di = -1, t0 = 0, holdUntil = 0, raf = 0, done = false, last = 0;
      const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); stageSkip = null; Sound.setIntensity(0); el.classList.remove('on'); el.innerHTML = ''; resolve(); };
      stageSkip = finish;
      function startDay(ts) {
        di++; if (di >= days.length) return finish();
        const d = days[di], r = d.r;
        sc.setData({ brand: S.brand, wx: r.wx, ojol: S.ojol, outlets: d.snap.map(o => { const x = r.out.find(q => q.id === o.id) || {}; return Object.assign({}, o, { closed: !!x.closed, served: x.served || 0, lost: x.lost || 0, vis: x.vis || 0, says: x.says }); }) }, 'day', daySec);
        $('#st-day').textContent = 'Hari ke-' + r.day + ' · ' + E.WX[r.wx] + (r.tags.length ? ' · ' + r.tags.join(', ') : '');
        $('#st-profit-box').style.visibility = 'hidden';
        t0 = ts; holdUntil = 0; Sound.sfx('bell');
      }
      function frame(ts) {
        if (done) return;
        raf = requestAnimationFrame(frame);
        if (di < 0) startDay(ts);
        if (done) return;
        const r = days[di].r, dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
        const t = Math.min(1, (ts - t0) / (daySec * 1000)), k = ease(Math.min(1, t / 0.9));
        sc.time = t; sc.step(dt); sc.draw();
        const mins = Math.round((7 + t * 14) * 60 / 10) * 10;
        $('#st-clock').textContent = String(Math.floor(mins / 60)).padStart(2, '0') + '.' + String(mins % 60).padStart(2, '0');
        $('#st-served').textContent = Math.round(r.served * k); $('#st-lost').textContent = Math.round(r.lost * k); $('#st-rev').textContent = rp(r.rev * k);
        $('#st-prog').style.width = ((di + t) / days.length * 100) + '%';
        if (t >= 1) {
          if (!holdUntil) { holdUntil = ts + (many ? 260 : 1150); const pb = $('#st-profit-box'), pe = $('#st-profit'); pe.textContent = rp(r.profit); pe.className = 'num ' + (r.profit >= 0 ? 'good' : 'bad'); pb.style.visibility = 'visible';
            if (G && !reduce) G.fromTo(pb, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }); if (!many) Sound.sfx(r.profit >= 0 ? 'good' : 'bad'); }
          else if (ts >= holdUntil) startDay(ts);
        }
      }
      raf = requestAnimationFrame(frame);
    });
  }
  async function nextDay(n) {
    if (!S || S.over || S.pending || dialog || busy) return;
    busy = true;
    const days = [], goalsBefore = Object.keys(S.goals).length;
    for (let i = 0; i < n; i++) {
      const snap = S.outlets.map(o => ({ id: o.id, loc: o.loc, equip: o.equip, dekor: o.dekor, staff: o.staff, own: o.own }));
      const r = E.runDay(S); if (!r) break;
      days.push({ r, snap });
      if (S.pending || S.over || S.cash < 0 || S.flags.justWon) break;
    }
    save();
    const r = days.length ? days[days.length - 1].r : null;
    if (days.length && P.anim !== 'mati' && !reduce) await playStage(days, days.length > 1 ? 1.25 : P.anim === 'cepat' ? 2.4 : 5.5);
    afterDay(goalsBefore);
    if (r && !dialog) toast(days.length > 1 ? days.length + ' hari berlalu. Kas ' + rp(S.cash) + '.' : 'Hari ke-' + r.day + ' selesai. Laba ' + rp(r.profit) + '.');
    draft.buy = {}; justRan = true; busy = false;
    save(); render();
  }
  const ACT = {
    tab: d => { tab = d.id; render(); if (fx) fx.top(); else $('#view').scrollTop = 0; },
    skipanim: () => { if (stageSkip) stageSkip(); },
    pref: d => { Sound.set(d.k, !P[d.k]); render(); },
    next: () => nextDay(1),
    skip: () => nextDay(7),
    price: d => { E.setPrice(S, d.k, S.prices[d.k] + +d.d); done(); },
    fill: d => { draft.buy[d.k] = coverQty(d.k, +d.d); render(); },
    buy: d => { const q = draft.buy[d.k] != null ? draft.buy[d.k] : coverQty(d.k, 3); const r = E.buy(S, d.k, q); if (r.ok) { delete draft.buy[d.k]; Sound.sfx('pop'); } done(r); },
    buyall: () => { let n = 0; for (const k in E.ING) { const q = coverQty(k, 3); if (q > 0 && E.buy(S, k, q).ok) n++; } draft.buy = {}; if (n) Sound.sfx('pop'); done({ msg: n ? 'Belanja selesai, ' + n + ' jenis bahan dibeli.' : 'Stok masih cukup.' }); },
    hire: d => done(E.hire(S, +d.id)), fire: d => done(E.fire(S, +d.id)),
    equip: d => done(E.upgradeEquip(S, +d.id)), dekor: d => done(E.upgradeDekor(S, +d.id)),
    open: d => { const L = E.LOCS[d.loc]; dialog = { eyebrow: 'Ekspansi', title: 'Buka outlet di ' + L.n + '?', text: 'Biaya buka ' + rp(E.setupCost(S, d.loc)) + '. Outlet baru langsung menambah gaji kepala toko dan satu barista, sementara pelanggan baru berdatangan pelan-pelan.',
      choices: [{ label: 'Ya, buka', act: 'open2', i: d.loc, primary: true }, { label: 'Batal', act: 'close' }] }; renderDialog(); },
    open2: d => { dialog = null; done(E.openOutlet(S, d.i)); },
    askclose: d => { dialog = { eyebrow: 'Outlet', title: 'Tutup outlet ini?', text: 'Peralatan dijual seharga 20% biaya buka. Keputusan ini tidak bisa dibatalkan.', choices: [{ label: 'Tutup outlet', act: 'close2', i: d.id }, { label: 'Batal', act: 'close', primary: true }] }; renderDialog(); },
    close2: d => { dialog = null; done(E.closeOutlet(S, +d.i)); },
    train: () => done(E.train(S)),
    camp: d => done(E.campaign(S, d.id)),
    research: d => done(E.research(S, d.id)),
    loan: () => done(E.takeLoan(S, draft.loanType, Math.min(draft.loanAmt * JT, E.loanLimit(S, draft.loanType)), draft.loanMonths)),
    repay: d => done(E.repayLoan(S, +d.i)),
    choice: d => { const ev = E.buildEvent(S), title = ev ? ev.title : ''; const r = E.resolveEvent(S, +d.i); if (!r.ok) { toast(r.msg); return; } dialog = null; info('Hasil', title, r.msg); save(); render(); },
    close: () => { const t = dialog && dialog.then; dialog = null; if (t) t(); render(); },
    export: async () => { const txt = JSON.stringify(S); draft.io = txt; const el = $('#io'); if (el) { el.value = txt; el.select(); }
      try { await navigator.clipboard.writeText(txt); toast('Teks simpanan disalin.'); } catch (e) { toast('Teks simpanan ada di kotak. Salin manual dengan Ctrl+C.'); } },
    import: () => { try { const st = valid(JSON.parse(($('#io').value || '').trim())); if (!st) throw 0; S = st; dialog = null; tab = 'ringkasan'; done({ msg: 'Simpanan dimuat: hari ke-' + S.day + '.' }); } catch (e) { toast('Teks simpanan tidak bisa dibaca. Pastikan tersalin utuh.'); } },
    asknew: () => { dialog = { eyebrow: 'Simpanan', title: 'Mulai usaha baru?', text: 'Simpanan yang sekarang akan tertimpa saat usaha baru dibuka.', choices: [{ label: 'Ya, mulai baru', act: 'newgame' }, { label: 'Batal', act: 'close', primary: true }] }; renderDialog(); },
    newgame: () => { dialog = null; S = null; render(); },
    continue: () => { S = loadLocal(); render(); },
  };
  const CHG = {
    price: (el, d) => { E.setPrice(S, d.k, +el.value || S.prices[d.k]); done(); },
    active: (el, d) => { S.active[d.k] = el.checked; done(); },
    buyqty: (el, d) => { draft.buy[d.k] = Math.max(0, +el.value || 0); render(); },
    grade: el => { S.grade = +el.value; done({ msg: 'Pembelian kopi berikutnya memakai ' + E.GRADES[S.grade].n + '.' }); },
    auto: el => { S.auto.on = el.checked; done(); },
    autodays: el => { S.auto.days = +el.value; done(); },
    adj: (el, d) => { S.outlets.find(o => o.id === +d.id).adj = +el.value; done(); },
    wage: el => { S.wagePct = +el.value; done(); },
    mix: (el, d) => { const o = S.outlets.find(x => x.id === +d.id); o.mix = Object.assign({}, E.mixOf(o), { [d.k]: +el.value }); done(); },
    ojol: el => { S.ojol = el.checked; done(); },
    loantype: el => { draft.loanType = el.value; render(); },
    loanamt: el => { draft.loanAmt = Math.max(1, Math.floor(+el.value || 1)); render(); },
    loanmo: el => { draft.loanMonths = +el.value; render(); },
    io: el => { draft.io = el.value; },
    vol: el => { Sound.set('vol', +el.value); },
    anim: el => { Sound.set('anim', el.value); },
  };
  document.addEventListener('click', e => {
    Sound.unlock();
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    if (busy && b.dataset.act !== 'skipanim') return;
    if (!/^(next|skip|buy|buyall|skipanim)$/.test(b.dataset.act)) Sound.sfx('tick');
    const f = ACT[b.dataset.act]; if (f) f(b.dataset);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-chg]');
    if (!el) return;
    const f = CHG[el.dataset.chg]; if (f) f(el, el.dataset);
  });
  document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.inp === 'vol') Sound.set('vol', +e.target.value); });
  document.addEventListener('submit', e => {
    e.preventDefault(); Sound.unlock();
    if (e.target.id !== 'newgame') return;
    S = E.newGame({ brand: $('#brand').value.trim() || 'Kedai Rintisan', mode: $('#mode-s').checked ? 'santai' : 'realistis' });
    tab = 'ringkasan'; prevCash = null; save(); render(); Sound.sfx('bell');
  });
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && stageSkip) { e.preventDefault(); stageSkip(); return; }
    if (e.code !== 'Space' || !S || dialog || busy) return;
    const t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || t === 'BUTTON') return;
    e.preventDefault(); nextDay(1);
  });

  /* ---------- Mulai ---------- */
  function start(data) {
    S = valid(data && data.S) || loadLocal();
    if (data && data.tab && VIEWS[data.tab]) tab = data.tab;
    render();
    initCloud();
  }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ S, tab }));
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
