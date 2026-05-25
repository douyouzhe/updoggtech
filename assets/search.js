/* updoggtech site search — client-side, over /search-index.json */
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
})();
