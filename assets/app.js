/* Mr. Wellness — comportamiento compartido (sin dependencias) */
(function () {
  'use strict';

  /* Señal para el failsafe del <head>: el script sí cargó. */
  window.__mw = true;

  /* --- Menú móvil --- */
  var toggle = document.querySelector('.nav__toggle');
  var panel = document.getElementById('nav-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* --- Sombra del encabezado al hacer scroll --- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Aparición progresiva de secciones --- */
  var targets = document.querySelectorAll('.reveal');
  if (targets.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --- Recordar el idioma elegido en la portada --- */
  var langLinks = document.querySelectorAll('[data-lang-choice]');
  langLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('mw-lang', a.getAttribute('data-lang-choice')); } catch (e) {}
    });
  });
})();
