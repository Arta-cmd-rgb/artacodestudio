/* =============================================================
   artacodestudio — Interaction Layer
   Vanilla JS, no dependency. Semua animasi murni CSS.
   ============================================================= */
(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  /* ---------------------------------------------------------
     0. TAHUN
  --------------------------------------------------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     0b. PENJAGA FONT
     Judul hero dibuat ekstra besar HANYA kalau webfont display
     (Anton) benar-benar terpakai. Diukur langsung lebar teksnya:
     kalau lebar dengan "Anton" sama dengan lebar dengan font
     cadangan, berarti Anton tidak ada -> pakai ukuran kecil.
  --------------------------------------------------------- */
  (function fontGuard() {
    const root = document.documentElement;
    const apply = () => {
      if (root.classList.contains('fonts-ok')) return;
      try {
        const el = document.createElement('span');
        el.textContent = 'artacode';
        el.style.cssText =
          'position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;' +
          'text-transform:uppercase;font:400 100px/1 Anton,monospace';
        document.documentElement.appendChild(el);
        const withAnton = el.getBoundingClientRect().width;
        el.style.fontFamily = 'monospace';
        const withFallback = el.getBoundingClientRect().width;
        el.remove();
        if (Math.abs(withAnton - withFallback) > 0.5) root.classList.add('fonts-ok');
      } catch (e) { /* diamkan */ }
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
    else apply();
    setTimeout(apply, 3000);
  })();

  /* ---------------------------------------------------------
     1. LOADER
  --------------------------------------------------------- */
  (function loader() {
    const el = $('#loader');
    if (!el) return;
    const bar  = $('.loader__bar i', el);
    const num  = $('.loader__count', el);
    const body = document.body;

    document.querySelectorAll('[data-split]').forEach((s, i) => {
      const d = i * 110;
      s.style.setProperty('--d', d);
      if (s.parentElement) s.parentElement.style.setProperty('--d', d);
    });

    //_loader benar-benar menunggu window.load (gambar/font) + durasi minimum_,
    // jadi layar splash selalu terlihat, tidak kedip hitam kosong.
    const MIN_MS  = reduceMotion ? 0 : 1800;   // minimal tampil
    const MAX_MS  = 7000;                      // batas keras, anti nyangkut
    const t0      = performance.now();
    let p = 0, done = false, loaded = false;

    const render = () => {
      if (bar) bar.style.width = p + '%';
      if (num) num.textContent = String(Math.round(p)).padStart(3, '0');
    };

    if (document.readyState === 'complete') loaded = true;
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    function finish() {
      if (done) return;
      done = true;
      clearInterval(tick);
      p = 100; render();
      setTimeout(() => {
        body.classList.remove('is-loading');
        body.classList.add('is-ready');
        el.classList.add('is-done');
        setTimeout(() => { el.style.display = 'none'; startAll(); }, 520);
      }, 240);
    }

    const tick = setInterval(() => {
      if (done) return;
      const target = loaded ? 100 : 92;
      const step = p < 55 ? 7 + Math.random() * 11 : 2 + Math.random() * 5;
      p = Math.min(target, p + step);
      render();
      const elapsed = performance.now() - t0;
      if (p >= 100 && loaded && elapsed >= MIN_MS) finish();
    }, 120);

    // jaring pengaman: paksa selesai apa pun yang terjadi
    setTimeout(() => { if (!done) { loaded = true; finish(); } }, MAX_MS);

    function startAll() {
      initReveal();
      initCounters();
      initStepsLine();
      initHeroFloat();
      tickerBoot();
      initScrollSpy();
    }
    window.__startAll = startAll;
  })();

  /* fallback kalau DOM lamban */
  setTimeout(() => {
    const l = document.getElementById('loader');
    if (document.body.classList.contains('is-loading')) {
      if (l) l.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      if (l) l.style.display = 'none';
      window.__startAll?.();
    }
  }, 7500);

  /* ---------------------------------------------------------
     2. SCROLL REVEAL (IntersectionObserver)
  --------------------------------------------------------- */
  let revealObserver = null;
  function initReveal() {
    if (revealObserver) revealObserver.disconnect();

    $$('.reveal').forEach(el => {
      const d = el.dataset.delay;
      if (d) el.style.setProperty('--rv-delay', d);

      if (el.dataset.reveal === 'words') splitWords(el);
    });

    if (reduceMotion) {
      $$('.reveal').forEach(el => el.classList.add('is-in'));
      return;
    }

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    // elemen yang sudah di dalam viewport: tampilkan langsung (lebih tearuh,
    // tidak bergantung pada waktu observer)
    $$('.reveal:not(.is-in)').forEach(el => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh && r.bottom > 0) el.classList.add('is-in');
      else revealObserver.observe(el);
    });
  }

  /* pecah kata untuk animasi berurutan */
  function splitWords(el) {
    if (el.dataset.split === 'done') return;
    el.dataset.split = 'done';
    const isPunct = (s) => !/[A-Za-z0-9\u00C0-\u024F]/.test(s);
    const walk = (node) => {
      let last = null;   // kata terakhir di level ini (untuk tanda baca)
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part.trim()) { frag.appendChild(document.createTextNode(' ')); return; }
            // tanda baca (titik, koma) ditempel ke kata sebelumnya supaya
            // tidak jadi kotak sendiri / pindah baris
            if (last && isPunct(part)) { last.textContent += part; return; }
            const w = document.createElement('span');
            w.className = 'split-word';
            w.textContent = part;
            frag.appendChild(w);
            last = w;
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
          const inner = child.querySelectorAll('.split-word');
          last = inner.length ? inner[inner.length - 1] : null;
        }
      });
    };
    walk(el);
  }

  /* ---------------------------------------------------------
     3. COUNTER
  --------------------------------------------------------- */
  let counterObserver = null;
  function initCounters() {
    if (counterObserver) counterObserver.disconnect();
    counterObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        countUp(e.target);
        counterObserver.unobserve(e.target);
      });
    }, { threshold: 0.4 });

    $$('.count').forEach(el => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh && r.bottom > 0) countUp(el);
      else counterObserver.observe(el);
    });
  }

  function countUp(el) {
    const to = parseFloat(el.dataset.to || '0');
    const dur = 1600;
    if (reduceMotion) { el.textContent = to; return; }

    const start = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.textContent = to;
    };
    // jaring pengaman: pastikan angka final muncul walau rAF tertahan
    const guard = setTimeout(finish, dur + 250);

    const step = (now) => {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(to * eased);
      if (t < 1) requestAnimationFrame(step);
      else { clearTimeout(guard); finish(); }
    };
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------
     4. SCROLL: progress bar, header, scroll-top, parallax
  --------------------------------------------------------- */
  const header   = $('#header');
  const progBar  = $('#progressBar');
  const scrollTop = $('#scrollTop');
  const stepsLine = $('#stepsLine');

  let lastY = window.scrollY, ticking = false;
  const parallaxEls = $$('[data-parallax]');

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    if (progBar) progBar.style.width = clamp(y / max, 0, 1) * 100 + '%';

    if (header) {
      header.classList.toggle('is-stuck', y > 40);
      if (y > 420 && y > lastY) header.classList.add('is-hidden');
      else header.classList.remove('is-hidden');
    }

    if (scrollTop) scrollTop.classList.toggle('is-on', y > 700);

    document.body.classList.toggle('has-mobar', y > 420);

    // parallax
    if (!reduceMotion) {
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0;
        const rect = el.getBoundingClientRect();
        const off = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        el.style.transform = `translate3d(0, ${off.toFixed(2)}px, 0)`;
      });
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (scrollTop) {
    scrollTop.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    );
  }

  /* ---------------------------------------------------------
     5. TICKER (marquee tak berujung)
  --------------------------------------------------------- */
  function tickerBoot() {
    ['#tickerRow', '#tickerRow2'].forEach(sel => {
      const row = $(sel);
      if (!row) return;
      const set = row.firstElementChild;
      if (!set) return;
      const w = set.getBoundingClientRect().width;
      if (!w) return;
      const need = Math.ceil((window.innerWidth * 2) / w) + 1;
      for (let i = 0; i < need; i++) {
        const clone = set.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        row.appendChild(clone);
      }

      let pos = 0, last = 0, speed = 0.6;
      const rev = row.classList.contains('ticker__row--rev');
      const step = (now) => {
        const dt = Math.min(48, now - last); last = now;
        pos -= (dt / 1000) * 60 * speed;
        if (pos <= -w) pos += w;
        row.style.transform = `translate3d(${pos}px,0,0)`;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);

      // hover speed up
      const wrap = row.parentElement;
      wrap.addEventListener('mouseenter', () => speed = 2.2);
      wrap.addEventListener('mouseleave', () => speed = 0.6);
    });
  }

  /* ---------------------------------------------------------
     6. STEPS LINE (gambar garis proses saat scroll)
  --------------------------------------------------------- */
  function initStepsLine() {
    if (!stepsLine) return;
    const steps = $('.steps');
    if (!steps) return;

    const update = () => {
      const rect = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height;
      const passed = clamp((vh * 0.72 - rect.top) / total, 0, 1);
      stepsLine.style.width = (passed * 100) + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  /* ---------------------------------------------------------
     7. HERO 3D PARALLAX (teks jauh, foto dekat)
  --------------------------------------------------------- */
  function initHeroFloat() {
    const scene = $('#stackScene') || $('.hero');
    if (!scene || isTouch || reduceMotion) return;

    const layers = $$('[data-depth]', scene).map(el => ({
      el, k: parseFloat(el.dataset.depth) / 100
    }));
    const hero = $('.hero');
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    function paint() {
      layers.forEach(L => {
        L.el.style.transform =
          `translate3d(${(cx * L.k * 100).toFixed(2)}px, ${(-cy * L.k * 100).toFixed(2)}px, 0)`;
      });
    }
    function loop() {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      paint();
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) raf = requestAnimationFrame(loop);
      else { raf = null; paint(); }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      ty = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      kick();
    }, { passive: true });
    hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; kick(); });
  }

  /* ---------------------------------------------------------
     8. CUSTOM CURSOR (desktop only)
  --------------------------------------------------------- */
  (function cursor() {
    const cur = $('#cursor');
    if (!cur || isTouch || reduceMotion) { cur?.remove(); return; }

    const label = $('.cursor__label', cur);
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let cx = x, cy = y, raf = null;

    window.addEventListener('mousemove', e => {
      x = e.clientX; y = e.clientY;
      cur.classList.add('is-on');
      if (!raf) loop();
    }, { passive: true });

    document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    document.addEventListener('mouseenter', () => cur.classList.add('is-on'));

    function loop() {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      cur.style.transform = `translate3d(${cx - 6}px, ${cy - 6}px, 0)`;
      raf = requestAnimationFrame(loop);
    }

    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor], a, button, .card, .deck__card, .chip span');
      if (!t) { cur.classList.remove('is-big'); if (label) label.textContent = ''; return; }
      cur.classList.add('is-big');
      if (label) label.textContent = t.dataset.cursor || '';
    });
  })();

  /* ---------------------------------------------------------
     9. MAGNETIC BUTTON
  --------------------------------------------------------- */
  if (!isTouch && !reduceMotion) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    /* tilt kartu layanan */
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     10. NAV (mobile overlay + scroll spy)
  --------------------------------------------------------- */
  (function nav() {
    const burger = $('#burger');
    const navEl  = $('#nav');
    const close  = $('#navClose');
    if (!burger || !navEl) return;

    let lockY = 0, locked = false;

    // Kunci scroll halaman selama menu hamburger terbuka.
    // body diposisikan fixed supaya iOS ikut berhenti menggulir.
    function lockScroll() {
      if (locked) return;
      lockY = window.scrollY || window.pageYOffset || 0;
      locked = true;
      document.documentElement.classList.add('is-locked');
      document.body.classList.add('no-scroll');
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    function unlockScroll() {
      if (!locked) return;
      locked = false;
      document.documentElement.classList.remove('is-locked');
      document.body.classList.remove('no-scroll');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';

      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, lockY);
      root.style.scrollBehavior = prev;
    }

    const open = () => {
      if (document.body.classList.contains('nav-open')) return;
      lockScroll();
      document.body.classList.add('nav-open');
      navEl.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      navEl.scrollTop = 0;
      header?.classList.remove('is-hidden');
    };
    const shut = () => {
      const wasOpen = document.body.classList.contains('nav-open');
      document.body.classList.remove('nav-open');
      navEl.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      if (wasOpen) unlockScroll();
    };

    burger.addEventListener('click', () =>
      document.body.classList.contains('nav-open') ? shut() : open());
    close?.addEventListener('click', shut);
    $$('a', navEl).forEach(a => a.addEventListener('click', shut));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });

    // kalau HP di-rotate / layar membesar, pastikan menu tertutup
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) shut();
    }, { passive: true });

    window.__navShut = shut;
  })();

  function initScrollSpy() {
    const links = $$('.nav__list a');
    const secs  = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if (!secs.length) return;

    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l =>
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => spy.observe(s));

    // mobile bottom bar
    const mob = $$('.mobar__item');
    const mobSpy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        mob.forEach(m =>
          m.classList.toggle('is-active', m.dataset.mob === en.target.id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['layanan', 'karya', 'kontak'].map(id => document.getElementById(id))
      .filter(Boolean).forEach(s => mobSpy.observe(s));
  }

  /* ---------------------------------------------------------
     11. CAROUSEL (dipakai karya)
  --------------------------------------------------------- */
  function makeCarousel(viewport, opts) {
    opts = opts || {};
    const track  = opts.track || viewport.firstElementChild;
    const slides = Array.from(track.children);
    if (slides.length < 1) return null;

    let i = 0, x0 = null, auto = null;

    const dotsWrap = opts.dots;
    const dots = slides.map((_, n) => {
      if (!dotsWrap) return null;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (opts.label || 'Slide') + ' ' + (n + 1));
      b.addEventListener('click', () => go(n));
      dotsWrap.appendChild(b);
      return b;
    });

    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1)';
      track.style.transform = `translate3d(${-i * 100}%,0,0)`;
      dots.forEach((d, k) => d && d.classList.toggle('is-on', k === i));
      slides.forEach((sl, k) => sl.setAttribute('aria-hidden', k !== i));
      if (opts.onChange) opts.onChange(i);
    }

    /* swipe / drag */
    const down = ev => {
      x0 = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      viewport.classList.add('is-drag');
    };
    const up = ev => {
      viewport.classList.remove('is-drag');
      if (x0 === null) return;
      const x = (ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX);
      const dx = x - x0;
      if (Math.abs(dx) > 48) go(dx < 0 ? i + 1 : i - 1);
      x0 = null;
    };
    viewport.addEventListener('touchstart', down, { passive: true });
    viewport.addEventListener('touchend', up, { passive: true });
    viewport.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);

    /* autoplay (opsional) */
    if (opts.autoplay) {
      auto = setInterval(() => go(i + 1), opts.autoplay);
      const stop = () => clearInterval(auto);
      const box = viewport.closest('[data-carousel]') || viewport;
      box.addEventListener('mouseenter', stop);
      box.addEventListener('mouseleave', () => { auto = setInterval(() => go(i + 1), opts.autoplay); });
    }

    go(0);
    return { go, next: () => go(i + 1), prev: () => go(i - 1), get index() { return i; }, count: slides.length };
  }

  /* ---------------------------------------------------------
     13. DECK KARYA (tumpukan 3D) + MODAL DETAIL
  --------------------------------------------------------- */
  const DECKS = $$('.deck__card');

  const deckState = { i: 0, n: DECKS.length };

  function deckPaint() {
    const { i, n } = deckState;
    DECKS.forEach((c, k) => {
      let d = k - i;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const a = Math.abs(d);
      const dir = d === 0 ? 0 : (d > 0 ? 1 : -1);

      let t, z, op;
      if (a === 0)      { t = 'translate3d(0,0,20px) scale(1.05)'; z = 60; op = 1; }
      else if (a === 1) { t = `translate3d(${dir * 56}%,0,-90px) scale(.82) rotateY(${-dir * 20}deg)`; z = 40; op = .72; }
      else if (a === 2) { t = `translate3d(${dir * 98}%,0,-190px) scale(.66) rotateY(${-dir * 28}deg)`; z = 20; op = .38; }
      else              { t = `translate3d(${dir * 122}%,0,-260px) scale(.58) rotateY(${-dir * 32}deg)`; z = 5; op = 0; }

      c.style.transform = t;
      c.style.zIndex = z;
      c.style.opacity = op;
      c.style.filter = a === 0 ? 'none' : 'brightness(.86)';
      c.style.pointerEvents = op < .2 ? 'none' : 'auto';
      c.setAttribute('aria-selected', d === 0 ? 'true' : 'false');
    });
  }

  function deckInfo(k) {
    const c = DECKS[k];
    if (!c) return;
    const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
    set('#deckTitle', c.dataset.title);
    set('#deckDesc', c.dataset.desc);
    set('#deckTags', c.dataset.tags.split('|').map(t => `<li>${t}</li>`).join(''));
    const cnt = $('#deckCount');
    if (cnt) cnt.textContent = String(k + 1).padStart(3, '0');
  }

  function deckGo(k) {
    const { n } = deckState;
    deckState.i = ((k % n) + n) % n;
    deckPaint();
    deckInfo(deckState.i);
  }

  let modalIdx = 0, lastFocus = null;

  function openModal(k) {
    const c = DECKS[k];
    if (!c) return;
    lastFocus = document.activeElement;
    modalIdx = k;
    fillModal(k);
    const m = $('#pModal');
    m.classList.add('is-on');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    $('#pmClose').focus();
  }

  function fillModal(k) {
    const n = DECKS.length;
    modalIdx = ((k % n) + n) % n;
    const c = DECKS[modalIdx];
    const img = $('#pmImg');
    const media = $('#pmMedia');
    img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    img.src = c.dataset.src;
    img.alt = 'Proyek ' + c.dataset.title;
    if (media) {
      media.classList.remove('pm__media--p34', 'pm__media--p916');
      if (c.dataset.ratio === '3/4') media.classList.add('pm__media--p34');
      else if (c.dataset.ratio === '9/16') media.classList.add('pm__media--p916');
    }
    $('#pmNum').textContent =
      String(modalIdx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    $('#pmCat').textContent = c.dataset.cat;
    $('#pmTitle').textContent = c.dataset.title;
    $('#pmDesc').textContent = c.dataset.desc;
    $('#pmTags').innerHTML = c.dataset.tags.split('|').map(t => '<li>' + t + '</li>').join('');
    deckGo(modalIdx);
  }

  function closeModal() {
    const m = $('#pModal');
    m.classList.remove('is-on');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  (function deck() {
    const wrap = $('#deck');
    if (!wrap || !DECKS.length) return;

    DECKS.forEach((c, k) => {
      c.addEventListener('click', () => openModal(k));
      c.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(k); }
      });
    });

    $('#deckNext').addEventListener('click', () => deckGo(deckState.i + 1));
    $('#deckPrev').addEventListener('click', () => deckGo(deckState.i - 1));

    /* swipe / drag */
    let x0 = null, moved = 0;
    wrap.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; moved = 0; }, { passive: true });
    wrap.addEventListener('touchmove', e => {
      if (x0 === null) return;
      moved = Math.abs(e.touches[0].clientX - x0);
    }, { passive: true });
    wrap.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40 && moved < 12) deckGo(deckState.i + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });

    wrap.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); deckGo(deckState.i + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); deckGo(deckState.i - 1); }
    });

    // klik area kiri/kanan deck untuk pindah
    wrap.addEventListener('click', e => {
      if (e.target.closest('.deck__card')) return;
      const r = wrap.getBoundingClientRect();
      deckGo(deckState.i + (e.clientX < r.left + r.width / 2 ? -1 : 1));
    });

    deckGo(0);
  })();

  (function projectModal() {
    const m = $('#pModal');
    if (!m || !DECKS.length) return;

    $('#pmClose').addEventListener('click', closeModal);
    $('#pmNext').addEventListener('click', () => fillModal(modalIdx + 1));
    $('#pmPrev').addEventListener('click', () => fillModal(modalIdx - 1));
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });

    document.addEventListener('keydown', e => {
      if (!m.classList.contains('is-on')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') fillModal(modalIdx + 1);
      if (e.key === 'ArrowLeft')  fillModal(modalIdx - 1);
      if (e.key === 'Tab') {
        const f = $$('button, a[href]', m).filter(el => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    let x0 = null;
    m.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    m.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) fillModal(modalIdx + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  })();

  /* ---------------------------------------------------------
     14. TEMA TERANG / GELAP
  --------------------------------------------------------- */
  (function invert() {
    const btn = $('#invertToggle');
    if (!btn) return;
    const KEY = 'arta-invert';

    if (localStorage.getItem(KEY) === '1') document.body.classList.add('is-invert');

    function syncAria() {
      const on = document.body.classList.contains('is-invert');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    }

    syncAria();
    btn.addEventListener('click', () => {
      const on = document.body.classList.toggle('is-invert');
      localStorage.setItem(KEY, on ? '1' : '0');
      syncAria();
    });
  })();

  /* ---------------------------------------------------------
     17. SMOOTH ANCHOR dengan header offset
  --------------------------------------------------------- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id) return;
      if (id === '#') { e.preventDefault(); return; }
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      window.__navShut?.();
      const top = target.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------------------------------------------------------
     18. ANIMASI KLIK: RIPPLE BULAT
  --------------------------------------------------------- */
  if (!reduceMotion) {
    document.addEventListener('pointerdown', e => {
      const host = e.target.closest('.btn, .soc, .snav, .filter, .mobar__item');
      if (!host) return;
      const r = host.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.1;
      const sp = document.createElement('span');
      sp.style.cssText = `position:absolute;left:${e.clientX - r.left - size / 2}px;top:${
        e.clientY - r.top - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;
        background:var(--inv);transform:scale(0);opacity:.35;pointer-events:none;
        transition:transform .6s cubic-bezier(.22,1,.36,1),opacity .6s;`;
      host.style.position = 'relative';
      host.style.overflow = 'hidden';
      host.appendChild(sp);
      requestAnimationFrame(() => {
        sp.style.transform = 'scale(1)';
        sp.style.opacity = '0';
      });
      setTimeout(() => sp.remove(), 650);
    });
  }

  /* ---------------------------------------------------------
     19. SMOOTH SCROLL DRIFT untuk wheel horizontal ticker
  --------------------------------------------------------- */
  window.addEventListener('load', () => {
    document.body.classList.add('is-ready');
  });
})();