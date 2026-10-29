/* Vrh – rezervacija: kalendar, forma, kalkulator cene */
(function () {
  'use strict';

  var MESECI = ['januar','februar','mart','april','maj','jun','jul','avgust','septembar','oktobar','novembar','decembar'];
  var MES_KR = ['jan','feb','mar','apr','maj','jun','jul','avg','sep','okt','nov','dec'];
  var DANI = ['nedelja','ponedeljak','utorak','sreda','četvrtak','petak','subota'];
  var DANI_KR = ['ned','pon','uto','sre','čet','pet','sub'];
  var DOW = ['Po','Ut','Sr','Če','Pe','Su','Ne'];
  var MOB = window.matchMedia('(max-width: 760px)');

  /* ---------- datumi i cene ---------- */
  function d0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return d0(x); }
  function same(a, b) { return a && b && a.getTime() === b.getTime(); }
  function diffDays(a, b) { return Math.round((d0(b) - d0(a)) / 864e5); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var DANAS = d0(new Date());

  function sezona(d) {
    var m = d.getMonth(), dan = d.getDate();
    return (m === 11 && dan >= 20) || (m === 0 && dan <= 10) || m === 6 || m === 7;
  }
  function cenaNoci(d) {
    if (sezona(d)) return { c: 145, tip: 'sezona' };
    var w = d.getDay();
    if (w === 5 || w === 6) return { c: 125, tip: 'vikend' };
    return { c: 95, tip: 'radni' };
  }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return Math.abs(n); }
  /* simulirana zauzetost: noć d je zauzeta (koncept, bez pravog kalendara) */
  function zauzeto(d) {
    var dani = Math.floor(d0(d).getTime() / 864e5) + 3; // ponedeljak = početak nedelje
    var ned = Math.floor(dani / 7), w = d.getDay(), h = hash(ned * 7919 + 13);
    if (h % 3 === 0 && (w === 5 || w === 6)) return true;
    if (h % 5 === 1 && (w === 2 || w === 3)) return true;
    if (h % 7 === 2 && w === 0) return true;
    return false;
  }
  function opsegSlobodan(a, b) { for (var d = d0(a); d < b; d = addDays(d, 1)) if (zauzeto(d)) return false; return true; }
  function noci(a, b) { var out = []; for (var d = d0(a); d < b; d = addDays(d, 1)) out.push({ d: d, p: cenaNoci(d) }); return out; }
  function rec(n, j, d, m) { return n === 1 ? j : (n >= 2 && n <= 4 ? d : m); }
  function nociTxt(n) { return n + ' ' + rec(n, 'noć', 'noći', 'noći'); }
  function gostiTxt(n) { return n + ' ' + rec(n, 'osoba', 'osobe', 'osoba'); }
  function eur(n) { return n.toLocaleString('sr-RS') + ' €'; }
  function kratko(d) { return DANI_KR[d.getDay()] + ', ' + d.getDate() + '. ' + MES_KR[d.getMonth()]; }
  function dugo(d) { var s = DANI[d.getDay()]; return s.charAt(0).toUpperCase() + s.slice(1) + ', ' + d.getDate() + '. ' + MESECI[d.getMonth()] + ' ' + d.getFullYear(); }
  function opsegTxt(a, b) {
    var A = DANI[a.getDay()], B = DANI[b.getDay()];
    A = A.charAt(0).toUpperCase() + A.slice(1);
    if (a.getMonth() === b.getMonth()) return A + ' ' + a.getDate() + '. – ' + B + ' ' + b.getDate() + '. ' + MESECI[b.getMonth()];
    return A + ' ' + a.getDate() + '. ' + MESECI[a.getMonth()] + ' – ' + B + ' ' + b.getDate() + '. ' + MESECI[b.getMonth()];
  }
  function tipTxt(list) {
    var t = {}; list.forEach(function (n) { t[n.p.tip] = 1; });
    var k = Object.keys(t);
    if (k.length > 1) return 'mešovita cena';
    return k[0] === 'vikend' ? 'vikend cena' : k[0] === 'sezona' ? 'sezonska cena' : 'radni dani';
  }

  function najavi(t) { var n = document.getElementById('najava'); if (!n) return; n.textContent = ''; setTimeout(function () { n.textContent = t; }, 60); }

  /* ---------- zajedničko stanje ---------- */
  var store = {
    s: { in: null, out: null, gosti: 2, late: false, msg: '' },
    subs: [],
    set: function (p) { Object.assign(this.s, p); this.subs.forEach(function (f) { f(); }); },
    on: function (f) { this.subs.push(f); }
  };
  function ukupno() {
    var s = store.s; if (!s.in || !s.out) return null;
    var z = noci(s.in, s.out).reduce(function (a, n) { return a + n.p.c; }, 0);
    return z + (s.late ? 20 : 0);
  }
  function izaberi(d) {
    var s = store.s;
    if (!s.in || s.out || d <= s.in) {
      if (zauzeto(d)) return;
      store.set({ in: d, out: null, msg: 'Sada izaberite dan odlaska.' });
      return;
    }
    var n = diffDays(s.in, d);
    if (!opsegSlobodan(s.in, d)) { store.set({ msg: 'U tom periodu ima zauzetih noći. Izaberite drugi odlazak.' }); return; }
    if (n < 2) { store.set({ msg: 'Najmanje 2 noći. Izaberite kasniji odlazak.' }); return; }
    store.set({ out: d, msg: '' });
    najavi(opsegTxt(s.in, d) + ', ' + nociTxt(n) + ', ukupno ' + eur(ukupno()));
  }

  /* ---------- kalendar ---------- */
  function Kalendar(root, prefix) {
    this.root = root; this.prefix = prefix;
    this.mesec = new Date(DANAS.getFullYear(), DANAS.getMonth(), 1);
    this.fokus = null;
    root.innerHTML =
      '<div class="cal-nav"><button type="button" class="icon-btn" data-m="-1" aria-label="Prethodni mesec"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<span aria-live="polite" id="' + prefix + '-mes"></span>' +
      '<button type="button" class="icon-btn" data-m="1" aria-label="Sledeći mesec"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-dow" aria-hidden="true">' + DOW.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
      '<div class="cal-grid" role="group" aria-labelledby="' + prefix + '-mes"></div>' +
      '<div class="legenda"><span><s>12</s>Zauzeto</span><span><i></i>Dolazak i odlazak</span><span><i class="noc"></i>Izabrane noći</span></div>' +
      '<p class="napomena">Najmanje 2 noći.</p>' +
      '<p class="cal-poruka" role="status" aria-live="polite"></p>';
    var self = this;
    root.querySelectorAll('[data-m]').forEach(function (b) {
      b.addEventListener('click', function () { self.pomeri(+b.dataset.m); });
    });
    this.grid = root.querySelector('.cal-grid');
    this.grid.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-d]'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
      var d = new Date(b.dataset.d + 'T00:00:00'); self.fokus = d; izaberi(d);
    });
    this.grid.addEventListener('keydown', function (e) { self.tastatura(e); });
    store.on(function () { self.render(); });
    this.render();
  }
  Kalendar.prototype.pomeri = function (n) {
    var m = new Date(this.mesec.getFullYear(), this.mesec.getMonth() + n, 1);
    var min = new Date(DANAS.getFullYear(), DANAS.getMonth(), 1);
    if (m < min) return;
    this.mesec = m; this.render();
  };
  Kalendar.prototype.pokazi = function (d) { this.mesec = new Date(d.getFullYear(), d.getMonth(), 1); this.render(); };
  Kalendar.prototype.render = function () {
    var ae = document.activeElement, imaoFokus = this.grid && this.grid.contains(ae), fd = imaoFokus && ae.dataset ? ae.dataset.d : null;
    var s = store.s, y = this.mesec.getFullYear(), m = this.mesec.getMonth();
    var mesEl = this.root.querySelector('#' + this.prefix + '-mes'), mesTxt = MESECI[m].charAt(0).toUpperCase() + MESECI[m].slice(1) + ' ' + y;
    if (mesEl.textContent !== mesTxt) mesEl.textContent = mesTxt;
    var prvi = new Date(y, m, 1), pomak = (prvi.getDay() + 6) % 7, brojDana = new Date(y, m + 1, 0).getDate();
    var html = '', i;
    for (i = 0; i < pomak; i++) html += '<span aria-hidden="true">' + new Date(y, m, i - pomak + 1).getDate() + '</span>';
    var tabCilj = null;
    for (i = 1; i <= brojDana; i++) {
      var d = new Date(y, m, i), cls = [], dis = false, stanje = 'slobodno';
      if (d < DANAS) { dis = true; cls.push('prosao'); stanje = 'prošao'; }
      else if (zauzeto(d)) {
        var mozeOdlazak = s.in && !s.out && d > s.in && opsegSlobodan(s.in, d);
        if (!mozeOdlazak) { dis = true; stanje = 'zauzeto'; } else stanje = 'moguć odlazak';
      }
      if (same(d, s.in) || same(d, s.out)) { cls.push('izabran'); stanje += same(d, s.in) ? ', dolazak' : ', odlazak'; }
      else if (s.in && s.out && d > s.in && d < s.out) cls.push('u-opsegu');
      html += '<button type="button" tabindex="-1" data-d="' + iso(d) + '"' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') +
        (dis ? ' aria-disabled="true"' : '') + ((same(d, s.in) || same(d, s.out)) ? ' aria-pressed="true"' : '') +
        ' aria-label="' + dugo(d) + ', ' + stanje + '">' + i + '</button>';
    }
    var ost = (7 - (pomak + brojDana) % 7) % 7;
    for (i = 1; i <= ost; i++) html += '<span aria-hidden="true">' + i + '</span>';
    this.grid.innerHTML = html;
    // jedan dan je u redosledu tastature (roving tabindex)
    var kandidat = [this.fokus, s.out, s.in, DANAS].filter(function (x) { return x && x.getMonth() === m && x.getFullYear() === y; })[0];
    var btn = kandidat ? this.grid.querySelector('[data-d="' + iso(kandidat) + '"]') : null;
    if (!btn || btn.getAttribute('aria-disabled') === 'true') btn = this.grid.querySelector('button:not([aria-disabled="true"])') || this.grid.querySelector('button');
    if (btn) btn.tabIndex = 0;
    if (imaoFokus) { var nb = fd ? this.grid.querySelector('[data-d="' + fd + '"]') : null; if (nb) { this.grid.querySelectorAll('button').forEach(function (x) { x.tabIndex = -1; }); nb.tabIndex = 0; nb.focus(); } else if (btn) btn.focus(); }
    var porEl = this.root.querySelector('.cal-poruka'), porTxt = s.msg || '';
    if (porEl.textContent !== porTxt) porEl.textContent = porTxt;
    var prev = this.root.querySelector('[data-m="-1"]');
    prev.disabled = (y === DANAS.getFullYear() && m === DANAS.getMonth());
  };
  Kalendar.prototype.tastatura = function (e) {
    var b = e.target.closest('button[data-d]'); if (!b) return;
    var d = new Date(b.dataset.d + 'T00:00:00'), n = null;
    switch (e.key) {
      case 'ArrowLeft': n = addDays(d, -1); break;
      case 'ArrowRight': n = addDays(d, 1); break;
      case 'ArrowUp': n = addDays(d, -7); break;
      case 'ArrowDown': n = addDays(d, 7); break;
      case 'Home': n = addDays(d, -((d.getDay() + 6) % 7)); break;
      case 'End': n = addDays(d, 6 - (d.getDay() + 6) % 7); break;
      case 'PageUp': n = new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28)); break;
      case 'PageDown': n = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)); break;
      default: return;
    }
    e.preventDefault();
    if (n < DANAS) n = DANAS;
    this.fokus = n;
    if (n.getMonth() !== this.mesec.getMonth() || n.getFullYear() !== this.mesec.getFullYear()) this.mesec = new Date(n.getFullYear(), n.getMonth(), 1);
    this.render();
    var t = this.grid.querySelector('[data-d="' + iso(n) + '"]');
    if (t) { this.grid.querySelectorAll('button').forEach(function (x) { x.tabIndex = -1; }); t.tabIndex = 0; t.focus(); }
  };

  /* ---------- rezervacija (u stranici ili u prozoru) ---------- */
  function Rezervacija(root, mode) {
    var p = 'r' + mode, self = this;
    this.root = root; this.mode = mode; this.p = p;
    var zatvori = mode === 'modal' ? '<button type="button" class="icon-btn" data-zatvori aria-label="Zatvori"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20"><path d="M4 4l12 12M16 4 4 16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>' : '';
    root.innerHTML =
      '<div class="booking-head">' +
        '<button type="button" class="icon-btn nazad" data-nazad aria-label="Nazad na datume" hidden><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:4px"><span class="korak" data-korak>Korak 1 od 2</span><h2 id="' + (mode === 'modal' ? 'dlg-naslov' : 'rez-naslov') + '" data-naslov>Kada dolazite?</h2></div>' + zatvori +
      '</div>' +
      '<div class="booking-body">' +
        '<div class="cal"></div>' +
        '<form class="forma" novalidate>' +
          '<div class="rezime"><div class="d"><span data-r="opseg">Izaberite dolazak i odlazak</span><small data-r="tip">od 95 € po noći</small></div><span class="iznos" data-r="iznos">—</span></div>' +
          '<div class="gosti"><span class="l"><span class="lab" id="' + p + '-g">Broj gostiju</span><span data-r="gosti">2 osobe</span></span>' +
            '<span class="stepper" role="group" aria-labelledby="' + p + '-g"><button type="button" data-g="-1" aria-label="Manje gostiju">−</button><button type="button" data-g="1" aria-label="Više gostiju">+</button></span></div>' +
          '<label class="cek"><span><input type="checkbox" data-late>Kasni izlaz do 15 h</span><span>+20 €</span></label>' +
          '<p class="obavezno">Polja sa * su obavezna.</p>' +
          '<div class="polje"><label for="' + p + '-ime" class="lab">Ime i prezime *</label><input id="' + p + '-ime" name="ime" type="text" autocomplete="name" required aria-describedby="' + p + '-ime-g"><span class="greska" id="' + p + '-ime-g"></span></div>' +
          '<div class="polje"><label for="' + p + '-tel" class="lab">Telefon *</label><input id="' + p + '-tel" name="telefon" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="' + p + '-tel-p ' + p + '-tel-g"><span class="pomoc" id="' + p + '-tel-p">Na primer 060 123 4567</span><span class="greska" id="' + p + '-tel-g"></span></div>' +
          '<div class="polje"><label for="' + p + '-mejl" class="lab">Mejl (nije obavezno)</label><input id="' + p + '-mejl" name="mejl" type="email" autocomplete="email" aria-describedby="' + p + '-mejl-g"><span class="greska" id="' + p + '-mejl-g"></span></div>' +
          '<button type="button" class="link-btn" data-poruka aria-expanded="false" aria-controls="' + p + '-por-w">+ Dodajte poruku vlasniku</button>' +
          '<div class="polje" id="' + p + '-por-w" hidden><label for="' + p + '-por" class="lab">Poruka (nije obavezno)</label><textarea id="' + p + '-por" name="poruka" rows="3"></textarea></div>' +
          '<p class="hp"><label>Ne popunjavajte <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>' +
          '<p class="forma-greska" role="alert" data-r="greska"></p>' +
          '<button type="submit" class="btn posalji">Pošaljite upit</button>' +
          '<p class="sitno">Upit stiže direktno vlasniku, bez provizije.</p>' +
        '</form>' +
      '</div>' +
      '<div class="dalje-wrap"><div class="rezime" style="border-bottom:0"><div class="d"><span data-r="opseg2">Izaberite dolazak i odlazak</span><small data-r="tip2">Najmanje 2 noći</small></div><span class="iznos" data-r="iznos2">—</span></div>' +
        '<button type="button" class="btn" style="min-height:52px" data-dalje>Dalje: vaši podaci</button></div>';

    this.kal = new Kalendar(root.querySelector('.cal'), p + 'k');
    this.korak(1);
    root.querySelectorAll('[data-g]').forEach(function (b) { b.addEventListener('click', function () { promeniGoste(+b.dataset.g); }); });
    root.querySelector('[data-poruka]').addEventListener('click', function () {
      var w = root.querySelector('#' + p + '-por-w'), open = w.hidden;
      w.hidden = !open; this.setAttribute('aria-expanded', String(open));
      if (open) root.querySelector('#' + p + '-por').focus();
    });
    root.querySelector('[data-dalje]').addEventListener('click', function () { self.dalje(); });
    root.querySelector('[data-nazad]').addEventListener('click', function () { self.korak(1); var h = root.querySelector('[data-naslov]'); h.setAttribute('tabindex', '-1'); h.focus(); });
    root.querySelector('[data-late]').addEventListener('change', function () { store.set({ late: this.checked }); });
    root.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); self.posalji(); });
    var z = root.querySelector('[data-zatvori]'); if (z) z.addEventListener('click', function () { Dijalog.zatvori(); });
    store.on(function () { self.osvezi(); });
    this.osvezi();
  }
  Rezervacija.prototype.korak = function (k) {
    this.k = k;
    this.root.classList.toggle('korak1', k === 1);
    this.root.classList.toggle('korak2', k === 2);
    var mob = MOB.matches;
    this.root.querySelector('[data-korak]').hidden = !mob;
    this.root.querySelector('[data-korak]').textContent = 'Korak ' + k + ' od 2';
    this.root.querySelector('[data-naslov]').textContent = (mob && k === 2) ? 'Vaši podaci' : 'Kada dolazite?';
    this.root.querySelector('[data-nazad]').hidden = !(mob && k === 2 && this.mode === 'modal');
    if (k === 2 && mob) { var f = this.root.querySelector('input[name="ime"]'); setTimeout(function () { f.focus(); }, 50); }
  };
  Rezervacija.prototype.dalje = function () {
    var s = store.s;
    if (!s.in || !s.out) { store.set({ msg: 'Izaberite dolazak i odlazak.' }); return; }
    if (this.mode === 'inline') Dijalog.otvori(document.activeElement, 2);
    else this.korak(2);
  };
  Rezervacija.prototype.osvezi = function () {
    var s = store.s, r = this.root, u = ukupno();
    var op = 'Izaberite dolazak i odlazak', tip = 'od 95 € po noći';
    if (s.in && !s.out) { op = 'Dolazak: ' + kratko(s.in); tip = 'Izaberite odlazak'; }
    if (s.in && s.out) { var l = noci(s.in, s.out); op = opsegTxt(s.in, s.out); tip = nociTxt(l.length) + ', ' + tipTxt(l) + (s.late ? ', kasni izlaz' : ''); }
    r.querySelector('[data-r="opseg"]').textContent = op; r.querySelector('[data-r="opseg2"]').textContent = op;
    r.querySelector('[data-r="tip"]').textContent = tip; var t2 = r.querySelector('[data-r="tip2"]'); t2.textContent = s.msg || (s.in && s.out ? tip : (s.in ? 'Izaberite odlazak' : 'Najmanje 2 noći')); t2.classList.toggle('upoz', !!s.msg);
    r.querySelector('[data-r="iznos"]').textContent = u == null ? '—' : eur(u);
    r.querySelector('[data-r="iznos2"]').textContent = u == null ? '—' : eur(u);
    r.querySelector('[data-r="gosti"]').textContent = gostiTxt(s.gosti);
    var st = r.querySelectorAll('[data-g]'); st[0].disabled = s.gosti <= 1; st[1].disabled = s.gosti >= 4;
    r.querySelector('[data-late]').checked = s.late;
  };
  Rezervacija.prototype.greska = function (name, txt) {
    var i = this.root.querySelector('[name="' + name + '"]'), g = this.root.querySelector('#' + i.id + '-g');
    if (txt) { i.setAttribute('aria-invalid', 'true'); g.textContent = txt; } else { i.removeAttribute('aria-invalid'); g.textContent = ''; }
    return !txt;
  };
  Rezervacija.prototype.posalji = function () {
    var r = this.root, s = store.s, self = this;
    var ime = r.querySelector('[name="ime"]').value.trim(), tel = r.querySelector('[name="telefon"]').value.trim(), mejl = r.querySelector('[name="mejl"]').value.trim();
    var ok = true, prvi = null;
    if (!this.greska('ime', ime.length < 2 ? 'Upišite ime i prezime.' : '')) { ok = false; prvi = prvi || 'ime'; }
    var cifre = tel.replace(/[^\d]/g, '');
    if (!this.greska('telefon', cifre.length < 8 ? 'Upišite ispravan broj telefona, na primer 060 123 4567.' : '')) { ok = false; prvi = prvi || 'telefon'; }
    if (!this.greska('mejl', mejl && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mejl) ? 'Proverite mejl adresu ili ostavite polje prazno.' : '')) { ok = false; prvi = prvi || 'mejl'; }
    var gr = r.querySelector('[data-r="greska"]');
    if (!s.in || !s.out) { gr.textContent = 'Izaberite dolazak i odlazak u kalendaru (najmanje 2 noći).'; if (MOB.matches) this.korak(1); return; }
    gr.textContent = '';
    if (!ok) { r.querySelector('[name="' + prvi + '"]').focus(); return; }
    var btn = r.querySelector('.posalji'); btn.disabled = true; btn.textContent = 'Šaljem…';
    var n = noci(s.in, s.out).length, u = ukupno();
    var data = { 'form-name': 'upit', 'bot-field': r.querySelector('[name="bot-field"]').value, dolazak: iso(s.in), odlazak: iso(s.out), noci: String(n), gosti: String(s.gosti), 'kasni-izlaz': s.late ? 'da' : 'ne', ukupno: u + ' EUR', ime: ime, telefon: tel, mejl: mejl, poruka: r.querySelector('[name="poruka"]').value.trim() };
    var body = Object.keys(data).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]); }).join('&');
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        var q = new URLSearchParams({ od: iso(s.in), do: iso(s.out), g: String(s.gosti), u: String(u) });
        window.location.href = '/hvala?' + q.toString();
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Pošaljite upit';
        gr.textContent = 'Slanje nije uspelo. Proverite internet vezu i pokušajte ponovo.';
        btn.focus();
      });
  };
  function promeniGoste(n) { var g = Math.max(1, Math.min(4, store.s.gosti + n)); if (g === store.s.gosti) return; store.set({ gosti: g }); najavi('Broj gostiju: ' + gostiTxt(g)); }

  /* ---------- prozor (dugme Rezervišite) ---------- */
  var Dijalog = {
    el: null, rez: null, opener: null,
    init: function () {
      this.el = document.querySelector('dialog.rez');
      if (!this.el) return;
      this.rez = new Rezervacija(this.el.querySelector('[data-booking="modal"]'), 'modal');
      var self = this;
      this.el.addEventListener('close', function () { document.documentElement.style.overflow = ''; if (self.opener && self.opener.focus) self.opener.focus(); });
      this.el.addEventListener('click', function (e) { if (e.target === self.el) self.zatvori(); });
    },
    otvori: function (opener, korak, fokusKalendar) {
      if (!this.el) return;
      this.opener = opener || document.activeElement;
      this.rez.korak(korak || 1);
      if (store.s.in) this.rez.kal.pokazi(store.s.in);
      document.documentElement.style.overflow = 'hidden';
      if (typeof this.el.showModal === 'function') this.el.showModal(); else this.el.setAttribute('open', '');
      var t = fokusKalendar ? this.el.querySelector('.cal-grid button[tabindex="0"]') : (korak === 2 ? this.el.querySelector('input[name="ime"]') : this.el.querySelector('[data-naslov]'));
      if (t) { if (!t.hasAttribute('tabindex') && t.tagName === 'H2') t.setAttribute('tabindex', '-1'); setTimeout(function () { t.focus(); }, 30); }
    },
    zatvori: function () { if (this.el && this.el.open) this.el.close(); }
  };

  /* ---------- kalkulator u prodajnom delu ---------- */
  function Kalkulator(root) {
    root.querySelectorAll('[data-open-cal]').forEach(function (b) { b.addEventListener('click', function () { Dijalog.otvori(b, 1, true); }); });
    root.querySelectorAll('[data-g]').forEach(function (b) { b.addEventListener('click', function () { promeniGoste(+b.dataset.g); }); });
    var late = root.querySelector('[data-k="late"]');
    late.addEventListener('change', function () { store.set({ late: late.checked }); });
    function render() {
      var s = store.s;
      root.querySelector('[data-k="in"]').textContent = s.in ? kratko(s.in) : 'Izaberite';
      root.querySelector('[data-k="out"]').textContent = s.out ? kratko(s.out) : 'Izaberite';
      root.querySelector('[data-k="gosti"]').textContent = gostiTxt(s.gosti);
      var st = root.querySelectorAll('[data-g]'); st[0].disabled = s.gosti <= 1; st[1].disabled = s.gosti >= 4;
      late.checked = s.late;
      var box = root.querySelector('[data-k="noci"]');
      if (s.in && s.out) {
        var l = noci(s.in, s.out), h = '', grupe = {};
        if (l.length <= 6) l.forEach(function (n) { var w = DANI[n.d.getDay()]; h += '<div><span>' + w.charAt(0).toUpperCase() + w.slice(1) + ' ' + n.d.getDate() + '. ' + MES_KR[n.d.getMonth()] + ', ' + (n.p.tip === 'vikend' ? 'vikend' : n.p.tip === 'sezona' ? 'sezona' : 'radni dan') + '</span><span>' + eur(n.p.c) + '</span></div>'; });
        else { l.forEach(function (n) { grupe[n.p.c] = (grupe[n.p.c] || 0) + 1; }); Object.keys(grupe).forEach(function (c) { h += '<div><span>' + nociTxt(grupe[c]) + ' × ' + c + ' €</span><span>' + eur(grupe[c] * c) + '</span></div>'; }); }
        box.innerHTML = h;
        root.querySelector('[data-k="ukupno-l"]').textContent = nociTxt(l.length) + ' ukupno';
      } else {
        box.innerHTML = '<div><span>' + (s.in ? 'Izaberite dan odlaska.' : 'Izaberite dolazak i odlazak da vidite cenu po noćima.') + '</span></div>';
        root.querySelector('[data-k="ukupno-l"]').textContent = 'Ukupno';
      }
      var u = ukupno(); root.querySelector('[data-k="ukupno"]').textContent = u == null ? '—' : eur(u);
    }
    store.on(render); render();
  }


  /* ---------- traka sa cenom: mali kalkulator ---------- */
  function Traka(root) {
    var cal = root.querySelector('[data-bar-cal]');
    cal.addEventListener('click', function () { Dijalog.otvori(cal, 1, true); });
    root.querySelectorAll('[data-bar-g]').forEach(function (b) { b.addEventListener('click', function () { promeniGoste(+b.dataset.barG); }); });
    function opsegKr(a, b) {
      if (a.getMonth() === b.getMonth()) return a.getDate() + '–' + b.getDate() + '. ' + MES_KR[b.getMonth()];
      return a.getDate() + '. ' + MES_KR[a.getMonth()] + ' – ' + b.getDate() + '. ' + MES_KR[b.getMonth()];
    }
    function render() {
      var s = store.s, u = ukupno(), ima = !!(s.in && s.out);
      root.classList.toggle('izabrano', ima);
      var n = ima ? noci(s.in, s.out).length : 0;
      root.querySelector('[data-bar="datumi"]').textContent = ima ? opsegKr(s.in, s.out) + (MOB.matches ? ' · ' + nociTxt(n) : '') : (s.in ? 'Dolazak ' + s.in.getDate() + '. ' + MES_KR[s.in.getMonth()] + ', izaberite odlazak' : 'Izaberite datume');
      root.querySelector('[data-bar="gosti"]').textContent = gostiTxt(s.gosti);
      var st = root.querySelectorAll('[data-bar-g]'); st[0].disabled = s.gosti <= 1; st[1].disabled = s.gosti >= 4;
      root.querySelector('[data-bar="noci"]').textContent = ima ? nociTxt(n) + (s.late ? ', kasni izlaz' : '') : '';
      root.querySelector('[data-bar="ukupno"]').textContent = u == null ? '' : eur(u);
      root.querySelector('[data-bar="uk-mob"]').innerHTML = u == null ? '' : '<b>' + eur(u) + '</b> ukupno';
    }
    store.on(render); render();
    MOB.addEventListener && MOB.addEventListener('change', render);
  }

  /* ---------- pokretanje ---------- */
  function start() {
    Dijalog.init();
    var inl = document.querySelector('[data-booking="inline"]');
    if (inl) new Rezervacija(inl, 'inline');
    var k = document.querySelector('.kalk'); if (k) Kalkulator(k);
    var tr = document.querySelector('.pricebar'); if (tr) Traka(tr);
    document.querySelectorAll('[data-open-booking]').forEach(function (b) { b.addEventListener('click', function () { Dijalog.otvori(b, (MOB.matches && store.s.in && store.s.out) ? 2 : 1); }); });
    MOB.addEventListener && MOB.addEventListener('change', function () { if (Dijalog.rez) Dijalog.rez.korak(Dijalog.rez.k); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.VrhRez = { store: store, otvori: function (o) { Dijalog.otvori(o, 1); } };
})();
