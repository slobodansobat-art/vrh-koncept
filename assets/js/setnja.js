/* Vrh – šetnja kroz kuću: stanice, a između njih kratki video prelazi */
(function () {
  'use strict';
  var doc = document.documentElement, body = document.body;
  var MOB = window.matchMedia('(max-width: 760px)');
  var MIRNO = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* x, y = položaj u procentima široke slike 16:9; xm, ym = položaj za telefon kad se razlikuje */
  var SCENE = [
    { ime: 'Ulaz', pins: [{ t: 'Parking za 2 auta', x: 22, y: 74 }, { t: 'Asfalt do samih vrata', x: 7, y: 64 }],
      stavke: ['Parking ispred kuće, za 2 auta', 'Asfalt do samih vrata', 'Wi-Fi u celoj kući'] },
    { ime: 'Kuhinja', pins: [{ t: 'Opremljena kuhinja', x: 10, y: 64 }, { t: 'Trpezarija za 4', x: 40, y: 76 }],
      stavke: ['Opremljena kuhinja', 'Trpezarija za 4', 'Aparat za kafu i sve za doručak'] },
    { ime: 'Galerija', pins: [{ t: 'Bračni krevet', x: 63, y: 80 }, { t: 'Pogled sa galerije', x: 50, y: 32, ym: 42 }],
      stavke: ['Bračni krevet', 'Pogled sa galerije', 'Posteljina i peškiri uključeni'] },
    { ime: 'Dnevna soba', pins: [{ t: 'Peć na drva', x: 50, y: 64 }, { t: 'Izlaz na terasu', x: 33, y: 50, xm: 38, ym: 52 }],
      stavke: ['Peć na drva', 'Podno grejanje', 'Izlaz na terasu'] },
    { ime: 'Terasa', pins: [{ t: 'Ognjište', x: 50, y: 68 }, { t: 'Nebo bez svetla grada', x: 60, y: 20, ym: 38 }],
      stavke: ['Ognjište', 'Nebo bez svetla grada', 'Sedenje za 4 uz vatru'] }
  ];
  var MOB_ISECAK = { x0: 0.3417, w: 0.3167 };     // telefon: srednji deo široke slike (608 od 1920)

  var walk = document.querySelector('.walk');
  var stage = walk && walk.querySelector('.walk-stage');
  var canvas = stage && stage.querySelector('canvas');
  var pinsBox = stage && stage.querySelector('.pins');
  var stavkeBox = stage && stage.querySelector('.stavke-mob');
  var uputstvo = stage && stage.querySelector('.uputstvo');
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
      if (mob && px > W * 0.5) b.classList.add('levo');   // natpis se otvara na stranu gde ima mesta
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

  /* ---------- šetnja: stanice, između njih se pušta video ---------- */
  var TRAJANJE = [3.2, 3.4, 5.2, 2.8];             // dužina prelaza u sekundama (za rezervni tajmer)
  var set = MOB.matches ? 'mob' : 'desk';
  var ctx, W = 0, H = 0, DPR = 1, trenutnaScena = -1, uZastanku = -1, tajmeri = [], pinovi = [];
  var stanica = 0, uToku = false, krajAnim = 0, poslednjiTocak = 0, aktivni = null, petlja = 0;
  var klipovi = {}, kutija = null, izvor = null, iw = 1440, ih = 810, prelazBr = 0, rezervaTajmer = 0, skokTajmer = 0;

  function kljuc(t, nazad) { return 't' + (t + 1) + (nazad ? 'r' : 'f'); }
  function napraviKlipove() {
    if (kutija) kutija.remove();
    kutija = document.createElement('div'); kutija.className = 'vid-kutija'; kutija.setAttribute('aria-hidden', 'true');
    stage.appendChild(kutija); klipovi = {};
    var red = [];
    for (var t = 0; t < 4; t++) red.push([t, false]);
    for (t = 0; t < 4; t++) red.push([t, true]);
    red.forEach(function (x) {
      var v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.preload = 'none';
      v.dataset.src = '/assets/video/t' + (x[0] + 1) + '-' + set + (x[1] ? '-r' : '') + '.mp4';
      kutija.appendChild(v); klipovi[kljuc(x[0], x[1])] = v;
    });
  }
  function ucitaj(v) { if (v && !v.src) { v.src = v.dataset.src; v.preload = 'auto'; v.load(); } }
  /* redom: prvi prelaz odmah, zatim oko trenutne stanice */
  function predUcitaj() {
    ucitaj(klipovi[kljuc(stanica, false)]);
    if (stanica > 0) ucitaj(klipovi[kljuc(stanica - 1, true)]);
    var v = klipovi[kljuc(Math.min(stanica + 1, 3), false)];
    setTimeout(function () { ucitaj(v); }, 1500);
  }

  function velicina() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    if (sobe) sobe.classList.toggle('skupljeno', window.innerHeight < 760 || window.scrollY > 40);
    rasporediTraku();
    if (izvor) crtaj(izvor);
    rasporediPinove();
  }
  /* telefon: ceo kadar u traci preko sredine ekrana, ispod teksta */
  var trakaY = 0, trakaW = 1.1;
  function rasporediTraku() {
    body.classList.toggle('traka', set === 'mob');
    if (set !== 'mob') return;
    var tesno = H < 720;                                   // niski telefoni: bez podnaslova, manji naslov
    walk.classList.toggle('tesno', tesno);
    trakaW = tesno ? 1 : 1.1;
    var dnoTeksta = 0;   // najviši tekst od svih stanica, da traka ne skače
    kopije.forEach(function (k) { dnoTeksta = Math.max(dnoTeksta, k.offsetTop + k.offsetHeight); });
    var h = W * trakaW * 9 / 16, spisak = (stavkeBox && stavkeBox.offsetHeight) || 90;
    var dnoSlobodno = H - 100;                             // iznad trake sa cenom
    trakaY = Math.round(Math.max(dnoTeksta + 20, tesno ? 0 : H * 0.40));
    trakaY = Math.min(trakaY, dnoSlobodno - spisak - 18 - h);
    if (stavkeBox) stavkeBox.style.top = (trakaY + h + 18) + 'px';
    body.style.setProperty('--traka-dno', (trakaY + h) + 'px');
  }
  function slikaRect() {
    if (set === 'mob') { var w0 = W * trakaW, h0 = w0 * 9 / 16; return { x: (W - w0) / 2, y: trakaY, w: w0, h: h0 }; }
    var s = Math.max(W / iw, H / ih), w = iw * s, h = ih * s;
    return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
  }
  function ivice(r) {
    var g = ctx.createLinearGradient(0, r.y * DPR, 0, (r.y + 32) * DPR);
    g.addColorStop(0, 'rgba(14,22,32,1)'); g.addColorStop(1, 'rgba(14,22,32,0)');
    ctx.fillStyle = g; ctx.fillRect(0, r.y * DPR, canvas.width, 32 * DPR);
    g = ctx.createLinearGradient(0, (r.y + r.h - 32) * DPR, 0, (r.y + r.h) * DPR);
    g.addColorStop(0, 'rgba(14,22,32,0)'); g.addColorStop(1, 'rgba(14,22,32,1)');
    ctx.fillStyle = g; ctx.fillRect(0, (r.y + r.h - 32) * DPR, canvas.width, 32 * DPR);
  }
  function crtaj(src) {
    if (!ctx || !src) return;
    var sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
    if (!sw) return;
    iw = sw; ih = sh; izvor = src;
    var r = slikaRect();
    if (set === 'mob') { ctx.fillStyle = '#0E1620'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    try { ctx.drawImage(src, r.x * DPR, r.y * DPR, r.w * DPR, r.h * DPR); } catch (e) {}
    if (set === 'mob') ivice(r);
  }
  /* početna slika dok se video ne učita */
  function prvaSlika() {
    var im = new Image();
    im.onload = function () { if (!izvor || izvor === im) crtaj(im); };
    im.src = '/assets/img/1-ulaz.webp';
    izvor = null;
  }
  /* nacrtaj kadar stanice: početak prvog klipa ili kraj klipa koji vodi do nje */
  function kadarStanice(i, gotovo) {
    var v = i === 0 ? klipovi[kljuc(0, false)] : klipovi[kljuc(i - 1, false)];
    ucitaj(v);
    function postavi() {
      var cilj = i === 0 ? 0 : Math.max(0, v.duration - 0.04);
      function nacrtano() { v.removeEventListener('seeked', nacrtano); crtaj(v); if (gotovo) gotovo(); }
      if (Math.abs(v.currentTime - cilj) < 0.02 && v.readyState >= 2) { crtaj(v); if (gotovo) gotovo(); return; }
      v.addEventListener('seeked', nacrtano); v.currentTime = cilj;
    }
    if (v.readyState >= 1) postavi(); else v.addEventListener('loadedmetadata', function lm() { v.removeEventListener('loadedmetadata', lm); postavi(); });
  }

  function pusti(cilj) {
    var nazad = cilj < stanica, t = nazad ? cilj : stanica;
    var v = klipovi[kljuc(t, nazad)];
    uToku = true; aktivni = v; ucitaj(v);
    ui({ z: -1, scena: stanica });
    var gotov = false, moj = ++prelazBr;
    function zavrsi(neuspeh) {
      if (gotov) return; gotov = true;
      v.removeEventListener('ended', kraj);
      if (moj !== prelazBr) return;                        // prelaz je otkazan (npr. promena širine)
      clearTimeout(rezervaTajmer); cancelAnimationFrame(petlja); v.removeEventListener('ended', kraj);
      stanica = cilj; uToku = false; aktivni = null; krajAnim = Date.now();
      document.dispatchEvent(new CustomEvent('vrh-stanica', { detail: cilj }));
      if (neuspeh === true) { v.pause(); kadarStanice(cilj, null); } else crtaj(v);   // poslednji kadar klipa
      ui({ z: cilj, scena: cilj }); predUcitaj();
    }
    function kraj() { zavrsi(false); }
    function korak() {
      if (gotov || moj !== prelazBr) return;
      if (v.readyState >= 2) crtaj(v);
      if (v.currentTime > v.duration * 0.5 && trenutnaScena !== cilj) ui({ z: -1, scena: cilj });
      petlja = requestAnimationFrame(korak);
    }
    v.addEventListener('ended', kraj);
    try { v.currentTime = 0; } catch (e) {}
    var p = v.play();
    if (p && p.catch) p.catch(function () { zavrsi(true); });   // pregledač ne da video: samo pređi na stanicu
    clearTimeout(rezervaTajmer);
    rezervaTajmer = setTimeout(function () { zavrsi(true); }, (TRAJANJE[t] + 8) * 1000);
    petlja = requestAnimationFrame(korak);
  }
  function idi(smer) {
    var cilj = stanica + smer;
    if (uToku || cilj < 0 || cilj > 4) return false;
    if (uputstvo) uputstvo.classList.remove('on');
    pusti(cilj); return true;
  }
  /* preskok na udaljenu prostoriju (spisak prostorija): kratko pretapanje */
  function skoci(i) {
    if (uToku) return;
    if (window.scrollY > walk.offsetTop + 2) window.scrollTo({ top: walk.offsetTop, behavior: 'auto' });
    if (i === stanica) return;
    if (Math.abs(i - stanica) === 1) { pusti(i); return; }
    uToku = true; canvas.classList.add('pretapanje');
    ui({ z: -1, scena: i });
    var moj = ++prelazBr;
    clearTimeout(skokTajmer);
    skokTajmer = setTimeout(function () {
      kadarStanice(i, function () {
        if (moj !== prelazBr) return;
        canvas.classList.remove('pretapanje');
        stanica = i; uToku = false; krajAnim = Date.now();
        ui({ z: i, scena: i }); predUcitaj();
      });
    }, 250);
  }

  function popuniStavke() {
    if (!stavkeBox) return;
    stavkeBox.innerHTML = (SCENE[trenutnaScena].stavke || []).map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }
  function rasporediPinove() {
    if (trenutnaScena < 0) return;
    if (set === 'mob') { pinsBox.innerHTML = ''; pinovi = []; return; }
    var r = slikaRect();
    var isecak = set === 'mob' ? MOB_ISECAK : { x0: 0, w: 1 };
    pinovi = rasporedi(pinsBox, SCENE[trenutnaScena], r, isecak, W, H);
    if (uZastanku === trenutnaScena) pinovi.forEach(function (b) { b.classList.add('on'); if (b.tagName === 'BUTTON') b.tabIndex = 0; });
  }
  function ui(st) {
    // tekst i oznake samo dok kamera stoji
    if (st.scena !== trenutnaScena) {
      trenutnaScena = st.scena;
      sobeBtns.forEach(function (b) { if (+b.dataset.scene === st.scena) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      rasporediPinove(); popuniStavke(); if (set === 'mob') rasporediTraku();
    }
    if (st.z !== uZastanku) {
      uZastanku = st.z;
      if (stavkeBox) stavkeBox.classList.toggle('on', st.z >= 0);
      tajmeri.forEach(clearTimeout); tajmeri = [];
      kopije.forEach(function (c) { c.classList.toggle('on', +c.dataset.copy === st.z); });
      pinovi.forEach(function (b) { b.classList.remove('on'); if (b.tagName === 'BUTTON') b.tabIndex = -1; });
      if (st.z >= 0) {
        pinovi.forEach(function (b, i) { tajmeri.push(setTimeout(function () { b.classList.add('on'); if (b.tagName === 'BUTTON') b.tabIndex = 0; }, 500 + i * 400)); });
      }
    }
    zatamni();
  }
  /* na terasi: kako se odlazi ka rezervaciji, slika tamni */
  function zatamni() {
    var se = stage.querySelector('.scrim-end');
    body.classList.toggle('odmaknuto', window.scrollY > 10);
    se.style.opacity = stanica === 4 && !uToku ? Math.min(1, Math.max(0, (window.scrollY - walk.offsetTop) / (H * 0.5))) : 0;
  }

  /* da li šetnja sada upravlja skrolom: stranica stoji na vrhu šetnje */
  var stigaoGore = 0, bioDole = false;
  function naVrhu() { return window.scrollY <= walk.offsetTop + 2; }
  function pratiVrh() {
    var gore = naVrhu();
    if (gore && bioDole) stigaoGore = Date.now();
    bioDole = !gore;
  }
  function smeDalje(smer) {
    if (!naVrhu()) return false;
    if (uToku) return true;
    if (smer > 0) return stanica < 4 || Date.now() - krajAnim < 700;   // posle terase kratko zadržimo, da zalet ne odnese stranu
    return stanica > 0 && Date.now() - stigaoGore > 450;                // zalet odozdo ne vraća odmah na prethodnu stanicu
  }

  function tocak(e) {
    if (e.ctrlKey) return;                                  // zumiranje
    var dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? H : 1);
    if (Math.abs(dy) < Math.abs(e.deltaX)) return;
    var smer = dy > 0 ? 1 : -1, sad = Date.now(), pauza = sad - poslednjiTocak;
    poslednjiTocak = sad;
    pratiVrh();
    if (smer < 0 && naVrhu() && !uToku && sad - stigaoGore < 450) { stigaoGore = sad; if (stanica > 0) e.preventDefault(); return; }
    if (smer > 0 && stanica === 4 && !uToku && naVrhu() && sad - krajAnim < 700) { krajAnim = sad; e.preventDefault(); return; }
    if (!smeDalje(smer)) return;
    e.preventDefault();
    // trackpad posle poteza šalje još dugo male pokrete: računamo samo novi potez
    if (uToku || sad - krajAnim < 250) return;
    if (pauza > 180 || Math.abs(dy) >= 60) idi(smer);
  }

  var dodir = null;
  function dodirPocetak(e) { if (e.touches.length !== 1) { dodir = null; return; } dodir = { y: e.touches[0].clientY, x: e.touches[0].clientX, nase: null }; }
  function dodirPomeraj(e) {
    if (!dodir) return;
    pratiVrh();
    var dy = dodir.y - e.touches[0].clientY, dx = dodir.x - e.touches[0].clientX;
    if (dodir.nase === null) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      dodir.vodoravno = Math.abs(dx) > Math.abs(dy);
      // nagore ili ulevo = sledeća prostorija, nadole ili udesno = prethodna (kao priče na Instagramu)
      dodir.nase = smeDalje((dodir.vodoravno ? dx : dy) > 0 ? 1 : -1);
    }
    if (dodir.nase) e.preventDefault();
  }
  function dodirKraj(e) {
    if (!dodir || !dodir.nase) { dodir = null; return; }
    var t = e.changedTouches[0], dy = t ? dodir.y - t.clientY : 0, dx = t ? dodir.x - t.clientX : 0;
    var d = dodir.vodoravno ? dx : dy;
    dodir = null;
    if (Math.abs(d) > 30 && !uToku) idi(d > 0 ? 1 : -1);
  }

  function tastatura(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var el = document.activeElement, tag = el && el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    var smer = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && tag !== 'BUTTON' && tag !== 'A')) smer = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey && tag !== 'BUTTON' && tag !== 'A')) smer = -1;
    if (!smer || !smeDalje(smer)) return;
    e.preventDefault(); idi(smer);
  }

  function pokreniSetnju() {
    walk.classList.add('walk-on', 'stanice');
    napraviKlipove();
    velicina(); prvaSlika();
    var prvi = klipovi[kljuc(0, false)]; ucitaj(prvi);
    prvi.addEventListener('loadeddata', function ld() { prvi.removeEventListener('loadeddata', ld); if (stanica === 0 && !uToku) kadarStanice(0, null); });
    ui({ z: 0, scena: 0 }); predUcitaj(); rasporediTraku();
    if (uputstvo && MOB.matches) setTimeout(function () { if (stanica === 0 && !uToku) uputstvo.classList.add('on'); }, 1200);
    window.addEventListener('wheel', tocak, { passive: false });
    window.addEventListener('touchstart', dodirPocetak, { passive: true });
    window.addEventListener('touchmove', dodirPomeraj, { passive: false });
    window.addEventListener('touchend', dodirKraj, { passive: true });
    window.addEventListener('keydown', tastatura);
    window.addEventListener('scroll', function () { pratiVrh(); zatamni(); }, { passive: true });
    window.addEventListener('resize', function () {
      var novi = MOB.matches ? 'mob' : 'desk';
      if (novi !== set) {
        set = novi; prelazBr++; clearTimeout(rezervaTajmer); clearTimeout(skokTajmer);
        if (aktivni) { aktivni.pause(); }
        cancelAnimationFrame(petlja); uToku = false; aktivni = null; izvor = null; canvas.classList.remove('pretapanje');
        napraviKlipove(); velicina(); kadarStanice(stanica, null); ui({ z: stanica, scena: stanica }); predUcitaj();
        return;
      }
      velicina();
    });
    sobeBtns.forEach(function (b) { b.addEventListener('click', function () { skoci(+b.dataset.scene); }); });
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
    if (savet && !vidjen && !MIRNO.matches && MOB.matches && walk) {
      // na telefonu savet tek posle prvog prelaza, da se ne sudara sa uputstvom
      document.addEventListener('vrh-stanica', function jednom() {
        document.removeEventListener('vrh-stanica', jednom);
        if (body.classList.contains('samo')) return;
        savet.textContent = 'Želite samo kuću, bez dugmića? Uključite ovde.';
        savet.classList.add('on');
        try { localStorage.setItem('vrh-savet', '1'); } catch (e) {}
        setTimeout(skloniSavet, 4500);
      });
    } else if (savet && !vidjen && !MIRNO.matches) {
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
