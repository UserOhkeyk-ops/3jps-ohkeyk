document.addEventListener('DOMContentLoaded', function () {
  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  var tabButtons = document.querySelectorAll('.btn-pill-toggle[data-tab]');
  var panels = document.querySelectorAll('.product-panel');
  var tabsRow = document.querySelector('.tabs');
  var onProductsPage = panels.length > 0;

  // ---------- Product tab switching (Products page) ----------
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // switching tabs manually cancels any active search
      clearSearch();

      tabButtons.forEach(function (b) { b.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      var target = document.getElementById(btn.getAttribute('data-tab'));
      if (target) target.classList.add('active');
    });
  });

  // ---------- Search ----------
  var form = document.getElementById('siteSearchForm');
  var input = document.getElementById('siteSearchInput');

  function removeResultsNote() {
    var note = document.getElementById('searchResultsNote');
    if (note) note.remove();
  }

  function showResultsNote(query, matchCount) {
    var head = document.querySelector('.section-head');
    if (!head) return;
    var note = document.getElementById('searchResultsNote');
    if (!note) {
      note = document.createElement('p');
      note.id = 'searchResultsNote';
      note.style.marginTop = '10px';
      note.style.fontSize = '.92rem';
      head.appendChild(note);
    }
    var text = matchCount > 0
      ? 'Showing ' + matchCount + ' result' + (matchCount === 1 ? '' : 's') + ' for "' + query + '" — '
      : 'No products found for "' + query + '". ';
    note.innerHTML = text + '<a href="products.html" style="text-decoration:underline; color:var(--ink); font-weight:600;">Clear search</a>';
  }

  function runSearch(rawQuery) {
    if (!onProductsPage) return;
    var query = (rawQuery || '').trim().toLowerCase();

    if (query === '') {
      clearSearch();
      return;
    }

    if (tabsRow) tabsRow.style.display = 'none';

    var totalMatches = 0;
    panels.forEach(function (panel) {
      panel.classList.add('active');
      panel.querySelectorAll('.product-card').forEach(function (card) {
        var haystack = card.textContent.toLowerCase();
        var isMatch = haystack.indexOf(query) !== -1;
        card.style.display = isMatch ? '' : 'none';
        if (isMatch) totalMatches++;
      });
    });

    showResultsNote(rawQuery.trim(), totalMatches);
  }

  function clearSearch() {
    if (!onProductsPage) return;
    removeResultsNote();
    if (tabsRow) tabsRow.style.display = '';
    panels.forEach(function (panel) {
      panel.querySelectorAll('.product-card').forEach(function (card) {
        card.style.display = '';
      });
    });
    // restore whichever tab is marked active (defaults to the first one)
    var activeBtn = document.querySelector('.btn-pill-toggle.active') || tabButtons[0];
    panels.forEach(function (p) { p.classList.remove('active'); });
    if (activeBtn) {
      activeBtn.classList.add('active');
      var target = document.getElementById(activeBtn.getAttribute('data-tab'));
      if (target) target.classList.add('active');
    }
  }

  // Run a search already present in the URL (?search=...) when landing on Products
  if (onProductsPage) {
    var params = new URLSearchParams(window.location.search);
    var initialQuery = params.get('search');
    if (initialQuery) {
      if (input) input.value = initialQuery;
      runSearch(initialQuery);
    }
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var query = input ? input.value.trim() : '';
      if (onProductsPage) {
        runSearch(query);
        var url = new URL(window.location.href);
        if (query) {
          url.searchParams.set('search', query);
        } else {
          url.searchParams.delete('search');
        }
        window.history.replaceState({}, '', url);
      } else {
        window.location.href = 'products.html' + (query ? ('?search=' + encodeURIComponent(query)) : '');
      }
    });
  }

  // Live filtering as the user types, only when already on the Products page
  if (input && onProductsPage) {
    input.addEventListener('input', function () {
      runSearch(input.value);
    });
  }

  // ---------- Contact form (front-end only demo) ----------
  var contactForm = document.querySelector('.contact-form form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Thanks for reaching out! This is a front-end demo, so no message was actually sent.');
      contactForm.reset();
    });
  }
});

