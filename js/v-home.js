/* Bienvenida, Inicio (plan de hoy, nivel estimado, puntos débiles) y plan completo. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const S = EG.store;
  const D = EG.data;
  const ui = EG.ui;
  const { esc } = U;
  const A = EG.actions;

  // ---------- arrancadores comunes ----------
  EG.startPractice = function (o) {
    const subs = o.subs || [];
    const qs = S.pick({ subs, topics: o.topics, n: o.n || 20, filter: o.filter || 'smart', types: o.types, diffs: o.diffs });
    let title = o.title;
    if (!title) {
      if (o.topics && o.topics.length === 1) {
        // la clave es "código.tema" y el código puede llevar punto (2.1.t03)
        const k = o.topics[0].lastIndexOf('.');
        const code = o.topics[0].slice(0, k);
        const tid = o.topics[0].slice(k + 1);
        const t = D.topic(code, tid);
        title = `${code} · ${t ? t.name : 'Tema'}`;
      } else if (subs.length === 1) title = `${subs[0]} · ${D.sub(subs[0]).short || D.sub(subs[0]).name}`;
      else title = 'Práctica inteligente';
    }
    return EG.startSession({ kind: o.kind || 'practice', title, mode: o.mode || 'tutor', qs, src: { subs, topics: o.topics || null, filter: o.filter || 'smart' } });
  };
  EG.startReview = function (n) {
    let ids = S.dueList();
    let title = 'Repaso del día';
    if (!ids.length) {
      ids = S.wrongList();
      title = 'Repaso de errores';
    }
    if (!ids.length) {
      ui.toast('No tienes repasos pendientes. ¡Practica temas nuevos!');
      return null;
    }
    // 'smart' prioriza las falladas y las adivinadas sobre el resto de las pendientes
    const qs = S.pick({ ids, n: n || 20, filter: 'smart', keepCases: false });
    return EG.startSession({ kind: 'review', title, mode: 'tutor', qs });
  };
  EG.startDiag = function () {
    const qs = S.pickExam(S.diagPerSub());
    return EG.startSession({ kind: 'diag', title: 'Diagnóstico inicial', mode: 'exam', qs, limit: 0 });
  };
  EG.startExam = function (kind, area) {
    const cfg = S.EXAMS[kind];
    const per = S.examPerSub(kind, area);
    const qs = S.pickExam(per);
    const minutes = Math.round(qs.length * 2.4) || cfg.minutes;
    const aname = area ? D.area(area).name : '';
    return EG.startSession({ kind: 'exam', title: area ? `Simulacro · ${aname}` : cfg.name, mode: 'exam', qs, limit: minutes * 60000, src: { exam: kind, area: area || null } });
  };

  A.nav = (el) => EG.router.go(el.dataset.to, el.dataset.p ? JSON.parse(el.dataset.p) : {}, { root: el.dataset.root === '1' });
  A.back = () => EG.router.back();
  A['start-sub'] = (el) => EG.startPractice({ subs: [el.dataset.sub], n: Number(el.dataset.n) || 20 });
  A['start-topic'] = (el) => EG.startPractice({ topics: [el.dataset.topic], n: Number(el.dataset.n) || 10 });
  A['start-review'] = (el) => EG.startReview(Number(el.dataset.n) || 20);
  A['start-diag'] = () => EG.startDiag();
  A['start-exam'] = (el) => EG.startExam(el.dataset.kind || 'medio', el.dataset.area || null);
  A['start-smart'] = (el) => EG.startPractice({ n: Number(el.dataset.n) || 20, subs: el.dataset.subs ? el.dataset.subs.split(',') : [] });
  A.resume = (el) => EG.resumeSession(el.dataset.id);
  A['open-guide'] = (el) => EG.router.go('guide', { sub: el.dataset.sub, topic: el.dataset.topic || null });

  // ---------- bienvenida ----------
  const WELCOME = { step: 0, date: '', goal: 40, weak: new Set(), name: '' };
  EG.resetWelcome = () => Object.assign(WELCOME, { step: 0, date: '', goal: 40, weak: new Set(), name: '' });
  EG.views.welcome = {
    focus: true,
    title: 'Bienvenida',
    html() {
      const p = S.profile();
      if (!WELCOME.date) WELCOME.date = p.examDate || U.dayKey(U.addDays(Date.now(), 30));
      const total = D.bank.size;
      const step = WELCOME.step;
      const dots = `<div class="steps" aria-hidden="true">${[0, 1, 2].map((k) => `<i class="${k === step ? 'on' : k < step ? 'done' : ''}"></i>`).join('')}</div>`;
      let body = '';
      if (step === 0) {
        body = `<div class="wel-hero"><div class="brand-mark big" aria-hidden="true">${EG.brandMark()}</div><p class="eyebrow">EGEL Plus COMPU · Ciencias Computacionales</p><h1>Tu ruta al Sobresaliente</h1><p class="lede">${U.fmtNum(total)} preguntas al estilo del examen, con la explicación de cada opción, guías de repaso de las 14 subáreas y simulacros con nivel estimado.</p></div>
        <ul class="wel-list">
          <li>${ui.icon('target')}<div><b>Como el examen real</b><span>Tres opciones, multirreactivos, relación de elementos y reactivos de innovación.</span></div></li>
          <li>${ui.icon('bulb')}<div><b>Aprendes de cada error</b><span>Por qué la correcta lo es y qué confusión hay detrás de cada distractor.</span></div></li>
          <li>${ui.icon('repeat')}<div><b>Repaso espaciado y plan diario</b><span>Lo que fallas regresa en el momento justo; el plan se ajusta a tus puntos débiles.</span></div></li>
        </ul>
        <div class="btn-row end"><button type="button" class="btn btn-primary btn-lg" data-act="wel-next" autofocus>Empezar${ui.icon('arrow')}</button></div>`;
      } else if (step === 1) {
        const goals = [[20, '≈ 30 min'], [40, '≈ 1 h'], [60, '≈ 1 h 30'], [80, '≈ 2 h']];
        const areaChips = D.meta.areas
          .map((a) => {
            const subs = D.meta.subs.filter((s) => s.area === a.id);
            return `<div class="wel-area"><p class="wel-area-h"><span class="dot" style="background:${ui.areaColor(a.id)}"></span>${esc(a.name)}</p><div class="chips">${subs.map((s) => `<button type="button" class="chip-btn${WELCOME.weak.has(s.code) ? ' on' : ''}" data-act="wel-weak" data-sub="${esc(s.code)}" aria-pressed="${WELCOME.weak.has(s.code)}"><b>${esc(s.code)}</b> ${esc(s.short || s.name)}</button>`).join('')}</div></div>`;
          })
          .join('');
        body = `<h1>Configura tu plan</h1>
        <div class="form">
          <label class="fld"><span>¿Cómo te llamas? <small>(opcional)</small></span><input id="welName" type="text" autocomplete="given-name" maxlength="40" value="${esc(WELCOME.name)}" placeholder="Tu nombre"></label>
          <label class="fld"><span>¿Cuándo presentas el examen?</span><input id="welDate" type="date" value="${esc(WELCOME.date)}" min="${U.dayKey(Date.now())}"></label>
          <div class="fld"><span>¿Cuántas preguntas al día?</span><div class="chips" role="radiogroup">${goals.map(([g, t]) => `<button type="button" class="chip-btn${WELCOME.goal === g ? ' on' : ''}" data-act="wel-goal" data-g="${g}" role="radio" aria-checked="${WELCOME.goal === g}"><b>${g}</b> ${t}</button>`).join('')}</div></div>
          <div class="fld"><span>¿Qué subáreas te cuestan más? <small>Les daré más tiempo en tu plan.</small></span>${areaChips}</div>
        </div>
        <div class="btn-row end"><button type="button" class="btn btn-ghost" data-act="wel-prev">Atrás</button><button type="button" class="btn btn-primary btn-lg" data-act="wel-next">Continuar${ui.icon('arrow')}</button></div>`;
      } else {
        const n = Object.values(S.diagPerSub()).reduce((a, b) => a + b, 0);
        body = `<h1>Haz un diagnóstico</h1>
        <p class="lede">${n} preguntas de todas las subáreas en modo examen (sin ver respuestas hasta el final), unos ${Math.round(n * 1.4)} minutos. Con el resultado tu plan prioriza lo que más necesitas.</p>
        <div class="card soft"><p>${ui.icon('info')} Puedes pausar cuando quieras: tu avance se guarda y lo retomas desde Inicio.</p></div>
        <div class="btn-row end"><button type="button" class="btn btn-ghost" data-act="wel-finish" data-diag="0">Más tarde</button><button type="button" class="btn btn-primary btn-lg" data-act="wel-finish" data-diag="1">Hacer diagnóstico</button></div>`;
      }
      return `<div class="welcome"><div class="welcome-card">${dots}${body}<p class="disclaimer">App de estudio independiente; no está afiliada al Ceneval. Estructura basada en la Guía del sustentante del EGEL Plus COMPU (2022).</p></div></div>`;
    },
  };
  function welRead() {
    const n = U.$('#welName');
    const d = U.$('#welDate');
    if (n) WELCOME.name = n.value.trim();
    if (d && d.value) WELCOME.date = d.value;
  }
  function welGo(d) {
    welRead();
    WELCOME.step = U.clamp(WELCOME.step + d, 0, 2);
    EG.router.render({ scroll: 0 });
  }
  // cada paso tiene su entrada en el historial, agregada con el toque (activación del usuario) para que el Atrás del
  // sistema regrese un paso; el «Atrás» de la página consume la del paso que deja
  A['wel-next'] = () => {
    if (EG.router.usesHistory && WELCOME.step < 2) EG.router.hist(() => history.pushState({ n: EG.router.depth() + 1 }, ''));
    welGo(1);
  };
  A['wel-prev'] = () => {
    if (EG.router.usesHistory && WELCOME.step > 0 && EG.router.depth() > 0) EG.router.histGo(-1);
    welGo(-1);
  };
  A['wel-goal'] = (el) => {
    welRead();
    WELCOME.goal = Number(el.dataset.g);
    EG.router.render({});
  };
  A['wel-weak'] = (el) => {
    welRead();
    const c = el.dataset.sub;
    if (WELCOME.weak.has(c)) WELCOME.weak.delete(c);
    else WELCOME.weak.add(c);
    el.classList.toggle('on');
    el.setAttribute('aria-pressed', String(WELCOME.weak.has(c)));
  };
  // botón Atrás del sistema en la bienvenida (el navegador ya retrocedió la entrada del paso): un paso atrás; false si
  // ya está en el primero
  EG.welcomeBack = () => {
    if (!WELCOME.step) return false;
    welGo(-1);
    return true;
  };
  A['wel-finish'] = (el) => {
    S.setProfile({ name: WELCOME.name, examDate: WELCOME.date, dailyGoal: WELCOME.goal, weak: [...WELCOME.weak], onboarded: true });
    EG.router.go('home', {}, { root: true });
    if (el.dataset.diag === '1') EG.startDiag();
  };

  // ---------- Inicio ----------
  function taskHtml(task, prog) {
    const goalNote = (done, n) => `<span class="task-n">${Math.min(done, n)}/${n}</span>`;
    if (task.type === 'diag') {
      const done = prog.diag || Object.values(S.state.ses).some((s) => s.k === 'diag' && s.done);
      return `<li class="task${done ? ' done' : ''}"><span class="task-ic">${ui.icon(done ? 'check' : 'target')}</span><div class="task-b"><b>Diagnóstico inicial</b><span class="muted">${Object.values(S.diagPerSub()).reduce((a, b) => a + b, 0)} preguntas de todas las subáreas</span></div>${done ? '' : '<button type="button" class="btn btn-sm" data-act="start-diag">Hacer</button>'}</li>`;
    }
    if (task.type === 'study') {
      const s = D.sub(task.sub);
      const done = prog.bySub[task.sub] || 0;
      const ok = done >= task.n;
      return `<li class="task${ok ? ' done' : ''}"><span class="task-ic" style="--c:${ui.areaColor(s.area)}">${ui.icon(ok ? 'check' : 'target')}</span><div class="task-b"><b>${esc(s.code)} ${esc(s.name)}</b><span class="task-p">${ui.bar(done / task.n, ui.areaColor(s.area))}${goalNote(done, task.n)}</span></div><div class="task-a"><button type="button" class="icon-btn" data-act="open-guide" data-sub="${esc(s.code)}" aria-label="Abrir guía de ${esc(s.name)}">${ui.icon('book')}</button><button type="button" class="btn btn-sm" data-act="start-sub" data-sub="${esc(s.code)}" data-n="${Math.max(10, task.n - done)}">${done ? 'Seguir' : 'Practicar'}</button></div></li>`;
    }
    if (task.type === 'review') {
      const due = S.dueList().length;
      const done = prog.review;
      const ok = done >= task.n || (!due && done > 0);
      return `<li class="task${ok ? ' done' : ''}"><span class="task-ic">${ui.icon(ok ? 'check' : 'repeat')}</span><div class="task-b"><b>Repaso espaciado</b><span class="task-p">${ui.bar(done / task.n)}${goalNote(done, task.n)}<span class="muted small">${due ? `${due} pendientes` : 'al día'}</span></span></div>${due || S.wrongList().length ? `<button type="button" class="btn btn-sm" data-act="start-review" data-n="${Math.max(10, task.n - done)}">Repasar</button>` : ''}</li>`;
    }
    if (task.type === 'exam') {
      const cfg = S.EXAMS[task.kind];
      // hecha con un simulacro de ese tipo (o el completo); un mini simulacro o uno de un área no la cumplen
      const done = prog.exams.has(task.kind) || prog.exams.has('completo');
      return `<li class="task task-exam${done ? ' done' : ''}"><span class="task-ic">${ui.icon(done ? 'check' : 'timer')}</span><div class="task-b"><b>${esc(cfg.name)}</b><span class="muted">${esc(cfg.desc)}</span></div>${done ? '' : `<button type="button" class="btn btn-sm" data-act="start-exam" data-kind="${esc(task.kind)}">Empezar</button>`}</li>`;
    }
    if (task.type === 'light') return `<li class="task"><span class="task-ic">${ui.icon('book')}</span><div class="task-b"><b>Repaso ligero</b><span class="muted">Relee las "Trampas frecuentes" de tus subáreas más débiles y descansa bien.</span></div><button type="button" class="btn btn-sm" data-act="nav" data-to="guides">Guías</button></li>`;
    return '';
  }
  function weakTopics(limit) {
    const rows = [];
    for (const s of D.meta.subs) {
      for (const t of s.topics) {
        const st = S.topicStats(s.code, t.id);
        if (st.total && st.seen >= 3) rows.push({ code: s.code, t, st });
      }
    }
    rows.sort((a, b) => a.st.acc - b.st.acc || b.st.seen - a.st.seen);
    return rows.filter((r) => r.st.acc < 0.8).slice(0, limit);
  }
  EG.weakTopics = weakTopics;

  EG.views.home = {
    tab: 'home',
    title: 'Inicio',
    html() {
      const p = S.profile();
      const plan = S.plan();
      const today = plan.days[0];
      const prog = S.todayProgress();
      const left = S.daysLeft();
      const active = S.activeSession();
      const exam = S.examDay();
      const greet = p.name ? `Hola, ${esc(p.name)}` : 'Tu plan de hoy';
      let count = '';
      if (left == null) count = `<button type="button" class="link" data-act="nav" data-to="settings">Define la fecha de tu examen</button>`;
      else if (left > 1) count = `Faltan <b>${left} días</b> · examen el ${esc(U.fmtLong(exam))}`;
      else if (left === 1) count = `<b>Mañana</b> es tu examen. Repasa ligero y descansa.`;
      else if (left === 0) count = `<b>Hoy</b> es tu examen. ¡Mucho éxito!`;
      else count = `Tu examen fue el ${esc(U.fmtLong(exam))}. Puedes seguir practicando o cambiar la fecha en Ajustes.`;
      const tasks = today ? today.tasks.map((t) => taskHtml(t, prog)).join('') : '';
      const answeredToday = (S.derived.daily.get(U.dayKey(Date.now())) || { n: 0 }).n;
      const goal = p.dailyGoal || 40;
      const cont = active
        ? (() => {
            const sc = S.sessionScore(active);
            return `<button type="button" class="btn btn-primary btn-lg btn-block" data-act="resume" data-id="${esc(active.id)}">${ui.icon('play')}<span>Continuar: ${esc(active.title)} <small>(${sc.n}/${sc.total})</small></span></button>`;
          })()
        : '';
      const rd = S.readiness();
      const answered = S.derived.q.size;
      const areaRows = D.meta.areas
        .map((a) => {
          const r = rd.areas[a.id];
          const st = S.areaStats(a.id);
          return `<button type="button" class="area-mini" data-act="nav" data-to="practice" data-p='${esc(JSON.stringify({ area: a.id }))}'><span class="area-mini-h"><span class="dot" style="background:${ui.areaColor(a.id)}"></span><b>${esc(a.short || a.name)}</b><span class="muted">${st.seen ? r.idx : '—'}</span></span>${ui.gauge(st.seen ? r.idx : null, { compact: true })}</button>`;
        })
        .join('');
      const weak = weakTopics(4);
      const weakHtml = weak.length
        ? `<ul class="weak">${weak.map((w) => `<li><div class="weak-b">${ui.subChip(w.code, { short: true })}<span>${esc(w.t.name)}</span><span class="muted small">${U.pct(w.st.acc)} de ${w.st.seen}</span></div><button type="button" class="btn btn-sm" data-act="start-topic" data-topic="${esc(w.code + '.' + w.t.id)}" data-n="10">Practicar</button></li>`).join('')}</ul>`
        : `<p class="muted">Cuando respondas algunas preguntas aquí aparecerán los temas donde más fallas.</p>`;
      const days14 = [];
      for (let k = 13; k >= 0; k--) {
        const t = U.addDays(Date.now(), -k);
        days14.push({ t, n: (S.derived.daily.get(U.dayKey(t)) || { n: 0 }).n });
      }
      const maxN = Math.max(goal, ...days14.map((d) => d.n));
      const spark = `<div class="spark" role="img" aria-label="Preguntas por día, últimos 14 días">${days14.map((d) => `<span title="${esc(U.fmtShort(d.t))}: ${d.n}" style="height:${Math.max(4, (d.n / maxN) * 100)}%" class="${d.n >= goal ? 'hit' : d.n ? 'some' : ''}"></span>`).join('')}</div>`;
      return `<div class="page home">
        <section class="card hero">
          <div class="hero-h"><div><p class="eyebrow">EGEL Plus COMPU</p><h1>${greet}</h1><p class="count">${count}</p></div>${ui.ring(answeredToday / goal, `${answeredToday}`, `de ${goal} hoy`)}</div>
          ${cont}
          ${today ? `<ol class="tasks">${tasks}</ol>` : '<p class="muted">Sin tareas para hoy.</p>'}
          <div class="btn-row"><button type="button" class="link" data-act="nav" data-to="plan">${ui.icon('cal')} Ver plan completo</button></div>
        </section>
        <section class="card readiness">
          <div class="card-h-row"><h2 class="card-h">Nivel estimado</h2>${answered ? ui.levelPill(rd.global || 'ANS', true) : ''}</div>
          <p class="muted small">${answered ? `Con base en ${U.plural(answered, 'pregunta distinta', 'preguntas distintas')} respondidas. Meta: 1150 o más en cada área.` : 'Responde preguntas para estimar tu Índice Ceneval por área (escala 700–1300).'}</p>
          <div class="area-minis">${areaRows}</div>
          <button type="button" class="link" data-act="nav" data-to="progress">${ui.icon('chart')} Ver progreso detallado</button>
        </section>
        <section class="card">
          <h2 class="card-h">Dónde más fallas</h2>
          ${weakHtml}
        </section>
        <section class="card stats-card">
          <div class="tiles">
            <div class="tile">${ui.icon('flame')}<b>${S.derived.streak}</b><span>${S.derived.streak === 1 ? 'día seguido' : 'días seguidos'}</span></div>
            <div class="tile">${ui.icon('check')}<b>${S.derived.totals.n ? U.pct(S.derived.totals.c / S.derived.totals.n) : '—'}</b><span>aciertos totales</span></div>
            <div class="tile">${ui.icon('list')}<b>${U.pct(answered / Math.max(1, D.bank.size))}</b><span>del banco visto</span></div>
          </div>
          ${spark}
        </section>
        <section class="quick">
          <button type="button" class="quick-b" data-act="start-smart" data-n="20">${ui.icon('target')}<b>Práctica inteligente</b><span>20 preguntas de todo, priorizando lo que necesitas</span></button>
          <button type="button" class="quick-b" data-act="nav" data-to="exam">${ui.icon('timer')}<b>Simulacro</b><span>Con tiempo y nivel estimado</span></button>
          <button type="button" class="quick-b" data-act="nav" data-to="guides">${ui.icon('book')}<b>Guías de repaso</b><span>Teoría breve de las 14 subáreas</span></button>
          <button type="button" class="quick-b" data-act="nav" data-to="search">${ui.icon('search')}<b>Buscar</b><span>Preguntas y temas por palabra</span></button>
        </section>
      </div>`;
    },
  };

  // ---------- plan completo ----------
  EG.views.plan = {
    nested: true,
    tab: 'home',
    title: 'Plan de estudio',
    html() {
      const plan = S.plan();
      const p = S.profile();
      const examT = S.examDay();
      if (!plan.days.length) return `<div class="page"><div class="card"><p>No hay días por planear antes de tu examen. Cambia la fecha en Ajustes si hace falta.</p><button class="btn btn-primary" data-act="nav" data-to="settings">Ir a Ajustes</button></div></div>`;
      const rows = plan.days
        .map((d, k) => {
          const items = d.tasks
            .map((t) => {
              if (t.type === 'study') {
                const s = D.sub(t.sub);
                return `<span class="plan-t" style="--c:${ui.areaColor(s.area)}"><b>${esc(s.code)}</b> ${esc(s.short || s.name)} · ${t.n}</span>`;
              }
              if (t.type === 'review') return `<span class="plan-t plan-r">Repaso · ${t.n}</span>`;
              if (t.type === 'exam') return `<span class="plan-t plan-e">${esc(S.EXAMS[t.kind].name)}</span>`;
              if (t.type === 'diag') return `<span class="plan-t plan-e">Diagnóstico</span>`;
              if (t.type === 'light') return `<span class="plan-t">Repaso ligero</span>`;
              return '';
            })
            .join('');
          return `<li class="plan-day${k === 0 ? ' today' : ''}"><div class="plan-date"><b>${esc(U.fmtDow(d.t))}</b><span>${esc(U.fmtShort(d.t))}</span></div><div class="plan-items">${k === 0 ? '<span class="pill pill-sm">Hoy</span>' : ''}${items}</div></li>`;
        })
        .join('');
      return `<div class="page">
        <header class="page-h"><div><p class="eyebrow">${plan.L} días hasta el examen${examT ? ` · ${esc(U.fmtLong(examT))}` : ''}</p><h1>Plan de estudio</h1><p class="muted">Cada día combina dos subáreas de áreas distintas y tu repaso espaciado. Las subáreas donde fallas más, y las que marcaste como difíciles, aparecen más veces. El plan se recalcula cada día con tu avance; la meta diaria es de ${Number(p.dailyGoal) || 40} preguntas.</p></div></header>
        <ol class="plan">${rows}<li class="plan-day plan-exam"><div class="plan-date"><b>${examT ? esc(U.fmtDow(examT)) : ''}</b><span>${examT ? esc(U.fmtShort(examT)) : ''}</span></div><div class="plan-items"><span class="plan-t plan-e">${ui.icon('medal')} Examen EGEL Plus COMPU</span></div></li></ol>
        <div class="btn-row"><button type="button" class="btn btn-ghost" data-act="nav" data-to="settings">Cambiar fecha o meta diaria</button></div>
      </div>`;
    },
  };
})();
