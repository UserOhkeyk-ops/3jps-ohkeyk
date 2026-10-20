/* 3JP's Ohkeyk — admin dashboard (front-end only, data kept in localStorage) */
(function () {
  var data = Store.get();
  var STATUSES = ['New', 'Confirmed', 'Baking', 'Ready', 'Completed', 'Cancelled'];
  var main = document.getElementById('adminMain');
  var modal = document.getElementById('adModal');
  var ui = { orders: { q: '', status: 'all' }, products: { q: '', cat: 'all' } };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function orderTotal(o) { return (o.unitPrice || 0) * (o.qty || 1); }

  /* ---------- Text size / bold (shared with public site) ---------- */
  var SIZES = [0.9, 1, 1.15, 1.3, 1.5], NAMES = ['Small', 'Normal', 'Large', 'Extra large', 'Huge'];
  var a11y = { size: 1, bold: false };
  try { a11y = Object.assign(a11y, JSON.parse(localStorage.getItem('ohkeyk_a11y') || '{}')); } catch (e) {}
  function applyA11y() {
    document.documentElement.style.setProperty('--fs', SIZES[a11y.size]);
    document.documentElement.classList.toggle('bold-text', !!a11y.bold);
    localStorage.setItem('ohkeyk_a11y', JSON.stringify(a11y));
    $('adSize').textContent = NAMES[a11y.size];
    $('adBold').setAttribute('aria-pressed', a11y.bold ? 'true' : 'false');
  }
  $('adMinus').onclick = function () { a11y.size = Math.max(0, a11y.size - 1); applyA11y(); };
  $('adPlus').onclick = function () { a11y.size = Math.min(SIZES.length - 1, a11y.size + 1); applyA11y(); };
  $('adBold').onclick = function () { a11y.bold = !a11y.bold; applyA11y(); };
  applyA11y();

  /* ---------- Login gate (demo only — not real security) ---------- */
  function showApp() {
    $('loginScreen').hidden = true;
    $('adminApp').hidden = false;
    route();
  }
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('passcode').value === data.settings.passcode) {
      sessionStorage.setItem('ohkeyk_admin', '1');
      showApp();
    } else { $('loginError').hidden = false; }
  });
  $('logoutBtn').onclick = function () { sessionStorage.removeItem('ohkeyk_admin'); location.reload(); };
  if (sessionStorage.getItem('ohkeyk_admin') === '1') showApp();

  /* ---------- Modal helpers ---------- */
  function openModal(html) {
    modal.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><button type="button" class="modal-x" data-close aria-label="Close">&times;</button>' + html + '</div>';
    modal.classList.add('open');
    document.body.classList.add('no-scroll');
  }
  function closeModal() { modal.classList.remove('open'); document.body.classList.remove('no-scroll'); }
  modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function persist() { return Store.save(); }

  /* ---------- Routing ---------- */
  var tabs = { overview: vOverview, orders: vOrders, products: vProducts, categories: vCategories, locations: vLocations, settings: vSettings };
  function route() {
    var tab = (location.hash || '#overview').slice(1);
    if (!tabs[tab]) tab = 'overview';
    document.querySelectorAll('#adminNav a').forEach(function (a) { a.classList.toggle('active', a.dataset.tab === tab); });
    tabs[tab]();
    var n = data.orders.filter(function (o) { return o.status === 'New'; }).length;
    $('newBadge').hidden = !n; $('newBadge').textContent = n;
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  function refresh() { route(); }

  /* ---------- Overview ---------- */
  function vOverview() {
    var newCount = data.orders.filter(function (o) { return o.status === 'New'; }).length;
    var revenue = data.orders.filter(function (o) { return o.status !== 'Cancelled'; }).reduce(function (s, o) { return s + orderTotal(o); }, 0);
    var recent = data.orders.slice(0, 5);
    main.innerHTML =
      '<h1>Overview</h1><p class="sub">A quick look at orders and what is on the menu.</p>' +
      '<div class="admin-note"><b>Front-end demo:</b> orders and edits are saved in this browser only (no backend). A real shared dashboard would need a database later.</div>' +
      '<div class="stats">' +
        '<div class="stat-card"><b>' + newCount + '</b><span>New orders</span></div>' +
        '<div class="stat-card"><b>' + data.orders.length + '</b><span>Total orders</span></div>' +
        '<div class="stat-card"><b>' + Store.peso(revenue) + '</b><span>Estimated order value</span></div>' +
        '<div class="stat-card"><b>' + data.products.length + '</b><span>Products</span></div>' +
        '<div class="stat-card"><b>' + data.categories.length + '</b><span>Categories</span></div>' +
        '<div class="stat-card"><b>' + data.locations.filter(function (l) { return l.active; }).length + '</b><span>Active locations</span></div>' +
      '</div>' +
      '<div class="bar"><h2 style="margin:0">Recent orders</h2><span class="spacer"></span><a class="btn-sm" href="#orders">View all</a></div>' +
      '<div class="panel">' + (recent.length ? ordersTable(recent) : '<p class="empty">No orders yet. Orders placed on the Products page will appear here.</p>') + '</div>';
  }

  /* ---------- Orders ---------- */
  function ordersTable(list) {
    return '<table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Item</th><th>Location</th><th>Needed</th><th>Status</th><th></th></tr></thead><tbody>' +
      list.map(function (o) {
        return '<tr><td><b>' + esc(o.id) + '</b><span class="muted">' + fmtDate(o.createdAt) + '</span></td>' +
          '<td>' + esc(o.customer) + '<span class="muted">' + esc(o.phone) + '</span></td>' +
          '<td>' + esc(o.productName) + ' &times; ' + o.qty + '<span class="muted">' + Store.peso(orderTotal(o)) + ' est.</span></td>' +
          '<td>' + esc(o.locationName || '—') + '<span class="muted">' + esc(o.locationType || '') + '</span></td>' +
          '<td>' + fmtDate(o.date) + '</td>' +
          '<td><select data-status="' + esc(o.id) + '" aria-label="Order status">' + STATUSES.map(function (s) { return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
          '<td class="actions"><button class="btn-sm" data-view="' + esc(o.id) + '">Details</button><button class="btn-sm danger" data-del-order="' + esc(o.id) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function vOrders() {
    var f = ui.orders;
    var terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    var list = data.orders.filter(function (o) {
      if (f.status !== 'all' && o.status !== f.status) return false;
      var hay = [o.id, o.customer, o.phone, o.productName, o.locationName, o.status].join(' ').toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    main.innerHTML =
      '<h1>Orders</h1><p class="sub">Customer order requests from the Products page.</p>' +
      '<div class="bar"><input type="search" id="ordSearch" placeholder="Search by name, phone, item, location…" value="' + esc(f.q) + '">' +
      '<select id="ordStatus"><option value="all">All statuses</option>' + STATUSES.map(function (s) { return '<option' + (f.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="panel">' + (list.length ? ordersTable(list) : '<p class="empty">No orders match.</p>') + '</div>';
    var s = $('ordSearch');
    s.oninput = function () { f.q = s.value; var pos = s.selectionStart; vOrders(); var n = $('ordSearch'); n.focus(); n.setSelectionRange(pos, pos); };
    $('ordStatus').onchange = function (e) { f.status = e.target.value; vOrders(); };
  }

  /* ---------- Products ---------- */
  function vProducts() {
    var f = ui.products;
    var terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    var list = data.products.filter(function (p) {
      if (f.cat !== 'all' && p.category !== f.cat) return false;
      var hay = (p.name + ' ' + p.description + ' ' + Store.categoryName(p.category)).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    main.innerHTML =
      '<h1>Products</h1><p class="sub">Add, edit or remove items shown on the Products page.</p>' +
      '<div class="bar"><input type="search" id="prodSearch" placeholder="Search products…" value="' + esc(f.q) + '">' +
      '<select id="prodCat"><option value="all">All categories</option>' + data.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (f.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<button class="btn-sm primary" id="addProd">+ Add product</button></div>' +
      '<div class="panel">' + (list.length ?
        '<table class="tbl"><thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th></th></tr></thead><tbody>' +
        list.map(function (p) {
          return '<tr><td><img class="thumb" src="' + esc(p.image) + '" alt=""></td>' +
            '<td><b>' + esc(p.name) + '</b><span class="muted">' + esc(p.description.slice(0, 70)) + (p.description.length > 70 ? '…' : '') + '</span></td>' +
            '<td>' + esc(Store.categoryName(p.category)) + '</td>' +
            '<td>' + Store.peso(p.price) + '<span class="muted">' + esc(p.priceNote) + '</span></td>' +
            '<td class="actions"><button class="btn-sm" data-edit-prod="' + esc(p.id) + '">Edit</button><button class="btn-sm danger" data-del-prod="' + esc(p.id) + '">Delete</button></td></tr>';
        }).join('') + '</tbody></table>' : '<p class="empty">No products match.</p>') + '</div>';
    var s = $('prodSearch');
    s.oninput = function () { f.q = s.value; var pos = s.selectionStart; vProducts(); var n = $('prodSearch'); n.focus(); n.setSelectionRange(pos, pos); };
    $('prodCat').onchange = function (e) { f.cat = e.target.value; vProducts(); };
    $('addProd').onclick = function () { productForm(null); };
  }

  function productForm(id) {
    var p = id ? data.products.filter(function (x) { return x.id === id; })[0] : { name: '', description: '', price: 0, priceNote: 'minimum', category: (data.categories[0] || {}).id, image: '' };
    var images = [];
    data.products.forEach(function (x) { if (x.image && x.image.indexOf('data:') !== 0 && images.indexOf(x.image) === -1) images.push(x.image); });
    var current = p.image;
    if (!data.categories.length) { alert('Add a category first (Categories tab).'); return; }
    openModal(
      '<h3>' + (id ? 'Edit product' : 'Add product') + '</h3>' +
      '<form id="prodForm">' +
        '<div class="field full"><label for="fName">Name</label><input id="fName" required value="' + esc(p.name) + '"></div>' +
        '<div class="form-row"><div class="field"><label for="fCat">Category</label><select id="fCat">' + data.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === p.category ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="fPrice">Price (₱)</label><input id="fPrice" type="number" min="0" required value="' + p.price + '"></div></div>' +
        '<div class="field full"><label for="fNote">Price note (e.g. minimum)</label><input id="fNote" value="' + esc(p.priceNote) + '"></div>' +
        '<div class="field full"><label for="fDesc">Description</label><textarea id="fDesc" rows="3">' + esc(p.description) + '</textarea></div>' +
        '<div class="field full"><label>Picture</label>' +
          '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><img class="img-preview" id="fPrev" src="' + esc(current) + '" alt="">' +
          '<div style="flex:1;min-width:200px"><select id="fImgSel"><option value="">Choose an existing picture…</option>' + images.map(function (i) { return '<option value="' + esc(i) + '"' + (i === current ? ' selected' : '') + '>' + esc(i.replace('images/', '')) + '</option>'; }).join('') + '</select>' +
          '<p style="margin:10px 0 6px;font-size:.9rem">or upload a new one:</p><input type="file" id="fImgFile" accept="image/*"></div></div></div>' +
        '<div class="modal-actions"><button type="submit" class="btn btn-dark">Save product</button><button type="button" class="btn btn-outline" data-close>Cancel</button></div>' +
      '</form>');
    $('fImgSel').onchange = function (e) { current = e.target.value; $('fPrev').src = current; };
    $('fImgFile').onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 700, r = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          current = c.toDataURL('image/jpeg', 0.8);
          $('fPrev').src = current;
          $('fImgSel').value = '';
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    $('prodForm').onsubmit = function (e) {
      e.preventDefault();
      var obj = id ? p : { id: Store.uid('p') };
      obj.name = $('fName').value.trim();
      obj.category = $('fCat').value;
      obj.price = Math.max(0, parseInt($('fPrice').value, 10) || 0);
      obj.priceNote = $('fNote').value.trim();
      obj.description = $('fDesc').value.trim();
      obj.image = current || 'images/logo.png';
      if (!id) data.products.unshift(obj);
      if (persist()) { closeModal(); refresh(); }
    };
  }

  /* ---------- Categories ---------- */
  function vCategories() {
    main.innerHTML =
      '<h1>Categories</h1><p class="sub">These appear as filter buttons on the Products page.</p>' +
      '<form class="bar" id="catForm"><input type="search" id="catName" placeholder="New category name" required><button class="btn-sm primary" type="submit">+ Add category</button></form>' +
      '<div class="cat-list">' + (data.categories.length ? data.categories.map(function (c) {
        var n = data.products.filter(function (p) { return p.category === c.id; }).length;
        return '<div class="cat-row"><b>' + esc(c.name) + '</b><span class="pill">' + n + ' product' + (n === 1 ? '' : 's') + '</span>' +
          '<button class="btn-sm" data-rename-cat="' + esc(c.id) + '">Rename</button><button class="btn-sm danger" data-del-cat="' + esc(c.id) + '">Delete</button></div>';
      }).join('') : '<p class="empty">No categories yet.</p>') + '</div>';
    $('catForm').onsubmit = function (e) {
      e.preventDefault();
      var name = $('catName').value.trim();
      if (!name) return;
      if (data.categories.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) { alert('That category already exists.'); return; }
      data.categories.push({ id: Store.uid('cat'), name: name });
      if (persist()) refresh();
    };
  }

  /* ---------- Ordering locations ---------- */
  function vLocations() {
    main.innerHTML =
      '<h1>Ordering Locations</h1><p class="sub">Pickup spots and delivery areas customers can choose when ordering. They also show on the Contact page.</p>' +
      '<div class="bar"><span class="spacer"></span><button class="btn-sm primary" id="addLoc">+ Add location</button></div>' +
      '<div class="panel">' + (data.locations.length ?
        '<table class="tbl"><thead><tr><th>Name</th><th>Type</th><th>Details</th><th>Fee</th><th>Status</th><th></th></tr></thead><tbody>' +
        data.locations.map(function (l) {
          return '<tr><td><b>' + esc(l.name) + '</b></td><td><span class="pill">' + (l.type === 'pickup' ? 'Pickup' : 'Delivery') + '</span></td>' +
            '<td>' + esc(l.address) + '</td><td>' + (l.fee ? Store.peso(l.fee) : 'Free / TBC') + '</td>' +
            '<td><button class="btn-sm" data-toggle-loc="' + esc(l.id) + '">' + (l.active ? 'Active' : 'Hidden') + '</button></td>' +
            '<td class="actions"><button class="btn-sm" data-edit-loc="' + esc(l.id) + '">Edit</button><button class="btn-sm danger" data-del-loc="' + esc(l.id) + '">Delete</button></td></tr>';
        }).join('') + '</tbody></table>' : '<p class="empty">No locations yet.</p>') + '</div>';
    $('addLoc').onclick = function () { locationForm(null); };
  }
  function locationForm(id) {
    var l = id ? data.locations.filter(function (x) { return x.id === id; })[0] : { name: '', type: 'pickup', address: '', fee: 0, active: true };
    openModal(
      '<h3>' + (id ? 'Edit location' : 'Add location') + '</h3>' +
      '<form id="locForm">' +
        '<div class="field full"><label for="lName">Location name</label><input id="lName" required value="' + esc(l.name) + '"></div>' +
        '<div class="form-row"><div class="field"><label for="lType">Type</label><select id="lType"><option value="pickup"' + (l.type === 'pickup' ? ' selected' : '') + '>Pickup</option><option value="delivery"' + (l.type === 'delivery' ? ' selected' : '') + '>Delivery</option></select></div>' +
        '<div class="field"><label for="lFee">Fee (₱, 0 if none)</label><input id="lFee" type="number" min="0" value="' + l.fee + '"></div></div>' +
        '<div class="field full"><label for="lAddr">Address / details</label><input id="lAddr" value="' + esc(l.address) + '"></div>' +
        '<label class="check"><input type="checkbox" id="lActive"' + (l.active ? ' checked' : '') + '> Show to customers</label>' +
        '<div class="modal-actions"><button type="submit" class="btn btn-dark">Save location</button><button type="button" class="btn btn-outline" data-close>Cancel</button></div>' +
      '</form>');
    $('locForm').onsubmit = function (e) {
      e.preventDefault();
      var obj = id ? l : { id: Store.uid('loc') };
      obj.name = $('lName').value.trim(); obj.type = $('lType').value;
      obj.fee = Math.max(0, parseInt($('lFee').value, 10) || 0);
      obj.address = $('lAddr').value.trim(); obj.active = $('lActive').checked;
      if (!id) data.locations.push(obj);
      if (persist()) { closeModal(); refresh(); }
    };
  }

  /* ---------- Settings ---------- */
  function vSettings() {
    main.innerHTML =
      '<h1>Settings</h1><p class="sub">Passcode, backup and reset.</p>' +
      '<div class="settings-card"><h3>Change passcode</h3><form id="pwForm"><div class="field full"><label for="newPw">New passcode</label><input id="newPw" type="text" minlength="4" required></div><button class="btn btn-dark" type="submit">Save passcode</button></form>' +
      '<p style="margin-top:12px;font-size:.9rem">This passcode only hides the dashboard in the browser. It is a demo gate, not real security.</p></div>' +
      '<div class="settings-card"><h3>Backup</h3><p>Download everything (products, categories, locations, orders) as a file.</p><button class="btn btn-outline" id="exportBtn">Download backup (.json)</button></div>' +
      '<div class="settings-card"><h3>Reset</h3><p>Clear all orders, or restore the original products, categories and locations.</p>' +
      '<div class="modal-actions"><button class="btn-sm danger" id="clearOrders">Clear all orders</button><button class="btn-sm danger" id="resetAll">Reset everything</button></div></div>';
    $('pwForm').onsubmit = function (e) {
      e.preventDefault();
      data.settings.passcode = $('newPw').value;
      if (persist()) { alert('Passcode updated.'); $('newPw').value = ''; }
    };
    $('exportBtn').onclick = function () {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ohkeyk-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
    };
    $('clearOrders').onclick = function () { if (confirm('Delete ALL orders? This cannot be undone.')) { data.orders = []; persist(); refresh(); } };
    $('resetAll').onclick = function () { if (confirm('Reset products, categories, locations and orders to the originals?')) { Store.reset(); location.reload(); } };
  }

  /* ---------- Delegated actions ---------- */
  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-status]');
    if (!sel) return;
    var o = data.orders.filter(function (x) { return x.id === sel.dataset.status; })[0];
    if (o) { o.status = sel.value; persist(); refresh(); }
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    var d = t.dataset;

    if (d.view) {
      var o = data.orders.filter(function (x) { return x.id === d.view; })[0];
      if (!o) return;
      openModal('<h3>' + esc(o.id) + '</h3><span class="pill st-' + esc(o.status) + '">' + esc(o.status) + '</span><dl class="detail-grid" style="margin-top:18px">' +
        '<dt>Customer</dt><dd>' + esc(o.customer) + ' &middot; ' + esc(o.phone) + '</dd>' +
        '<dt>Item</dt><dd>' + esc(o.productName) + ' &times; ' + o.qty + '</dd>' +
        '<dt>Size / flavor</dt><dd>' + esc(o.size || '—') + '</dd>' +
        '<dt>Estimated total</dt><dd>' + Store.peso(orderTotal(o)) + ' (final price confirmed with customer)</dd>' +
        '<dt>Location</dt><dd>' + esc(o.locationName || '—') + ' (' + esc(o.locationType) + ')</dd>' +
        '<dt>Delivery address</dt><dd>' + esc(o.address || '—') + '</dd>' +
        '<dt>Date needed</dt><dd>' + fmtDate(o.date) + '</dd>' +
        '<dt>Notes</dt><dd>' + esc(o.notes || '—') + '</dd>' +
        '<dt>Placed</dt><dd>' + fmtDate(o.createdAt) + '</dd></dl>' +
        '<button class="btn btn-dark" data-close>Close</button>');
    }
    if (d.delOrder && confirm('Delete order ' + d.delOrder + '?')) {
      data.orders = data.orders.filter(function (x) { return x.id !== d.delOrder; }); persist(); refresh();
    }
    if (d.editProd) productForm(d.editProd);
    if (d.delProd && confirm('Delete this product?')) {
      data.products = data.products.filter(function (x) { return x.id !== d.delProd; }); persist(); refresh();
    }
    if (d.renameCat) {
      var c = data.categories.filter(function (x) { return x.id === d.renameCat; })[0];
      var name = prompt('Rename category:', c.name);
      if (name && name.trim()) { c.name = name.trim(); persist(); refresh(); }
    }
    if (d.delCat) {
      var used = data.products.filter(function (p) { return p.category === d.delCat; }).length;
      if (used) { alert('This category still has ' + used + ' product(s). Move or delete them first.'); return; }
      if (confirm('Delete this category?')) { data.categories = data.categories.filter(function (x) { return x.id !== d.delCat; }); persist(); refresh(); }
    }
    if (d.editLoc) locationForm(d.editLoc);
    if (d.toggleLoc) {
      var l = data.locations.filter(function (x) { return x.id === d.toggleLoc; })[0];
      l.active = !l.active; persist(); refresh();
    }
    if (d.delLoc && confirm('Delete this location?')) {
      data.locations = data.locations.filter(function (x) { return x.id !== d.delLoc; }); persist(); refresh();
    }
  });
})();
