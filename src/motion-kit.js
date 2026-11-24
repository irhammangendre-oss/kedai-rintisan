/* motion-kit.js — GSAP ScrollTrigger (judul per kata) + Motion (kartu masuk & hover) + Lenis (smooth scroll).
   Tempel inline SETELAH keempat <script src> library. Semua library opsional: yang gagal dimuat dilewati,
   dan konten tidak pernah dibiarkan tersembunyi.
   Pakai:
     var fx = MotionKit.init({ scroller: null,            // elemen scroll; null = window
                               headings: "h1,h2",         // judul yang dipecah per kata
                               cards: ".card",            // elemen yang dianimasikan masuk
                               hover: ".card" });         // elemen yang terangkat saat hover
     fx.refresh("nama-halaman");  // panggil setiap selesai render ulang DOM; animasi masuk hanya
                                  // diputar bila kuncinya berubah, hover selalu dipasang ulang
     fx.top();                    // scroll ke atas (lewat Lenis bila ada)                              */
(function (root) {
  function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function init(opt) {
    opt = opt || {};
    var scroller = opt.scroller || null, scope = opt.scope || document;
    var reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var G = !reduce && root.gsap && root.ScrollTrigger ? root.gsap : null;
    var M = !reduce && root.Motion ? root.Motion : null;
    var lenis = null, lastKey, stops = [], slot = 0;
    if (G) { G.registerPlugin(root.ScrollTrigger); if (scroller) root.ScrollTrigger.defaults({ scroller: scroller }); }
    if (!reduce && root.Lenis) {
      try {
        lenis = new root.Lenis(scroller ? { wrapper: scroller, content: scroller.firstElementChild, lerp: 0.11 } : { lerp: 0.11 });
        if (G) { lenis.on("scroll", root.ScrollTrigger.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0); }
        else (function loop(t) { lenis.raf(t); requestAnimationFrame(loop); })(0);
      } catch (e) { lenis = null; }
    }
    function split(h) {
      var text = h.textContent.trim();
      h.setAttribute("aria-label", text); // pembaca layar tetap membaca judul utuh
      h.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="mk-w" aria-hidden="true" style="display:inline-block">' + escHtml(w) + "</span>"; }).join(" ");
      return h.querySelectorAll(".mk-w");
    }
    function refresh(key) {
      stops.forEach(function (f) { try { f(); } catch (e) {} }); stops = [];
      if (G) root.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      var fresh = key === undefined || key !== lastKey; lastKey = key;
      var els = [];
      try {
        if (M && opt.hover) scope.querySelectorAll(opt.hover).forEach(function (el) {
          stops.push(M.hover(el, function () {
            M.animate(el, { y: -4, scale: 1.015 }, { duration: 0.18 });
            return function () { M.animate(el, { y: 0, scale: 1 }, { duration: 0.25 }); };
          }));
        });
        if (!fresh) return;
        if (G && opt.headings) scope.querySelectorAll(opt.headings).forEach(function (h) {
          G.from(split(h), { opacity: 0, yPercent: 70, duration: 0.55, ease: "power3.out", stagger: 0.08,
            scrollTrigger: { trigger: h, start: "top 94%", once: true } });
        });
        if (M && opt.cards) {
          els = Array.prototype.slice.call(scope.querySelectorAll(opt.cards));
          var shown = new Set(), batch = [];
          var flush = function () { // IntersectionObserver tidak menjamin urutan: urutkan menurut DOM
            batch.sort(function (a, b) { return els.indexOf(a) - els.indexOf(b); }).forEach(function (el) {
              var now = performance.now(); slot = Math.max(now, slot) + 45;
              M.animate(el, { opacity: [0, 1], y: [18, 0] }, { duration: 0.45, delay: (slot - now) / 1000, ease: [0.2, 0.7, 0.2, 1] });
            }); batch = [];
          };
          els.forEach(function (el) {
            el.style.opacity = "0";
            stops.push(M.inView(el, function () {
              if (shown.has(el)) return; shown.add(el);
              if (!batch.length) setTimeout(flush, 0); batch.push(el);
            }, scroller ? { root: scroller } : {}));
          });
          var t = setTimeout(function () { // jaring pengaman: jangan ada yang tertinggal tak terlihat
            els.forEach(function (el) { if (!shown.has(el)) { var r = el.getBoundingClientRect(); if (r.top < root.innerHeight && r.bottom > 0) { shown.add(el); el.style.opacity = ""; } } });
          }, 1500);
          stops.push(function () { clearTimeout(t); });
        }
        if (G) root.ScrollTrigger.refresh();
      } catch (e) { els.forEach(function (el) { el.style.opacity = ""; }); }
    }
    return { refresh: refresh, lenis: lenis,
      top: function () { if (lenis) lenis.scrollTo(0, { immediate: true }); else if (scroller) scroller.scrollTop = 0; else root.scrollTo(0, 0); } };
  }
  root.MotionKit = { init: init };
})(window);
