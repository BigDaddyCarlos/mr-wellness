/* Mr. Wellness — comportamiento de la portada (sin dependencias).
   La escena 3D se carga aparte y solo cuando se puede: si falla, queda la esfera CSS. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Menú móvil --- */
  var toggle = document.querySelector('.nav__toggle');
  var panel = document.getElementById('nav-panel');
  function closeMenu(focus) {
    if (!panel) return;
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (focus) toggle.focus();
  }
  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) closeMenu(true);
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1040) closeMenu(false); });
  }

  /* --- Cabecera con fondo al bajar --- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Luz que sigue al cursor en las tarjetas --- */
  document.querySelectorAll('.pillar').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* --- Vista previa de Ikite: los cinco apartados se pueden tocar --- */
  var tabs = document.querySelectorAll('.tabs [role="tab"]');
  var panels = document.querySelectorAll('.phone .panel');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) { p.classList.toggle('is-on', p.id === tab.getAttribute('aria-controls')); });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* --- Año del pie --- */
  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  /* --- Recordar el idioma que elige --- */
  document.querySelectorAll('.nav__lang a[hreflang]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('mw-lang', a.getAttribute('hreflang')); } catch (e) {}
    });
  });

  /* --- Escena 3D (Three.js), después de que la página ya es útil --- */
  var host = document.getElementById('scene');
  if (!host) return;

  function webglOk() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (!webglOk()) return;

  var started = false;
  function start() {
    if (started) return;
    started = true;
    import('./flow-scene.js').then(function (m) {
      return m.mountFlow(host, { reduceMotion: reduce });
    }).then(function (ok) {
      if (ok) host.classList.add('is-live');
    }).catch(function (err) {
      if (window.console) console.warn('Escena 3D no disponible:', err && err.message);
    });
  }
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 250); };
  if (document.readyState === 'complete') idle(start);
  else window.addEventListener('load', function () { idle(start); });
})();
