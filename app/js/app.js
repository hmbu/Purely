/* Router and modal stack. Owns #app and #modal-root. */
(function () {
  'use strict';

  var ROUTES = [
    { re: /^\/store$/,            view: 'G-01', params: function () { return {}; } },
    { re: /^\/product\/(.+)$/,    view: 'G-02', params: function (m) { return { id: m[1] }; } },
    { re: /^\/cart$/,             view: 'G-03', params: function () { return {}; } },
    { re: /^\/checkout$/,         view: 'G-04', params: function () { return {}; } },
    { re: /^\/submitted\/(.+)$/,  view: 'G-05', params: function (m) { return { orderNo: m[1] }; } },
    { re: /^\/order\/(.+)$/,      view: 'G-06', params: function (m) { return { orderNo: m[1] }; } },
    { re: /^\/orders$/,           view: 'G-07', params: function () { return {}; } }
  ];

  var current = { view: 'G-01', params: {} };
  var modalStack = [];

  function path() {
    var h = location.hash.replace(/^#/, '');
    return h || '/store';
  }

  function resolve(p) {
    for (var i = 0; i < ROUTES.length; i++) {
      var m = p.match(ROUTES[i].re);
      if (m) return { view: ROUTES[i].view, params: ROUTES[i].params(m) };
    }
    return { view: 'G-01', params: {} };
  }

  var App = {
    /* G-08 replaces G-01 when the catalog cannot load. The view layer sets this;
       G-08 has no URL of its own (G-08 §3.3). */
    storeUnavailable: null,   // null | { variant: 'retryable' | 'invalidLink' }

    go: function (p) {
      if (location.hash === '#' + p) { App.rerender(); return; }
      location.hash = p;
    },

    back: function (fallback) {
      if (history.length > 1) history.back();
      else App.go(fallback || '/store');
    },

    /* Drops the current entry so a submitted checkout can never be reached by
       going back. M-01 §7.4 step 4. */
    replace: function (p) {
      location.replace('#' + p);
      App.rerender();
    },

    render: function () {
      current = resolve(path());
      var view = Views[current.view];
      var root = document.getElementById('app');
      if (!view) { root.innerHTML = ''; return; }
      root.innerHTML = view.render(current.params) || '';
      root.setAttribute('data-screen', current.view);
      if (view.mount) view.mount(root, current.params);
      window.scrollTo(0, 0);
    },

    rerender: function () {
      App.render();
      // Re-render any open modal so a language switch reaches it too.
      var stack = modalStack.slice();
      modalStack = [];
      document.getElementById('modal-root').innerHTML = '';
      stack.forEach(function (m) { App.openModal(m.id, m.params); });
    },

    openModal: function (id, params) {
      var def = Modals[id];
      if (!def) return;
      params = params || {};
      modalStack.push({ id: id, params: params });
      var host = document.getElementById('modal-root');
      var wrap = document.createElement('div');
      wrap.className = 'backdrop' + (id === 'M-01' ? ' backdrop--locked' : '');
      wrap.setAttribute('data-modal', id);
      wrap.innerHTML = def.render(params) || '';
      host.appendChild(wrap);
      document.body.classList.add('is-modal-open');

      /* Backdrop closes every modal except M-01, whose only exits are its two
         buttons. Map §4 decision 14; M-01 §5.5. */
      if (id !== 'M-01') {
        wrap.addEventListener('click', function (e) {
          if (e.target === wrap && !wrap.classList.contains('is-busy')) {
            if (def.onDismiss) def.onDismiss(params);
            App.closeModal();
          }
        });
      }
      if (def.mount) def.mount(wrap, params);
      var focusTarget = wrap.querySelector('h2, [data-autofocus]');
      if (focusTarget) focusTarget.focus && focusTarget.focus();
    },

    closeModal: function () {
      var host = document.getElementById('modal-root');
      if (host.lastElementChild) host.removeChild(host.lastElementChild);
      modalStack.pop();
      if (!modalStack.length) document.body.classList.remove('is-modal-open');
    },

    closeAllModals: function () {
      document.getElementById('modal-root').innerHTML = '';
      modalStack = [];
      document.body.classList.remove('is-modal-open');
    },

    modalBusy: function (busy) {
      var host = document.getElementById('modal-root');
      if (host.lastElementChild) host.lastElementChild.classList.toggle('is-busy', !!busy);
    },

    /* The only transient toast in version 1, after Reorder. Map §1.3; G-03 C10. */
    toast: function (lines, ms) {
      var root = document.getElementById('toast-root');
      root.innerHTML = '';
      var el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('data-el', 'G-03-C10');
      (Array.isArray(lines) ? lines : [lines]).forEach(function (line) {
        var p = document.createElement('p');
        p.textContent = line;
        el.appendChild(p);
      });
      el.addEventListener('click', function () { root.innerHTML = ''; });
      root.appendChild(el);
      setTimeout(function () { if (el.parentNode) root.innerHTML = ''; }, ms || 5000);
    },

    currentView: function () { return current.view; }
  };

  window.App = App;

  window.addEventListener('hashchange', function () {
    App.closeAllModals();
    App.render();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var host = document.getElementById('modal-root');
    var top = host.lastElementChild;
    if (!top) return;
    if (top.getAttribute('data-modal') === 'M-01') return;  // ignored by rule
    if (top.classList.contains('is-busy')) return;
    var def = Modals[top.getAttribute('data-modal')];
    if (def && def.onDismiss) def.onDismiss({});
    App.closeModal();
  });

  document.addEventListener('DOMContentLoaded', function () {
    I18N.apply();
    Store.init();
    Store.on('change', function () { App.render(); });
    Demo.init();
    App.render();
  });
})();
