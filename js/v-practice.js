/* Practicar (áreas, subáreas y temas), constructor de sesiones, Repaso, Historial, Simulacros y Búsqueda. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const S = EG.store;
  const D = EG.data;
  const ui = EG.ui;
  const { esc } = U;
  const A = EG.actions;

  const pctOr = (x) => (x == null ? '—' : U.pct(x));

  // ---------- Practicar ----------
  EG.views.practice = {
    tab: 'practice',
    title: 'Practicar',
    html(p) {
      const focusArea = p && p.area;
      const wrong = S.wrongList().length;
      const marked = S.bookmarked().length;
      const due = S.dueList().length;
      const weak = S.profile().weak || [];
      const presets = `<div class="presets">
        <button type="button" class="preset" data-act="build" data-preset="smart">${ui.icon('target')}<b>Inteligente</b><span>De todo, prioriza lo pendiente</span></button>
        ${weak.length ? `<button type="button" class="preset" data-act="build" data-preset="weak">${ui.icon('flame')}<b>Mis subáreas difíciles</b><span>${esc(weak.join(', '))}</span></button>` : ''}
        <button type="button" class="preset" data-act="build" data-preset="wrong"${wrong ? '' : ' disabled'}>${ui.icon('x')}<b>Mis errores</b><span>${wrong ? U.plural(wrong, 'pregunta', 'preguntas') : 'Aún no hay'}</span></button>
        <button type="button" class="preset" data-act="build" data-preset="due"${due ? '' : ' disabled'}>${ui.icon('repeat')}<b>Repaso pendiente</b><span>${due ? U.plural(due, 'pregunta', 'preguntas') : 'Al día'}</span></button>
        <button type="button" class="preset" data-act="build" data-preset="marked"${marked ? '' : ' disabled'}>${ui.icon('star')}<b>Guardadas</b><span>${marked ? U.plural(marked, 'pregunta', 'preguntas') : 'Ninguna'}</span></button>
        <button type="button" class="preset" data-act="build" data-preset="innov">${ui.icon('grid')}<b>Solo innovación</b><span>Elige dos, numéricas y ordenamiento</span></button>
      </div>`;
      const areas = D.meta.areas
        .map((a) => {
          const subs = D.meta.subs.filter((s) => s.area === a.id);
          const ast = S.areaStats(a.id);
          const cards = subs
            .map((s) => {
              const st = S.subStats(s.code);
              return `<button type="button" class="sub-card" data-act="nav" data-to="sub" data-p='${esc(JSON.stringify({ code: s.code }))}' style="--c:${ui.areaColor(a.id)}">
                <span class="sub-card-h"><span class="code">${esc(s.code)}</span><b>${esc(s.name)}</b></span>
                <span class="sub-card-s">${ui.bar(st.coverage, ui.areaColor(a.id))}<span class="muted small">${st.seen}/${st.total} vistas · dominio ${pctOr(st.acc)}${st.due ? ` · ${st.due} por repasar` : ''}</span></span>
              </button>`;
            })
            .join('');
          return `<section class="area-sec${focusArea === a.id ? ' focus' : ''}" id="area-${esc(a.id)}">
            <header class="area-h" style="--c:${ui.areaColor(a.id)}"><div><p class="eyebrow">${esc(a.id === 'LC' ? 'Sección transversal' : 'Área ' + a.id.slice(1))} · ${a.items} reactivos en el examen</p><h2>${esc(a.name)}</h2></div><div class="area-h-s"><span class="muted small">${ast.seen}/${ast.total} vistas</span><button type="button" class="btn btn-sm" data-act="build" data-preset="area" data-area="${esc(a.id)}">Practicar área</button></div></header>
            <div class="sub-grid">${cards}</div>
          </section>`;
        })
        .join('');
      return `<div class="page"><header class="page-h"><div><h1>Practicar</h1><p class="muted">Elige un atajo o entra a una subárea para practicar temas específicos.</p></div></header>${presets}${areas}</div>`;
    },
    mount(el, p) {
      if (p && p.area) {
        const sec = U.$('#area-' + p.area);
        if (sec) sec.scrollIntoView({ block: 'start' });
      }
    },
  };

  // ---------- Subárea ----------
  EG.views.sub = {
    nested: true,
    tab: 'practice',
    title: (p) => (D.sub(p.code) ? `${p.code} ${D.sub(p.code).short || D.sub(p.code).name}` : 'Subárea'),
    html(p) {
      const s = D.sub(p.code);
      if (!s) return '<div class="empty"><p>Subárea no encontrada.</p></div>';
      const a = D.area(s.area);
      const st = S.subStats(s.code);
      const idx = S.icne(st.est);
      const topics = s.topics
        .map((t) => {
          const ts = S.topicStats(s.code, t.id);
          const read = S.isRead(s.code + '.' + t.id);
          return `<li class="topic">
            <div class="topic-b"><span class="code">${esc(t.id.replace('t', ''))}</span><div><b>${esc(t.name)}</b><span class="topic-s">${ui.bar(ts.coverage, ui.areaColor(s.area))}<span class="muted small">${ts.seen}/${ts.total} · dominio ${pctOr(ts.acc)}${t.lvl === 'SS' ? ' · nivel Sobresaliente' : ''}</span></span></div></div>
            <div class="topic-a"><button type="button" class="icon-btn${read ? ' on' : ''}" data-act="open-guide" data-sub="${esc(s.code)}" data-topic="${esc(t.id)}" aria-label="Guía: ${esc(t.name)}">${ui.icon('book')}</button><button type="button" class="btn btn-sm" data-act="start-topic" data-topic="${esc(s.code + '.' + t.id)}" data-n="10"${ts.total ? '' : ' disabled'}>Practicar</button></div>
          </li>`;
        })
        .join('');
      return `<div class="page">
        <header class="page-h sub-h" style="--c:${ui.areaColor(s.area)}"><div><p class="eyebrow">${esc(a.name)} · ${s.exam} reactivos en el examen</p><h1><span class="code big">${esc(s.code)}</span> ${esc(s.name)}</h1></div></header>
        <section class="card sub-sum">
          <div class="sub-sum-g"><div><small>Índice estimado</small><b class="idx">${st.seen ? idx : '—'}</b>${st.seen ? ui.levelPill(S.level(idx), true) : ''}</div>${ui.gauge(st.seen ? idx : null)}</div>
          <p class="muted small">${st.seen}/${st.total} preguntas vistas · ${st.cor}/${st.att} aciertos en ${U.plural(st.att, 'intento', 'intentos')}${st.due ? ` · ${st.due} por repasar` : ''}</p>
          <div class="btn-row"><button type="button" class="btn btn-primary" data-act="build" data-preset="sub" data-sub="${esc(s.code)}">Practicar subárea</button><button type="button" class="btn btn-ghost" data-act="open-guide" data-sub="${esc(s.code)}">${ui.icon('book')}<span>Guía de repaso</span></button><button type="button" class="btn btn-ghost" data-act="start-exam-sub" data-sub="${esc(s.code)}">${ui.icon('timer')}<span>Mini simulacro (10)</span></button></div>
        </section>
        <section class="card"><h2 class="card-h">Temas</h2><ol class="topics">${topics}</ol></section>
      </div>`;
    },
  };
  A['start-exam-sub'] = (el) => {
    const code = el.dataset.sub;
    const per = {};
    for (const s of D.meta.subs) per[s.code] = s.code === code ? 10 : 0;
    const qs = S.pickExam(per);
    EG.startSession({ kind: 'exam', title: `Mini simulacro · ${code}`, mode: 'exam', qs, limit: Math.round(qs.length * 2.4) * 60000, src: { exam: 'sub', sub: code } });
  };

  // ---------- constructor de sesión ----------
  const BUILD = { n: 20, filter: 'smart', mode: 'tutor', diffs: [], innov: true };
  A.build = async (el) => {
    const preset = el.dataset.preset;
    const cfg = { subs: [], topics: [], types: null, title: '', filter: BUILD.filter };
    if (preset === 'weak') cfg.subs = (S.profile().weak || []).slice();
    if (preset === 'area') cfg.subs = D.meta.subs.filter((s) => s.area === el.dataset.area).map((s) => s.code);
    if (preset === 'sub') cfg.subs = [el.dataset.sub];
    if (preset === 'wrong') cfg.filter = 'wrong';
    if (preset === 'due') cfg.filter = 'due';
    if (preset === 'marked') cfg.filter = 'marked';
    if (preset === 'innov') cfg.types = ['multi', 'numeric', 'order'];
    const fixedFilter = ['wrong', 'due', 'marked'].includes(preset);
    const titles = { smart: 'Práctica inteligente', weak: 'Subáreas difíciles', wrong: 'Mis errores', due: 'Repaso pendiente', marked: 'Guardadas', innov: 'Reactivos de innovación', area: D.area(el.dataset.area) ? D.area(el.dataset.area).name : 'Área', sub: el.dataset.sub ? `${el.dataset.sub} · ${D.sub(el.dataset.sub).short || D.sub(el.dataset.sub).name}` : '' };
    cfg.title = titles[preset] || 'Práctica';
    const count = () => {
      const pool = S.pick({ subs: cfg.subs, types: cfg.types, n: 99999, filter: fixedFilter ? cfg.filter : BUILD.filter, diffs: BUILD.diffs, keepCases: false });
      return pool.length;
    };
    const render = (panel) => {
      const avail = count();
      U.$('#bldAvail', panel).textContent = `${U.plural(avail, 'pregunta disponible', 'preguntas disponibles')} con estos filtros`;
      U.$$('[data-bn]', panel).forEach((b) => b.classList.toggle('on', Number(b.dataset.bn) === BUILD.n));
      U.$$('[data-bf]', panel).forEach((b) => b.classList.toggle('on', b.dataset.bf === BUILD.filter));
      U.$$('[data-bm]', panel).forEach((b) => b.classList.toggle('on', b.dataset.bm === BUILD.mode));
      U.$$('[data-bd]', panel).forEach((b) => b.classList.toggle('on', BUILD.diffs.includes(Number(b.dataset.bd))));
    };
    const filters = [['smart', 'Inteligente'], ['new', 'Solo nuevas'], ['wrong', 'Falladas'], ['all', 'Al azar']];
    const v = await ui.modal({
      title: cfg.title,
      body: `<div class="form">
        <div class="fld"><span>¿Cuántas preguntas?</span><div class="chips">${[10, 20, 30, 50].map((n) => `<button type="button" class="chip-btn" data-bn="${n}">${n}</button>`).join('')}</div></div>
        ${fixedFilter ? '' : `<div class="fld"><span>¿Cuáles?</span><div class="chips">${filters.map(([k, l]) => `<button type="button" class="chip-btn" data-bf="${k}">${l}</button>`).join('')}</div></div>`}
        <div class="fld"><span>Dificultad <small>(sin marcar = todas)</small></span><div class="chips">${[[1, 'Básica'], [2, 'Media'], [3, 'Alta']].map(([d, l]) => `<button type="button" class="chip-btn" data-bd="${d}">${l}</button>`).join('')}</div></div>
        <div class="fld"><span>Modo</span><div class="chips"><button type="button" class="chip-btn" data-bm="tutor">Tutor <small>ve la respuesta al instante</small></button><button type="button" class="chip-btn" data-bm="exam">Examen <small>califica al final</small></button></div></div>
        <p class="muted small" id="bldAvail"></p>
      </div>`,
      actions: [
        { id: 'cancel', label: 'Cancelar' },
        { id: 'go', label: 'Empezar', kind: 'primary' },
      ],
      mount(panel) {
        render(panel);
        panel.addEventListener('click', (e) => {
          const b = e.target.closest('[data-bn],[data-bf],[data-bm],[data-bd]');
          if (!b) return;
          if (b.dataset.bn) BUILD.n = Number(b.dataset.bn);
          if (b.dataset.bf) BUILD.filter = b.dataset.bf;
          if (b.dataset.bm) BUILD.mode = b.dataset.bm;
          if (b.dataset.bd) {
            const d = Number(b.dataset.bd);
            BUILD.diffs = BUILD.diffs.includes(d) ? BUILD.diffs.filter((x) => x !== d) : BUILD.diffs.concat(d);
          }
          render(panel);
        });
      },
    });
    if (v !== 'go') return;
    const qs = S.pick({ subs: cfg.subs, types: cfg.types, n: BUILD.n, filter: fixedFilter ? cfg.filter : BUILD.filter, diffs: BUILD.diffs });
    EG.startSession({ kind: preset === 'due' || preset === 'wrong' ? 'review' : 'practice', title: cfg.title, mode: BUILD.mode, qs, src: { preset, subs: cfg.subs } });
  };

  // ---------- Repaso ----------
  EG.views.review = {
    tab: 'review',
    title: 'Repaso',
    html() {
      const due = S.dueList();
      const wrong = S.wrongList();
      const guessed = S.guessedList();
      const marked = S.bookmarked().filter((id) => D.bank.has(id));
      const reported = S.reported().filter((id) => D.bank.has(id));
      const box = (ic, title, n, desc, act, extra) =>
        `<div class="rev-box"><div class="rev-ic">${ui.icon(ic)}</div><div class="rev-b"><b>${esc(title)}</b><span class="muted">${desc}</span></div><div class="rev-a"><span class="rev-n">${U.fmtNum(n)}</span>${n ? `<button type="button" class="btn btn-sm" ${act}>${extra || 'Repasar'}</button>` : ''}</div></div>`;
      const ids = (list) => esc(list.slice(0, 400).join(','));
      const sessions = S.sessions().filter((s) => s.done).slice(0, 8);
      const hist = sessions.length
        ? `<ol class="hist">${sessions.map(histRow).join('')}</ol><button type="button" class="link" data-act="nav" data-to="history">${ui.icon('list')} Ver todo el historial</button>`
        : `<p class="muted">Aquí verás tus sesiones terminadas para revisar cada respuesta.</p>`;
      const active = S.sessions().filter((s) => !s.done && s.qs.some((id) => !(s.it[id] && s.it[id][0] != null)));
      const pend = active.length ? `<section class="card"><h2 class="card-h">Sesiones sin terminar</h2><ol class="hist">${active.slice(0, 5).map((s) => { const sc = S.sessionScore(s); return `<li><button type="button" class="hist-row" data-act="resume" data-id="${esc(s.id)}"><span class="hist-ic">${ui.icon('play')}</span><span class="hist-b"><b>${esc(s.title)}</b><span class="muted small">${esc(U.fmtDateTime(s.t0))} · ${sc.n}/${sc.total} respondidas</span></span>${ui.icon('right')}</button></li>`; }).join('')}</ol></section>` : '';
      return `<div class="page">
        <header class="page-h"><div><h1>Repaso</h1><p class="muted">Las preguntas que fallas regresan al día siguiente; las que aciertas, cada vez más espaciadas (3, 7, 16 días). Así fijas lo aprendido sin perder tiempo en lo que ya dominas.</p></div></header>
        <section class="card rev">
          ${box('repeat', 'Para hoy', due.length, 'Preguntas cuyo repaso ya toca.', `data-act="start-review" data-n="20"`)}
          ${box('x', 'Mis errores', wrong.length, 'Tu última respuesta fue incorrecta.', `data-act="practice-ids" data-kind="mistakes" data-title="Mis errores" data-ids="${ids(wrong)}"`)}
          ${box('eye', 'Adivinadas', guessed.length, 'Acertaste, pero marcaste que adivinaste.', `data-act="practice-ids" data-kind="review" data-title="Adivinadas" data-ids="${ids(guessed)}"`)}
          ${box('star', 'Guardadas', marked.length, 'Las que marcaste con estrella.', `data-act="practice-ids" data-kind="review" data-title="Guardadas" data-ids="${ids(marked)}"`)}
          ${reported.length ? box('alert', 'Reportadas', reported.length, 'Preguntas en las que reportaste un error.', `data-act="nav" data-to="settings"`, 'Ver') : ''}
        </section>
        ${pend}
        <section class="card"><h2 class="card-h">Historial</h2>${hist}</section>
      </div>`;
    },
  };
  function histRow(s) {
    const sc = S.sessionScore(s);
    const p = sc.total ? sc.c / sc.total : 0;
    const kindIc = { exam: 'timer', diag: 'target', review: 'repeat', mistakes: 'x' }[s.k] || 'target';
    return `<li><button type="button" class="hist-row" data-act="nav" data-to="results" data-p='${esc(JSON.stringify({ id: s.id }))}'><span class="hist-ic">${ui.icon(kindIc)}</span><span class="hist-b"><b>${esc(s.title)}</b><span class="muted small">${esc(U.fmtDateTime(s.t0))} · ${sc.c}/${sc.total}</span></span><span class="hist-p ${p >= 0.8 ? 'hi' : p >= 0.6 ? 'mid' : 'lo'}">${U.pct(p)}</span>${ui.icon('right')}</button></li>`;
  }
  EG.views.history = {
    nested: true,
    tab: 'review',
    title: 'Historial',
    html(p) {
      const all = S.sessions().filter((s) => s.done);
      const lim = (p && p.lim) || 60;
      return `<div class="page"><header class="page-h"><div><h1>Historial</h1><p class="muted">${U.plural(all.length, 'sesión terminada', 'sesiones terminadas')}. Toca una para revisar cada pregunta.</p></div></header><section class="card">${all.length ? `<ol class="hist">${all.slice(0, lim).map(histRow).join('')}</ol>` : '<p class="muted">Todavía no terminas ninguna sesión.</p>'}${all.length > lim ? `<button type="button" class="btn btn-ghost" data-act="nav" data-to="history" data-p='${esc(JSON.stringify({ lim: lim + 60 }))}'>Ver más</button>` : ''}</section></div>`;
    },
  };

  // ---------- Simulacros ----------
  EG.views.exam = {
    tab: 'exam',
    title: 'Simulacro',
    html() {
      const past = S.sessions().filter((s) => s.k === 'exam' && s.done);
      const cards = Object.entries(S.EXAMS)
        .map(([k, c]) => {
          const n = Object.values(S.examPerSub(k)).reduce((a, b) => a + b, 0);
          return `<div class="sim"><div class="sim-b"><b>${esc(c.name)}</b><span class="muted">${esc(c.desc)}</span><span class="sim-m">${ui.icon('timer')} ${U.fmtDur(c.minutes * 60000)} · ${n} reactivos</span></div><button type="button" class="btn ${k === 'medio' ? 'btn-primary' : ''}" data-act="start-exam" data-kind="${k}">Empezar</button></div>`;
        })
        .join('');
      const areaBtns = D.meta.areas.map((a) => `<button type="button" class="chip-btn" data-act="start-exam" data-kind="disciplinar" data-area="${esc(a.id)}"><span class="dot" style="background:${ui.areaColor(a.id)}"></span>${esc(a.name)}</button>`).join('');
      const trend = past.length
        ? `<ol class="hist">${past.slice(0, 10).map(histRow).join('')}</ol>`
        : '<p class="muted">Tus simulacros terminados aparecerán aquí con su nivel estimado.</p>';
      return `<div class="page">
        <header class="page-h"><div><h1>Simulacro</h1><p class="muted">Modo examen: sin ver respuestas hasta el final, con cronómetro a 2.4 minutos por reactivo (el ritmo del examen real: 200 reactivos en 8 horas). Puedes marcar preguntas para revisarlas y pausar saliendo; tu avance se guarda.</p></div></header>
        <section class="card sims">${cards}</section>
        <section class="card"><h2 class="card-h">Solo un área</h2><p class="muted small">10 reactivos por cada subárea del área elegida.</p><div class="chips">${areaBtns}</div></section>
        <section class="card"><h2 class="card-h">Tus simulacros</h2>${trend}</section>
      </div>`;
    },
  };

  // ---------- Búsqueda ----------
  let SEARCH_IDX = null;
  function buildIndex() {
    SEARCH_IDX = [];
    for (const q of D.bank.values()) {
      const cs = q.case ? D.cases.get(q.case) : null;
      SEARCH_IDX.push({ id: q.id, text: U.norm([q.stem, (q.options || []).join(' '), q.why, q.tip, cs ? cs.title : ''].join(' ')) });
    }
  }
  EG.views.search = {
    nested: true,
    tab: 'practice',
    title: 'Buscar',
    html(p) {
      const term = (p && p.q) || '';
      return `<div class="page"><header class="page-h"><div><h1>Buscar</h1></div></header>
        <div class="search-box">${ui.icon('search')}<input id="searchIn" type="search" placeholder="Ej. TreeSet, subneteo, A*, Dijkstra, tilde diacrítica…" value="${esc(term)}" autocomplete="off" aria-label="Buscar preguntas y temas"></div>
        <div id="searchOut"></div></div>`;
    },
    mount(el, p) {
      const inp = U.$('#searchIn', el);
      const out = U.$('#searchOut', el);
      const run = () => {
        const term = U.norm(inp.value.trim());
        EG.router.cur.params.q = inp.value;
        if (term.length < 2) {
          out.innerHTML = '<p class="muted">Escribe al menos dos letras.</p>';
          return;
        }
        if (!SEARCH_IDX) buildIndex();
        const words = term.split(/\s+/).filter(Boolean);
        const hits = SEARCH_IDX.filter((x) => words.every((w) => x.text.includes(w))).slice(0, 80);
        const topics = [];
        for (const s of D.meta.subs) for (const t of s.topics) if (words.every((w) => U.norm(t.name + ' ' + (t.points || '')).includes(w))) topics.push({ s, t });
        const ids = hits.map((h) => h.id);
        out.innerHTML = `${topics.length ? `<section class="card"><h2 class="card-h">Temas</h2><ul class="tlist">${topics.slice(0, 12).map(({ s, t }) => `<li><div>${ui.subChip(s.code, { short: true })} <b>${esc(t.name)}</b></div><div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-act="open-guide" data-sub="${esc(s.code)}" data-topic="${esc(t.id)}">${ui.icon('book')}<span>Guía</span></button><button type="button" class="btn btn-sm" data-act="start-topic" data-topic="${esc(s.code + '.' + t.id)}" data-n="10">Practicar</button></div></li>`).join('')}</ul></section>` : ''}
          <section class="card"><div class="card-h-row"><h2 class="card-h">Preguntas</h2>${ids.length ? `<button type="button" class="btn btn-sm" data-act="practice-ids" data-kind="practice" data-title="Búsqueda: ${esc(inp.value.trim().slice(0, 30))}" data-ids="${esc(ids.join(','))}">Practicar estas ${ids.length}</button>` : ''}</div>${ids.length ? `<ol class="qrows">${ids.map((id) => { const q = D.bank.get(id); return `<li><button type="button" class="qrow" data-act="open-q" data-qid="${esc(id)}" data-list="${esc(ids.join(','))}">${ui.subChip(q.sub, { short: true })}<span class="qrow-t">${esc(EG.md.plain(q.stem).slice(0, 140))}</span></button></li>`; }).join('')}</ol>` : '<p class="muted">Sin resultados.</p>'}</section>`;
      };
      inp.addEventListener('input', U.debounce(run, 180));
      if (inp.value) run();
      setTimeout(() => inp.focus(), 50);
    },
  };
})();
