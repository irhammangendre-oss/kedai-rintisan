/* Kedai Rintisan: musik dan efek suara, disintesis dengan Web Audio (tanpa berkas audio). */
const Sound = (() => {
  'use strict';
  const PKEY = 'kedai-rintisan-prefs';
  const prefs = { music: true, sfx: true, vol: 0.6, anim: 'penuh' };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PKEY)) || {}); } catch (e) { /* abaikan */ }
  let ctx = null, master, musicBus, sfxBus, delay, noiseBuf, timer = 0, nextT = 0, stepN = 0, intensity = 0, lastChing = 0;
  const BPM = 94, STEP = 60 / BPM / 4;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const CH = { C: [60, 64, 67, 71], Am: [57, 60, 64, 67], Dm: [62, 65, 69, 72], G: [55, 59, 62, 65], F: [53, 57, 60, 64], Em: [52, 55, 59, 62] };
  const ROOT = { C: 36, Am: 33, Dm: 38, G: 31, F: 29, Em: 28 };
  const SEC = { A: ['C', 'Am', 'Dm', 'G'], B: ['F', 'Em', 'Dm', 'G'] };
  const MEL = {
    A: [[[0, 76, 2], [3, 79, 2], [6, 76, 2], [8, 72, 4], [14, 74, 2]], [[0, 72, 3], [4, 69, 2], [8, 67, 4], [12, 69, 2], [14, 72, 2]],
      [[0, 74, 2], [3, 77, 2], [6, 74, 2], [8, 72, 2], [10, 69, 4]], [[0, 71, 3], [4, 74, 2], [8, 79, 3], [12, 77, 2], [14, 74, 2]]],
    A2: [[[0, 79, 2], [2, 76, 2], [6, 72, 2], [8, 76, 4], [14, 79, 2]], [[0, 81, 3], [4, 79, 2], [8, 76, 4], [14, 72, 2]],
      [[0, 77, 2], [3, 74, 2], [6, 77, 2], [8, 81, 3], [12, 77, 2]], [[0, 79, 4], [6, 74, 2], [8, 71, 3], [12, 67, 4]]],
    B: [[[0, 81, 3], [4, 79, 2], [6, 77, 2], [8, 76, 4], [14, 72, 2]], [[0, 79, 3], [4, 76, 2], [8, 74, 3], [12, 71, 2], [14, 74, 2]],
      [[0, 77, 2], [2, 74, 2], [4, 72, 2], [8, 69, 4], [12, 72, 2]], [[0, 74, 4], [6, 71, 2], [8, 67, 4], [12, 71, 2], [14, 74, 2]]],
  };
  const FORM = [['A', null], ['A', 'A'], ['B', 'B'], ['A', 'A2'], ['A', 'A'], ['A', 'A2'], ['B', 'B'], ['A', 'A']];
  const COMP = [0, 3, 6, 10, 12], RIM = [0, 3, 6, 10, 12], BASS = [[0, 0], [6, 7], [8, 0], [14, 7]];

  function save() { try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch (e) { /* abaikan */ } }
  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = prefs.vol; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.5 : 0; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
      delay = ctx.createDelay(1); delay.delayTime.value = STEP * 3; const fb = ctx.createGain(); fb.gain.value = 0.28; const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
      delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }
  function tone(bus, type, f, t, dur, vel, opt) {
    opt = opt || {};
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + (opt.att || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); let out = g;
    if (opt.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opt.lp; g.connect(f2); out = f2; }
    out.connect(bus); if (opt.send) { const s = ctx.createGain(); s.gain.value = opt.send; out.connect(s); s.connect(delay); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(bus, t, dur, vel, hp) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }
  function schedule(n, t) {
    const bar = Math.floor(n / 16), s = n % 16, sec = FORM[Math.floor(bar / 4) % FORM.length], chord = SEC[sec[0]][bar % 4];
    const sw = s % 2 ? STEP * 0.14 : 0; t += sw;
    if (COMP.includes(s)) CH[chord].forEach((m, i) => { tone(musicBus, 'sine', hz(m), t + i * 0.006, s === 0 ? 0.9 : 0.34, 0.085, { lp: 2400 }); tone(musicBus, 'triangle', hz(m + 12), t + i * 0.006, 0.22, 0.02, { lp: 3000 }); });
    for (const [bs, iv] of BASS) if (bs === s) { tone(musicBus, 'triangle', hz(ROOT[chord] + iv + 12), t, 0.42, 0.24, { lp: 700 }); tone(musicBus, 'sine', hz(ROOT[chord] + iv), t, 0.42, 0.22); }
    if (sec[1]) for (const [ms, m, len] of MEL[sec[1]][bar % 4]) if (ms === s) { tone(musicBus, 'triangle', hz(m), t, len * STEP * 1.05 + 0.1, 0.11, { lp: 3200, att: 0.012, send: 0.35 }); tone(musicBus, 'sine', hz(m + 12), t, len * STEP * 0.6, 0.025, {}); }
    if (s % 2 === 0) noise(musicBus, t, 0.035, s % 4 === 2 ? 0.07 : 0.035, 7500);
    else if (intensity > 0) noise(musicBus, t, 0.025, 0.03, 9000);
    if (intensity > 0) {
      if (s === 0 || s === 8 || s === 11) tone(musicBus, 'sine', 130, t, 0.16, 0.5, { to: 44, att: 0.003 });
      if (RIM.includes(s)) { tone(musicBus, 'triangle', 820, t, 0.03, 0.12, { att: 0.002 }); noise(musicBus, t, 0.02, 0.05, 3000); }
    } else if (s === 0) tone(musicBus, 'sine', 110, t, 0.14, 0.22, { to: 46, att: 0.003 });
  }
  function tick() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.14) { if (prefs.music) schedule(stepN, nextT); stepN++; nextT += STEP; }
  }
  function startMusic() {
    if (!ensure() || timer) return;
    nextT = ctx.currentTime + 0.08; timer = setInterval(tick, 45);
  }
  /* Panggil dari handler klik: peramban hanya mengizinkan audio setelah interaksi. */
  function unlock() {
    if (!ensure()) return;
    try { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); } catch (e) { /* ditolak */ }
    startMusic();
  }
  const SFX = {
    tick: t => tone(sfxBus, 'triangle', 1400, t, 0.04, 0.12, { att: 0.002 }),
    pop: t => tone(sfxBus, 'sine', 320, t, 0.12, 0.3, { to: 720, att: 0.004 }),
    ching: t => { tone(sfxBus, 'sine', 1975, t, 0.3, 0.13, { att: 0.002 }); tone(sfxBus, 'sine', 2637, t + 0.05, 0.35, 0.12, { att: 0.002 }); },
    bell: t => { tone(sfxBus, 'sine', 1318, t, 0.5, 0.16); tone(sfxBus, 'sine', 1760, t + 0.12, 0.6, 0.14); },
    event: t => { tone(sfxBus, 'triangle', hz(64), t, 0.22, 0.2, { lp: 2500 }); tone(sfxBus, 'triangle', hz(70), t + 0.14, 0.4, 0.2, { lp: 2500 }); },
    good: t => [72, 76, 79].forEach((m, i) => tone(sfxBus, 'triangle', hz(m), t + i * 0.08, 0.3, 0.18, { lp: 3500 })),
    bad: t => [67, 63, 58].forEach((m, i) => tone(sfxBus, 'triangle', hz(m), t + i * 0.12, 0.4, 0.2, { lp: 1800 })),
    win: t => [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => tone(sfxBus, 'triangle', hz(m), t + i * 0.11, 0.5, 0.2, { lp: 4000 })),
    lose: t => [60, 58, 55, 51, 48].forEach((m, i) => tone(sfxBus, 'sawtooth', hz(m), t + i * 0.2, 0.5, 0.12, { lp: 900 })),
    print: t => { for (let i = 0; i < 9; i++) noise(sfxBus, t + i * 0.07, 0.03, 0.09, 2500); },
  };
  function sfx(name) {
    if (!prefs.sfx || !ctx || ctx.state !== 'running') return;
    if (name === 'ching') { const n = performance.now(); if (n - lastChing < 110) return; lastChing = n; }
    try { SFX[name](ctx.currentTime + 0.005); } catch (e) { /* abaikan */ }
  }
  return { prefs, unlock, sfx,
    setIntensity(v) { intensity = v; },
    set(k, v) { prefs[k] = v; save(); if (!ctx) return; const t = ctx.currentTime;
      if (k === 'music') musicBus.gain.setTargetAtTime(v ? 0.5 : 0, t, 0.08);
      if (k === 'vol') master.gain.setTargetAtTime(v, t, 0.05); } };
})();
