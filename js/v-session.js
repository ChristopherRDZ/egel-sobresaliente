/* Motor de preguntas (modo tutor y modo examen), retroalimentación, resultados y revisión. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const S = EG.store;
  const D = EG.data;
  const ui = EG.ui;
  const { esc } = U;
  const L = ['A', 'B', 'C', 'D', 'E', 'F'];
  const toArr = (v) => (Array.isArray(v) ? v.slice() : v == null ? [] : [v]);
  const clone = (v) => (Array.isArray(v) ? v.slice() : v);

  // Orden en que se muestran las opciones (índices originales).
  function optOrder(seed, q) {
    const n = q.options ? q.options.length : 0;
    const idx = [...Array(n).keys()];
    if (!n) return idx;
    if (q.type !== 'order' && !S.settings().shuffle) return idx;
    let perm = U.shuffle(idx, U.rng(String(seed) + ':' + q.id));
    if (q.type === 'order' && perm.every((v, i) => v === q.answer[i])) perm = perm.reverse();
    return perm;
  }
  EG.optOrder = optOrder;

  // ---------- HTML de una pregunta ----------
  function metaHtml(q) {
    const topic = D.topic(q.sub, q.topic);
    const fmt = ui.TYPE_LABEL[q.type] || ui.FMT_LABEL[q.fmt] || '';
    return `<div class="q-meta">${ui.subChip(q.sub)}<span class="q-topic">${esc(topic ? topic.name : '')}</span><span class="q-fmt">${esc(fmt)}</span>${ui.diffDots(q.diff)}</div>`;
  }
  function caseHtml(q, open) {
    const cs = q.case ? D.cases.get(q.case) : null;
    if (!cs) return '';
    return `<details class="case"${open ? ' open' : ''}><summary>${ui.icon('book')}<span class="case-t">${esc(cs.title || 'Caso')}</span><small>Estímulo de varias preguntas</small>${ui.icon('down', 'case-ch')}</summary><div class="case-b rich">${EG.md.render(cs.text)}${cs.fig ? EG.fig.render(cs.fig) : ''}</div></details>`;
  }
  function optsHtml(q, st) {
    const multi = q.type === 'multi';
    const sel = toArr(st.revealed ? st.ans : st.sel);
    const correct = multi ? q.answer : [q.answer];
    const locked = st.revealed;
    const hint = multi && !locked ? `<p class="q-hint">Elige <b>dos</b> opciones <span class="q-count">${sel.length}/2</span></p>` : '';
    const items = st.order
      .map((oi, k) => {
        const isSel = sel.includes(oi);
        const isOk = correct.includes(oi);
        let cls = 'opt';
        if (isSel) cls += ' sel';
        if (locked) cls += isOk ? ' ok' : isSel ? ' bad' : ' dim';
        const mark = locked ? (isOk ? ui.icon('check', 'opt-ic') : isSel ? ui.icon('x', 'opt-ic') : '') : '';
        const note = locked && q.notes && q.notes[oi] ? `<div class="opt-note rich">${EG.md.render(q.notes[oi])}</div>` : '';
        return `<li class="opt-li"><button type="button" class="${cls}" data-act="q-pick" data-i="${oi}"${locked ? ' disabled' : ''} aria-pressed="${isSel}"><span class="opt-l">${L[k]}</span><span class="opt-t rich">${EG.md.renderOption(q.options[oi])}</span>${mark}</button>${note}</li>`;
      })
      .join('');
    return `${hint}<ol class="opts${multi ? ' opts-multi' : ''}">${items}</ol>`;
  }
  function numHtml(q, st) {
    const unit = q.unit ? ` ${esc(q.unit)}` : '';
    if (st.revealed) {
      const ok = S.grade(q, st.ans) === 1;
      return `<div class="num-res"><div class="${ok ? 'ok' : 'bad'}"><small>Tu respuesta</small><b>${esc(st.ans == null || st.ans === '' ? '—' : st.ans)}${unit}</b></div><div class="ok"><small>Respuesta correcta</small><b>${esc(q.answer)}${unit}</b></div></div>`;
    }
    // inputmode text en todas: el teclado decimal del iPhone no trae signo menos, y variarlo por pregunta daría pistas
    return `<div class="num"><label for="numIn">Captura tu respuesta</label><div class="num-row"><input id="numIn" class="num-in" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(st.sel == null ? '' : st.sel)}" placeholder="Escribe tu resultado">${q.unit ? `<span class="num-unit">${esc(q.unit)}</span>` : ''}</div></div>`;
  }
  function orderHtml(q, st) {
    if (st.revealed) {
      const user = toArr(st.ans);
      const rows = q.answer
        .map((oi, k) => {
          const ok = user[k] === oi;
          return `<li class="ord-row ${ok ? 'ok' : 'bad'}"><span class="ord-n">${k + 1}</span><span class="rich">${EG.md.renderOption(q.options[oi])}</span>${ok ? ui.icon('check', 'opt-ic') : ui.icon('x', 'opt-ic')}</li>`;
        })
        .join('');
      const yours = user.length ? `<p class="q-hint">Tu orden: ${user.map((oi) => `<b>${L[st.order.indexOf(oi)]}</b>`).join(' → ')}</p>` : '';
      return `<div class="ord-res"><p class="q-hint">Orden correcto (✓ = lo colocaste en esa posición)</p><ol class="ord-list">${rows}</ol>${yours}</div>`;
    }
    const picked = toArr(st.sel);
    const target = picked
      .map((oi, k) => `<li><button type="button" class="ord-item in" data-act="q-unpick" data-i="${oi}" aria-label="${esc(`Quitar «${EG.md.plain(q.options[oi])}» de la posición ${k + 1}`)}"><span class="ord-n">${k + 1}</span><span class="rich">${EG.md.renderOption(q.options[oi])}</span>${ui.icon('x', 'ord-x')}</button></li>`)
      .join('');
    const slots = Array.from({ length: q.options.length - picked.length }, (_, k) => `<li class="ord-slot"><span class="ord-n">${picked.length + k + 1}</span></li>`).join('');
    const pool = st.order
      .filter((oi) => !picked.includes(oi))
      .map((oi) => `<li><button type="button" class="ord-item" data-act="q-pick" data-i="${oi}"><span class="opt-l">${L[st.order.indexOf(oi)]}</span><span class="rich">${EG.md.renderOption(q.options[oi])}</span></button></li>`)
      .join('');
    return `<div class="ord"><p class="q-hint">Toca los elementos en el orden correcto. Toca uno ya colocado para regresarlo.</p><ol class="ord-list ord-target">${target}${slots}</ol>${pool ? `<ul class="ord-pool">${pool}</ul>` : ''}</div>`;
  }
  function feedbackHtml(q, st) {
    const g = S.grade(q, st.ans);
    const ok = g === 1;
    const skipped = st.ans == null || st.ans === '' || (Array.isArray(st.ans) && !st.ans.length);
    const head = skipped ? `${ui.icon('info')}<span>Sin responder</span>` : ok ? `${ui.icon('check')}<span>¡Correcto!</span>` : `${ui.icon('x')}<span>Incorrecto</span>`;
    let correctLine = '';
    // div y no p: una opción con bloque de código (figure) cerraría el <p> antes de tiempo
    if (!ok && q.type === 'mc') correctLine = `<div class="fb-correct">Respuesta correcta: <b>${L[st.order.indexOf(q.answer)]})</b> <span class="rich">${EG.md.renderOption(q.options[q.answer])}</span></div>`;
    if (!ok && q.type === 'multi') correctLine = `<div class="fb-correct">Respuestas correctas: ${q.answer.map((i) => `<b>${L[st.order.indexOf(i)]})</b>`).join(' y ')}</div>`;
    const guess = st.canGuess && ok ? `<button type="button" class="chip-btn${st.guessed ? ' on' : ''}" data-act="q-guess" aria-pressed="${!!st.guessed}" title="Marca si acertaste sin estar seguro: la pregunta volverá pronto a tu repaso">${ui.icon('eye')} Adiviné</button>` : '';
    const ask = EG.tutor && EG.tutor.available ? `<button type="button" class="chip-btn chip-claude" data-act="q-ask">${ui.icon('spark')} Pregúntale a Claude</button>` : '';
    const book = S.mark(q.id) && S.mark(q.id).m;
    return `<section class="fb ${skipped ? 'fb-skip' : ok ? 'fb-ok' : 'fb-bad'}" aria-live="polite">
      <div class="fb-h" tabindex="-1">${head}</div>${correctLine}
      <div class="fb-why rich">${EG.md.render(q.why)}</div>
      <div class="fb-tip">${ui.icon('bulb')}<div class="rich">${EG.md.render(q.tip)}</div></div>
      ${q.src ? `<p class="fb-src">Para profundizar: ${esc(q.src)}</p>` : ''}
      <div class="fb-acts">${guess}<button type="button" class="chip-btn" data-act="q-guide">${ui.icon('book')} Guía del tema</button>${ask}<button type="button" class="chip-btn${book ? ' on' : ''}" data-act="q-bookmark" aria-pressed="${!!book}">${ui.icon('star')} ${book ? 'Guardada' : 'Guardar'}</button><button type="button" class="chip-btn" data-act="q-report">${ui.icon('alert')} Reportar error</button></div>
    </section>`;
  }
  function questionHtml(q, st) {
    let body = '';
    if (q.type === 'mc' || q.type === 'multi') body = optsHtml(q, st);
    else if (q.type === 'numeric') body = numHtml(q, st);
    else if (q.type === 'order') body = orderHtml(q, st);
    return `<article class="qcard" data-qid="${esc(q.id)}">${metaHtml(q)}${caseHtml(q, st.caseOpen)}<div class="q-stem rich">${EG.md.render(q.stem)}</div>${q.fig ? EG.fig.render(q.fig) : ''}${body}${st.revealed ? feedbackHtml(q, st) : ''}</article>`;
  }
  EG.questionHtml = questionHtml;

  // contexto de la pregunta mostrada (para acciones comunes de retroalimentación)
  const CTX = { q: null, st: null, s: null };
  EG.qctx = CTX;

  // ---------- inicio de sesiones ----------
  EG.startSession = function (opts) {
    if (!opts.qs || !opts.qs.length) {
      ui.toast('No hay preguntas con esos filtros. Prueba con otros.');
      return null;
    }
    const s = S.newSession(opts);
    EG.router.go('session', { id: s.id }, { replace: EG.router.cur && EG.router.cur.name === 'session' });
    return s;
  };
  EG.resumeSession = (id) => EG.router.go('session', { id });

  // ---------- corredor ----------
  // drafts: selección incompleta por pregunta (modo examen); elSaved: cronómetro ya guardado; ptr: ver onPtr
  const RUN = { s: null, i: 0, st: null, qStart: 0, tick: null, saveT: 0, key: null, drafts: {}, elSaved: 0, ptr: false };
  // una sincronización pudo traer respuestas a la sesión abierta (se fusionan en el mismo objeto): mostrarlas
  S.on((why) => {
    if (why !== 'remote' || !RUN.s) return;
    const cur = S.session(RUN.s.id);
    if (!cur) EG.router.go('home', {}, { root: true });
    // calificada en otro dispositivo: no seguir respondiendo ni contando tiempo en ella
    else if (cur.done) EG.router.go('results', { id: cur.id }, { replace: true });
    else {
      // la pregunta actual se respondió en otro dispositivo: mostrar esa respuesta y no pisarla con la selección vieja
      const st = RUN.st;
      const a = st && isAnswered(cur, st.qid) ? cur.it[st.qid][0] : null;
      if (st && JSON.stringify(a) !== JSON.stringify(st.ans == null ? null : st.ans)) RUN.st = null;
      rerender();
    }
  });
  const isAnswered = (s, qid) => {
    const it = s.it[qid];
    return !!it && it[0] != null && !(Array.isArray(it[0]) && !it[0].length) && it[0] !== '';
  };
  function firstOfCase(s, i) {
    const q = D.bank.get(s.qs[i]);
    if (!q || !q.case) return false;
    const prev = i > 0 ? D.bank.get(s.qs[i - 1]) : null;
    return !prev || prev.case !== q.case;
  }
  function stateFor(s, i) {
    const qid = s.qs[i];
    const q = D.bank.get(qid);
    // pregunta retirada del banco: runHtml muestra el aviso con "Continuar"
    if (!q) {
      RUN.st = null;
      return { q: null, st: null };
    }
    const it = s.it[qid];
    const answered = isAnswered(s, qid);
    if (!RUN.st || RUN.st.qid !== qid || RUN.st.sid !== s.id) {
      RUN.st = {
        qid,
        sid: s.id,
        sel: answered ? clone(it[0]) : RUN.drafts[qid] ? clone(RUN.drafts[qid]) : q.type === 'mc' || q.type === 'numeric' ? null : [],
        order: optOrder(s.sh, q),
        caseOpen: firstOfCase(s, i),
      };
      RUN.qStart = performance.now();
    }
    const st = RUN.st;
    st.revealed = s.mode !== 'exam' && answered;
    st.ans = answered ? it[0] : null;
    st.mode = s.mode;
    st.canGuess = s.mode !== 'exam';
    st.guessed = answered ? !!it[4] : false;
    return { q, st };
  }
  function topHtml(s) {
    const total = s.qs.length;
    const nAns = s.qs.filter((id) => isAnswered(s, id)).length;
    const exam = s.mode === 'exam';
    const qid = s.qs[RUN.i];
    const book = S.mark(qid) && S.mark(qid).m;
    const clock = exam && s.lim ? `<span class="run-clock" id="runClock" aria-label="Tiempo restante">${ui.icon('timer')}<b>${U.fmtClock(s.lim - s.el)}</b></span>` : exam ? `<span class="run-clock" id="runClock">${ui.icon('timer')}<b>${U.fmtClock(s.el)}</b></span>` : S.settings().practiceTimer ? `<span class="run-clock" id="runClock">${ui.icon('timer')}<b>00:00</b></span>` : '';
    return `<header class="run-top">
      <button type="button" class="icon-btn" data-act="run-exit" aria-label="Salir de la sesión">${ui.icon('x')}</button>
      <div class="run-prog"><div class="run-title"><span>${esc(s.title)}</span><span class="run-count">${RUN.i + 1} / ${total}</span></div>${ui.bar(nAns / total, null, 'bar-run')}</div>
      ${clock}
      <button type="button" class="icon-btn${book ? ' on' : ''}" data-act="q-bookmark" aria-pressed="${!!book}" aria-label="${book ? 'Quitar de guardadas' : 'Guardar pregunta'}">${ui.icon('star')}</button>
      <button type="button" class="icon-btn" data-act="run-map" aria-label="Mapa de preguntas">${ui.icon('grid')}</button>
    </header>`;
  }
  function barHtml(s, q, st) {
    const last = RUN.i === s.qs.length - 1;
    const allDone = s.qs.every((id) => isAnswered(s, id));
    if (s.mode === 'exam') {
      const fl = s.fl.includes(q.id);
      return `<footer class="run-bar">
        <button type="button" class="btn btn-ghost" data-act="run-prev"${RUN.i === 0 ? ' disabled' : ''}>${ui.icon('left')}<span>Anterior</span></button>
        <button type="button" class="btn btn-ghost${fl ? ' on' : ''}" data-act="run-flag" aria-pressed="${fl}">${ui.icon('flag')}<span>${fl ? 'Marcada' : 'Revisar después'}</span></button>
        ${last ? `<button type="button" class="btn btn-primary" data-act="run-finish">Terminar</button>` : `<button type="button" class="btn btn-primary" data-act="run-next"><span>Siguiente</span>${ui.icon('right')}</button>`}
      </footer>`;
    }
    if (st.revealed) {
      return `<footer class="run-bar">
        <button type="button" class="btn btn-ghost" data-act="run-prev"${RUN.i === 0 ? ' disabled' : ''}>${ui.icon('left')}<span>Anterior</span></button>
        ${last || allDone ? `<button type="button" class="btn btn-primary" data-act="run-finish">${allDone ? 'Ver resultados' : 'Terminar'}</button>` : ''}
        ${!last ? `<button type="button" class="btn ${allDone ? 'btn-ghost' : 'btn-primary'}" data-act="run-next" id="runNext"><span>Siguiente</span>${ui.icon('right')}</button>` : ''}
      </footer>`;
    }
    const ready = selectionComplete(q, st);
    return `<footer class="run-bar">
      <button type="button" class="btn btn-ghost" data-act="run-skip">${last ? 'Terminar' : 'Saltar'}</button>
      <button type="button" class="btn btn-primary" data-act="run-check" id="runCheck"${ready ? '' : ' disabled'}>Comprobar</button>
    </footer>`;
  }
  function selectionComplete(q, st) {
    if (q.type === 'mc') return st.sel != null;
    if (q.type === 'multi') return toArr(st.sel).length === 2;
    if (q.type === 'order') return toArr(st.sel).length === q.options.length;
    if (q.type === 'numeric') return st.sel != null && String(st.sel).trim() !== '';
    return false;
  }
  function runHtml() {
    const s = RUN.s;
    const { q, st } = stateFor(s, RUN.i);
    if (!q) {
      // que "Continuar" no confirme la pregunta anterior
      CTX.q = null;
      CTX.st = null;
      CTX.s = s;
      return `<div class="empty"><p>Esta pregunta ya no existe en el banco.</p><button class="btn btn-primary" data-act="run-next">Continuar</button></div>`;
    }
    CTX.q = q;
    CTX.st = st;
    CTX.s = s;
    return `<div class="run">${topHtml(s)}<div class="run-body">${questionHtml(q, st)}</div>${barHtml(s, q, st)}</div>`;
  }
  function rerender(opts) {
    const el = U.$('#view');
    if (!el || !RUN.s) return;
    const y = window.scrollY;
    // el HTML se reemplaza completo: conservar el foco del teclado y el desplazamiento del estímulo
    const key = ui.focusKey(el);
    const cb = U.$('.case-b', el);
    const cbTop = cb && !(opts && opts.top) ? cb.scrollTop : 0;
    el.innerHTML = runHtml();
    afterRender();
    const cb2 = cbTop ? U.$('.case-b', el) : null;
    if (cb2) cb2.scrollTop = cbTop;
    ui.restoreFocus(el, key, ['#runNext', '#runCheck:not(:disabled)', '.ord-pool button']);
    if (opts && opts.top) window.scrollTo(0, 0);
    else window.scrollTo(0, y);
    if (opts && opts.focusFb) {
      const fb = U.$('.fb');
      if (fb) {
        const r = fb.getBoundingClientRect();
        if (r.top > window.innerHeight * 0.7) window.scrollBy({ top: r.top - window.innerHeight * 0.35, behavior: U.prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }
  }
  function afterRender() {
    // recordar si el estudiante abrió o cerró el estímulo del caso (cada toque vuelve a dibujar la vista)
    const det = U.$('.qcard details.case');
    const st0 = RUN.st;
    if (det && st0) det.addEventListener('toggle', () => {
      if (RUN.st === st0) st0.caseOpen = det.open;
    });
    const inp = U.$('#numIn');
    if (inp) {
      inp.addEventListener('input', () => {
        RUN.st.sel = inp.value;
        const btn = U.$('#runCheck');
        if (btn) btn.disabled = !selectionComplete(CTX.q, RUN.st);
      });
      inp.addEventListener('change', () => {
        if (RUN.s.mode === 'exam') commitExam();
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (RUN.s.mode === 'exam') {
            commitExam();
            go(1);
          } else check();
        }
      });
    }
  }
  function elapsedQ() {
    return Math.min(15 * 60000, performance.now() - RUN.qStart);
  }
  function commitExam() {
    const s = RUN.s;
    const q = CTX.q;
    const st = RUN.st;
    const val = selectionComplete(q, st) ? clone(st.sel) : null;
    // la selección incompleta (ordenamiento o "elige dos") no se califica, pero se conserva al volver
    if (val == null) RUN.drafts[q.id] = clone(st.sel);
    else delete RUN.drafts[q.id];
    S.answer(s, q.id, val, elapsedQ());
    // lo guardado aquí no cuenta como cambio de otro dispositivo (listener 'remote')
    st.ans = val;
    RUN.qStart = performance.now();
  }
  function check() {
    const s = RUN.s;
    const q = CTX.q;
    const st = RUN.st;
    if (!selectionComplete(q, st)) return;
    S.answer(s, q.id, clone(st.sel), elapsedQ());
    rerender({ focusFb: true });
    // llevar el foco al resultado para que el lector de pantalla lo anuncie
    const h = U.$('.fb-h');
    if (h && h.focus) h.focus({ preventScroll: true });
  }
  function go(delta) {
    const s = RUN.s;
    const ni = RUN.i + delta;
    if (ni < 0) return;
    if (ni >= s.qs.length) {
      finishFlow();
      return;
    }
    RUN.i = ni;
    S.setPos(s, ni);
    rerender({ top: true });
  }
  async function finishFlow(force) {
    const s = RUN.s;
    if (!s) return;
    const missing = s.qs.filter((id) => !isAnswered(s, id)).length;
    if (!force && s.mode === 'exam') {
      const fl = s.fl.length;
      const v = await ui.modal({
        title: 'Terminar simulacro',
        body: `<p>${missing ? `Te faltan <b>${missing}</b> ${missing === 1 ? 'pregunta' : 'preguntas'} sin responder; contarán como incorrectas.` : 'Respondiste todas las preguntas.'}${fl ? ` Tienes <b>${fl}</b> marcadas para revisar.` : ''}</p>`,
        actions: [
          { id: 'cancel', label: 'Seguir respondiendo' },
          { id: 'ok', label: 'Terminar y calificar', kind: 'primary' },
        ],
      });
      if (v !== 'ok') return;
    } else if (!force && missing && missing < s.qs.length) {
      const v = await ui.modal({
        title: 'Terminar sesión',
        body: `<p>Quedan <b>${missing}</b> sin responder. Puedes terminar ahora y ver tus resultados, o seguir después desde Inicio.</p>`,
        actions: [
          { id: 'cancel', label: 'Seguir' },
          { id: 'ok', label: 'Ver resultados', kind: 'primary' },
        ],
      });
      if (v !== 'ok') return;
    }
    if (!s.qs.some((id) => isAnswered(s, id))) {
      S.discard(s);
      EG.router.go('home', {}, { root: true });
      return;
    }
    S.finish(s);
    EG.router.go('results', { id: s.id }, { replace: true });
  }
  function startTick() {
    stopTick();
    const s = RUN.s;
    if (!s) return;
    RUN.elSaved = s.el;
    const exam = s.mode === 'exam';
    if (!exam && !S.settings().practiceTimer) return;
    let last = performance.now();
    RUN.tick = setInterval(() => {
      const now = performance.now();
      // un tic dura ~1 s: el salto tras congelar o suspender la página (teléfono) no cuenta, como el tiempo oculto
      const dt = Math.min(now - last, 2000);
      last = now;
      if (document.visibilityState !== 'visible') return;
      const clock = U.$('#runClock b');
      if (exam) {
        s.el += dt;
        if (Date.now() - RUN.saveT > 15000) {
          RUN.saveT = Date.now();
          S.touchSession(s);
          RUN.elSaved = s.el;
        }
        if (clock) clock.textContent = U.fmtClock(s.lim ? s.lim - s.el : s.el);
        if (s.lim && s.lim - s.el <= 600000) U.$('#runClock') && U.$('#runClock').classList.add('warn');
        if (s.lim && s.el >= s.lim) {
          stopTick();
          // cerrar mapa o diálogos abiertos y calificar también la numérica que se estaba escribiendo
          while (ui.layers.length) ui.closeTop();
          commitExamIfInput();
          ui.toast('Se terminó el tiempo del simulacro.');
          finishFlow(true);
        }
      } else if (clock) clock.textContent = U.fmtClock(performance.now() - RUN.qStart);
    }, 1000);
  }
  function stopTick() {
    if (RUN.tick) clearInterval(RUN.tick);
    RUN.tick = null;
  }
  // la última interacción fue con el ratón o un toque (el clic deja el foco en la opción elegida)
  function onPtr() {
    RUN.ptr = true;
  }
  function onKey(e) {
    // cualquier tecla vuelve al modo teclado
    const ptr = RUN.ptr;
    RUN.ptr = false;
    if (EG.ui.layers.length || !RUN.s) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
    // Enter sobre un botón o enlace con foco: que lo active el navegador, no el atajo de avanzar; sobre la opción
    // recién elegida con el ratón sí es el atajo (comprobar o avanzar)
    if (e.key === 'Enter' && e.target && e.target.closest) {
      const b = e.target.closest('button, a[href], summary, select, [contenteditable], [role=button]');
      if (b && !(ptr && b.matches('[data-act="q-pick"], [data-act="q-unpick"]'))) return;
    }
    const q = CTX.q;
    const st = RUN.st;
    if (!st) return;
    const k = e.key.toLowerCase();
    const n = q && q.options ? q.options.length : 0;
    const idx = '123456'.indexOf(k) >= 0 ? '123456'.indexOf(k) : 'abcdef'.indexOf(k);
    if (idx >= 0 && idx < n && !st.revealed && k.length === 1) {
      e.preventDefault();
      pick(st.order[idx]);
      return;
    }
    if (k === 'enter') {
      e.preventDefault();
      if (st.revealed) go(1);
      else if (RUN.s.mode === 'exam') go(1);
      else check();
    } else if (k === 'arrowright' && (st.revealed || RUN.s.mode === 'exam')) go(1);
    else if (k === 'arrowleft' && (st.revealed || RUN.s.mode === 'exam')) go(-1);
  }
  function pick(oi) {
    const s = RUN.s;
    const q = CTX.q;
    const st = RUN.st;
    if (st.revealed) return;
    if (q.type === 'mc') {
      st.sel = oi;
      if (s.mode === 'exam') commitExam();
      else if (S.settings().oneTap) {
        check();
        return;
      }
    } else if (q.type === 'multi') {
      const arr = toArr(st.sel);
      const at = arr.indexOf(oi);
      if (at >= 0) arr.splice(at, 1);
      else {
        arr.push(oi);
        if (arr.length > 2) arr.shift();
      }
      st.sel = arr;
      if (s.mode === 'exam') commitExam();
    } else if (q.type === 'order') {
      const arr = toArr(st.sel);
      if (!arr.includes(oi)) arr.push(oi);
      st.sel = arr;
      if (s.mode === 'exam') commitExam();
    }
    rerender();
  }

  EG.views.session = {
    focus: true,
    title: 'Sesión',
    html(p) {
      const s = S.session(p.id);
      if (!s) return `<div class="empty"><p>Esta sesión ya no existe.</p><button class="btn btn-primary" data-act="nav" data-to="home">Ir al inicio</button></div>`;
      RUN.s = s;
      RUN.st = null;
      RUN.drafts = {};
      RUN.i = U.clamp(s.pos || 0, 0, s.qs.length - 1);
      if (s.mode === 'tutor' && isAnswered(s, s.qs[RUN.i])) {
        const nxt = s.qs.findIndex((id) => !isAnswered(s, id));
        if (nxt >= 0) RUN.i = nxt;
      }
      return runHtml();
    },
    mount() {
      afterRender();
      document.addEventListener('keydown', onKey);
      document.addEventListener('pointerdown', onPtr, true);
      startTick();
    },
    unmount() {
      stopTick();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPtr, true);
      // solo si el cronómetro avanzó desde el último guardado: entrar y salir no cuenta como cambio
      if (RUN.s && RUN.s.el !== RUN.elSaved) S.touchSession(RUN.s);
      RUN.s = null;
      RUN.st = null;
    },
  };

  // ---------- acciones ----------
  const A = EG.actions;
  A['q-pick'] = (el) => {
    if (RUN.s) pick(Number(el.dataset.i));
  };
  A['q-unpick'] = (el) => {
    if (!RUN.s) return;
    const st = RUN.st;
    st.sel = toArr(st.sel).filter((x) => x !== Number(el.dataset.i));
    if (RUN.s.mode === 'exam') commitExam();
    rerender();
  };
  A['run-check'] = () => check();
  A['run-next'] = () => {
    if (RUN.s && RUN.s.mode === 'exam') commitExamIfInput();
    go(1);
  };
  A['run-prev'] = () => {
    if (RUN.s && RUN.s.mode === 'exam') commitExamIfInput();
    go(-1);
  };
  function commitExamIfInput() {
    if (CTX.q && CTX.q.type === 'numeric') commitExam();
  }
  A['run-skip'] = () => {
    if (RUN.i === RUN.s.qs.length - 1) finishFlow();
    else go(1);
  };
  A['run-finish'] = () => {
    if (RUN.s && RUN.s.mode === 'exam') commitExamIfInput();
    finishFlow();
  };
  A['run-flag'] = () => {
    S.toggleFlag(RUN.s, CTX.q.id);
    rerender();
  };
  // figura reducida en teléfono (aquí y en la revisión de preguntas): verla a tamaño natural
  A['fig-zoom'] = (el) => EG.fig.zoom(el);
  A['run-exit'] = async () => {
    const s = RUN.s;
    if (!s) return EG.router.back();
    const nAns = s.qs.filter((id) => isAnswered(s, id)).length;
    if (!nAns) {
      S.discard(s);
      return EG.router.back('home');
    }
    // con todo respondido lo pendiente es calificar: no prometer "continuar" y destacar Terminar
    const all = nAns === s.qs.length;
    const v = await ui.modal({
      title: 'Salir de la sesión',
      body: all
        ? `<p>Ya respondiste todas (${nAns} de ${s.qs.length}). Termina para ver tu calificación; si sales, puedes terminarla después desde Inicio.</p>`
        : `<p>Tu avance quedó guardado (${nAns} de ${s.qs.length}). Puedes continuar después desde Inicio.</p>`,
      actions: [
        { id: 'stay', label: 'Seguir aquí' },
        { id: 'finish', label: 'Terminar y calificar', kind: all ? 'primary' : undefined },
        { id: 'leave', label: 'Salir', kind: all ? undefined : 'primary' },
      ],
    });
    if (v === 'finish') finishFlow(s.mode === 'exam' ? false : true);
    else if (v === 'leave') EG.router.back('home');
  };
  A['run-map'] = () => {
    const s = RUN.s;
    if (!s) return;
    const cells = s.qs
      .map((id, k) => {
        const q = D.bank.get(id);
        const ans = isAnswered(s, id);
        const ok = ans && s.mode !== 'exam' ? S.grade(q, s.it[id][0]) === 1 : null;
        const cls = ['mapc', k === RUN.i ? 'cur' : '', ans ? 'ans' : '', ok === true ? 'ok' : ok === false ? 'bad' : '', s.fl.includes(id) ? 'fl' : ''].join(' ');
        const state = `${ans ? (ok === true ? 'correcta' : ok === false ? 'incorrecta' : 'respondida') : 'sin responder'}${s.fl.includes(id) ? ', marcada' : ''}`;
        return `<button type="button" class="${cls}" data-act="run-jump" data-k="${k}" aria-label="Pregunta ${k + 1}, ${state}"${k === RUN.i ? ' aria-current="true"' : ''}>${k + 1}</button>`;
      })
      .join('');
    const legend = s.mode === 'exam' ? '<span><i class="lg ans"></i>respondida</span><span><i class="lg fl"></i>marcada</span><span><i class="lg"></i>pendiente</span>' : '<span><i class="lg ok"></i>correcta</span><span><i class="lg bad"></i>incorrecta</span><span><i class="lg"></i>pendiente</span>';
    ui.sheet({ title: 'Mapa de preguntas', html: `<div class="map-legend">${legend}</div><div class="map">${cells}</div>` });
  };
  A['run-jump'] = (el) => {
    ui.closeTop();
    if (!RUN.s) return;
    if (RUN.s.mode === 'exam') commitExamIfInput();
    const k = Number(el.dataset.k);
    RUN.i = k;
    S.setPos(RUN.s, k);
    rerender({ top: true });
  };
  A['q-guess'] = () => {
    const st = CTX.st;
    if (!RUN.s || !st) return;
    S.setGuess(RUN.s, CTX.q.id, !st.guessed);
    rerender();
    ui.toast(st.guessed ? 'Anotado: volverá pronto a tu repaso.' : 'Quitado de adivinadas.');
  };
  A['q-bookmark'] = () => {
    const on = S.toggleBookmark(CTX.q.id);
    ui.toast(on ? 'Guardada en Repaso › Guardadas.' : 'Quitada de guardadas.');
    if (RUN.s) rerender();
    else EG.router.refresh();
  };
  A['q-guide'] = () => EG.guides && EG.guides.openTopic(CTX.q.sub, CTX.q.topic);
  A['q-ask'] = () => EG.tutor && EG.tutor.open(CTX.q, CTX.st);
  A['q-report'] = () => EG.reportDialog(CTX.q);

  EG.reportDialog = async function (q) {
    const reasons = ['La clave de respuesta está mal', 'Hay más de una respuesta correcta', 'La explicación tiene un error', 'Error de redacción u ortografía', 'Otro'];
    const prev = S.mark(q.id) && S.mark(q.id).r;
    let chosen = prev ? prev.reason : '';
    const v = await ui.modal({
      title: 'Reportar un error',
      body: `<p class="muted">Tu reporte queda guardado con tu progreso para corregir la pregunta <b>${esc(q.id)}</b>.</p><div class="chips" role="radiogroup" aria-label="Motivo">${reasons.map((r) => `<button type="button" class="chip-btn${r === chosen ? ' on' : ''}" data-reason="${esc(r)}" role="radio" aria-checked="${r === chosen}">${esc(r)}</button>`).join('')}</div><label class="fld"><span>Detalle (opcional)</span><textarea id="repText" rows="3" maxlength="800" placeholder="¿Qué está mal y por qué?">${esc(prev ? prev.text : '')}</textarea></label>`,
      actions: [
        ...(prev ? [{ id: 'clear', label: 'Quitar reporte' }] : []),
        { id: 'cancel', label: 'Cancelar' },
        { id: 'send', label: 'Guardar reporte', kind: 'primary' },
      ],
      mount(panel) {
        panel.addEventListener('click', (e) => {
          const b = e.target.closest('[data-reason]');
          if (!b) return;
          chosen = b.dataset.reason;
          U.$$('[data-reason]', panel).forEach((x) => {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-checked', String(x === b));
          });
        });
        const ta = U.$('#repText', panel);
        if (ta) ta.addEventListener('input', () => (panel.dataset.text = ta.value));
        panel.dataset.text = ta ? ta.value : '';
        EG._repPanel = panel;
      },
    });
    const text = EG._repPanel ? EG._repPanel.dataset.text : '';
    if (v === 'send') {
      S.report(q.id, chosen || 'Otro', text);
      ui.toast('Reporte guardado. ¡Gracias!');
    } else if (v === 'clear') {
      S.report(q.id, null);
      ui.toast('Reporte quitado.');
    }
  };

  // ---------- resultados ----------
  function sessionReport(s) {
    const byArea = {};
    const tot = {};
    for (const id of s.qs) {
      const q = D.bank.get(id);
      if (!q) continue;
      const a = D.sub(q.sub).area;
      tot[a] = (tot[a] || 0) + 1;
      const it = s.it[id];
      byArea[a] = (byArea[a] || 0) + (it && it[0] != null ? S.grade(q, it[0]) || 0 : 0);
    }
    const p = {};
    for (const a of Object.keys(tot)) p[a] = byArea[a] / tot[a];
    return { p, tot, rep: S.scoreReport(p) };
  }
  EG.sessionReport = sessionReport;

  EG.views.results = {
    nested: true,
    tab: 'review',
    title: 'Resultados',
    html(p) {
      const s = S.session(p.id);
      if (!s) return `<div class="empty"><p>No encontré esa sesión.</p></div>`;
      const sc = S.sessionScore(s);
      const pc = sc.total ? sc.c / sc.total : 0;
      const isExam = s.k === 'exam' || s.k === 'diag';
      const bySub = {};
      for (const id of s.qs) {
        const q = D.bank.get(id);
        if (!q) continue;
        const b = (bySub[q.sub] = bySub[q.sub] || { n: 0, c: 0 });
        b.n++;
        const it = s.it[id];
        b.c += it && it[0] != null ? S.grade(q, it[0]) || 0 : 0;
      }
      const wrong = s.qs.filter((id) => {
        const it = s.it[id];
        return !(it && it[0] != null && S.grade(D.bank.get(id), it[0]) === 1);
      });
      let examBlock = '';
      if (isExam) {
        const { p: pa, tot, rep } = sessionReport(s);
        const rows = EG.data.meta.areas
          .filter((a) => rep.areas[a.id])
          .map((a) => `<div class="area-row"><div class="area-row-h"><span class="dot" style="background:${ui.areaColor(a.id)}"></span><b>${esc(a.name)}</b><span class="muted">${Math.round(pa[a.id] * tot[a.id])}/${tot[a.id]} · ${U.pct(pa[a.id])}</span>${ui.levelPill(rep.areas[a.id].lvl, true)}</div>${ui.gauge(rep.areas[a.id].idx)}</div>`)
          .join('');
        // un simulacro parcial (una subárea o un área) no estima el resultado global ni la sección completa
        const full = !!(rep.disc && rep.disc.complete);
        const g = full ? rep.global : null;
        examBlock = `<section class="card">
          <h2 class="card-h">Nivel estimado</h2>
          ${g ? `<div class="global-lvl"><div>${ui.icon('medal')}</div><div><small>Resultado global estimado</small>${ui.levelPill(g)}${rep.lcMissing ? '<p class="muted small">Sin preguntas de Lenguaje y Comunicación: se supuso Satisfactorio en esa sección.</p>' : ''}</div></div>` : ''}
          ${full ? `<p class="muted small">Sección disciplinar: índice ${rep.disc.idx} (${S.LEVEL_NAME[rep.disc.lvl]})${rep.lc ? ` · Lenguaje y Comunicación: ${rep.lc.idx} (${S.LEVEL_NAME[rep.lc.lvl]})` : ''}</p>` : ''}
          <div class="area-rows">${rows}</div>
          <p class="note">${ui.icon('info')} Estimación orientativa: el Ceneval fija sus propios puntos de corte. Aquí se usa una meta exigente: 80% de aciertos ≈ 1150 (Sobresaliente) y 60% ≈ 1000 (Satisfactorio).</p>
        </section>`;
      }
      const subRows = Object.entries(bySub)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, b]) => `<li class="sub-res">${ui.subChip(code)}<span class="sub-res-n">${b.c}/${b.n}</span>${ui.bar(b.c / b.n, ui.areaColor(D.sub(code).area))}</li>`)
        .join('');
      const list = s.qs
        .map((id, k) => {
          const q = D.bank.get(id);
          if (!q) return '';
          const it = s.it[id];
          const ans = it && it[0] != null;
          const ok = ans && S.grade(q, it[0]) === 1;
          const ic = !ans ? `<span class="st st-skip" aria-label="Sin responder">–</span>` : ok ? `<span class="st st-ok" aria-label="Correcta">${ui.icon('check')}</span>` : `<span class="st st-bad" aria-label="Incorrecta">${ui.icon('x')}</span>`;
          return `<li><button type="button" class="qrow" data-act="open-q" data-qid="${esc(id)}" data-sid="${esc(s.id)}">${ic}<span class="qrow-n">${k + 1}</span><span class="qrow-t">${esc(EG.md.plain(q.stem).slice(0, 110))}</span>${ui.subChip(q.sub, { short: true })}</button></li>`;
        })
        .join('');
      return `<div class="page">
        <header class="page-h"><div><p class="eyebrow">${esc(U.fmtDateTime(s.t0))} · ${s.mode === 'exam' ? 'Modo examen' : 'Modo tutor'}</p><h1>${esc(s.title)}</h1></div></header>
        <section class="card score-card">
          ${ui.ring(pc, U.pct(pc), `${sc.c} de ${sc.total}`)}
          <div class="score-meta"><p><b>${sc.c}</b> ${sc.c === 1 ? 'correcta' : 'correctas'} · <b>${sc.n - sc.c}</b> ${sc.n - sc.c === 1 ? 'incorrecta' : 'incorrectas'} · <b>${sc.total - sc.n}</b> sin responder</p><p class="muted">Tiempo: ${U.fmtDur(s.mode === 'exam' && s.el ? s.el : sc.ms)} · ${sc.n ? U.fmtDur(sc.ms / sc.n) : '—'} por pregunta</p>
          <div class="btn-row">${wrong.length ? `<button type="button" class="btn btn-primary" data-act="practice-ids" data-kind="mistakes" data-title="Errores de la sesión" data-ids="${esc(wrong.join(','))}">${ui.icon('repeat')}<span>${sc.total - sc.n ? `Repasar las ${wrong.length} falladas u omitidas` : wrong.length === 1 ? 'Repasar mi error' : `Repasar mis ${wrong.length} errores`}</span></button>` : ''}<button type="button" class="btn btn-ghost" data-act="nav" data-to="home" data-root="1">Ir al inicio</button></div></div>
        </section>
        ${examBlock}
        <section class="card"><h2 class="card-h">Por subárea</h2><ul class="sub-res-list">${subRows}</ul></section>
        <section class="card"><h2 class="card-h">Preguntas</h2><p class="muted small">Toca una para ver la explicación completa.</p><ol class="qrows">${list}</ol></section>
      </div>`;
    },
  };

  // ---------- revisión de una pregunta ----------
  EG.views.qview = {
    nested: true,
    tab: 'review',
    title: 'Revisión',
    html(p) {
      const q = D.bank.get(p.qid);
      if (!q) return `<div class="empty"><p>Esa pregunta ya no existe.</p></div>`;
      const s = p.sid ? S.session(p.sid) : null;
      const it = s ? s.it[q.id] : null;
      const list = s ? s.qs : p.list || [q.id];
      const k = list.indexOf(q.id);
      const st = { order: optOrder(s ? s.sh : 'rev', q), revealed: true, ans: it && it[0] != null ? it[0] : null, mode: 'review', caseOpen: true, canGuess: false };
      CTX.q = q;
      CTX.st = st;
      CTX.s = null;
      const nav = list.length > 1 ? `<div class="btn-row qv-nav"><button type="button" class="btn btn-ghost" data-act="qv-go" data-d="-1"${k <= 0 ? ' disabled' : ''}>${ui.icon('left')}<span>Anterior</span></button><span class="muted">${k + 1} de ${list.length}</span><button type="button" class="btn btn-ghost" data-act="qv-go" data-d="1"${k >= list.length - 1 ? ' disabled' : ''}><span>Siguiente</span>${ui.icon('right')}</button></div>` : '';
      const stat = S.qstat(q.id);
      const hist = stat ? `<p class="muted small">Has respondido esta pregunta ${U.plural(stat.a, 'vez', 'veces')}, ${stat.c} bien. Próximo repaso: ${stat.d <= Date.now() ? 'pendiente' : U.fmtShort(stat.d)}.</p>` : '';
      const untried = !s && !stat ? `<button type="button" class="btn btn-primary" data-act="practice-ids" data-kind="practice" data-title="Pregunta ${esc(q.id)}" data-ids="${esc(q.id)}">Responderla</button>` : '';
      return `<div class="page page-narrow">${nav}${!s && !stat ? questionHtml(q, { order: st.order, revealed: false, sel: null, caseOpen: true }).replace(/data-act="q-pick"/g, 'data-act="noop" disabled') : questionHtml(q, st)}${hist}<div class="btn-row">${untried}</div>${nav}</div>`;
    },
  };
  A['open-q'] = (el) => EG.router.go('qview', { qid: el.dataset.qid, sid: el.dataset.sid || null, list: el.dataset.list ? el.dataset.list.split(',') : null });
  A['qv-go'] = (el) => {
    const p = EG.router.cur.params;
    const s = p.sid ? S.session(p.sid) : null;
    const list = s ? s.qs : p.list || [p.qid];
    const k = list.indexOf(p.qid) + Number(el.dataset.d);
    if (k < 0 || k >= list.length) return;
    EG.router.go('qview', { qid: list[k], sid: p.sid, list: p.list }, { replace: true });
  };
  A['practice-ids'] = (el) => {
    const ids = el.dataset.ids.split(',').filter((id) => D.bank.has(id));
    const qs = S.pick({ ids, n: ids.length, filter: 'all', keepCases: false, seed: Date.now() });
    EG.startSession({ kind: el.dataset.kind || 'practice', title: el.dataset.title || 'Práctica', mode: 'tutor', qs });
  };
  A.noop = () => {};
})();
