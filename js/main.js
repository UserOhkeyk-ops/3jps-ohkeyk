/* 3JP's Ohkeyk — public site behavior (front-end only) */
document.addEventListener('DOMContentLoaded', function () {
  var data = Store.get();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hl(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) toggle.addEventListener('click', function () { nav.classList.toggle('open'); });

  /* ---------- Text size + bold controls (all pages) ---------- */
  var A11Y_KEY = 'ohkeyk_a11y';
  var SIZES = [0.9, 1, 1.15, 1.3, 1.5];
  var SIZE_NAMES = ['Small', 'Normal', 'Large', 'Extra large', 'Huge'];
  var a11y = { size: 1, bold: false };
  try { a11y = Object.assign(a11y, JSON.parse(localStorage.getItem(A11Y_KEY) || '{}')); } catch (e) {}

  function applyA11y() {
    document.documentElement.style.setProperty('--fs', SIZES[a11y.size]);
    document.documentElement.classList.toggle('bold-text', !!a11y.bold);
    try { localStorage.setItem(A11Y_KEY, JSON.stringify(a11y)); } catch (e) {}
    var label = document.getElementById('a11yLabel');
    if (label) label.textContent = SIZE_NAMES[a11y.size];
    var b = document.getElementById('a11yBold');
    if (b) b.setAttribute('aria-pressed', a11y.bold ? 'true' : 'false');
  }

  var headerWrap = document.querySelector('.site-header .container');
  if (headerWrap) {
    var wrap = document.createElement('div');
    wrap.className = 'a11y-wrap';
    wrap.innerHTML =
      '<button type="button" class="a11y-btn" id="a11yOpen" aria-expanded="false" aria-label="Text size and bold options"><b>A</b><span>a</span></button>' +
      '<div class="a11y-panel" id="a11yPanel" hidden>' +
        '<p class="a11y-title">Text size</p>' +
        '<div class="a11y-row">' +
          '<button type="button" id="a11yMinus" aria-label="Smaller text">A&minus;</button>' +
          '<span id="a11yLabel" aria-live="polite"></span>' +
          '<button type="button" id="a11yPlus" aria-label="Larger text">A+</button>' +
        '</div>' +
        '<button type="button" class="a11y-bold" id="a11yBold" aria-pressed="false">Bold text</button>' +
        '<button type="button" class="a11y-reset" id="a11yReset">Reset</button>' +
      '</div>';
    headerWrap.insertBefore(wrap, headerWrap.querySelector('.nav-toggle'));

    var panel = document.getElementById('a11yPanel');
    var openBtn = document.getElementById('a11yOpen');
    openBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      openBtn.setAttribute('aria-expanded', String(!panel.hidden));
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) { panel.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); }
    });
    document.getElementById('a11yMinus').addEventListener('click', function () { a11y.size = Math.max(0, a11y.size - 1); applyA11y(); });
    document.getElementById('a11yPlus').addEventListener('click', function () { a11y.size = Math.min(SIZES.length - 1, a11y.size + 1); applyA11y(); });
    document.getElementById('a11yBold').addEventListener('click', function () { a11y.bold = !a11y.bold; applyA11y(); });
    document.getElementById('a11yReset').addEventListener('click', function () { a11y = { size: 1, bold: false }; applyA11y(); });
  }
  applyA11y();

  /* ---------- Search form (header) ---------- */
  var form = document.getElementById('siteSearchForm');
  var input = document.getElementById('siteSearchInput');
  var grid = document.getElementById('productGrid');
  var onProducts = !!grid;
  var state = { q: '', cat: 'all', sort: 'default' };

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input ? input.value.trim() : '';
      if (onProducts) { state.q = q; syncUrl(); render(); }
      else window.location.href = 'products.html' + (q ? '?search=' + encodeURIComponent(q) : '');
    });
    if (input && onProducts) input.addEventListener('input', function () { state.q = input.value.trim(); syncUrl(); render(); });
  }

  function syncUrl() {
    var url = new URL(window.location.href);
    if (state.q) url.searchParams.set('search', state.q); else url.searchParams.delete('search');
    if (state.cat !== 'all') url.searchParams.set('cat', state.cat); else url.searchParams.delete('cat');
    window.history.replaceState({}, '', url);
  }

  /* ---------- Products page ---------- */
  function visibleProducts() {
    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var list = data.products.filter(function (p) {
      if (state.cat !== 'all' && p.category !== state.cat) return false;
      var hay = (p.name + ' ' + p.description + ' ' + Store.categoryName(p.category) + ' ' + p.price).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    if (state.sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (state.sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
    if (state.sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
    return { list: list, terms: terms };
  }

  function renderChips() {
    var chips = document.getElementById('catChips');
    if (!chips) return;
    var html = '<button type="button" class="chip' + (state.cat === 'all' ? ' active' : '') + '" data-cat="all">All <span>' + data.products.length + '</span></button>';
    data.categories.forEach(function (c) {
      var n = data.products.filter(function (p) { return p.category === c.id; }).length;
      html += '<button type="button" class="chip' + (state.cat === c.id ? ' active' : '') + '" data-cat="' + esc(c.id) + '">' + esc(c.name) + ' <span>' + n + '</span></button>';
    });
    chips.innerHTML = html;
  }

  function render() {
    if (!onProducts) return;
    var res = visibleProducts();
    renderChips();
    var note = document.getElementById('resultsNote');
    if (note) {
      if (state.q) {
        note.innerHTML = res.list.length
          ? 'Showing <b>' + res.list.length + '</b> result' + (res.list.length === 1 ? '' : 's') + ' for &ldquo;<b>' + esc(state.q) + '</b>&rdquo; &mdash; <button type="button" class="link-btn" id="clearSearch">Clear search</button>'
          : 'No products found for &ldquo;<b>' + esc(state.q) + '</b>&rdquo;. Try a different word, or <button type="button" class="link-btn" id="clearSearch">clear the search</button>.';
      } else {
        note.textContent = res.list.length + ' item' + (res.list.length === 1 ? '' : 's');
      }
    }
    grid.innerHTML = res.list.map(function (p) {
      return '<div class="product-card">' +
        '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        '<div class="pc-body">' +
          '<span class="pc-cat">' + esc(Store.categoryName(p.category)) + '</span>' +
          '<h3>' + hl(p.name, res.terms) + '</h3>' +
          '<p>' + hl(p.description, res.terms) + '</p>' +
          '<div class="pc-foot"><span class="price">' + Store.peso(p.price) + (p.priceNote ? ' ' + esc(p.priceNote) : '') + '</span>' +
          '<button type="button" class="btn btn-dark btn-small" data-order="' + esc(p.id) + '">Order</button></div>' +
        '</div></div>';
    }).join('');
    var clear = document.getElementById('clearSearch');
    if (clear) clear.addEventListener('click', function () { state.q = ''; if (input) input.value = ''; syncUrl(); render(); });
  }

  if (onProducts) {
    var params = new URLSearchParams(window.location.search);
    state.q = (params.get('search') || '').trim();
    var pc = params.get('cat');
    if (pc && data.categories.some(function (c) { return c.id === pc; })) state.cat = pc;
    if (input) input.value = state.q;

    document.getElementById('catChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      state.cat = b.getAttribute('data-cat');
      syncUrl(); render();
    });
    document.getElementById('sortSelect').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-order]');
      if (b) openOrder(b.getAttribute('data-order'));
    });
    render();
  }

  /* ---------- Home page: featured products from the shared data ---------- */
  function homeCard(p) {
    return '<div class="product-card">' +
      '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
      '<div class="pc-body">' +
        '<span class="pc-cat">' + esc(Store.categoryName(p.category)) + '</span>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p>' + esc(p.description) + '</p>' +
        '<div class="pc-foot"><span class="price">' + Store.peso(p.price) + (p.priceNote ? ' ' + esc(p.priceNote) : '') + '</span>' +
        '<button type="button" class="btn btn-dark btn-small" data-order="' + esc(p.id) + '">Order</button></div>' +
      '</div></div>';
  }
  [['homePastries', 'cat_bread'], ['homeCakes', 'cat_cakes']].forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    el.innerHTML = data.products.filter(function (p) { return p.category === pair[1]; }).slice(0, 4).map(homeCard).join('');
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-order]');
      if (b) openOrder(b.getAttribute('data-order'));
    });
  });

  /* ---------- Order modal ---------- */
  var modal;
  function openOrder(productId) {
    var p = data.products.filter(function (x) { return x.id === productId; })[0];
    if (!p) return;
    var locs = data.locations.filter(function (l) { return l.active; });
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    }
    var locOptions = locs.length
      ? locs.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.name) + (l.fee ? ' (+' + Store.peso(l.fee) + ')' : '') + '</option>'; }).join('')
      : '<option value="">No locations available</option>';
    var today = new Date().toISOString().slice(0, 10);

    modal.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="omTitle">' +
        '<button type="button" class="modal-x" data-close aria-label="Close">&times;</button>' +
        '<h3 id="omTitle">Order: ' + esc(p.name) + '</h3>' +
        '<p class="modal-sub">' + Store.peso(p.price) + (p.priceNote ? ' ' + esc(p.priceNote) : '') + ' &middot; the baker will confirm the final price with you.</p>' +
        '<form id="orderForm">' +
          '<div class="form-row"><div class="field"><label for="oName">Your name</label><input id="oName" required></div>' +
          '<div class="field"><label for="oPhone">Phone number</label><input id="oPhone" type="tel" required></div></div>' +
          '<div class="form-row"><div class="field"><label for="oQty">Quantity</label><input id="oQty" type="number" min="1" value="1" required></div>' +
          '<div class="field"><label for="oSize">Size / flavor</label><input id="oSize" placeholder="e.g. 8x4 inch, chocolate"></div></div>' +
          '<div class="form-row"><div class="field"><label for="oLoc">Pickup / delivery location</label><select id="oLoc" required>' + locOptions + '</select></div>' +
          '<div class="field"><label for="oDate">Date needed</label><input id="oDate" type="date" min="' + today + '" required></div></div>' +
          '<div class="field full"><label for="oAddr">Delivery address (if delivery)</label><input id="oAddr" placeholder="Street, barangay, city"></div>' +
          '<div class="field full"><label for="oNotes">Cake message / design notes</label><textarea id="oNotes" rows="3"></textarea></div>' +
          '<button type="submit" class="btn btn-dark">Place order request</button>' +
        '</form></div>';
    modal.classList.add('open');
    document.body.classList.add('no-scroll');
    document.getElementById('oName').focus();

    document.getElementById('orderForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var loc = data.locations.filter(function (l) { return l.id === document.getElementById('oLoc').value; })[0];
      var order = {
        id: 'ORD-' + String(data.orders.length + 1).padStart(4, '0') + '-' + Date.now().toString(36).slice(-3).toUpperCase(),
        createdAt: new Date().toISOString(),
        status: 'New',
        productId: p.id,
        productName: p.name,
        unitPrice: p.price,
        qty: Math.max(1, parseInt(document.getElementById('oQty').value, 10) || 1),
        size: document.getElementById('oSize').value.trim(),
        customer: document.getElementById('oName').value.trim(),
        phone: document.getElementById('oPhone').value.trim(),
        locationId: loc ? loc.id : '',
        locationName: loc ? loc.name : '',
        locationType: loc ? loc.type : '',
        address: document.getElementById('oAddr').value.trim(),
        date: document.getElementById('oDate').value,
        notes: document.getElementById('oNotes').value.trim()
      };
      data.orders.unshift(order);
      Store.save();
      modal.querySelector('.modal').innerHTML =
        '<button type="button" class="modal-x" data-close aria-label="Close">&times;</button>' +
        '<h3>Order request sent</h3>' +
        '<p>Thank you, <b>' + esc(order.customer) + '</b>! Your reference number is <b>' + esc(order.id) + '</b>.</p>' +
        '<p>We will contact you at <b>' + esc(order.phone) + '</b> to confirm the price and details.</p>' +
        '<button type="button" class="btn btn-dark" data-close>Done</button>';
    });
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }

  /* ---------- Contact page: ordering locations + demo form ---------- */
  var locList = document.getElementById('locationList');
  if (locList) {
    var active = data.locations.filter(function (l) { return l.active; });
    locList.innerHTML = active.length ? active.map(function (l) {
      return '<div class="loc-item"><span class="loc-tag ' + esc(l.type) + '">' + (l.type === 'pickup' ? 'Pickup' : 'Delivery') + '</span>' +
        '<h4>' + esc(l.name) + '</h4><p>' + esc(l.address) + (l.fee ? ' &middot; fee ' + Store.peso(l.fee) : '') + '</p></div>';
    }).join('') : '<p>No ordering locations listed yet.</p>';
  }

  var contactForm = document.querySelector('.contact-form form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Thanks for reaching out! This is a front-end demo, so no message was actually sent.');
      contactForm.reset();
    });
  }
});
