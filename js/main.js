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
    const syncTxt = sync.mode === 'cloud' ? (sync.status === 'syncing' ? 'Sincronizando…' : sync.status === 'error' ? 'Sin conexión; se reintentará' : 'Sincronizado') : 'Guardado en este dispositivo';
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
    if (why === 'settings') EG.applySettings();
    if (why === 'remote') {
      const cur = R.cur && R.cur.name;
      if (cur && !['session', 'welcome'].includes(cur)) R.refresh();
      if (cur === 'welcome' && EG.store.profile().onboarded) R.go('home', {}, { root: true });
    }
    updateSide();
  }

  function setupHistory() {
    if (U.isFramed || !U.isStandalone()) return;
    R.usesHistory = true;
    try {
      history.replaceState({ n: 0 }, '');
    } catch (e) {
      R.usesHistory = false;
      return;
    }
    window.addEventListener('popstate', () => {
      if (ui.layers.length) {
        ui.closeTop();
        history.pushState({ n: 1 }, '');
        return;
      }
      if (R.cur && R.cur.name === 'session') {
        history.pushState({ n: 1 }, '');
        EG.actions['run-exit']();
        return;
      }
      if (R.stack.length) R.back();
      else if (R.cur && R.cur.name !== 'home') R.go('home', {}, { root: true, fromPop: true });
    });
    EG.actions.back = () => history.back();
  }

  function registerSW() {
    if (U.isFramed || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  async function boot() {
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
    const onboarded = EG.store.profile().onboarded;
    R.go(onboarded ? 'home' : 'welcome', {}, { root: true });
    updateSide();
    const bootEl = U.$('#boot');
    if (bootEl) {
      bootEl.classList.add('done');
      setTimeout(() => bootEl.remove(), 400);
    }
    EG.store.initSync().then(() => updateSide());
    EG.tutor.init().then(() => {
      if (EG.tutor.available && R.cur && R.cur.name === 'session') R.refresh();
    });
    registerSW();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
