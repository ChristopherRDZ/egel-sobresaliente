/* Íconos, componentes, ventanas modales, hojas laterales, avisos y enrutador de vistas. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const { esc } = U;

  // ---------- íconos ----------
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9.5 2h5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 16v2"/><path d="M12.5 11v7"/><path d="M17 7v11"/>',
    sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1.5 14h5"/><path d="M9.5 8h5"/><path d="M17.5 16h5"/>',
    star: '<path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z"/>',
    flag: '<path d="M5 22V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    spark: '<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 3v4M17 5h4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    expand: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
    cal: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7V16h6v-.1c0-.6.3-1.2.8-1.6A6.5 6.5 0 0 0 12 2.5z"/>',
    flame: '<path d="M12 2.5c.8 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.7 1.6-4.6 2.7-6.3.8 1.8 1.7 2.6 2.8 2.8-.3-2.6-.9-4.8 0-7.5z"/>',
    cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.9A3.2 3.2 0 0 0 7 18.5z"/>',
    device: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01"/>',
    arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    back: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
    restart: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    medal: '<circle cx="12" cy="15" r="6"/><path d="M8.5 9.8 6 2.5h4l2 5 2-5h4l-2.5 7.3"/><path d="M12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/>',
  };
  const icon = (name, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;

  // ---------- áreas y niveles ----------
  const AREA_VAR = { A1: 'var(--a1)', A2: 'var(--a2)', A3: 'var(--a3)', A4: 'var(--a4)', LC: 'var(--lc)' };
  const areaColor = (id) => AREA_VAR[id] || 'var(--accent)';
  const subChip = (code, opts) => {
    const s = EG.data.sub(code);
    if (!s) return '';
    const o = opts || {};
    return `<span class="chip chip-sub" style="--c:${areaColor(s.area)}"><b>${esc(s.code)}</b>${o.short ? '' : ` ${esc(o.name || s.short || s.name)}`}</span>`;
  };
  const LVL_CLASS = { SS: 'lvl-ss', S: 'lvl-s', ANS: 'lvl-ans' };
  const levelPill = (lvl, small) => `<span class="pill ${LVL_CLASS[lvl] || ''}${small ? ' pill-sm' : ''}">${esc(EG.store.LEVEL_NAME[lvl] || '—')}</span>`;
  const bar = (p, color, extra) => `<span class="bar${extra ? ' ' + extra : ''}"><span style="width:${(U.clamp(p || 0, 0, 1) * 100).toFixed(1)}%;${color ? `background:${color}` : ''}"></span></span>`;
  // Escala del Índice Ceneval 700–1300 con cortes en 1000 y 1150
  const gauge = (idx, opts) => {
    const o = opts || {};
    const pos = (v) => (((U.clamp(v, 700, 1300) - 700) / 600) * 100).toFixed(2);
    const none = idx == null;
    const lvl = none ? '' : EG.store.level(idx);
    const label = none ? 'Sin datos todavía' : `Índice estimado ${idx} de 1300, ${EG.store.LEVEL_NAME[lvl]}`;
    return `<div class="gauge ${LVL_CLASS[lvl] || 'gauge-none'}${o.compact ? ' gauge-c' : ''}" role="img" aria-label="${label}">
      <div class="gauge-track"><span class="gz gz-1"></span><span class="gz gz-2"></span><span class="gz gz-3"></span>${none ? '' : `<span class="gauge-mark" style="left:${pos(idx)}%"></span>`}</div>
      ${o.compact ? '' : `<div class="gauge-scale"><span style="left:0">700</span><span style="left:${pos(1000)}%">1000</span><span style="left:${pos(1150)}%">1150</span><span style="left:100%">1300</span></div>`}
    </div>`;
  };
  const ring = (p, label, sub) => {
    const r = 26;
    const c = 2 * Math.PI * r;
    const v = U.clamp(p, 0, 1);
    return `<div class="ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="ring-bg"/><circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div class="ring-t"><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;
  };
  const FMT_LABEL = { directo: 'Cuestionamiento directo', completamiento: 'Completamiento', relacion: 'Relación de elementos', caso: 'Multirreactivo' };
  const TYPE_LABEL = { multi: 'Innovación · elige dos', numeric: 'Innovación · respuesta numérica', order: 'Innovación · ordenamiento' };
  const diffDots = (d) => `<span class="dots" title="Dificultad ${d} de 3" aria-label="Dificultad ${d} de 3">${[1, 2, 3].map((k) => `<i class="${k <= d ? 'on' : ''}"></i>`).join('')}</span>`;

  // ---------- avisos ----------
  let toastT = null;
  const toast = (text, kind) => {
    const el = U.$('#toast');
    if (!el) return;
    el.textContent = text;
    el.className = 'toast show' + (kind ? ' toast-' + kind : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => (el.className = 'toast'), 2800);
  };

  // ---------- modal y hoja ----------
  const layers = [];
  // solo la capa de arriba es interactiva: con #app y las capas de abajo inertes, Tab no sale del diálogo
  const setInert = (on) => {
    const app = U.$('#app');
    if (app) app.inert = on;
  };
  function closeTop(value) {
    const top = layers.pop();
    if (!top) return;
    top.el.classList.remove('open');
    const el = top.el;
    el.inert = true;
    setTimeout(() => el.remove(), U.prefersReducedMotion() ? 0 : 180);
    const below = layers[layers.length - 1];
    if (below) below.el.inert = false;
    else setInert(false);
    if (top.onClose) top.onClose(value);
    if (top.prevFocus && top.prevFocus.focus) top.prevFocus.focus();
    if (!layers.length) document.body.classList.remove('has-layer');
  }
  function openLayer(kind, html, opts) {
    const o = opts || {};
    const wrapEl = document.createElement('div');
    wrapEl.className = `layer layer-${kind}`;
    wrapEl.innerHTML = `<div class="layer-bg" data-close="1"></div><div class="layer-panel ${o.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title || '')}" tabindex="-1">${html}</div>`;
    U.$('#overlay').appendChild(wrapEl);
    const entry = { el: wrapEl, onClose: o.onClose, prevFocus: document.activeElement };
    const below = layers[layers.length - 1];
    if (below) below.el.inert = true;
    setInert(true);
    layers.push(entry);
    document.body.classList.add('has-layer');
    requestAnimationFrame(() => {
      wrapEl.classList.add('open');
      const panel = wrapEl.querySelector('.layer-panel');
      const f = panel.querySelector('[autofocus]') || panel;
      f.focus({ preventScroll: true });
    });
    wrapEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeTop(e.target.closest('[data-close]').dataset.close === '1' ? null : e.target.closest('[data-close]').dataset.close);
    });
    if (o.mount) o.mount(wrapEl.querySelector('.layer-panel'));
    return entry;
  }
  // modal({title, body, actions:[{id,label,kind}]}) → Promise<id|null>
  function modal(o) {
    return new Promise((resolve) => {
      const acts = (o.actions || [{ id: 'ok', label: 'Entendido', kind: 'primary' }])
        .map((a) => `<button type="button" class="btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost'}" data-close="${esc(a.id)}"${a.kind === 'primary' ? ' autofocus' : ''}>${esc(a.label)}</button>`)
        .join('');
      openLayer(
        'modal',
        `<div class="modal-h"><h2>${esc(o.title || '')}</h2><button type="button" class="icon-btn" data-close="1" aria-label="Cerrar">${icon('x')}</button></div><div class="modal-b">${o.body || ''}</div><div class="modal-f">${acts}</div>`,
        { title: o.title, onClose: (v) => resolve(v), mount: o.mount, cls: o.cls },
      );
    });
  }
  // sheet({title, html, mount}) — panel lateral en escritorio, hoja inferior en teléfono
  function sheet(o) {
    return new Promise((resolve) => {
      openLayer(
        'sheet',
        `<div class="sheet-h"><div class="sheet-grip" aria-hidden="true"></div><h2>${o.titleHtml || esc(o.title || '')}</h2><button type="button" class="icon-btn" data-close="1" aria-label="Cerrar">${icon('x')}</button></div><div class="sheet-b">${o.html || ''}</div>`,
        {
          title: o.title,
          onClose: (v) => {
            if (o.onClose) o.onClose(v);
            resolve(v);
          },
          mount: o.mount,
          cls: o.cls,
        },
      );
    });
  }

  // ---------- foco al volver a dibujar ----------
  // Selector del control con foco (id o sus data-*) y su posición entre iguales, para recuperarlo tras reemplazar el HTML.
  const FOCUS_DATA = ['act', 'i', 'v', 'key', 'sub', 'topic', 'k', 'd', 'id', 'q', 'to', 'preset', 'area', 'kind', 'qid', 'reason'];
  function focusKey(root) {
    const a = document.activeElement;
    if (!root || !a || a === root || !root.contains || !root.contains(a)) return null;
    let sel = a.id ? '#' + (window.CSS && CSS.escape ? CSS.escape(a.id) : a.id) : '';
    if (!sel && a.dataset && a.dataset.act) sel = FOCUS_DATA.filter((k) => a.dataset[k] != null).map((k) => `[data-${k}=${JSON.stringify(a.dataset[k])}]`).join('');
    if (!sel) return null;
    return { sel, k: Math.max(0, Array.prototype.indexOf.call(root.querySelectorAll(sel), a)) };
  }
  // Enfoca el mismo control; si ya no existe o está deshabilitado, el primero de fallbacks que sirva, o la vista.
  function restoreFocus(root, key, fallbacks) {
    if (!root || !key) return;
    // «Ampliar figura» nace oculto hasta que fit mide la figura: medir ya, para poder devolverle el foco
    if (EG.fig && EG.fig.fit) root.querySelectorAll('.fig[data-w]').forEach(EG.fig.fit);
    const usable = (x) => !!x && !x.disabled && typeof x.focus === 'function';
    let el = root.querySelectorAll(key.sel)[key.k] || root.querySelector(key.sel);
    if (!usable(el)) el = (fallbacks || []).map((s) => root.querySelector(s)).find(usable) || root;
    try {
      el.focus({ preventScroll: true });
    } catch (e) {
      /* sin foco */
    }
  }

  // ---------- enrutador ----------
  const views = (EG.views = {});
  const R = (EG.router = { cur: null, stack: [] });
  // Historial (R.usesHistory): cada entrada guarda su profundidad n sobre la base (Inicio = 0); otra pestaña raíz
  // ocupa una sola entrada encima y las vistas anidadas se apilan. history.go() es asíncrono: mientras su
  // popstate no llega, lo demás espera en cola y ese popstate no cambia la vista (R.ownPop).
  const H = { wait: null };
  const depth = () => (history.state && history.state.n) || 0;
  function hist(fn) {
    if (H.wait) H.wait.push(fn);
    else {
      try {
        fn();
      } catch (e) {
        /* historial no disponible */
      }
      R.at = depth();
    }
  }
  R.hist = hist;
  // profundidad de la entrada que dejó la app: un popstate que llega más arriba es Adelante del navegador
  R.at = 0;
  R.depth = depth;
  R.histGo = (delta) =>
    hist(() => {
      if (!delta) return;
      const q = (H.wait = []);
      history.go(delta);
      setTimeout(() => H.wait === q && R.ownPop(), 1000); // por si el popstate no llega
    });
  R.ownPop = function () {
    if (!H.wait) return false;
    const q = H.wait;
    H.wait = null;
    R.at = depth();
    q.forEach(hist);
    return true;
  };
  R.go = function (name, params, opts) {
    const o = opts || {};
    if (!views[name]) name = 'home';
    // una hoja o un modal abiertos no deben quedar encima de otra vista
    while (layers.length) closeTop(null);
    // la sesión no recupera su posición: al volver salta a la primera sin responder y empieza arriba
    if (R.cur && !o.replace && !o.root) R.stack.push(Object.assign({}, R.cur, { y: R.cur.name === 'session' ? 0 : window.scrollY }));
    if (o.root) R.stack = [];
    if (R.cur && views[R.cur.name] && views[R.cur.name].unmount) views[R.cur.name].unmount();
    R.cur = { name, params: params || {} };
    R.render({ scroll: o.keepScroll ? null : 0 });
    if (R.usesHistory && !o.fromPop) {
      if (o.replace) hist(() => history.replaceState({ n: depth() }, ''));
      else if (o.root) {
        hist(() => {
          const n = depth();
          // Inicio y el primer paso de la bienvenida ocupan la entrada base
          if (name === 'home' || name === 'welcome') R.histGo(-n);
          else if (!n) history.pushState({ n: 1 }, '');
          else {
            R.histGo(1 - n);
            hist(() => history.replaceState({ n: 1 }, ''));
          }
        });
      } else hist(() => history.pushState({ n: depth() + 1 }, ''));
    }
  };
  // fromPop: lo pide el popstate (el navegador ya retrocedió). Desde el código, con historial, se retrocede
  // con history.back() y el popstate hace el cambio, para consumir la entrada.
  R.back = function (fallback, fromPop) {
    if (R.usesHistory && !fromPop) {
      hist(() => {
        if (depth() > 0) {
          const to = (R.pendingBack = fallback || 'home');
          history.back();
          setTimeout(() => {
            if (R.pendingBack === to) {
              R.pendingBack = null;
              R.back(to, true);
            }
          }, 1000);
        } else R.back(fallback, true);
      });
      return;
    }
    while (layers.length) closeTop(null);
    if (R.cur && views[R.cur.name] && views[R.cur.name].unmount) views[R.cur.name].unmount();
    const prev = R.stack.pop();
    R.cur = prev ? { name: prev.name, params: prev.params } : { name: fallback || 'home', params: {} };
    // volver a la posición que tenía la vista anterior (Resultados, Buscar…)
    R.render({ scroll: prev && prev.y ? null : 0 });
    if (prev && prev.y) window.scrollTo(0, prev.y);
  };
  R.render = function (opts) {
    const o = opts || {};
    const v = views[R.cur.name];
    const el = U.$('#view');
    const app = U.$('#app');
    app.classList.toggle('app-focus', !!v.focus);
    app.dataset.view = R.cur.name;
    el.innerHTML = v.html(R.cur.params);
    // antes de montar: mount puede desplazar la página (p. ej. hasta el área elegida en Practicar)
    if (o.scroll === 0) window.scrollTo(0, 0);
    if (v.mount) v.mount(el, R.cur.params);
    const tab = v.tab || R.cur.name;
    U.$$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === tab));
    const title = typeof v.title === 'function' ? v.title(R.cur.params) : v.title;
    const tt = U.$('#topTitle');
    if (tt) tt.textContent = title || 'Sobresaliente';
    const backBtn = U.$('#topBack');
    if (backBtn) backBtn.hidden = !v.nested;
  };
  R.refresh = function () {
    const y = window.scrollY;
    const el = U.$('#view');
    const key = focusKey(el);
    R.render({});
    window.scrollTo(0, y);
    restoreFocus(el, key);
  };

  // ---------- acciones delegadas ----------
  const actions = (EG.actions = {});
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) {
      e.preventDefault();
      fn(el, e);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && layers.length) {
      e.preventDefault();
      closeTop(null);
    }
  });

  EG.ui = { icon, areaColor, subChip, levelPill, bar, gauge, ring, toast, modal, sheet, closeTop, FMT_LABEL, TYPE_LABEL, diffDots, layers, focusKey, restoreFocus };
})();
