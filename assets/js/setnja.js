/* Vrh – šetnja kroz kuću: niz kadrova kojim upravlja skrol */
(function () {
  'use strict';
  var doc = document.documentElement, body = document.body;
  var MOB = window.matchMedia('(max-width: 760px)');
  var MIRNO = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* x, y = položaj u procentima široke slike 16:9; xm, ym = položaj za telefon kad se razlikuje */
  var SCENE = [
    { ime: 'Ulaz', pins: [] },
    { ime: 'Kuhinja', pins: [{ t: 'Opremljena kuhinja', x: 10, y: 64 }, { t: 'Trpezarija za 4', x: 40, y: 76 }] },
    { ime: 'Galerija', pins: [{ t: 'Bračni krevet', x: 63, y: 80 }, { t: 'Pogled sa galerije', x: 50, y: 32, ym: 42 }] },
    { ime: 'Dnevna soba', pins: [{ t: 'Peć na drva', x: 50, y: 64 }, { t: 'Izlaz na terasu', x: 33, y: 50, xm: 38, ym: 52 }] },
    { ime: 'Terasa', pins: [{ t: 'Ognjište', x: 50, y: 68 }, { t: 'Nebo bez svetla grada', x: 60, y: 20, ym: 38 }] }
  ];
  var PRELAZI = [{ id: 't1', d: 53, m: 27 }, { id: 't2', d: 59, m: 30 }, { id: 't3', d: 99, m: 50 }, { id: 't4', d: 42, m: 21 }];
  var ZADRZI = [0.8, 0.9, 0.9, 0.9, 0.7];       // zastanak na sceni, u visinama ekrana
  var DUZINE = [1.7, 1.9, 3.2, 1.4];             // prelazi, u visinama ekrana
  var MOB_ISECAK = { x0: 0.3417, w: 0.3167 };     // telefon: srednji deo široke slike (608 od 1920)

  var walk = document.querySelector('.walk');
  var stage = walk && walk.querySelector('.walk-stage');
  var canvas = stage && stage.querySelector('canvas');
  var pinsBox = stage && stage.querySelector('.pins');
  var kopije = stage ? [].slice.call(stage.querySelectorAll('[data-copy]')) : [];
  var sobeBtns = [].slice.call(document.querySelectorAll('.rooms [data-scene], .rooms-mob [data-scene]'));
  var sobe = document.querySelector('.rooms');
  var samoBtn = document.querySelector('.samo-btn');
  var savet = document.querySelector('.savet');
  var bar = document.querySelector('.pricebar');
  var end = document.getElementById('rezervacija');

  /* ---------- oznake (pinovi) ---------- */
  function napraviPin(p, mob) {
    var inner = '<span class="dot" aria-hidden="true"></span><span class="crta" aria-hidden="true"></span><span class="naziv staklo">' + p.t + '</span>';
    if (!mob) { var d = document.createElement('div'); d.className = 'pin info'; d.innerHTML = inner; return d; }
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pin'; b.tabIndex = -1;
    b.setAttribute('aria-expanded', 'false');
    b.innerHTML = inner;
    b.setAttribute('aria-label', p.t);
    b.addEventListener('click', function () {
      if (!MOB.matches) return;
      var otvoren = b.getAttribute('aria-expanded') === 'true';
      b.parentNode.querySelectorAll('.pin').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
      b.setAttribute('aria-expanded', String(!otvoren));
    });
    return b;
  }
  /* rect = gde je široka slika nacrtana; isecak = koji deo široke slike je u kadru */
  function rasporedi(box, scena, rect, isecak, W, H) {
    box.innerHTML = '';
    var mob = MOB.matches, out = [];
    scena.pins.forEach(function (p) {
      var x = (mob && p.xm != null ? p.xm : p.x) / 100, y = (mob && p.ym != null ? p.ym : p.y) / 100;
      var px = rect.x + ((x - isecak.x0) / isecak.w) * rect.w, py = rect.y + y * rect.h;
      var ivica = mob ? 24 : 56, gore = mob ? 120 : 140, dole = mob ? 170 : 150, desno = mob ? 24 : 120;
      if (px < ivica || px > W - desno - (mob ? 30 : 200) || py < gore || py > H - dole) return; // samo ono što je u kadru
      var b = napraviPin(p, mob); b.style.left = px + 'px'; b.style.top = py + 'px';
      box.appendChild(b); out.push(b);
    });
    return out;
  }

  /* ---------- režim bez animacija: scene jedna ispod druge ---------- */
  function staticki() {
    document.querySelectorAll('.scena-st').forEach(function (fig) {
      var i = +fig.dataset.static, box = fig.querySelector('.pins'); if (!box) return;
      function lay() {
        var W = fig.clientWidth, H = fig.clientHeight, s = Math.max(W / 16, H / 9), w = 16 * s, h = 9 * s;
        var pins = rasporedi(box, SCENE[i], { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h }, { x0: 0, w: 1 }, W, H);
        pins.forEach(function (b) { b.classList.add('on'); if (b.tagName === 'BUTTON') b.tabIndex = 0; });
      }
      lay(); window.addEventListener('resize', lay);
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (!e.isIntersecting) return; var i = e.target.dataset.static;
          sobeBtns.forEach(function (b) { if (b.dataset.scene === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      document.querySelectorAll('.scena-st').forEach(function (f) { io.observe(f); });
    }
    sobeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var fig = document.querySelector('[data-static="' + b.dataset.scene + '"]');
        if (fig) fig.scrollIntoView();
      });
    });
  }

  /* ---------- šetnja ---------- */
  var set = MOB.matches ? 'mob' : 'desk', kadrovi = [], ukupnoJed = 0, segmenti = [];
  var ctx, W = 0, H = 0, DPR = 1, poslednji = null, trenutnaScena = -1, uZastanku = -1, tajmeri = [], pinovi = [];

  function pripremiSegmente() {
    segmenti = []; ukupnoJed = 0;
    for (var i = 0; i < 5; i++) {
      segmenti.push({ tip: 'z', i: i, od: ukupnoJed, len: ZADRZI[i] }); ukupnoJed += ZADRZI[i];
      if (i < 4) { segmenti.push({ tip: 'p', i: i, od: ukupnoJed, len: DUZINE[i] }); ukupnoJed += DUZINE[i]; }
    }
  }
  var generacija = 0, trazeno = {}, dodajURed = null;
  var STEDI = !!(navigator.connection && navigator.connection.saveData);
  function zatrazi(t) { if (t < 0 || t >= PRELAZI.length || trazeno[t] || !dodajURed) return; trazeno[t] = 1; dodajURed(t); }
  function ucitajKadrove() {
    var gen = ++generacija; trazeno = {};
    kadrovi = PRELAZI.map(function (p) {
      var n = set === 'mob' ? p.m : p.d, arr = [];
      for (var k = 1; k <= n; k++) arr.push({ src: '/assets/frames/' + set + '/' + p.id + '_' + String(k).padStart(3, '0') + '.webp', img: null, ok: false });
      return arr;
    });
    // redosled: krajevi prelaza (scene) odmah, a prelazi na zahtev (trenutni i sledeći), prvo svaki četvrti kadar
    var mojiKadrovi = kadrovi, red = [], vidjen = {};
    function dodaj(t, k) { var key = t + ':' + k; if (vidjen[key] || !mojiKadrovi[t][k]) return; vidjen[key] = 1; red.push([t, k]); }
    dodaj(0, 0); mojiKadrovi.forEach(function (a, t) { dodaj(t, a.length - 1); });
    var aktivno = 0, idx = 0;
    function sledeci() {
      if (gen !== generacija) return;
      while (aktivno < 6 && idx < red.length) {
        (function (par) {
          var f = mojiKadrovi[par[0]][par[1]], im = new Image();
          aktivno++; im.decoding = 'async';
          im.onload = function () { if (gen !== generacija) return; f.img = im; f.ok = true; aktivno--; if (!poslednji || poslednji.t === par[0]) nacrtaj(true); sledeci(); };
          im.onerror = function () { aktivno--; sledeci(); };
          im.src = f.src;
        })(red[idx++]);
      }
    }
    dodajURed = function (t) {
      var a = mojiKadrovi[t], k, korak = STEDI ? 3 : 1;
      for (k = 0; k < a.length; k += 4) dodaj(t, k);
      for (k = 0; k < a.length; k += korak) dodaj(t, k);
      sledeci();
    };
    sledeci();
    zatrazi(0);
  }
  function velicina() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    walk.style.height = (ukupnoJed * H + H) + 'px';
    if (sobe) sobe.classList.toggle('skupljeno', window.innerHeight < 760 || window.scrollY > 40);
    poslednji = null; nacrtaj(true); rasporediPinove();
  }
  function stanje() {
    var top = walk.offsetTop, raspon = walk.offsetHeight - H;
    var prog = Math.min(1, Math.max(0, (window.scrollY - top) / raspon)) * ukupnoJed;
    for (var s = 0; s < segmenti.length; s++) {
      var g = segmenti[s];
      if (prog <= g.od + g.len || s === segmenti.length - 1) {
        var u = Math.min(1, Math.max(0, (prog - g.od) / g.len));
        if (g.tip === 'z') return { z: g.i, t: g.i === 0 ? 0 : g.i - 1, k: g.i === 0 ? 0 : kadrovi[g.i - 1].length - 1, scena: g.i, u: u, kraj: g.i === 4 ? u : 0 };
        var n = kadrovi[g.i].length;
        return { z: -1, t: g.i, k: Math.round(u * (n - 1)), scena: u < 0.5 ? g.i : g.i + 1, u: u, kraj: 0 };
      }
    }
  }
  function nadjiUcitan(t, k) {
    var a = kadrovi[t];
    for (var d = 0; d < a.length; d++) {
      if (a[k - d] && a[k - d].ok) return a[k - d];
      if (a[k + d] && a[k + d].ok) return a[k + d];
    }
    return null;
  }
  function slikaRect() {
    var iw = set === 'mob' ? 540 : 1440, ih = set === 'mob' ? 960 : 810;
    var s = Math.max(W / iw, H / ih), w = iw * s, h = ih * s;
    return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
  }
  function nacrtaj(sila) {
    if (!ctx) return;
    var st = stanje(); if (!st) return;
    zatrazi(st.t); zatrazi(st.t + 1);
    if (!sila && poslednji && poslednji.t === st.t && poslednji.k === st.k) { ui(st); return; }
    var f = nadjiUcitan(st.t, st.k);
    if (f) {
      var r = slikaRect();
      ctx.drawImage(f.img, r.x * DPR, r.y * DPR, r.w * DPR, r.h * DPR);
      poslednji = st;
    }
    ui(st);
  }
  function rasporediPinove() {
    if (trenutnaScena < 0) return;
    var r = slikaRect();
    var isecak = set === 'mob' ? MOB_ISECAK : { x0: 0, w: 1 };
    var rr = set === 'mob' ? { x: r.x, y: r.y, w: r.w, h: r.h } : r;
    pinovi = rasporedi(pinsBox, SCENE[trenutnaScena], rr, isecak, W, H);
    if (uZastanku === trenutnaScena) pinovi.forEach(function (b) { b.classList.add('on'); if (b.tagName === 'BUTTON') b.tabIndex = 0; });
  }
  function ui(st) {
    // tekst i oznake samo dok kamera stoji
    if (st.scena !== trenutnaScena) {
      trenutnaScena = st.scena;
      sobeBtns.forEach(function (b) { if (+b.dataset.scene === st.scena) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      rasporediPinove();
    }
    if (st.z !== uZastanku) {
      uZastanku = st.z;
      tajmeri.forEach(clearTimeout); tajmeri = [];
      kopije.forEach(function (c) { c.classList.toggle('on', +c.dataset.copy === st.z); });
      pinovi.forEach(function (b) { b.classList.remove('on'); if (b.tagName === 'BUTTON') b.tabIndex = -1; });
      if (st.z >= 0) {
        pinovi.forEach(function (b, i) { tajmeri.push(setTimeout(function () { b.classList.add('on'); if (b.tagName === 'BUTTON') b.tabIndex = 0; }, 800 + i * 500)); });
      }
    }
    var se = stage.querySelector('.scrim-end');
    se.style.opacity = st.z === 4 ? Math.min(1, st.u * 1.4) : 0;
  }

  var zakazano = false;
  function naSkrol() {
    if (zakazano) return; zakazano = true;
    requestAnimationFrame(function () { zakazano = false; nacrtaj(false); });
  }
  function idiNaScenu(i) {
    var g = segmenti.filter(function (x) { return x.tip === 'z' && x.i === i; })[0];
    var raspon = walk.offsetHeight - H;
    var y = walk.offsetTop + ((g.od + g.len * 0.45) / ukupnoJed) * raspon;
    window.scrollTo({ top: y, behavior: MIRNO.matches ? 'auto' : 'smooth' });
  }

  function pokreniSetnju() {
    walk.classList.add('walk-on');
    pripremiSegmente(); ucitajKadrove();
    velicina();
    window.addEventListener('scroll', naSkrol, { passive: true });
    window.addEventListener('resize', function () {
      var novi = MOB.matches ? 'mob' : 'desk';
      if (novi !== set) { set = novi; poslednji = null; ucitajKadrove(); }
      velicina();
    });
    sobeBtns.forEach(function (b) { b.addEventListener('click', function () { idiNaScenu(+b.dataset.scene); }); });
  }

  /* ---------- spisak prostorija, Samo pogled, savet, traka sa cenom ---------- */
  function ostalo() {
    if (sobe) {
      sobe.addEventListener('mouseenter', function () { body.classList.add('rooms-open'); });
      sobe.addEventListener('mouseleave', function () { setTimeout(function () { body.classList.remove('rooms-open'); }, 300); });
      sobe.addEventListener('focusin', function () { body.classList.add('rooms-open'); });
      sobe.addEventListener('focusout', function () { body.classList.remove('rooms-open'); });
      window.addEventListener('scroll', function () { if (window.scrollY > 40 || window.innerHeight < 760) sobe.classList.add('skupljeno'); }, { passive: true });
      if (window.innerHeight < 760) sobe.classList.add('skupljeno');
    }
    if (samoBtn) samoBtn.addEventListener('click', function () {
      var on = samoBtn.getAttribute('aria-checked') !== 'true';
      samoBtn.setAttribute('aria-checked', String(on));
      body.classList.toggle('samo', on);
      skloniSavet();
    });
    // savet samo pri prvoj poseti
    var vidjen = false; try { vidjen = localStorage.getItem('vrh-savet') === '1'; } catch (e) { vidjen = true; }
    function skloniSavet() { if (savet) savet.classList.remove('on'); }
    if (savet && !vidjen && !MIRNO.matches) {
      setTimeout(function () {
        if (window.scrollY > 40) return;
        savet.textContent = 'Želite samo kuću, bez dugmića? Uključite ovde.';
        savet.classList.add('on');
        try { localStorage.setItem('vrh-savet', '1'); } catch (e) {}
        setTimeout(skloniSavet, 4500);
      }, 1000);
      window.addEventListener('scroll', function sk() { if (window.scrollY > 20) { skloniSavet(); window.removeEventListener('scroll', sk); } }, { passive: true });
    }
    // traka sa cenom se sklanja kod kalendara, kalkulatora i završnog poziva
    var vidljivi = new Set();
    if ('IntersectionObserver' in window && bar) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) vidljivi.add(e.target); else vidljivi.delete(e.target); });
        bar.classList.toggle('sakrij', vidljivi.size > 0);
      }, { threshold: 0.15 });
      document.querySelectorAll('[data-hide-bar]').forEach(function (el) { io.observe(el); });
    }
    // posle šetnje sklanjamo spisak prostorija i Samo pogled
    function posle() {
      var kraj = end ? end.getBoundingClientRect().top < window.innerHeight * 0.5 : false;
      body.classList.toggle('posle', kraj);
      if (kraj && body.classList.contains('samo') && samoBtn) { body.classList.remove('samo'); samoBtn.setAttribute('aria-checked', 'false'); }
    }
    window.addEventListener('scroll', posle, { passive: true }); posle();
  }

  function start() {
    ostalo();
    if (!walk) return;
    if (MIRNO.matches || !canvas || !canvas.getContext) staticki(); else pokreniSetnju();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
