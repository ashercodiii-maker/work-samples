// קרן אלקטרוניקה, כיוון ב «קרן»: התנהגות משותפת לכל העמודים. כל מה שמסומן data-demo נשאר בתוך ההדגמה.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const nis = n => n.toLocaleString('he-IL');

  // toast
  const toast = $('#toast'); let tt;
  const say = (html, ms = 3400) => { if (!toast) return; toast.innerHTML = html; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), ms); };

  // cart badge (demo, kept in this browser only)
  const cartBtn = $('.cart'), cartN = cartBtn && $('b', cartBtn);
  let cart = parseInt(store.get('keren-demo-cart') || '0', 10) || 0;
  const paintCart = () => { if (!cartBtn) return; cartN.textContent = cart; cartBtn.setAttribute('aria-label', `סל הקניות, ${cart} פריטים`); };
  const addToCart = n => { cart += n; store.set('keren-demo-cart', String(cart)); paintCart(); cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); };
  paintCart();

  // demo links: nothing leaves the page
  const msgs = {
    cart: () => `כאן ייפתח סל הקניות (יש בו עכשיו ${cart} פריטים)`,
    search: 'כאן ייפתח החיפוש באתר',
    product: 'כאן ייפתח עמוד הדגם. בהדגמה בנינו עמוד מוצר אחד: BOOX Go 7 Color Gen II',
    accessories: 'כאן תיפתח קטגוריית האביזרים',
    ru: 'כאן ייפתח האתר ברוסית',
    whatsapp: 'כאן תיפתח שיחת וואטסאפ עם מיכאל',
    waze: 'כאן ייפתח הניווט ב-Waze',
    maps: 'כאן תיפתח המפה של Google',
    gps: 'כאן תיפתח קטגוריית GPS ורחפנים',
    tel: 'כאן תתחיל שיחת טלפון לחנות',
    mail: 'כאן ייפתח מייל לחנות',
    zap: 'כאן ייפתח עמוד חוות הדעת בזאפ',
    pay: 'כאן ממשיכים לעמוד התשלום המאובטח'
  };
  document.addEventListener('click', e => {
    const d = e.target.closest('[data-demo]');
    if (!d) return;
    e.preventDefault();
    const m = msgs[d.dataset.demo];
    say('<b>הדגמה:</b> בגרסה הסופית ' + (typeof m === 'function' ? m() : (m || 'כאן ייפתח העמוד המתאים')) + '.');
  });

  // header shadow
  const hdr = $('#hdr');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // drawer
  const drawer = $('#drawer'), menuBtn = $('.menu-btn');
  if (drawer && menuBtn) {
    const openDrawer = open => {
      menuBtn.setAttribute('aria-expanded', open);
      drawer.setAttribute('aria-hidden', !open);
      if (open) { drawer.classList.add('open'); requestAnimationFrame(() => drawer.classList.add('vis')); $('.close', drawer).focus(); }
      else { drawer.classList.remove('vis'); setTimeout(() => drawer.classList.remove('open'), 350); menuBtn.focus(); }
    };
    menuBtn.addEventListener('click', () => openDrawer(true));
    drawer.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target.closest('.panel a')) openDrawer(false); });
    addEventListener('keydown', e => {
      if (!drawer.classList.contains('open')) return;
      if (e.key === 'Escape') openDrawer(false);
      if (e.key === 'Tab') { // keep focus inside the open menu
        const f = $$('a,button', $('.panel', drawer)), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  // reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  // star divider turns with scroll
  const star = $('#rayStar');
  if (star && !reduce) addEventListener('scroll', () => { star.style.transform = `rotate(${scrollY * .25}deg)`; }, { passive: true });

  // floating WhatsApp waits until the page's own call to action scrolls away
  const fab = $('.fab');
  if (fab) {
    const anchor = $('[data-fab-hide]');
    if (!anchor) fab.classList.remove('away');
    else new IntersectionObserver(([en]) => fab.classList.toggle('away', en.isIntersecting || en.boundingClientRect.top > innerHeight)).observe(anchor);
  }

  // colour swatches on product cards
  $$('.sw').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const img = g.parentElement.querySelector('img');
    $$('button', g).forEach(x => x.setAttribute('aria-pressed', x === b));
    img.style.opacity = .2;
    setTimeout(() => {
      img.srcset = `assets/img/${b.dataset.src}-440.webp 440w, assets/img/${b.dataset.src}-880.webp 880w`;
      img.src = `assets/img/${b.dataset.src}-440.webp`;
      img.alt = img.alt.replace(/בצבע \S+/, 'בצבע ' + b.getAttribute('aria-label'));
      img.onload = () => { img.style.opacity = 1; };
    }, 160);
  }));

  // gentle 3D tilt on product cards (mouse only)
  const tilt = card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  };
  if (!reduce && fine) $$('.card').forEach(tilt);

  // home chooser: filter by need
  const chooser = $('#choose .cards');
  if (chooser) {
    const chips = $$('#choose .chip'), cards = $$('.card', chooser), count = $('#count');
    const filter = f => {
      chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.f === f));
      let n = 0;
      cards.forEach(card => {
        const show = f === 'all' || card.dataset.tags.split(' ').includes(f);
        if (show) { n++; card.hidden = false; requestAnimationFrame(() => card.classList.remove('out')); }
        else { card.classList.add('out'); setTimeout(() => { if (card.classList.contains('out')) card.hidden = true; }, reduce ? 0 : 320); }
      });
      count.textContent = `מוצגים ${n} דגמים`;
    };
    chips.forEach(c => c.addEventListener('click', () => filter(c.dataset.f)));
  }

  // category: need + screen size + sort, kept in the address bar
  const grid = $('#grid');
  if (grid) {
    const cards = $$('.card', grid), count = $('#count'), empty = $('#empty');
    const sizeOf = c => parseFloat(c.dataset.size), priceOf = c => parseInt(c.dataset.price, 10);
    const inSize = (c, s) => s === 'all' || (s === '7' ? sizeOf(c) <= 7 : s === '10' ? sizeOf(c) === 10.3 : sizeOf(c) === 13.3);
    const sorters = { rec: (a, b) => a.dataset.rank - b.dataset.rank, low: (a, b) => priceOf(a) - priceOf(b), high: (a, b) => priceOf(b) - priceOf(a), size: (a, b) => sizeOf(a) - sizeOf(b) || priceOf(a) - priceOf(b) };
    const q = new URLSearchParams(location.search);
    const fv = $$('.toolbar [data-f]').map(b => b.dataset.f), sv = $$('.toolbar [data-s]').map(b => b.dataset.s);
    const st = { f: fv.includes(q.get('f')) ? q.get('f') : 'all', s: sv.includes(q.get('s')) ? q.get('s') : 'all', o: Object.hasOwn(sorters, q.get('o') || '') ? q.get('o') : 'rec' };
    const sortSel = $('#sort');
    const apply = (first) => {
      $$('[data-f]', $('.toolbar')).forEach(b => b.setAttribute('aria-pressed', b.dataset.f === st.f));
      $$('[data-s]', $('.toolbar')).forEach(b => b.setAttribute('aria-pressed', b.dataset.s === st.s));
      sortSel.value = st.o;
      [...cards].sort(sorters[st.o]).forEach(c => grid.appendChild(c));
      let n = 0;
      cards.forEach(c => {
        const show = (st.f === 'all' || c.dataset.tags.split(' ').includes(st.f)) && inSize(c, st.s);
        if (show) { n++; c.hidden = false; requestAnimationFrame(() => c.classList.remove('out')); }
        else if (first || reduce) { c.classList.add('out'); c.hidden = true; }
        else { c.classList.add('out'); setTimeout(() => { if (c.classList.contains('out')) c.hidden = true; }, 320); }
      });
      count.textContent = n === 1 ? 'מוצג דגם אחד' : `מוצגים ${n} דגמים`;
      empty.hidden = n > 0;
      const p = new URLSearchParams();
      if (st.f !== 'all') p.set('f', st.f);
      if (st.s !== 'all') p.set('s', st.s);
      if (st.o !== 'rec') p.set('o', st.o);
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
      $$('.frame').forEach(fr => fr.classList.toggle('on', fr.dataset.frame === st.s));
      $$('.size-list button').forEach(b => b.classList.toggle('on', b.dataset.sizeBtn === st.s));
    };
    $('.toolbar').addEventListener('click', e => {
      const b = e.target.closest('[data-f],[data-s]'); if (!b) return;
      if (b.dataset.f) st.f = b.dataset.f; else st.s = b.dataset.s;
      apply();
    });
    sortSel.addEventListener('change', () => { st.o = sortSel.value; apply(); });
    $$('[data-clear]').forEach(b => b.addEventListener('click', () => { st.f = 'all'; st.s = 'all'; apply(); $('#grid-h').focus(); }));
    // size guide: hover shows the frame, click filters the grid
    $$('.size-list button').forEach(b => {
      const fr = $(`.frame[data-frame="${b.dataset.sizeBtn}"]`);
      const on = v => fr && fr.classList.toggle('on', v || st.s === b.dataset.sizeBtn);
      b.addEventListener('pointerenter', () => on(true)); b.addEventListener('pointerleave', () => on(false));
      b.addEventListener('focus', () => on(true)); b.addEventListener('blur', () => on(false));
      b.addEventListener('click', () => {
        st.s = b.dataset.sizeBtn; apply();
        $('#models').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        setTimeout(() => $('#grid-h').focus({ preventScroll: true }), reduce ? 0 : 500);
      });
    });
    apply(true);
  }

  // home: front-light slider
  const temp = $('#temp');
  if (temp) {
    const out = $('#tempOut'), lp = $('#lightPhoto');
    const setT = () => { const t = temp.value / 100; lp.style.setProperty('--t', t); const w = t < .34 ? 'קר' : t < .67 ? 'ניטרלי' : 'חם'; out.textContent = w; temp.setAttribute('aria-valuetext', w); };
    temp.addEventListener('input', setT); setT();
  }

  // home: hero video, the real store photo panning. Loaded after first paint, never with reduced motion or data saver
  const v = $('#heroVideo');
  if (v) {
    const vt = $('#vt'), poster = $('#heroPoster');
    const saveData = navigator.connection && navigator.connection.saveData;
    if (!reduce && !saveData) {
      const tall = matchMedia('(max-width:760px)').matches;
      addEventListener('load', () => {
        const ext = v.canPlayType('video/webm; codecs="vp9"') ? 'webm' : 'mp4';
        v.src = 'assets/video/store-' + (tall ? 'tall' : 'wide') + '.' + ext;
        v.addEventListener('playing', () => { poster.style.opacity = 0; vt.hidden = false; }, { once: true });
        v.play().catch(() => {});
      });
      let userPaused = false;
      vt.addEventListener('click', () => {
        userPaused = !v.paused;
        if (v.paused) { v.play(); vt.setAttribute('aria-pressed', 'false'); $('#vtLabel').textContent = 'עצירת הסרטון'; $('#vtIcon').setAttribute('d', 'M3 2h3v10H3zM8 2h3v10H8z'); }
        else { v.pause(); vt.setAttribute('aria-pressed', 'true'); $('#vtLabel').textContent = 'הפעלת הסרטון'; $('#vtIcon').setAttribute('d', 'M3 1.5l9 5.5-9 5.5z'); }
      });
      new IntersectionObserver(([en]) => { if (!v.src || userPaused) return; en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v);
    }
  }

  // demo forms: real validation, nothing is sent
  $$('form[data-demo-form]').forEach(f => {
    const errBox = $('.err', f), okBox = $('.ok-msg', f);
    f.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true' && (e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim())) e.target.removeAttribute('aria-invalid'); });
    f.addEventListener('change', e => { if (e.target.type === 'checkbox' && e.target.checked) e.target.removeAttribute('aria-invalid'); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const req = $$('[required]', f);
      req.forEach(i => i.removeAttribute('aria-invalid'));
      const bad = req.filter(i => i.type === 'checkbox' ? !i.checked : i.type === 'tel' ? i.value.replace(/\D/g, '').length < 9 : !i.value.trim());
      if (bad.length) {
        bad.forEach(i => i.setAttribute('aria-invalid', 'true'));
        const b = bad[0];
        const name = b.type === 'checkbox' ? 'צריך לאשר את מדיניות הפרטיות כדי לשלוח' : b.type === 'tel' && b.value.trim() ? 'מספר הטלפון קצר מדי' : 'חסר עוד פרט: ' + (b.dataset.label || b.closest('label').firstChild.textContent.trim());
        if (errBox) { errBox.textContent = name + '.'; errBox.hidden = false; }
        if (okBox) okBox.hidden = true;
        b.focus();
        return;
      }
      if (errBox) errBox.hidden = true;
      if (okBox) { okBox.hidden = false; okBox.focus(); }
      say('<b>הדגמה:</b> ' + (f.dataset.demoForm || 'בגרסה הסופית הבקשה תגיע למיכאל, והוא יחזור אליכם.'), 4200);
    });
  });
  // file picker shows the chosen file, nothing is uploaded
  $$('input[type=file][data-show]').forEach(inp => inp.addEventListener('change', () => {
    const out = $('#' + inp.dataset.show); const f = inp.files && inp.files[0];
    out.textContent = f ? `נבחר: ${f.name}. בהדגמה הקובץ לא נשלח לשום מקום.` : 'אפשר לצרף תמונה אחת, עד 10MB.';
  }));

  // visit: prefill the model someone asked to see
  const modelField = $('#bk-model');
  if (modelField) {
    const models = { go7c: 'BOOX Go 7 Color Gen II' };
    const m = new URLSearchParams(location.search).get('model');
    if (m && models[m]) { modelField.value = models[m]; const r = $('input[name=what][value=read]'); if (r) r.checked = true; }
  }

  // opening hours: live status and today's row, by Israel time
  const statusEl = $('[data-hours]');
  if (statusEl || $('.hours [data-days]')) {
    const H = statusEl ? JSON.parse(statusEl.dataset.hours) : null;
    const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const part = t => now.find(p => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday'));
    const mins = parseInt(part('hour'), 10) % 24 * 60 + parseInt(part('minute'), 10);
    $$('.hours [data-days]').forEach(row => row.classList.toggle('today', row.dataset.days.split(' ').includes(String(day))));
    if (H) {
      const toM = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
      const names = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const t = H[day]; const label = $('span', statusEl);
      if (t && mins >= toM(t[0]) && mins < toM(t[1])) { statusEl.classList.add('open'); label.textContent = `פתוח עכשיו, עד ${t[1]}. מגיעים בתיאום מראש.`; }
      else {
        let d = day, k = 0, nextOpen = null;
        if (t && mins < toM(t[0])) nextOpen = [day, t[0]];
        while (!nextOpen && k < 7) { d = (d + 1) % 7; k++; if (H[d]) nextOpen = [d, H[d][0]]; }
        const when = nextOpen[0] === day ? 'היום' : nextOpen[0] === (day + 1) % 7 ? 'מחר' : `ביום ${names[nextOpen[0]]}`;
        label.textContent = `סגור עכשיו. נפתח ${when} ב-${nextOpen[1]}.`;
      }
    }
  }

  // product page
  const pdp = $('.pdp');
  if (pdp) {
    // gallery
    const slides = $('.slides'), sl = $$('.slide', slides), thumbs = $$('.thumbs button');
    const rtl = getComputedStyle(slides).direction === 'rtl';
    thumbs.forEach((t, i) => t.addEventListener('click', () => {
      slides.scrollTo({ left: (rtl ? -1 : 1) * i * slides.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
      thumbs.forEach(x => x.setAttribute('aria-current', x === t));
    }));
    const gio = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { const i = sl.indexOf(en.target); thumbs.forEach((x, j) => x.setAttribute('aria-current', i === j)); } }), { root: slides, threshold: .6 });
    sl.forEach(s => gio.observe(s));
    // add-ons, quantity, total (the total sits on the button and on the sticky bar)
    const base = parseInt(pdp.dataset.price, 10), qtyOut = $('#qty'), totalEl = $('#total'), stickyPrice = $('#stickyPrice'), sum = $('#addonsN'), live = $('#buyLive');
    let qty = 1;
    const addons = $$('.addon input');
    const paint = announce => {
      const picked = addons.filter(a => a.checked), extra = picked.reduce((s, a) => s + parseInt(a.dataset.price, 10), 0);
      const tot = nis(base * qty + extra) + ' ₪';
      qtyOut.textContent = qty;
      totalEl.textContent = tot;
      if (stickyPrice) stickyPrice.textContent = tot;
      sum.textContent = !picked.length ? 'עדיין לא נבחרו תוספות.' : `${picked.length === 1 ? 'נבחרה תוספת אחת' : `נבחרו ${picked.length} תוספות`}, ${nis(extra)} ₪. הן ייכנסו לסל יחד עם המכשיר.`;
      sum.classList.toggle('on', picked.length > 0);
      if (announce && live) live.textContent = `${announce}. סה״כ ${tot}`;
    };
    addons.forEach(a => a.addEventListener('change', () => paint(a.checked ? 'התוספת נבחרה' : 'התוספת הוסרה')));
    $('#qtyMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); paint(`כמות ${qty}`); });
    $('#qtyPlus').addEventListener('click', () => { qty = Math.min(5, qty + 1); paint(`כמות ${qty}`); });
    paint();
    const add = () => {
      const n = qty + addons.filter(a => a.checked).length;
      addToCart(n);
      say(`<b>הדגמה:</b> ${n === 1 ? 'פריט אחד נוסף' : n + ' פריטים נוספו'} לסל. בגרסה הסופית ממשיכים מכאן לתשלום מאובטח.`, 4200);
    };
    $$('[data-add]').forEach(b => b.addEventListener('click', add));
    // sticky buy bar once the main button has scrolled away
    const sticky = $('.sticky-buy'), buyRow = $('.buy-row'), foot = $('.site-footer');
    if (sticky && buyRow) {
      let pastBuy = false, atFoot = false;
      const upd = () => { const show = pastBuy && !atFoot; sticky.classList.toggle('show', show); document.body.classList.toggle('has-sticky', show); sticky.toggleAttribute('inert', !show); };
      new IntersectionObserver(([en]) => { pastBuy = !en.isIntersecting && en.boundingClientRect.top < 0; upd(); }).observe(buyRow);
      new IntersectionObserver(([en]) => { atFoot = en.isIntersecting; upd(); }).observe(foot);
      upd();
    }
  }

  // colour vs black-and-white comparison
  $$('.cmp').forEach(c => {
    const r = $('input', c);
    const set = () => { c.style.setProperty('--p', r.value + '%'); r.setAttribute('aria-valuetext', `${r.value}% מהמסך בצבע`); };
    r.addEventListener('input', set); set();
  });

  // repairs: steps fill in as you read them
  const steps = $('.steps');
  if (steps) {
    // progress only moves forward; when a whole row arrives at once (desktop) the steps light up one after another
    const wrap = steps.parentElement, items = $$('li', steps), fill = $('.fill', wrap);
    let shown = -1, target = -1, timer = null;
    const paint = () => {
      items.forEach((li, j) => li.classList.toggle('done', j <= shown));
      if (fill) wrap.style.setProperty('--prog', items.length > 1 ? Math.max(shown, 0) / (items.length - 1) : 1);
    };
    const step = () => { if (shown >= target) { timer = null; return; } shown++; paint(); timer = setTimeout(step, reduce ? 0 : 260); };
    const sio = new IntersectionObserver(es => {
      es.forEach(en => { if (en.isIntersecting) target = Math.max(target, items.indexOf(en.target)); });
      if (!timer && shown < target) step();
    }, { rootMargin: '-35% 0px -45% 0px' });
    items.forEach(li => sio.observe(li));
  }

  // legal pages: table of contents follows the reader
  const toc = $('.toc');
  if (toc) {
    const links = $$('a', toc), secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const tio = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-25% 0px -65% 0px' });
    secs.forEach(s => tio.observe(s));
  }
  $$('.toc-m a').forEach(a => a.addEventListener('click', () => { const d = a.closest('details'); if (d) d.open = false; }));
  const flagBtn = $('[data-flags]');
  if (flagBtn) flagBtn.addEventListener('click', () => {
    const fl = $$('.flag'), open = flagBtn.getAttribute('aria-pressed') !== 'true';
    fl.forEach(d => { d.open = open; });
    flagBtn.setAttribute('aria-pressed', open);
    $('span', flagBtn).textContent = open ? 'לסגור את כל ההערות' : 'לפתוח את כל ההערות';
  });
})();
