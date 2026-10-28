/* Arranque: estructura de la app, carga de datos, sincronización, tutor, service worker y botón Atrás. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const ui = EG.ui;
  const R = EG.router;

  EG.brandMark = () =>
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" class="bm-bg"/><path d="M5.6 15.6a6.4 6.4 0 0 1 12.8 0" class="bm-arc"/><path d="M12 15.6l4.1-4.6" class="bm-needle"/><circle cx="12" cy="15.6" r="1.7" class="bm-hub"/></svg>';

  const NAV = [
    ['home', 'home', 'Inicio'],
    ['practice', 'target', 'Practicar'],
    ['review', 'repeat', 'Repaso'],
    ['exam', 'timer', 'Simulacro'],
    ['guides', 'book', 'Guías'],
    ['progress', 'chart', 'Progreso'],
    ['settings', 'sliders', 'Ajustes'],
  ];

  function shell() {
    const side = NAV.map(([k, ic, label]) => `<button type="button" class="nav-i" data-nav="${k}" data-act="nav" data-to="${k}" data-root="1">${ui.icon(ic)}<span>${label}</span></button>`).join('');
    const tabs = NAV.slice(0, 5)
      .map(([k, ic, label]) => `<button type="button" class="tab-i" data-nav="${k}" data-act="nav" data-to="${k}" data-root="1">${ui.icon(ic)}<span>${label}</span></button>`)
      .join('');
    U.$('#app').innerHTML = `
      <aside class="side" aria-label="Navegación principal">
        <div class="brand"><span class="brand-mark">${EG.brandMark()}</span><span class="brand-t"><b>Sobresaliente</b><small>EGEL Plus COMPU</small></span></div>
        <nav class="side-nav">${side}</nav>
        <div class="side-foot" id="sideFoot"></div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn" id="topBack" data-act="back" aria-label="Atrás" hidden>${ui.icon('back')}</button>
          <span class="brand-mark sm top-mark">${EG.brandMark()}</span>
          <h1 id="topTitle" class="top-title">Sobresaliente</h1>
          <div class="top-acts">
            <button type="button" class="icon-btn" data-act="nav" data-to="search" aria-label="Buscar">${ui.icon('search')}</button>
            <button type="button" class="icon-btn top-only-m" data-act="nav" data-to="progress" data-root="1" aria-label="Progreso" data-nav="progress">${ui.icon('chart')}</button>
            <button type="button" class="icon-btn top-only-m" data-act="nav" data-to="settings" data-root="1" aria-label="Ajustes" data-nav="settings">${ui.icon('sliders')}</button>
          </div>
        </header>
        <main id="view" class="view" tabindex="-1"></main>
      </div>
      <nav class="tabbar" aria-label="Navegación principal">${tabs}</nav>`;
  }

  function updateSide() {
    const el = U.$('#sideFoot');
    if (!el || !EG.store.state) return;
    const left = EG.store.daysLeft();
    const sync = EG.store.sync;
    const syncTxt = sync.mode === 'cloud' ? (sync.error === 'quota' ? 'La nube está llena: tu progreso solo se guarda en este dispositivo' : sync.status === 'syncing' ? 'Sincronizando…' : sync.status === 'error' ? 'Sin conexión; se reintentará' : 'Sincronizado') : 'Guardado en este dispositivo';
    el.innerHTML = `${left != null && left >= 0 ? `<div class="side-count"><b>${left}</b><span>${left === 1 ? 'día para' : 'días para'} el examen</span></div>` : ''}<div class="side-sync">${ui.icon(sync.mode === 'cloud' ? 'cloud' : 'device')}<span>${syncTxt}</span></div>`;
  }
  EG.updateSide = updateSide;

  function bootProgress(p) {
    const b = U.$('#bootBar');
    if (b) b.style.width = `${Math.round(10 + p * 90)}%`;
  }
  function bootError(e) {
    const el = U.$('#boot');
    if (el) el.innerHTML = `<div class="boot-card"><p><b>No se pudo cargar el banco de preguntas.</b></p><p class="muted">${U.esc(e && e.message ? e.message : '')}</p><button type="button" class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>`;
  }

  function onChange(why) {
    // tema y tamaño de texto también al importar un respaldo o al llegar de otro dispositivo
    if (why === 'settings' || why === 'import' || why === 'remote') EG.applySettings();
    if (why === 'remote') {
      const cur = R.cur && R.cur.name;
      if (cur && !['session', 'welcome'].includes(cur)) R.refresh();
      if (cur === 'welcome' && EG.store.profile().onboarded) R.go('home', {}, { root: true });
      // "Borrar todo" en otro dispositivo (o el navegador lo usa otra cuenta): de vuelta a la bienvenida
      else if (cur && cur !== 'welcome' && !EG.store.profile().onboarded) {
        if (EG.resetWelcome) EG.resetWelcome();
        R.go('welcome', {}, { root: true });
      }
    }
    updateSide();
  }

  // Botón Atrás del sistema: en la PWA y también en una pestaña normal (no dentro de claude.ai).
  function setupHistory() {
    if (U.isFramed) return;
    R.usesHistory = true;
    try {
      // tras recargar a media navegación, volver a la entrada base para no heredar entradas sin vista
      const n = R.depth();
      if (n > 0) R.histGo(-n);
      // la posición al volver la restaura R.back: sin la restauración del navegador, que la pisaría. Se fija ya en la
      // entrada base, porque cada entrada nueva hereda el modo de la actual
      R.hist(() => {
        history.replaceState({ n: 0 }, '');
        history.scrollRestoration = 'manual';
      });
    } catch (e) {
      R.usesHistory = false;
      return;
    }
    const onPop = () => {
      if (R.pendingBack) {
        const to = R.pendingBack;
        R.pendingBack = null;
        R.back(to, true);
        return;
      }
      if (ui.layers.length) {
        ui.closeTop();
        history.pushState({ n: R.depth() + 1 }, '');
        return;
      }
      if (R.cur && R.cur.name === 'session') {
        history.pushState({ n: R.depth() + 1 }, '');
        EG.actions['run-exit']();
        return;
      }
      // en la bienvenida, Atrás regresa un paso sin saltarla; en el primero queda en la entrada base
      if (R.cur && R.cur.name === 'welcome') {
        if (EG.welcomeBack && EG.welcomeBack()) history.pushState({ n: R.depth() + 1 }, '');
        return;
      }
      if (R.stack.length) R.back(null, true);
      else if (R.cur && R.cur.name !== 'home') R.go('home', {}, { root: true, fromPop: true });
    };
    window.addEventListener('popstate', () => {
      // provocado por la app: history.go() de la navegación raíz o R.back() desde el código
      if (R.ownPop()) return;
      // Adelante del navegador: la entrada quedó más arriba de la que dejó la app; regresar sin cambiar la vista
      if (R.depth() > R.at) {
        R.histGo(R.at - R.depth());
        return;
      }
      onPop();
      // también las entradas que agregan el diálogo, la sesión y la bienvenida
      R.at = R.depth();
    });
  }

  // Aviso de versión nueva: se escucha desde que carga el script, porque el SW nuevo puede activarse antes de que
  // termine el arranque; el diálogo espera a que la app esté lista. La página sigue con la versión anterior hasta recargar.
  const SW = { had: false, changed: false, ready: false, shown: false, checked: 0 };
  if (!U.isFramed && 'serviceWorker' in navigator) {
    SW.had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      SW.changed = true;
      offerReload();
    });
  }
  async function offerReload() {
    // en la primera visita no había versión anterior: no hay nada que avisar
    if (!SW.had || !SW.changed || !SW.ready || SW.shown) return;
    SW.shown = true;
    const v = await ui.modal({
      title: 'Nueva versión disponible',
      body: '<p>Se actualizó el banco de preguntas o la app. Tu progreso se conserva.</p>',
      actions: [
        { id: 'reload', label: 'Actualizar ahora', kind: 'primary' },
        { id: 'later', label: 'Más tarde' },
      ],
    });
    if (v === 'reload') {
      EG.store.flushSync();
      location.reload();
    }
  }

  function registerSW() {
    if (U.isFramed || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    SW.ready = true;
    offerReload();
    navigator.serviceWorker
      .register('sw.js')
      .then((reg) => {
        SW.checked = Date.now();
        // la PWA puede quedarse abierta días sin navegar: al volver a verla, buscar versión nueva (como máximo cada hora)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && Date.now() - SW.checked > 3600000) {
            SW.checked = Date.now();
            reg.update().catch(() => {});
          }
        });
      })
      .catch(() => {});
  }

  async function boot() {
    // el Artifact se publica sin <html lang>: declarar el idioma para los lectores de pantalla
    if (!document.documentElement.lang) document.documentElement.lang = 'es-MX';
    const early = U.storage.get('egel-sobresaliente:v1', null);
    const theme = early && early.main && early.main.settings && early.main.settings.theme;
    EG.hostTheme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
    shell();
    try {
      await EG.data.loadAll(bootProgress);
    } catch (e) {
      bootError(e);
      return;
    }
    EG.store.load();
    EG.applySettings();
    EG.store.on(onChange);
    setupHistory();
    // en claude.ai el perfil puede estar ya en la nube: esperar la primera sincronización antes de ofrecer la bienvenida
    const sync = EG.store.initSync();
    if (window.claude && !EG.store.profile().onboarded) await Promise.race([sync.catch(() => {}), new Promise((r) => setTimeout(r, 8000))]);
    const onboarded = EG.store.profile().onboarded;
    // la bienvenida va encima de la entrada base, para que Atrás regrese un paso (EG.welcomeBack) sin salir de la app
    R.go(onboarded ? 'home' : 'welcome', {}, { root: true, replace: onboarded });
    updateSide();
    const bootEl = U.$('#boot');
    if (bootEl) {
      bootEl.classList.add('done');
      setTimeout(() => bootEl.remove(), 400);
    }
    sync.then(updateSide, updateSide);
    EG.tutor.init().then(() => {
      if (EG.tutor.available && R.cur && R.cur.name === 'session') R.refresh();
    });
    registerSW();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
