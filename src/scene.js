/* Kedai Rintisan: adegan kanvas. Toko, jalan, cuaca, dan kerumunan pelanggan. */
const Scene = (() => {
  'use strict';
  const LOOK = {
    gang: { wall: '#ecd2ab', trim: '#8a5a3c', awn: ['#c8452f', '#f6ecd8'], back: 'kampung' },
    pasar: { wall: '#ddd6b4', trim: '#3f6f5c', awn: ['#2e7d5b', '#f6ecd8'], back: 'tenda' },
    kampus: { wall: '#d3deea', trim: '#35507a', awn: ['#2b5aa8', '#f3f6fb'], back: 'kampus' },
    kantor: { wall: '#cfd4dc', trim: '#3d4554', awn: ['#30343f', '#e6e8ec'], back: 'menara' },
    wisata: { wall: '#f3dfbc', trim: '#9a5a26', awn: ['#e08a1e', '#fff3d6'], back: 'gunung' },
    mall: { wall: '#e8d9ea', trim: '#6b3f78', awn: ['#8a3f8f', '#f6e9f7'], back: 'mal' },
  };
  const NAMES = { gang: 'Gang Kampung', pasar: 'Dekat Pasar', kampus: 'Depan Kampus', kantor: 'Perkantoran', wisata: 'Kota Wisata', mall: 'Kios Mal' };
  const SKIN = ['#f1c9a5', '#d9a37a', '#b9825a', '#8d5a3b'];
  const CLOTH = ['#c8452f', '#2b5aa8', '#2e7d5b', '#e0a21e', '#7a4a9a', '#3b4252', '#d9627a', '#3a9aa8', '#f2ead8', '#ef8d3c'];
  const SKY = [ /* t, atas, bawah */
    [0, [247, 190, 150], [253, 232, 200]], [0.18, [150, 205, 240], [226, 242, 251]], [0.68, [130, 195, 238], [222, 240, 250]],
    [0.84, [240, 150, 105], [251, 214, 160]], [1, [38, 46, 92], [112, 92, 140]],
  ];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rgb = c => 'rgb(' + c.map(Math.round).join(',') + ')';
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickOf = arr => arr[Math.floor(Math.random() * arr.length)];
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function skyAt(t) {
    for (let i = 1; i < SKY.length; i++) if (t <= SKY[i][0]) {
      const k = (t - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]);
      return [mix(SKY[i - 1][1], SKY[i][1], k), mix(SKY[i - 1][2], SKY[i][2], k)];
    }
    return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
  }

  /* ---------- Gambar toko ---------- */
  function backdrop(c, kind, cx, base, w, tone) {
    c.save(); c.globalAlpha = 0.9;
    const col = (a, b, d) => rgb(mix([a, b, d], tone, 0.35));
    if (kind === 'kampung') {
      c.fillStyle = col(196, 150, 120);
      for (const [dx, bw, bh] of [[-0.62, 0.34, 0.3], [0.5, 0.4, 0.36]]) {
        const x = cx + dx * w, y = base - bh * w;
        c.fillRect(x, y, bw * w, bh * w);
        c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + bw * w / 2, y - bw * w * 0.3); c.lineTo(x + bw * w + 6, y); c.closePath();
        c.fillStyle = col(160, 86, 62); c.fill(); c.fillStyle = col(196, 150, 120);
      }
    } else if (kind === 'tenda') {
      for (const [dx, k] of [[-0.6, 0], [0.34, 1]]) {
        const x = cx + dx * w, bw = 0.3 * w, y = base - 0.3 * w;
        c.fillStyle = k ? col(232, 170, 60) : col(70, 140, 170);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + bw / 2, y - 0.14 * w); c.lineTo(x + bw, y); c.closePath(); c.fill();
        c.fillStyle = col(120, 110, 100); c.fillRect(x + 2, y, 3, 0.3 * w); c.fillRect(x + bw - 5, y, 3, 0.3 * w);
      }
    } else if (kind === 'kampus') {
      const x = cx - 0.6 * w, y = base - 0.62 * w;
      c.fillStyle = col(214, 200, 176); c.fillRect(x, y, 1.2 * w, 0.62 * w);
      c.fillStyle = col(150, 90, 70); c.beginPath(); c.moveTo(x - 8, y); c.lineTo(cx, y - 0.2 * w); c.lineTo(x + 1.2 * w + 8, y); c.closePath(); c.fill();
      c.fillStyle = col(120, 140, 170);
      for (let i = 0; i < 6; i++) c.fillRect(x + 0.08 * w + i * 0.19 * w, y + 0.1 * w, 0.09 * w, 0.14 * w);
    } else if (kind === 'menara') {
      for (const [dx, bw, bh, k] of [[-0.55, 0.42, 1.25, 0], [0.12, 0.5, 0.95, 1]]) {
        const x = cx + dx * w, y = base - bh * w;
        c.fillStyle = k ? col(120, 140, 165) : col(96, 116, 146); c.fillRect(x, y, bw * w, bh * w);
        c.fillStyle = col(190, 215, 235);
        for (let r = 0; r < Math.floor(bh * 9); r++) for (let q = 0; q < 4; q++) c.fillRect(x + 0.05 * w + q * (bw * w - 0.08 * w) / 4, y + 0.06 * w + r * 0.105 * w, 0.06 * w, 0.05 * w);
      }
    } else if (kind === 'gunung') {
      c.fillStyle = col(110, 150, 140);
      c.beginPath(); c.moveTo(cx - 0.8 * w, base); c.lineTo(cx - 0.15 * w, base - 0.95 * w); c.lineTo(cx + 0.3 * w, base - 0.5 * w); c.lineTo(cx + 0.55 * w, base - 0.72 * w); c.lineTo(cx + 0.9 * w, base); c.closePath(); c.fill();
      c.fillStyle = col(240, 244, 240);
      c.beginPath(); c.moveTo(cx - 0.26 * w, base - 0.79 * w); c.lineTo(cx - 0.15 * w, base - 0.95 * w); c.lineTo(cx - 0.05 * w, base - 0.84 * w); c.closePath(); c.fill();
      const px = cx + 0.6 * w; /* pohon kelapa */
      c.strokeStyle = col(110, 80, 50); c.lineWidth = Math.max(2, 0.025 * w); c.beginPath(); c.moveTo(px, base); c.quadraticCurveTo(px + 0.05 * w, base - 0.35 * w, px - 0.02 * w, base - 0.66 * w); c.stroke();
      c.strokeStyle = col(50, 130, 80); c.lineWidth = Math.max(2, 0.03 * w);
      for (let a = 0; a < 6; a++) { const an = -Math.PI + a * Math.PI / 5; c.beginPath(); c.moveTo(px - 0.02 * w, base - 0.66 * w); c.quadraticCurveTo(px - 0.02 * w + Math.cos(an) * 0.12 * w, base - 0.76 * w, px - 0.02 * w + Math.cos(an) * 0.22 * w, base - 0.6 * w + Math.sin(an) * 0.06 * w); c.stroke(); }
    } else if (kind === 'mal') {
      const x = cx - 0.66 * w, y = base - 1.05 * w;
      c.fillStyle = col(176, 150, 186); rr(c, x, y, 1.32 * w, 1.05 * w, 6); c.fill();
      c.fillStyle = col(200, 222, 238); c.fillRect(x + 0.1 * w, y + 0.26 * w, 1.12 * w, 0.2 * w);
      c.fillStyle = col(255, 250, 240); c.font = '800 ' + Math.round(0.13 * w) + 'px "Bricolage Grotesque",sans-serif'; c.textAlign = 'center'; c.fillText('PLAZA', cx, y + 0.18 * w);
    }
    c.restore();
  }
  /* o: {loc, equip, dekor, staff, own, closed}. x = tengah, base = garis tanah, w = lebar toko. */
  function shop(c, o, brand, x, base, w, time, steamT) {
    const L = LOOK[o.loc] || LOOK.gang, h = w * 0.5, x0 = x - w / 2, y0 = base - h;
    /* dinding */
    c.fillStyle = L.wall; c.fillRect(x0, y0, w, h);
    c.fillStyle = L.trim; c.fillRect(x0, base - h * 0.14, w, h * 0.14);
    /* atap + papan nama */
    const signH = w * 0.15, sy = y0 - signH - w * 0.02;
    c.fillStyle = L.trim;
    if (o.loc === 'gang' || o.loc === 'wisata') { c.beginPath(); c.moveTo(x0 - w * 0.06, y0); c.lineTo(x0 + w * 0.12, sy - w * 0.1); c.lineTo(x0 + w * 0.88, sy - w * 0.1); c.lineTo(x0 + w * 1.06, y0); c.closePath(); c.fill(); }
    else c.fillRect(x0 - w * 0.02, sy - w * 0.03, w * 1.04, signH + w * 0.07);
    c.fillStyle = '#20262c'; rr(c, x0 + w * 0.1, sy, w * 0.8, signH, 4); c.fill();
    let fs = Math.round(signH * 0.62);
    c.font = '800 ' + fs + 'px "Bricolage Grotesque","Arial Narrow",sans-serif';
    while (fs > 6 && c.measureText(brand).width > w * 0.6) { fs--; c.font = '800 ' + fs + 'px "Bricolage Grotesque","Arial Narrow",sans-serif'; }
    c.fillStyle = '#fbf3df'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(brand, x + w * 0.05, sy + signH / 2 + 1);
    /* cangkir di papan nama + uap */
    const cx = x0 + w * 0.17, cy = sy + signH * 0.56, cr = signH * 0.2;
    c.fillStyle = '#fbf3df'; c.fillRect(cx - cr, cy - cr * 0.7, cr * 2, cr * 1.5);
    c.strokeStyle = '#fbf3df'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx + cr * 1.15, cy, cr * 0.55, -1.3, 1.3); c.stroke();
    if (!o.closed) {
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4;
      for (let i = 0; i < 2; i++) { const ph = steamT * 2 + i * 1.7, ox = cx - cr * 0.5 + i * cr; c.beginPath(); c.moveTo(ox, cy - cr); c.quadraticCurveTo(ox + Math.sin(ph) * 3, cy - cr * 1.9, ox + Math.sin(ph + 1) * 2, cy - cr * 2.7); c.stroke(); }
    }
    /* jendela */
    const wx0 = x0 + w * 0.07, wy0 = y0 + h * 0.3, ww = w * 0.52, wh = h * 0.46;
    c.fillStyle = '#3a4a52'; c.fillRect(wx0 - 2, wy0 - 2, ww + 4, wh + 4);
    c.fillStyle = o.closed ? '#59636a' : '#f6d48a'; c.fillRect(wx0, wy0, ww, wh);
    if (!o.closed) {
      c.fillStyle = 'rgba(70,45,30,.85)'; /* meja bar */
      c.fillRect(wx0, wy0 + wh * 0.68, ww, wh * 0.32);
      const n = Math.min(3, (o.staff || 0) + (o.own ? 1 : 0));
      for (let i = 0; i < n; i++) { const bx = wx0 + ww * (0.22 + i * 0.26), by = wy0 + wh * 0.5; c.fillStyle = '#5b3a2a'; c.beginPath(); c.arc(bx, by - wh * 0.12, wh * 0.1, 0, 7); c.fill(); c.fillStyle = '#2f5d4a'; c.fillRect(bx - wh * 0.13, by, wh * 0.26, wh * 0.2); }
      if (o.equip >= 1) { c.fillStyle = '#c9ced4'; rr(c, wx0 + ww * 0.76, wy0 + wh * 0.4, ww * 0.2, wh * 0.28, 2); c.fill(); c.fillStyle = '#7b848c'; c.fillRect(wx0 + ww * 0.8, wy0 + wh * 0.56, ww * 0.03, wh * 0.12); c.fillRect(wx0 + ww * 0.89, wy0 + wh * 0.56, ww * 0.03, wh * 0.12); }
      if (o.equip >= 3) { c.fillStyle = '#8a5a3c'; c.fillRect(wx0 + ww * 0.04, wy0 + wh * 0.12, ww * 0.34, 2); for (let i = 0; i < 4; i++) { c.fillStyle = ['#c8452f', '#e0a21e', '#2e7d5b', '#f2ead8'][i]; c.fillRect(wx0 + ww * (0.06 + i * 0.08), wy0 + wh * 0.02, ww * 0.05, wh * 0.1); } }
    } else { c.strokeStyle = '#444d54'; c.lineWidth = 1; for (let i = 1; i < 7; i++) { c.beginPath(); c.moveTo(wx0, wy0 + wh * i / 7); c.lineTo(wx0 + ww, wy0 + wh * i / 7); c.stroke(); } }
    c.strokeStyle = '#3a4a52'; c.lineWidth = 2; c.beginPath(); c.moveTo(wx0 + ww / 2, wy0); c.lineTo(wx0 + ww / 2, wy0 + wh * 0.68); c.stroke();
    /* pintu */
    const dx = x0 + w * 0.68, dw = w * 0.22, dy = y0 + h * 0.24, dh = h * 0.76;
    c.fillStyle = o.closed ? '#59636a' : '#6b4630'; c.fillRect(dx, dy, dw, dh);
    c.fillStyle = o.closed ? '#59636a' : '#f6d48a'; c.fillRect(dx + dw * 0.14, dy + dh * 0.1, dw * 0.72, dh * 0.4);
    c.fillStyle = o.closed ? '#b3362a' : '#1f7446'; rr(c, dx + dw * 0.1, dy + dh * 0.58, dw * 0.8, Math.max(8, h * 0.13), 2); c.fill();
    c.fillStyle = '#fff'; c.font = '700 ' + Math.max(6, Math.round(h * 0.085)) + 'px "IBM Plex Mono",monospace'; c.fillText(o.closed ? 'TUTUP' : 'BUKA', dx + dw / 2, dy + dh * 0.58 + Math.max(8, h * 0.13) / 2 + 0.5);
    /* awning bergaris */
    const ay = y0 + h * 0.06, ah = h * 0.2, n = 9, sw = (w * 1.04) / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = L.awn[i % 2]; const ax = x0 - w * 0.02 + i * sw;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + sw, ay); c.lineTo(ax + sw, ay + ah * 0.75); c.arc(ax + sw / 2, ay + ah * 0.75, sw / 2, 0, Math.PI); c.closePath(); c.fill();
    }
    /* dekor */
    if (o.dekor >= 1) for (const px of [x0 + w * 0.02, x0 + w * 0.63]) { c.fillStyle = '#a5562f'; c.fillRect(px - w * 0.025, base - h * 0.16, w * 0.05, h * 0.16); c.fillStyle = '#3f8a57'; c.beginPath(); c.arc(px, base - h * 0.24, w * 0.045, 0, 7); c.arc(px - w * 0.025, base - h * 0.18, w * 0.03, 0, 7); c.arc(px + w * 0.025, base - h * 0.18, w * 0.03, 0, 7); c.fill(); }
    if (o.dekor >= 2) {
      const night = smooth(0.7, 0.95, time);
      for (let i = 0; i <= 10; i++) { const lx = x0 + w * i / 10, ly = ay + ah * 1.25 + Math.sin(i / 10 * Math.PI) * h * 0.07; c.fillStyle = ['#ffd45e', '#ff8f6b', '#8fd3ff'][i % 3]; c.globalAlpha = 0.65 + 0.35 * night; c.beginPath(); c.arc(lx, ly, Math.max(1.6, w * 0.011), 0, 7); c.fill(); }
      c.globalAlpha = 1;
    }
    c.textBaseline = 'alphabetic';
    return { door: dx + dw / 2, win: [wx0, wy0, ww, wh], doorR: [dx + dw * 0.14, dy + dh * 0.1, dw * 0.72, dh * 0.4] };
  }
  function person(c, p, base, u, rain) {
    const x = p.x, y = base + p.lane, s = u * p.size, sw = Math.sin(p.phase) * (p.still ? 0 : 1);
    c.save(); c.globalAlpha = clamp(p.alpha, 0, 1);
    c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(x, y, 7 * s, 2.2 * s, 0, 0, 7); c.fill();
    if (p.kind === 'ojol') {
      c.fillStyle = '#2b2f36'; c.beginPath(); c.arc(x - 9 * s, y - 4 * s, 4.5 * s, 0, 7); c.arc(x + 9 * s, y - 4 * s, 4.5 * s, 0, 7); c.fill();
      c.fillStyle = '#3b4252'; rr(c, x - 10 * s, y - 11 * s, 20 * s, 6 * s, 2 * s); c.fill();
      c.fillStyle = '#1f9d55'; rr(c, x - 5 * s, y - 22 * s, 9 * s, 12 * s, 3 * s); c.fill();
      c.fillStyle = '#1f9d55'; c.fillRect(x - 12 * s * p.dir - 4 * s, y - 20 * s, 8 * s, 8 * s);
      c.fillStyle = '#20262c'; c.beginPath(); c.arc(x, y - 26 * s, 4.6 * s, 0, 7); c.fill();
      c.restore(); return;
    }
    c.strokeStyle = '#2d3138'; c.lineWidth = 2.4 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 2 * s, y - 9 * s); c.lineTo(x - 2 * s + sw * 3.5 * s, y); c.moveTo(x + 2 * s, y - 9 * s); c.lineTo(x + 2 * s - sw * 3.5 * s, y); c.stroke();
    c.fillStyle = p.cloth; rr(c, x - 5 * s, y - 22 * s, 10 * s, 14 * s, 4 * s); c.fill();
    c.fillStyle = p.skin; c.beginPath(); c.arc(x, y - 26.5 * s, 4.6 * s, 0, 7); c.fill();
    c.fillStyle = p.hair; c.beginPath(); c.arc(x, y - 27.5 * s, 4.7 * s, Math.PI, 0); c.fill();
    if (p.cup) { c.fillStyle = '#fffdf6'; c.fillRect(x + p.dir * 5.5 * s - 1.8 * s, y - 18 * s, 3.8 * s, 5.5 * s); c.fillStyle = '#8a5a3c'; c.fillRect(x + p.dir * 5.5 * s - 1.8 * s, y - 16.4 * s, 3.8 * s, 1.6 * s); }
    if (rain) { c.fillStyle = p.umb; c.beginPath(); c.arc(x, y - 33 * s, 11 * s, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = '#2d3138'; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(x, y - 33 * s); c.lineTo(x, y - 20 * s); c.stroke(); }
    if (p.angry) { c.fillStyle = '#b3362a'; c.font = '800 ' + Math.round(13 * s) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('!', x, y - (rain ? 46 : 35) * s); }
    c.restore();
  }

  /* ---------- Satu adegan hidup ---------- */
  function create() {
    const st = { cv: null, c: null, W: 0, H: 0, dpr: 1, data: null, people: [], floats: [], queue: [], t: 0.3, mode: 'ambient', daySec: 5,
      clouds: Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: 0.08 + Math.random() * 0.28, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006 })),
      rain: Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.9 + Math.random() * 0.6 })),
      steam: 0, acc: 0, onSale: null, raf: 0, last: 0, doors: [] };
    function attach(cv) {
      st.cv = cv; st.c = cv.getContext('2d'); resize();
    }
    function resize() {
      if (!st.cv) return;
      const r = st.cv.getBoundingClientRect(); if (!r.width) return;
      st.dpr = Math.min(2, window.devicePixelRatio || 1); st.W = r.width; st.H = r.height;
      st.cv.width = Math.round(r.width * st.dpr); st.cv.height = Math.round(r.height * st.dpr);
    }
    function layout() {
      const n = Math.max(1, st.data.outlets.length), slot = Math.min(st.H * 1.25, 420, (st.W - 24) / n), x0 = (st.W - slot * n) / 2;
      return { n, slot, x0, sw: slot * 0.8, base: st.H - Math.max(40, st.H * 0.2), u: clamp(slot / 250, 0.62, 1.3) };
    }
    function newPerson(kind, i, L) {
      const side = Math.random() < 0.5 ? -1 : 1, door = st.doors[i] != null ? st.doors[i] : st.W / 2;
      const v = st.mode === 'day' ? L.slot * 0.8 / (0.15 * st.daySec) : 46;
      const p = { kind, i, x: 0, dir: -side, lane: rand(5, 26), size: rand(0.88, 1.08), phase: Math.random() * 6, alpha: 0, v: v * rand(0.85, 1.2),
        skin: pickOf(SKIN), cloth: pickOf(CLOTH), hair: pickOf(['#20262c', '#3b2a22', '#5b3a2a', '#20262c']), umb: pickOf(['#c8452f', '#2b5aa8', '#e0a21e', '#2e7d5b']), state: 'in', wait: 0, cup: false, angry: false, still: false, door };
      if (kind === 'pass') { p.x = side < 0 ? -20 : st.W + 20; p.v = st.mode === 'day' ? st.W / (0.4 * st.daySec) : 52; p.state = 'pass'; p.alpha = 1; }
      else if (kind === 'ojol') { p.x = side < 0 ? -30 : st.W + 30; p.lane = rand(30, 38); p.v = st.mode === 'day' ? st.W / (0.16 * st.daySec) : 170; p.size = 1; }
      else p.x = clamp(door + side * L.slot * rand(0.6, 1.15), -20, st.W + 20);
      st.people.push(p);
    }
    /* data: {brand, wx, ojol, outlets:[{loc,equip,dekor,staff,own,closed,served,lost,vis}]} */
    function setData(d, mode, daySec) {
      st.data = d; st.mode = mode; st.daySec = daySec || 5; st.queue = [];
      if (mode === 'day') {
        st.people = []; st.floats = []; st.t = 0;
        const dens = daySec < 2 ? 0.6 : 1, fig = x => x <= 0 ? 0 : clamp(Math.round(Math.sqrt(x) * 2.8 * dens), 1, Math.round(44 * dens));
        d.outlets.forEach((o, i) => {
          for (let k = fig(o.served); k--;) st.queue.push({ t: rand(0.02, 0.78), kind: 'buy', i });
          for (let k = fig(o.lost); k--;) st.queue.push({ t: rand(0.2, 0.78), kind: 'lost', i });
          if (d.ojol && !o.closed) for (let k = Math.round(2 * dens); k--;) st.queue.push({ t: rand(0.1, 0.8), kind: 'ojol', i });
        });
        const tv = d.outlets.reduce((a, o) => a + (o.vis || 0), 0);
        for (let k = clamp(Math.round(Math.sqrt(tv) * 1.4 * dens), 3, 26); k--;) st.queue.push({ t: rand(0, 0.8), kind: 'pass', i: 0 });
        st.queue.sort((a, b) => a.t - b.t);
      }
    }
    function step(dt) {
      const d = st.data; if (!d || !st.W) return;
      const L = layout(), rain = d.wx === 'hujan';
      st.steam += dt;
      for (const cl of st.clouds) { cl.x += cl.v * dt * (st.mode === 'day' ? 6 : 1); if (cl.x > 1.2) cl.x = -0.2; }
      for (const r of st.rain) { r.y += r.v * dt * 1.6; r.x -= dt * 0.12; if (r.y > 1) { r.y = -0.05; r.x = Math.random() * 1.1; } }
      if (st.mode === 'day') { while (st.queue.length && st.queue[0].t <= st.t) { const q = st.queue.shift(); newPerson(q.kind, q.i, L); } }
      else {
        st.acc += dt;
        if (st.acc > 0.32 && st.people.length < 40) {
          st.acc = 0;
          d.outlets.forEach((o, i) => { if (!o.closed && Math.random() < clamp(0.1 + (o.served || 20) / 500, 0.1, 0.55)) newPerson('buy', i, L); });
          if (Math.random() < 0.45) newPerson('pass', 0, L);
          if (d.ojol && Math.random() < 0.05) newPerson('ojol', Math.floor(Math.random() * d.outlets.length), L);
        }
      }
      const hold = st.mode === 'day' ? 0.045 * st.daySec : 1.6;
      for (const p of st.people) {
        p.phase += dt * 11; p.still = false;
        const go = tx => { const dx = tx - p.x, m = p.v * dt; p.dir = dx >= 0 ? 1 : -1; if (Math.abs(dx) <= m) { p.x = tx; return true; } p.x += p.dir * m; return false; };
        if (p.state === 'pass') { p.x += p.dir * p.v * dt; if (p.x < -30 || p.x > st.W + 30) p.dead = true; }
        else if (p.state === 'in') {
          p.alpha = Math.min(1, p.alpha + dt * 5);
          const stopAt = p.kind === 'lost' ? p.door - p.dir * 16 * L.u : p.kind === 'ojol' ? p.door + 4 : p.door;
          if (go(stopAt)) { p.state = 'hold'; p.wait = hold * (p.kind === 'buy' ? rand(0.7, 1.3) : 0.8); if (p.kind === 'lost') p.angry = true; }
        } else if (p.state === 'hold') {
          p.still = true; p.wait -= dt;
          if (p.kind === 'buy') p.alpha = Math.max(0, p.alpha - dt * 9);
          if (p.wait <= 0) {
            p.state = 'out'; p.dir = p.kind === 'lost' ? -p.dir : (Math.random() < 0.5 ? -1 : 1);
            if (p.kind === 'buy') { p.cup = true; st.floats.push({ x: p.door, y: 0, life: 1 }); if (st.onSale) st.onSale(); }
            if (p.kind === 'ojol') { st.floats.push({ x: p.door, y: 0, life: 1 }); if (st.onSale) st.onSale(); }
            p.tx = p.kind === 'ojol' ? (p.dir > 0 ? st.W + 40 : -40) : clamp(p.door + p.dir * L.slot * rand(0.6, 1.1), -30, st.W + 30);
          }
        } else if (p.state === 'out') {
          const dist = Math.abs(p.tx - p.x);
          p.alpha = p.kind === 'ojol' ? 1 : Math.min(p.alpha + dt * 6, dist / (L.slot * 0.18));
          if (go(p.tx)) p.dead = true;
        }
      }
      st.people = st.people.filter(p => !p.dead);
      for (const f of st.floats) { f.life -= dt * (st.mode === 'day' ? Math.max(1.2, 4 / st.daySec) : 1); f.y -= dt * 34; }
      st.floats = st.floats.filter(f => f.life > 0);
    }
    function draw() {
      const c = st.c, d = st.data; if (!c || !d || !st.W) return;
      const W = st.W, H = st.H, L = layout(), t = st.t, wx = d.wx;
      c.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      /* langit */
      let [top, bot] = skyAt(t);
      const grey = wx === 'hujan' ? 0.68 : wx === 'mendung' ? 0.45 : 0;
      if (grey) { top = mix(top, [120, 130, 140], grey); bot = mix(bot, [176, 184, 190], grey); }
      const g = c.createLinearGradient(0, 0, 0, L.base); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const night = smooth(0.8, 1, t);
      /* matahari / bulan */
      const sx = W * (0.08 + 0.84 * t), sy = L.base * (0.72 - Math.sin(Math.PI * clamp(t / 0.92, 0, 1)) * 0.56);
      if (!grey || wx === 'mendung') {
        const R = wx === 'terik' ? 24 : 18;
        if (wx === 'terik' && night < 0.5) { c.strokeStyle = 'rgba(255,214,90,.55)'; c.lineWidth = 3; for (let a = 0; a < 10; a++) { const an = a * Math.PI / 5 + st.steam * 0.3; c.beginPath(); c.moveTo(sx + Math.cos(an) * (R + 6), sy + Math.sin(an) * (R + 6)); c.lineTo(sx + Math.cos(an) * (R + 17), sy + Math.sin(an) * (R + 17)); c.stroke(); } }
        c.globalAlpha = grey ? 0.5 : 1; c.fillStyle = rgb(mix([255, 208, 80], [255, 130, 80], smooth(0.7, 0.9, t))); c.beginPath(); c.arc(sx, sy, R, 0, 7); c.fill(); c.globalAlpha = 1;
      }
      if (night > 0.2) { c.globalAlpha = night; c.fillStyle = '#f4f1e0'; c.beginPath(); c.arc(W * 0.16, L.base * 0.2, 13, 0, 7); c.fill(); c.fillStyle = rgb(top); c.beginPath(); c.arc(W * 0.16 + 6, L.base * 0.2 - 3, 11, 0, 7); c.fill();
        c.fillStyle = '#fff'; for (let i = 0; i < 24; i++) c.fillRect((i * 97.3) % W, (i * 53.7) % (L.base * 0.55), 1.5, 1.5); c.globalAlpha = 1; }
      /* awan */
      c.fillStyle = grey ? 'rgba(225,228,232,.92)' : 'rgba(255,255,255,' + (0.85 - night * 0.5) + ')';
      const nCl = wx === 'terik' ? 1 : grey ? 5 : 3;
      for (let i = 0; i < nCl; i++) { const cl = st.clouds[i], x = cl.x * W, y = cl.y * L.base, s = cl.s * (grey ? 1.5 : 1) * 20; c.beginPath(); c.arc(x, y, s, 0, 7); c.arc(x + s * 1.1, y + s * 0.2, s * 0.8, 0, 7); c.arc(x - s * 1.1, y + s * 0.25, s * 0.7, 0, 7); c.arc(x + s * 0.2, y - s * 0.5, s * 0.75, 0, 7); c.fill(); }
      /* latar per lokasi */
      const tone = bot;
      d.outlets.forEach((o, i) => backdrop(c, (LOOK[o.loc] || LOOK.gang).back, L.x0 + L.slot * (i + 0.5), L.base, L.sw, tone));
      /* tanah */
      c.fillStyle = '#c9c2b2'; c.fillRect(0, L.base, W, 30);
      c.fillStyle = '#b1ab9c'; c.fillRect(0, L.base + 28, W, 3);
      c.fillStyle = wx === 'hujan' ? '#4a5058' : '#5a5f66'; c.fillRect(0, L.base + 31, W, H - L.base - 31);
      c.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 10; x < W; x += 46) c.fillRect(x, L.base + 31 + (H - L.base - 31) / 2 - 1, 22, 2);
      /* toko */
      const hot = [];
      st.doors = [];
      d.outlets.forEach((o, i) => { const r = shop(c, o, d.brand, L.x0 + L.slot * (i + 0.5), L.base, L.sw, t, st.steam + i); st.doors[i] = r.door; if (!o.closed) hot.push(r);
        c.fillStyle = 'rgba(32,38,44,.78)'; c.font = '600 ' + Math.round(clamp(L.slot * 0.052, 9, 12)) + 'px "IBM Plex Sans",sans-serif'; c.textAlign = 'center'; c.fillText(NAMES[o.loc] || '', L.x0 + L.slot * (i + 0.5), L.base + 21); });
      /* orang */
      const ppl = st.people.slice().sort((a, b) => a.lane - b.lane);
      for (const p of ppl) person(c, p, L.base, L.u, wx === 'hujan' && p.kind !== 'ojol');
      /* gelap malam + lampu */
      if (night > 0.02) { c.fillStyle = 'rgba(18,22,58,' + 0.42 * night + ')'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,214,120,' + 0.5 * night + ')'; for (const r of hot) { c.fillRect(r.win[0], r.win[1], r.win[2], r.win[3] * 0.68); c.fillRect(r.doorR[0], r.doorR[1], r.doorR[2], r.doorR[3]); } }
      /* hujan */
      if (wx === 'hujan') { c.strokeStyle = 'rgba(220,235,250,.6)'; c.lineWidth = 1.2; c.beginPath(); for (const r of st.rain) { const x = r.x * W * 1.1, y = r.y * H; c.moveTo(x, y); c.lineTo(x - 5, y + 13); } c.stroke(); }
      /* uang melayang */
      c.textAlign = 'center'; c.font = '700 ' + Math.round(12 * L.u + 2) + 'px "IBM Plex Mono",monospace';
      for (const f of st.floats) { c.globalAlpha = clamp(f.life * 1.6, 0, 1); c.fillStyle = '#145c36'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; const y = L.base - L.sw * 0.42 + f.y; c.strokeText('+Rp', f.x, y); c.fillText('+Rp', f.x, y); }
      c.globalAlpha = 1;
    }
    function loop(ts) {
      st.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (ts - (st.last || ts)) / 1000); st.last = ts;
      if (!st.cv || !st.cv.isConnected || document.hidden) return;
      if (st.cv.width !== Math.round(st.cv.getBoundingClientRect().width * st.dpr)) resize();
      step(dt); draw();
    }
    return { attach, resize, setData, draw, step,
      start() { if (!st.raf) { st.last = 0; st.raf = requestAnimationFrame(loop); } },
      stop() { cancelAnimationFrame(st.raf); st.raf = 0; },
      set time(v) { st.t = v; }, get time() { return st.t; },
      set onSale(f) { st.onSale = f; },
      still() { step(0.016); draw(); } };
  }
  /* Gambar diam satu toko untuk kartu outlet. */
  function thumb(cv, o, brand, wx) {
    const s = create(); s.attach(cv); s.setData({ brand, wx: wx || 'cerah', outlets: [o], ojol: false }, 'ambient'); s.time = 0.35; s.draw();
  }
  return { create, thumb };
})();
