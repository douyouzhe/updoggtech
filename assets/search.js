/* sdeoffer site search — client-side, over /search-index.json */
(function () {
  var input = document.getElementById('site-search');
  var box = document.getElementById('search-results');
  if (!input || !box) return;

  var index = null, loading = false;

  function load() {
    if (index || loading) return;
    loading = true;
    fetch('/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { index = data; render(input.value); })
      .catch(function () { loading = false; });
  }

  function score(e, q) {
    var t = (e.t || '').toLowerCase();
    if (t.indexOf(q) === 0) return 0;                          // title starts with
    if (t.indexOf(q) !== -1) return 1;                         // title contains
    if ((e.s || '').toLowerCase().indexOf(q) !== -1) return 2; // section
    if ((e.d || '').toLowerCase().indexOf(q) !== -1) return 3; // description
    return -1;
  }

  function esc(s) {
    return (s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render(raw) {
    var q = (raw || '').trim().toLowerCase();
    if (!q || !index) { box.classList.remove('open'); box.innerHTML = ''; return; }
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var sc = score(index[i], q);
      if (sc >= 0) hits.push([sc, index[i]]);
    }
    hits.sort(function (a, b) { return a[0] - b[0]; });
    hits = hits.slice(0, 8);
    if (!hits.length) {
      box.innerHTML = '<div class="sr-empty">No results</div>';
      box.classList.add('open');
      return;
    }
    box.innerHTML = hits.map(function (h) {
      var e = h[1];
      return '<a class="sr-item" href="' + e.u + '">' +
             '<span class="sr-title">' + esc(e.t) + '</span>' +
             '<span class="sr-sec">' + esc(e.s) + '</span></a>';
    }).join('');
    box.classList.add('open');
  }

  input.addEventListener('focus', load);
  input.addEventListener('input', function () { render(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var first = box.querySelector('.sr-item');
      if (first) window.location.href = first.getAttribute('href');
    } else if (e.key === 'Escape') {
      box.classList.remove('open'); input.blur();
    }
  });
  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !box.contains(e.target)) box.classList.remove('open');
  });

  // ── ?q= deep-link handler (powers the WebSite SearchAction / sitelinks searchbox) ──
  try {
    var q0 = new URLSearchParams(location.search).get('q');  // landing via /?q=term
    if (q0) { input.value = q0; load(); input.focus(); }       // load() renders once index is ready
  } catch (e) { /* URLSearchParams unsupported — ignore */ }
})();

/* sdeoffer — site-wide UI: favicon, auto footer year, mobile nav (one file covers all pages) */
(function () {
  // ── favicon (inject site-wide) ──
  if (!document.querySelector('link[rel~="icon"]')) {
    var fav = document.createElement('link');
    fav.rel = 'icon'; fav.type = 'image/svg+xml'; fav.href = '/favicon.svg';
    document.head.appendChild(fav);
  }

  // ── Cloudflare Web Analytics(用已有站点 token;本地预览不上报)──
  var h = location.hostname;
  if (h !== 'localhost' && h !== '127.0.0.1' && !document.querySelector('script[src*="cloudflareinsights"]')) {
    var beacon = document.createElement('script');
    beacon.defer = true;
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.setAttribute('data-cf-beacon', '{"token":"93e8f646bc894e318d279abd0dc8fa18"}');
    document.head.appendChild(beacon);
  }

  // ── auto-update footer copyright year ──
  var copy = document.querySelector('.footer-copy');
  if (copy) copy.innerHTML = copy.innerHTML.replace(/20\d\d/, new Date().getFullYear());  // 旧硬编码 2024 -> 当前年

  // ── mobile nav (hamburger) ──
  var nav = document.querySelector('nav');
  var inner = nav && nav.querySelector('.nav-inner');
  if (!inner || inner.querySelector('.nav-toggle')) return;  // 无 nav 或已初始化则跳过

  var css = '.mobile-panel{display:contents;}'
    + '.nav-toggle{display:none;background:var(--bg3,#1e2535);border:1px solid var(--border,#2a3347);color:var(--text,#e2e8f0);width:40px;height:34px;border-radius:6px;cursor:pointer;font-size:18px;line-height:1;padding:0;}'
    + '@media(max-width:768px){'
    +   '.nav-toggle{display:inline-flex;align-items:center;justify-content:center;}'
    +   '.nav-inner .mobile-panel{display:none;}'
    +   'nav.mobile-open .mobile-panel{display:flex;flex-direction:column;align-items:flex-start;gap:6px;position:fixed;top:60px;left:0;right:0;background:rgba(14,17,23,0.98);backdrop-filter:blur(12px);border-bottom:1px solid var(--border,#2a3347);padding:16px 24px 20px;z-index:99;}'
    +   'nav.mobile-open .mobile-panel .nav-links{display:flex;flex-direction:column;width:100%;gap:2px;}'
    +   'nav.mobile-open .mobile-panel .nav-links a{padding:10px 0;}'
    +   'nav.mobile-open .mobile-panel .nav-search,nav.mobile-open .mobile-panel .nav-search input{width:100%;}'
    +   'nav.mobile-open .mobile-panel .nav-cta{width:100%;text-align:center;}'
    + '}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // 把可折叠项移入 panel(display:contents 保证桌面端布局不变)
  var panel = document.createElement('div'); panel.className = 'mobile-panel';
  ['.nav-links', '.nav-search', '.lang-switch', '.nav-cta'].forEach(function (sel) {
    var el = inner.querySelector(sel);
    if (el) panel.appendChild(el);
  });

  var btn = document.createElement('button');
  btn.className = 'nav-toggle'; btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle menu'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '☰';
  inner.appendChild(btn);
  inner.appendChild(panel);

  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('mobile-open');  // 切换移动菜单展开
    btn.innerHTML = open ? '✕' : '☰';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  panel.addEventListener('click', function (e) {
    if (e.target.closest('a')) { nav.classList.remove('mobile-open'); btn.innerHTML = '☰'; btn.setAttribute('aria-expanded', 'false'); }  // 点链接后收起
  });
})();
