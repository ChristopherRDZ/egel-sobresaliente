/* Estado persistente, sincronización (claude.ai db o local), estadísticas derivadas, repaso espaciado,
   selección de preguntas, estimación del Índice Ceneval y plan de estudio. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const BASE_KEY = 'egel-sobresaliente:v1';
  // clave local: la base, o una propia si el navegador lo comparte otra cuenta de claude.ai (ver initSync)
  let KEY = BASE_KEY;
  const HOUR = 3600000;
  const DAY = 86400000;
  // Intervalos de repaso por caja (Leitner): 0 = fallada, 1 = adivinada, 2..5 = dominio creciente.
  const INTERVAL = [20 * HOUR, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];

  const S = (EG.store = {
    state: null,
    derived: null,
    sync: { mode: 'local', status: 'idle', error: '', last: 0 },
    INTERVAL,
  });
  const listeners = new Set();
  S.on = (fn) => listeners.add(fn);
  S.off = (fn) => listeners.delete(fn);
  const emit = (why) => listeners.forEach((fn) => {
    try {
      fn(why);
    } catch (e) {
      console.error(e);
    }
  });

  function defaults() {
    return {
      v: 1,
      main: {
        u: 0,
        // momento del último "Borrar todo": lo anterior se descarta también al sincronizar
        resetAt: 0,
        profile: { name: '', examDate: '', dailyGoal: 40, weak: [], onboarded: false, created: Date.now() },
        settings: { theme: 'system', text: 1, shuffle: true, oneTap: false, practiceTimer: false },
        read: {},
      },
      marks: { u: 0, q: {} },
      ses: {},
      plan: null,
      // ya hubo un pull exitoso en este dispositivo (antes, el perfil configurado en la nube gana al local)
      syncedOnce: false,
    };
  }

  // ---------- validación (datos de la nube o de un respaldo importado) ----------
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  function cleanProfile(p) {
    const o = Object.assign(defaults().main.profile, isObj(p) ? p : {});
    const meta = EG.data && EG.data.meta;
    const codes = meta ? new Set(meta.subs.map((s) => s.code).concat(meta.areas.map((a) => a.id))) : null;
    o.name = String(o.name == null ? '' : o.name).slice(0, 40);
    o.examDate = /^\d{4}-\d{2}-\d{2}$/.test(o.examDate) ? o.examDate : '';
    o.dailyGoal = U.clamp(Math.round(Number(o.dailyGoal)) || 40, 10, 300);
    o.weak = Array.isArray(o.weak) ? o.weak.filter((c) => typeof c === 'string' && (!codes || codes.has(c))) : [];
    o.onboarded = !!o.onboarded;
    return o;
  }
  function cleanSettings(st) {
    const o = Object.assign(defaults().main.settings, isObj(st) ? st : {});
    if (!['system', 'light', 'dark'].includes(o.theme)) o.theme = 'system';
    o.text = [1, 1.12, 1.25].includes(Number(o.text)) ? Number(o.text) : 1;
    for (const k of ['shuffle', 'oneTap', 'practiceTimer']) o[k] = !!o[k];
    return o;
  }
  const validMark = (m) => isObj(m) && (m.r == null || (isObj(m.r) && typeof m.r.reason === 'string' && (m.r.text == null || typeof m.r.text === 'string')));
  // Sesión con la forma que usan las vistas; null si no sirve (archivo editado o de otra versión).
  function cleanSession(s) {
    if (!isObj(s) || typeof s.id !== 'string' || !Array.isArray(s.qs) || !s.qs.every((x) => typeof x === 'string')) return null;
    if (!isObj(s.it) || !Number.isFinite(s.t0)) return null;
    for (const k of Object.keys(s.it)) if (!Array.isArray(s.it[k])) delete s.it[k];
    if (!Array.isArray(s.fl)) s.fl = [];
    return s;
  }

  // ---------- carga y guardado local ----------
  function sanitize(st) {
    const d = defaults();
    if (!isObj(st) || st.v !== 1) return d;
    st.main = Object.assign(d.main, isObj(st.main) ? st.main : {});
    st.main.profile = cleanProfile(st.main.profile);
    st.main.settings = cleanSettings(st.main.settings);
    st.main.read = isObj(st.main.read) ? st.main.read : {};
    // guardado por la versión anterior (sin syncedOnce): si ya se usaba, no es un dispositivo nuevo
    if (st.syncedOnce === undefined) st.syncedOnce = (Number(st.main.u) || 0) > 0;
    st.marks = Object.assign(d.marks, isObj(st.marks) ? st.marks : {});
    st.marks.q = isObj(st.marks.q) ? st.marks.q : {};
    for (const [id, m] of Object.entries(st.marks.q)) if (!validMark(m)) delete st.marks.q[id];
    st.ses = isObj(st.ses) ? st.ses : {};
    for (const [id, s] of Object.entries(st.ses)) if (!cleanSession(s)) delete st.ses[id];
    return st;
  }
  let hideHooked = false;
  S.load = function () {
    S.state = sanitize(U.storage.get(KEY, null));
    S.recompute();
    if (!hideHooked) {
      hideHooked = true;
      // guardar al ocultar o cerrar la app (la PWA puede descartarse sin aviso); en la nube sube lo pendiente
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') S.flushSync();
      });
      window.addEventListener('pagehide', () => S.flushSync());
    }
  };
  // al ocultar o cerrar solo se escribe si esta pestaña tiene algo sin guardar: otra pestaña o ventana del mismo sitio
  // pudo guardar después, y escribir el estado completo de esta, sin cambios, lo borraría
  let localPending = false;
  const saveLocalNow = U.debounce(() => {
    localPending = false;
    U.storage.set(KEY, S.state);
  }, 300);
  const saveLocal = () => {
    localPending = true;
    saveLocalNow();
  };
  saveLocal.flush = () => {
    if (localPending) saveLocalNow.flush();
  };
  S.saveNow = () => saveLocal.flush();
  // Otra pestaña o ventana del mismo sitio guardó (por ejemplo, la PWA instalada y una pestaña del navegador): fusionar
  // lo suyo como en un pull, para que lo que guarde esta después lo conserve en vez de pisarlo
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue || !S.state) return;
    let o = null;
    try {
      o = JSON.parse(e.newValue);
    } catch (err) {
      return;
    }
    if (!isObj(o) || o.v !== 1 || !isObj(o.main) || (o.owner && S.state.owner && o.owner !== S.state.owner)) return;
    let changed = false;
    const rAt = Number(o.main.resetAt) || 0;
    if (rAt > (S.state.main.resetAt || 0)) {
      dropBefore(rAt);
      changed = true;
    }
    if (mergeMain(o.main)) changed = true;
    if (mergeMarks(o.marks)) changed = true;
    const after = S.state.main.resetAt || 0;
    for (const s of Object.values(isObj(o.ses) ? o.ses : {})) {
      if (isObj(s) && Math.max(s.t0 || 0, s.u || 0) >= after && mergeSession(s, true)) changed = true;
    }
    // la copia que llegó no tiene algo que esta pestaña sí (la escribió otra con una versión anterior, que guarda su estado
    // completo al ocultarse, o se cruzaron dos guardados): volver a guardar, porque al cerrar esta ya no escribe nada
    const rses = isObj(o.ses) ? o.ses : {};
    const rq = isObj(o.marks) && isObj(o.marks.q) ? o.marks.q : {};
    const rrd = isObj(o.main.read) ? o.main.read : {};
    if (
      (S.state.main.u || 0) > (Number(o.main.u) || 0) ||
      (S.state.main.resetAt || 0) > rAt ||
      Object.values(S.state.ses).some((l) => ahead(l, rses[l.id])) ||
      Object.entries(S.state.marks.q).some(([id, m]) => !isObj(rq[id]) || (m.t || 0) > (rq[id].t || 0)) ||
      Object.entries(S.state.main.read).some(([k, t]) => Math.abs(t) > Math.abs(Number(rrd[k]) || 0))
    )
      saveLocal();
    if (!changed) return;
    S.state.plan = null;
    S.recompute();
    emit('remote');
  });

  // Marca un documento como modificado: guarda local y agenda la sincronización.
  function touch(docKey) {
    const t = Date.now();
    if (docKey === 'main') S.state.main.u = t;
    else if (docKey === 'marks') S.state.marks.u = t;
    saveLocal();
    if (SYNC.on) {
      SYNC.dirty.add(docKey);
      scheduleFlush();
    }
  }
  S.touch = touch;

  // ---------- perfil y ajustes ----------
  S.profile = () => S.state.main.profile;
  S.settings = () => S.state.main.settings;
  S.setProfile = (patch) => {
    const welcome = !!patch.onboarded && !S.state.main.profile.onboarded;
    Object.assign(S.state.main.profile, patch);
    S.state.plan = null;
    touch('main');
    // main.u que dejó la bienvenida: mientras no cambie, el perfil y los ajustes son los de partida (ver importData)
    if (welcome) S.state.main.welcomeAt = S.state.main.u;
    emit('profile');
  };
  S.setSettings = (patch) => {
    Object.assign(S.state.main.settings, patch);
    touch('main');
    emit('settings');
  };
  S.markRead = (key, on) => {
    // desmarcar deja una lápida (tiempo negativo) para que no regrese desde otro dispositivo
    S.state.main.read[key] = on ? Date.now() : -Date.now();
    touch('main');
    emit('read');
  };
  S.isRead = (key) => (S.state.main.read[key] || 0) > 0;

  // ---------- marcas por pregunta (guardada, reporte) ----------
  S.mark = (qid) => S.state.marks.q[qid] || null;
  S.toggleBookmark = (qid) => {
    const m = Object.assign({ m: 0, r: null }, S.state.marks.q[qid]);
    m.m = m.m ? 0 : 1;
    m.t = Date.now();
    S.state.marks.q[qid] = m;
    touch('marks');
    emit('marks');
    return !!m.m;
  };
  S.report = (qid, reason, text) => {
    const m = Object.assign({ m: 0, r: null }, S.state.marks.q[qid]);
    m.r = reason ? { reason, text: text || '', t: Date.now() } : null;
    m.t = Date.now();
    S.state.marks.q[qid] = m;
    touch('marks');
    emit('marks');
    if (reason && SYNC.on) {
      SYNC.db
        .collection('reports')
        .add({ qid, reason, text: String(text || '').slice(0, 800), t: Date.now(), v: (EG.data.meta && EG.data.meta.version) || '' })
        .catch(() => {});
    }
  };
  S.bookmarked = () => Object.keys(S.state.marks.q).filter((id) => S.state.marks.q[id].m);
  S.reported = () => Object.keys(S.state.marks.q).filter((id) => S.state.marks.q[id].r);

  // ---------- calificación ----------
  function cleanNum(s) {
    let t = String(s).trim().toLowerCase().replace(/\s+/g, '').replace(/\u2212/g, '-').replace(/[%$]/g, '');
    // coma de miles solo si el primer grupo no empieza en 0 ("0,343" es decimal)
    if (/^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
    else if (/^-?\d+,\d+$/.test(t)) t = t.replace(',', '.');
    return t;
  }
  S.grade = function (q, ans) {
    if (!q || ans == null || ans === '') return null;
    switch (q.type) {
      case 'mc':
        return ans === q.answer ? 1 : 0;
      case 'multi': {
        if (!Array.isArray(ans) || ans.length !== 2) return 0;
        const a = ans.slice().sort((x, y) => x - y);
        return a[0] === q.answer[0] && a[1] === q.answer[1] ? 1 : 0;
      }
      case 'order':
        return Array.isArray(ans) && ans.length === q.answer.length && ans.every((v, i) => v === q.answer[i]) ? 1 : 0;
      case 'numeric': {
        const g = cleanNum(ans);
        const cands = [q.answer].concat(q.accept || []);
        if (cands.some((c) => cleanNum(c) === g)) return 1;
        const gn = Number(g);
        if (g !== '' && !Number.isNaN(gn)) {
          const tol = q.tol != null ? q.tol : 1e-9;
          return cands.some((c) => {
            const cn = Number(cleanNum(c));
            return !Number.isNaN(cn) && Math.abs(cn - gn) <= tol + 1e-12;
          })
            ? 1
            : 0;
        }
        return 0;
      }
      default:
        return 0;
    }
  };

  // ---------- sesiones ----------
  // las descartadas quedan como lápida (del) para la sincronización, pero no se muestran
  S.sessions = () => Object.values(S.state.ses).filter((s) => !s.del).sort((a, b) => b.t0 - a.t0);
  S.session = (id) => (S.state.ses[id] && !S.state.ses[id].del ? S.state.ses[id] : null);
  // toda sesión sin terminar es reanudable, aunque ya tenga todas las respuestas (falta calificarla)
  S.activeSession = () => S.sessions().find((s) => !s.done && Date.now() - (s.u || s.t0) < 21 * DAY) || null;
  S.newSession = function (opts) {
    const t = Date.now();
    const s = {
      id: U.uid('s'),
      k: opts.kind || 'practice',
      title: opts.title || 'Práctica',
      mode: opts.mode || 'tutor',
      t0: t,
      u: t,
      t1: null,
      qs: opts.qs.slice(),
      sh: U.hash(t + ':' + Math.random()),
      pos: 0,
      it: {},
      fl: [],
      lim: opts.limit || 0,
      el: 0,
      done: false,
      src: opts.src || null,
    };
    // cerrar otras sesiones abiertas del mismo tipo de práctica para no acumular pendientes
    S.state.ses[s.id] = s;
    touchSession(s);
    emit('session');
    return s;
  };
  function touchSession(s) {
    s.u = Date.now();
    touch('w-' + U.weekKey(s.t0));
  }
  S.touchSession = touchSession;
  S.answer = function (s, qid, ans, ms, extra) {
    const prev = s.it[qid];
    const g = extra && extra.g ? 1 : 0;
    s.it[qid] = [ans, S.grade(EG.data.bank.get(qid), ans), Math.round((prev && prev[2]) || 0) + Math.round(ms || 0), Date.now(), g];
    touchSession(s);
    // también en simulacro: sus respuestas, aún sin calificar, cuentan ya en la actividad del día y la racha
    S.recompute();
    emit('answer');
  };
  S.setGuess = function (s, qid, on) {
    const it = s.it[qid];
    if (!it) return;
    it[4] = on ? 1 : 0;
    touchSession(s);
    S.recompute();
    emit('answer');
  };
  S.toggleFlag = function (s, qid) {
    const i = s.fl.indexOf(qid);
    if (i >= 0) s.fl.splice(i, 1);
    else s.fl.push(qid);
    touchSession(s);
    emit('flag');
  };
  S.setPos = function (s, pos) {
    s.pos = pos;
    touchSession(s);
  };
  S.finish = function (s) {
    if (s.done) return;
    s.done = true;
    s.t1 = Date.now();
    touchSession(s);
    S.recompute();
    emit('finish');
  };
  S.discard = function (s) {
    // lápida: la sesión descartada no regresa desde otro dispositivo al sincronizar
    S.state.ses[s.id] = { id: s.id, t0: s.t0, u: Date.now(), del: 1, qs: [], it: {}, fl: [] };
    touch('w-' + U.weekKey(s.t0));
    S.recompute();
    emit('discard');
  };
  S.sessionScore = function (s) {
    let n = 0;
    let c = 0;
    let ms = 0;
    for (const id of s.qs) {
      const it = s.it[id];
      if (it && it[0] != null) {
        n++;
        c += S.grade(EG.data.bank.get(id), it[0]) || 0;
        ms += it[2] || 0;
      }
    }
    return { n, c, total: s.qs.length, ms };
  };

  // ---------- estadísticas derivadas ----------
  S.recompute = function () {
    const bank = (EG.data && EG.data.bank) || new Map();
    const items = [];
    // un simulacro sin calificar todavía no cuenta en estadísticas ni repaso (sus errores no deben verse antes de
    // terminarlo); sus respuestas sí cuentan para la actividad del día y la racha
    const pending = [];
    for (const s of Object.values(S.state.ses)) {
      const open = s.mode === 'exam' && !s.done;
      for (const qid of Object.keys(s.it || {})) {
        const it = s.it[qid];
        if (!it || it[0] == null) continue;
        (open ? pending : items).push({ t: it[3] || s.t0, qid, ans: it[0], ms: it[2] || 0, g: it[4] || 0, k: s.k });
      }
    }
    items.sort((a, b) => a.t - b.t);
    const q = new Map();
    const daily = new Map();
    let n = 0;
    let c = 0;
    let ms = 0;
    for (const x of items) {
      const qq = bank.get(x.qid);
      if (!qq) continue;
      const ok = S.grade(qq, x.ans) || 0;
      const st = q.get(x.qid) || { a: 0, c: 0, l: 0, ok: 0, b: 0, d: 0, g: 0 };
      const due = st.d;
      st.a++;
      st.c += ok;
      st.l = x.t;
      st.ok = ok;
      st.g = x.g;
      if (!ok) st.b = 0;
      else if (x.g) st.b = 1;
      // un acierto antes de que toque repasarla no sube de caja (tras un fallo queda en 1: vuelve al día siguiente)
      else st.b = st.a === 1 ? 3 : x.t >= due ? Math.min(5, Math.max(2, st.b + 1)) : Math.max(1, st.b);
      st.d = x.t + INTERVAL[st.b];
      q.set(x.qid, st);
      const dk = U.dayKey(x.t);
      const day = daily.get(dk) || { n: 0, c: 0, ms: 0 };
      day.n++;
      day.c += ok;
      day.ms += Math.min(x.ms, 15 * 60000);
      daily.set(dk, day);
      n++;
      c += ok;
      ms += Math.min(x.ms, 15 * 60000);
    }
    // p: las del día que todavía no tienen acierto o error
    for (const x of pending) {
      if (!bank.has(x.qid)) continue;
      const dk = U.dayKey(x.t);
      const day = daily.get(dk) || { n: 0, c: 0, ms: 0 };
      day.n++;
      day.p = (day.p || 0) + 1;
      day.ms += Math.min(x.ms, 15 * 60000);
      daily.set(dk, day);
    }
    let streak = 0;
    let cur = Date.now();
    if (!daily.has(U.dayKey(cur))) cur = U.addDays(cur, -1);
    while (daily.has(U.dayKey(cur))) {
      streak++;
      cur = U.addDays(cur, -1);
    }
    S.derived = { q, daily, streak, totals: { n, c, ms } };
  };
  S.qstat = (qid) => (S.derived && S.derived.q.get(qid)) || null;

  // Dominio de un conjunto de preguntas: proporción de preguntas vistas cuya última respuesta fue correcta,
  // suavizada hacia 50% cuando hay pocos datos.
  S.groupStats = function (qids) {
    let seen = 0;
    let known = 0;
    let att = 0;
    let cor = 0;
    let due = 0;
    const now = Date.now();
    for (const id of qids) {
      const st = S.derived.q.get(id);
      if (!st) continue;
      seen++;
      known += st.ok;
      att += st.a;
      cor += st.c;
      if (st.d <= now) due++;
    }
    const total = qids.length;
    return {
      total,
      seen,
      known,
      att,
      cor,
      due,
      coverage: total ? seen / total : 0,
      acc: seen ? known / seen : null,
      est: (known + 2) / (seen + 4),
    };
  };
  S.subStats = (code) => S.groupStats(EG.data.bySub.get(code) || []);
  S.topicStats = (code, tid) => S.groupStats(EG.data.byTopic.get(code + '.' + tid) || []);
  S.areaStats = (aid) => S.groupStats(EG.data.meta.subs.filter((s) => s.area === aid).flatMap((s) => EG.data.bySub.get(s.code) || []));
  S.dueList = function () {
    const now = Date.now();
    const out = [];
    for (const [id, st] of S.derived.q) if (st.d <= now && EG.data.bank.has(id)) out.push(id);
    out.sort((a, b) => S.derived.q.get(a).b - S.derived.q.get(b).b || S.derived.q.get(a).d - S.derived.q.get(b).d);
    return out;
  };
  S.wrongList = () => [...S.derived.q].filter(([id, st]) => !st.ok && EG.data.bank.has(id)).map(([id]) => id);
  S.guessedList = () => [...S.derived.q].filter(([id, st]) => st.ok && st.g && EG.data.bank.has(id)).map(([id]) => id);

  // ---------- Índice Ceneval estimado ----------
  // Los puntos de corte reales los fija el Ceneval; aquí se usa una meta conservadora:
  // 60% de aciertos ≈ 1000 (Satisfactorio) y 80% ≈ 1150 (Sobresaliente).
  const CUTS = [[0, 700], [0.6, 1000], [0.8, 1150], [1, 1300]];
  S.icne = function (p) {
    const x = U.clamp(p, 0, 1);
    for (let i = 1; i < CUTS.length; i++) {
      const [x0, y0] = CUTS[i - 1];
      const [x1, y1] = CUTS[i];
      if (x <= x1) return Math.round(y0 + ((x - x0) / (x1 - x0)) * (y1 - y0));
    }
    return 1300;
  };
  S.level = (idx) => (idx >= 1150 ? 'SS' : idx >= 1000 ? 'S' : 'ANS');
  S.LEVEL_NAME = { SS: 'Sobresaliente', S: 'Satisfactorio', ANS: 'Aún no satisfactorio' };
  S.globalLevel = function (disc, lc) {
    if (disc === 'ANS') return 'ANS';
    if (disc === 'SS') return lc === 'ANS' ? 'S' : 'SS';
    return 'S';
  };
  // Combina proporciones por área en índices por área, por sección y nivel global.
  S.scoreReport = function (byArea) {
    const meta = EG.data.meta;
    const areas = {};
    for (const a of meta.areas) {
      const v = byArea[a.id];
      if (v == null) continue;
      const idx = S.icne(v);
      areas[a.id] = { p: v, idx, lvl: S.level(idx) };
    }
    const sec = (ids) => {
      const present = ids.filter((id) => areas[id]);
      if (!present.length) return null;
      const w = present.reduce((s, id) => s + meta.areas.find((a) => a.id === id).items, 0);
      const idx = Math.round(present.reduce((s, id) => s + areas[id].idx * meta.areas.find((a) => a.id === id).items, 0) / w);
      return { idx, lvl: S.level(idx), complete: present.length === ids.length };
    };
    const disc = sec(['A1', 'A2', 'A3', 'A4']);
    const lc = areas.LC ? { idx: areas.LC.idx, lvl: areas.LC.lvl, complete: true } : null;
    const global = disc ? S.globalLevel(disc.lvl, lc ? lc.lvl : 'S') : null;
    return { areas, disc, lc, global, lcMissing: !lc };
  };
  S.readiness = function () {
    const byArea = {};
    for (const a of EG.data.meta.areas) byArea[a.id] = S.areaStats(a.id).est;
    return S.scoreReport(byArea);
  };

  // ---------- selección de preguntas ----------
  function scoreFor(id, filter, rnd, now) {
    const st = S.derived.q.get(id);
    const j = rnd() * 1.5;
    if (filter === 'all') return rnd();
    if (!st) return 5 + j;
    if (!st.ok) return 6 + (st.d <= now ? 1 : 0) + j;
    if (st.g) return 4.5 + j;
    if (st.d <= now) return 4 + j;
    return 1 + Math.min(2, (now - st.l) / (7 * DAY)) + j * 0.6;
  }
  function passFilter(id, filter, now) {
    const st = S.derived.q.get(id);
    switch (filter) {
      case 'new':
        return !st;
      case 'wrong':
        return !!st && !st.ok;
      case 'due':
        return !!st && st.d <= now;
      case 'guessed':
        return !!st && st.ok && st.g;
      case 'marked':
        return !!(S.state.marks.q[id] && S.state.marks.q[id].m);
      default:
        return true;
    }
  }
  // opts: {subs, topics, ids, n, filter, types, diffs, seed, keepCases, countOnly}
  S.pick = function (opts) {
    const o = Object.assign({ n: 20, filter: 'smart', keepCases: true }, opts);
    const data = EG.data;
    const now = Date.now();
    const rnd = U.rng(o.seed != null ? o.seed : Date.now());
    let pool = o.ids ? o.ids.filter((id) => data.bank.has(id)) : [...data.bank.keys()];
    if (o.subs && o.subs.length) pool = pool.filter((id) => o.subs.includes(data.bank.get(id).sub));
    if (o.topics && o.topics.length) pool = pool.filter((id) => {
      const q = data.bank.get(id);
      return o.topics.includes(q.sub + '.' + q.topic);
    });
    if (o.types && o.types.length) pool = pool.filter((id) => o.types.includes(data.bank.get(id).type));
    if (o.diffs && o.diffs.length) pool = pool.filter((id) => o.diffs.includes(data.bank.get(id).diff));
    pool = pool.filter((id) => passFilter(id, o.filter, now));
    // solo contar las disponibles (constructor de sesiones): sin puntuar ni elegir
    if (o.countOnly) return pool;
    const scored = pool.map((id) => ({ id, s: scoreFor(id, o.filter, rnd, now), topic: data.bank.get(id).sub + '.' + data.bank.get(id).topic }));
    scored.sort((a, b) => b.s - a.s);
    const chosen = [];
    const taken = new Set();
    const perTopic = {};
    const inPool = new Set(pool);
    let count = 0;
    while (count < o.n && taken.size < scored.length) {
      let best = null;
      let bestS = -Infinity;
      for (const x of scored) {
        if (taken.has(x.id)) continue;
        const eff = x.s - 0.9 * (perTopic[x.topic] || 0);
        if (eff > bestS) {
          bestS = eff;
          best = x;
        }
      }
      if (!best) break;
      const q = data.bank.get(best.id);
      let group = [best.id];
      if (o.keepCases && q.case) {
        group = (data.byCase.get(q.case) || [best.id]).filter((id) => inPool.has(id) && !taken.has(id));
        if (!group.includes(best.id)) group.unshift(best.id);
      }
      for (const id of group) taken.add(id);
      // n cuenta preguntas, no grupos: un caso que se pasaría por más de una se salta (como en pickExam)
      if (count && count + group.length > o.n + (group.length > 1 ? 1 : 0)) continue;
      perTopic[best.topic] = (perTopic[best.topic] || 0) + group.length;
      chosen.push(group);
      count += group.length;
    }
    // casos juntos, el resto revuelto
    return U.shuffle(chosen, rnd).flat();
  };

  // Selección tipo examen: por subárea, preferir no vistas y las vistas hace más tiempo; repartir temas.
  S.pickExam = function (perSub, seed) {
    const data = EG.data;
    const rnd = U.rng(seed != null ? seed : Date.now());
    const now = Date.now();
    const out = [];
    for (const sub of data.meta.subs) {
      const need = perSub[sub.code] || 0;
      if (!need) continue;
      const ids = data.bySub.get(sub.code) || [];
      const score = (id) => {
        const st = S.derived.q.get(id);
        return (st ? Math.min(6, (now - st.l) / (3 * DAY)) : 10) + rnd() * 2;
      };
      const groups = [];
      const seenCase = new Set();
      for (const id of ids) {
        const q = data.bank.get(id);
        if (q.case) {
          if (seenCase.has(q.case)) continue;
          seenCase.add(q.case);
          const g = data.byCase.get(q.case) || [id];
          groups.push({ ids: g, topic: q.topic, s: g.reduce((a, x) => a + score(x), 0) / g.length });
        } else groups.push({ ids: [id], topic: q.topic, s: score(id) });
      }
      groups.sort((a, b) => b.s - a.s);
      const per = {};
      const pick = [];
      let count = 0;
      const used = new Set();
      while (count < need && used.size < groups.length) {
        let best = -1;
        let bestS = -Infinity;
        groups.forEach((g, k) => {
          if (used.has(k)) return;
          if (count + g.ids.length > need + (g.ids.length > 1 ? 1 : 0)) return;
          const eff = g.s - 2.5 * (per[g.topic] || 0);
          if (eff > bestS) {
            bestS = eff;
            best = k;
          }
        });
        if (best < 0) break;
        used.add(best);
        const g = groups[best];
        per[g.topic] = (per[g.topic] || 0) + 1;
        pick.push(g.ids);
        count += g.ids.length;
      }
      out.push(...U.shuffle(pick, rnd).flat());
    }
    return out;
  };
  S.EXAMS = {
    completo: { name: 'Simulacro completo', desc: '200 reactivos como el examen real: 140 disciplinares y 60 de Lenguaje y Comunicación.', per: 10, lc: [30, 30], minutes: 480 },
    disciplinar: { name: 'Sección disciplinar', desc: '140 reactivos: 10 por cada una de las 14 subáreas.', per: 10, lc: [0, 0], minutes: 336 },
    medio: { name: 'Medio simulacro', desc: '100 reactivos: 5 por subárea y 30 de Lenguaje y Comunicación.', per: 5, lc: [15, 15], minutes: 240 },
    rapido: { name: 'Simulacro rápido', desc: '48 reactivos: 3 por subárea y 6 de Lenguaje y Comunicación.', per: 3, lc: [3, 3], minutes: 115 },
  };
  S.examPerSub = function (kind, area) {
    const cfg = S.EXAMS[kind];
    const per = {};
    for (const sub of EG.data.meta.subs) {
      if (sub.area === 'LC') per[sub.code] = sub.code === 'LC1' ? cfg.lc[0] : cfg.lc[1];
      else per[sub.code] = cfg.per;
      // "Solo un área": cfg.per por subárea del área elegida (también Lenguaje y Comunicación)
      if (area) per[sub.code] = sub.area === area ? cfg.per : 0;
    }
    return per;
  };
  S.diagPerSub = function () {
    const per = {};
    for (const sub of EG.data.meta.subs) per[sub.code] = sub.area === 'LC' ? (sub.code === 'LC1' ? 3 : 2) : 2;
    return per;
  };

  // ---------- plan de estudio ----------
  S.examDay = function () {
    const p = S.profile();
    if (p.examDate) return U.parseDay(p.examDate).getTime();
    return null;
  };
  S.daysLeft = function () {
    const e = S.examDay();
    return e == null ? null : U.daysBetween(Date.now(), e);
  };
  S.plan = function () {
    const today = U.startOfDay(Date.now());
    const key = U.dayKey(today);
    const p = S.profile();
    const sig = [key, p.examDate, p.dailyGoal, (p.weak || []).join(','), EG.data.bank.size].join('|');
    if (S.state.plan && S.state.plan.sig === sig) return S.state.plan;
    const examT = S.examDay() || U.addDays(today, 30);
    const L = Math.max(0, U.daysBetween(today, examT));
    const goal = Math.max(10, p.dailyGoal || 40);
    const days = [];
    const diagDone = Object.values(S.state.ses).some((s) => s.k === 'diag' && s.done);
    const simDays = new Set();
    // anclados a la fecha del examen (18, 10 y 3 días antes; ligero la víspera) para que lleguen a "hoy"
    const hasDate = S.examDay() != null;
    if (hasDate) for (const k of [18, 10, 3]) if (L - k >= 0) simDays.add(L - k);
    const lightDay = hasDate && L >= 1 ? L - 1 : -1;
    const subs = EG.data.meta.subs;
    const weight = (s) => {
      const base = s.area === 'LC' ? (s.code === 'LC1' ? 0.45 : 0.55) : 1;
      const weak = (p.weak || []).includes(s.code) || (p.weak || []).includes(s.area) ? 1.5 : 1;
      const est = S.subStats(s.code).est;
      return base * weak * (1.3 - est);
    };
    const studyIdx = [];
    for (let d = 0; d < L; d++) if (!simDays.has(d) && d !== lightDay) studyIdx.push(d);
    const slots = studyIdx.length * 2;
    const ws = subs.map((s) => ({ code: s.code, area: s.area, w: weight(s) }));
    const sumW = ws.reduce((a, x) => a + x.w, 0) || 1;
    const minEach = slots >= subs.length ? 1 : 0;
    let alloc = ws.map((x) => ({ ...x, n: minEach, r: 0 }));
    let rest = slots - minEach * subs.length;
    alloc.forEach((x) => {
      const exact = (rest * x.w) / sumW;
      x.n += Math.floor(exact);
      x.r = exact - Math.floor(exact);
    });
    let left = slots - alloc.reduce((a, x) => a + x.n, 0);
    alloc.slice().sort((a, b) => b.r - a.r).forEach((x) => {
      if (left > 0) {
        x.n++;
        left--;
      }
    });
    const remaining = new Map(alloc.map((x) => [x.code, x.n]));
    const scheduled = new Set();
    let prev = [];
    const pickTwo = () => {
      const cands = alloc.filter((x) => remaining.get(x.code) > 0);
      const rank = (x) => remaining.get(x.code) + (scheduled.has(x.code) ? 0 : 3) + x.w - (prev.includes(x.code) ? 5 : 0);
      cands.sort((a, b) => rank(b) - rank(a));
      const a = cands[0];
      if (!a) return [];
      const b = cands.find((x) => x !== a && x.area !== a.area) || cands.find((x) => x !== a);
      return b ? [a.code, b.code] : [a.code];
    };
    for (let d = 0; d < L; d++) {
      const t = U.addDays(today, d);
      const tasks = [];
      if (d === 0 && !diagDone && L >= 3) tasks.push({ type: 'diag' });
      if (simDays.has(d)) {
        tasks.push({ type: 'exam', kind: d === L - 3 ? 'completo' : 'medio' });
        tasks.push({ type: 'review', n: Math.round(goal * 0.3) });
      } else if (d === lightDay) {
        tasks.push({ type: 'review', n: Math.round(goal * 0.5) });
        tasks.push({ type: 'light' });
      } else {
        const two = pickTwo();
        two.forEach((c) => {
          remaining.set(c, remaining.get(c) - 1);
          scheduled.add(c);
        });
        prev = two;
        const share = tasks.some((x) => x.type === 'diag') ? 0.3 : 0.4;
        two.forEach((c) => tasks.push({ type: 'study', sub: c, n: Math.max(8, Math.round(goal * share)) }));
        tasks.push({ type: 'review', n: Math.max(6, Math.round(goal * 0.2)) });
      }
      days.push({ t, d, tasks });
    }
    S.state.plan = { sig, days, examT, L };
    saveLocal();
    return S.state.plan;
  };
  // Avance de hoy por tarea
  S.todayProgress = function () {
    const key = U.dayKey(Date.now());
    const bySub = {};
    let review = 0;
    const exams = new Set();
    let diag = false;
    for (const s of Object.values(S.state.ses)) {
      for (const qid of Object.keys(s.it || {})) {
        const it = s.it[qid];
        if (!it || it[0] == null || U.dayKey(it[3] || s.t0) !== key) continue;
        const q = EG.data.bank.get(qid);
        if (!q) continue;
        if (s.k === 'review' || s.k === 'mistakes') review++;
        else bySub[q.sub] = (bySub[q.sub] || 0) + 1;
      }
      if (s.done && U.dayKey(s.t1) === key) {
        // tipos de simulacro completos terminados hoy (un mini simulacro o "Solo un área" no cuentan para el plan)
        if (s.k === 'exam' && s.src && S.EXAMS[s.src.exam] && !s.src.area) exams.add(s.src.exam);
        if (s.k === 'diag') diag = true;
      }
    }
    return { bySub, review, exam: exams.size > 0, exams, diag };
  };

  // ---------- exportar / importar / reiniciar ----------
  S.exportData = () => JSON.stringify({ app: 'egel-sobresaliente', v: 1, exported: new Date().toISOString(), main: S.state.main, marks: S.state.marks, ses: S.state.ses }, null, 0);
  S.importData = function (text) {
    const obj = JSON.parse(text);
    if (!obj || obj.app !== 'egel-sobresaliente' || obj.v !== 1) throw new Error('El archivo no es un respaldo de esta app.');
    // lo del archivo anterior al último "Borrar todo" se restaura con la fecha del borrado; lo inválido se descarta
    const after = S.state.main.resetAt || 0;
    if (after) liftBefore(obj, after);
    // perfil y ajustes del archivo si son más recientes, o si los locales solo vienen de la bienvenida
    const fresh = S.state.main.u === S.state.main.welcomeAt && isObj(obj.main) && isObj(obj.main.profile) && !!obj.main.profile.onboarded;
    if (mergeMain(obj.main, fresh)) touch('main');
    if (mergeMarks(obj.marks)) touch('marks');
    const weeks = new Set();
    for (const s of Object.values(isObj(obj.ses) ? obj.ses : {})) {
      if (isObj(s) && mergeSession(s)) weeks.add(U.weekKey(s.t0));
    }
    weeks.forEach((w) => touch('w-' + w));
    S.state.plan = null;
    S.recompute();
    emit('import');
  };
  // Respaldo anterior a "Borrar todo": se trata como restaurado en el momento del borrado, para que lo hecho después
  // gane al fusionar y la sincronización (que descarta lo anterior a resetAt) no lo vuelva a borrar. t0 no cambia.
  function liftBefore(obj, t) {
    const rd = isObj(obj.main) && isObj(obj.main.read) ? obj.main.read : {};
    for (const [k, v] of Object.entries(rd)) if (typeof v === 'number' && Math.abs(v) < t) {
      if (v > 0) rd[k] = t;
      else delete rd[k];
    }
    const q = isObj(obj.marks) && isObj(obj.marks.q) ? obj.marks.q : {};
    for (const m of Object.values(q)) if (isObj(m) && (m.t || 0) < t) m.t = t;
    const ses = isObj(obj.ses) ? obj.ses : {};
    for (const [id, s] of Object.entries(ses)) if (isObj(s) && Math.max(s.t0 || 0, s.u || 0) < t) {
      if (s.del) delete ses[id];
      else s.u = t;
    }
  }
  // Devuelve false si la copia de la nube no se pudo borrar todavía (queda pendiente y se reintenta).
  S.reset = async function () {
    const keys = docKeys();
    const now = Date.now();
    const keep = { owner: S.state.owner, syncedOnce: S.state.syncedOnce };
    S.state = Object.assign(defaults(), keep);
    // lápida en main: los demás dispositivos descartan lo anterior a resetAt al sincronizar
    S.state.main.u = now;
    S.state.main.resetAt = now;
    U.storage.set(KEY, S.state);
    S.recompute();
    let ok = true;
    if (SYNC.on && !SYNC.readonly) {
      keys.forEach((k) => SYNC.dirty.add(k));
      SYNC.dirty.add('main');
      while (SYNC.writing) await new Promise((r) => setTimeout(r, 200));
      await flush();
      ok = !SYNC.dirty.size;
    }
    emit('reset');
    return ok;
  };

  // ---------- sincronización con claude.ai (db por usuario) ----------
  // pulled: ya hubo un pull exitoso en esta carga; antes no se sube nada (set() reemplaza documentos completos)
  const SYNC = { on: false, db: null, uid: null, dirty: new Set(), writing: false, readonly: false, lastPull: 0, pulled: false, pulling: null, retry: 0, retryT: null };
  const col = () => SYNC.db.collection('data/users/' + SYNC.uid);
  // copia propia de lo que entrega la db: sus objetos llegan congelados y la app los modifica
  const own = (x) => JSON.parse(JSON.stringify(x == null ? null : x));
  function docKeys() {
    const keys = new Set(['main', 'marks']);
    for (const s of Object.values(S.state.ses)) keys.add('w-' + U.weekKey(s.t0));
    return [...keys];
  }
  function buildDoc(key) {
    if (key === 'main') return { u: S.state.main.u, resetAt: S.state.main.resetAt || 0, profile: S.state.main.profile, settings: S.state.main.settings, read: S.state.main.read };
    if (key === 'marks') return { u: S.state.marks.u, q: S.state.marks.q };
    const wk = key.slice(2);
    const s = {};
    let u = 0;
    for (const x of Object.values(S.state.ses)) if (U.weekKey(x.t0) === wk) {
      s[x.id] = x;
      u = Math.max(u, x.u || 0);
    }
    return { u, s };
  }
  // "Leído" por tema: t > 0 leído, t < 0 desmarcado (lápida); gana el de |t| mayor.
  function mergeRead(local, remote) {
    if (!isObj(remote)) return false;
    const after = S.state.main.resetAt || 0;
    let changed = false;
    for (const [k, t] of Object.entries(remote)) {
      if (typeof t !== 'number' || Math.abs(t) < after || Math.abs(t) <= Math.abs(local[k] || 0)) continue;
      local[k] = t;
      changed = true;
    }
    return changed;
  }
  function mergeMain(remote, force) {
    if (!isObj(remote)) return false;
    const main = S.state.main;
    let changed = mergeRead(main.read, remote.read);
    if (force || (Number(remote.u) || 0) > (main.u || 0)) {
      main.profile = cleanProfile(Object.assign({}, main.profile, isObj(remote.profile) ? remote.profile : {}));
      main.settings = cleanSettings(Object.assign({}, main.settings, isObj(remote.settings) ? remote.settings : {}));
      main.u = Math.max(Number(remote.u) || 0, main.u || 0);
      changed = true;
    }
    if (changed) S.state.plan = null;
    return changed;
  }
  function mergeMarks(remote) {
    if (!isObj(remote) || !isObj(remote.q)) return false;
    const after = S.state.main.resetAt || 0;
    let changed = false;
    for (const [id, m] of Object.entries(remote.q)) {
      if (!validMark(m) || (m.t || 0) < after) continue;
      const l = S.state.marks.q[id];
      if (!l || (m.t || 0) > (l.t || 0)) {
        S.state.marks.q[id] = m;
        changed = true;
      }
    }
    S.state.marks.u = Math.max(S.state.marks.u || 0, Number(remote.u) || 0);
    return changed;
  }
  // Fusiona una sesión remota dentro del objeto local, que la vista abierta sigue usando: por pregunta gana
  // la respuesta más reciente; terminada y tiempo se acumulan; marcas y posición son de la copia más nueva.
  // quietEl: el cronómetro que avanzó en otra pestaña (su tic guarda cada 15 s) se adopta sin contar como cambio
  function mergeSession(r, quietEl) {
    if (!cleanSession(r)) return false;
    const l = S.state.ses[r.id];
    if (!l) {
      S.state.ses[r.id] = r;
      return true;
    }
    const newer = (r.u || 0) > (l.u || 0);
    if (l.del || r.del) {
      // lápida contra sesión: gana la copia más reciente completa
      if (!newer) return false;
      for (const k of Object.keys(l)) delete l[k];
      Object.assign(l, r);
      return true;
    }
    let changed = false;
    for (const [qid, x] of Object.entries(r.it)) {
      const y = l.it[qid];
      const tx = x[3] || 0;
      const ty = (y && y[3]) || 0;
      if (!y || tx > ty || (tx === ty && newer && JSON.stringify(x) !== JSON.stringify(y))) {
        l.it[qid] = x;
        changed = true;
      }
    }
    if (r.done && !l.done) {
      l.done = true;
      changed = true;
    }
    const t1 = Math.max(l.t1 || 0, r.t1 || 0) || null;
    if (t1 !== (l.t1 || null)) {
      l.t1 = t1;
      changed = true;
    }
    if ((r.el || 0) > (l.el || 0)) {
      l.el = r.el;
      if (!quietEl) changed = true;
    }
    if (newer) {
      if (l.pos !== r.pos || JSON.stringify(l.fl) !== JSON.stringify(r.fl)) changed = true;
      l.fl = r.fl;
      l.pos = r.pos;
      l.u = r.u;
    }
    return changed;
  }
  // ¿La copia local tiene algo que la remota no? (respuesta más nueva, cierre, lápida…)
  function ahead(l, r) {
    if (!isObj(r)) return true;
    if ((l.u || 0) > (r.u || 0)) return true;
    if (l.del || r.del) return false;
    if (l.done && !r.done) return true;
    const rit = isObj(r.it) ? r.it : {};
    return Object.entries(l.it || {}).some(([qid, y]) => !Array.isArray(rit[qid]) || (y[3] || 0) > (rit[qid][3] || 0));
  }
  // "Borrar todo" hecho en otro dispositivo: descartar lo anterior a t sin volver a subirlo
  function dropBefore(t) {
    for (const s of Object.values(S.state.ses)) if (Math.max(s.t0 || 0, s.u || 0) < t) delete S.state.ses[s.id];
    for (const [id, m] of Object.entries(S.state.marks.q)) if ((m.t || 0) < t) delete S.state.marks.q[id];
    for (const [k, v] of Object.entries(S.state.main.read)) if (Math.abs(v) < t) delete S.state.main.read[k];
    S.state.main.resetAt = t;
    S.state.plan = null;
  }
  function pull() {
    if (!SYNC.on) return Promise.resolve();
    if (!SYNC.pulling) SYNC.pulling = doPull().finally(() => (SYNC.pulling = null));
    return SYNC.pulling;
  }
  async function doPull() {
    SYNC.lastPull = Date.now();
    S.sync.status = 'syncing';
    emit('sync');
    try {
      const snap = await col().get();
      const docs = snap.docs.map((d) => ({ id: d.id, body: own(d.data()) })).filter((d) => isObj(d.body));
      const remoteKeys = new Set(docs.map((d) => d.id));
      let changed = false;
      // un "Borrar todo" más nuevo hecho en otro dispositivo se aplica antes de fusionar lo demás
      const rm = docs.find((d) => d.id === 'main');
      const rAt = rm ? Number(rm.body.resetAt) || 0 : 0;
      if (rAt > (S.state.main.resetAt || 0)) {
        dropBefore(rAt);
        changed = true;
      }
      const after = S.state.main.resetAt || 0;
      for (const { id, body } of docs) {
        if (id === 'main') {
          // primera sincronización del dispositivo: el perfil ya configurado en la nube gana al de la bienvenida
          const first = !S.state.syncedOnce && isObj(body.profile) && !!body.profile.onboarded && (Number(body.u) || 0) > after;
          if (mergeMain(body, first)) changed = true;
          if (first) {
            S.state.main.u = Number(body.u) || 0;
            SYNC.dirty.delete('main');
          } else if ((S.state.main.u || 0) > (Number(body.u) || 0) || after > rAt) SYNC.dirty.add('main');
        } else if (id === 'marks') {
          if (mergeMarks(body)) changed = true;
          const rq = isObj(body.q) ? body.q : {};
          const localNewer = Object.entries(S.state.marks.q).some(([qid, m]) => !isObj(rq[qid]) || (m.t || 0) > (rq[qid].t || 0)) || Object.values(rq).some((m) => !isObj(m) || (m.t || 0) < after);
          if (localNewer) SYNC.dirty.add('marks');
        } else if (id.startsWith('w-')) {
          const rs = isObj(body.s) ? body.s : {};
          let stale = false;
          for (const s of Object.values(rs)) {
            // borrada por un "Borrar todo": no regresa y el documento se reescribe sin ella
            if (!isObj(s) || Math.max(s.t0 || 0, s.u || 0) < after) stale = true;
            else if (mergeSession(s)) changed = true;
          }
          const wk = id.slice(2);
          if (stale || Object.values(S.state.ses).some((s) => U.weekKey(s.t0) === wk && ahead(s, rs[s.id]))) SYNC.dirty.add(id);
        }
      }
      for (const k of docKeys()) if (!remoteKeys.has(k)) {
        const b = buildDoc(k);
        if (k === 'main' ? b.u || S.state.main.profile.onboarded : k === 'marks' ? Object.keys(b.q).length : Object.keys(b.s).length) SYNC.dirty.add(k);
      }
      SYNC.pulled = true;
      SYNC.retry = 0;
      if (!S.state.syncedOnce) {
        S.state.syncedOnce = true;
        saveLocal();
      }
      S.sync.status = 'ok';
      S.sync.last = Date.now();
      if (S.sync.error !== 'quota') S.sync.error = '';
      if (changed) {
        U.storage.set(KEY, S.state);
        S.recompute();
        emit('remote');
      }
      emit('sync');
      if (SYNC.dirty.size) scheduleFlush();
    } catch (e) {
      S.sync.status = 'error';
      S.sync.error = (e && e.code) || 'error';
      emit('sync');
      // sin un primer pull exitoso no se sube nada: reintentar con espera creciente
      if (!SYNC.pulled) {
        SYNC.retry = Math.min(60000, (SYNC.retry || 2000) * 2);
        clearTimeout(SYNC.retryT);
        SYNC.retryT = setTimeout(() => pull(), SYNC.retry);
      }
    }
  }
  const scheduleFlush = U.debounce(() => flush(), 2500);
  async function flush() {
    if (!SYNC.on || !SYNC.pulled || SYNC.readonly || SYNC.writing || !SYNC.dirty.size) return;
    SYNC.writing = true;
    S.sync.status = 'syncing';
    emit('sync');
    let quota = false;
    try {
      while (SYNC.dirty.size) {
        const key = SYNC.dirty.values().next().value;
        SYNC.dirty.delete(key);
        const body = buildDoc(key);
        try {
          if (key.startsWith('w-') && !Object.keys(body.s).length) await col().doc(key).delete();
          else await col().doc(key).set(JSON.parse(JSON.stringify(body)));
        } catch (e) {
          const code = e && e.code;
          if (code === 'invalid_argument' || code === 'not_granted' || code === 'revoked') {
            SYNC.readonly = true;
            S.sync.mode = 'local';
            S.sync.error = 'readonly';
            break;
          }
          if (code === 'quota_exceeded') {
            // la nube está llena (no es transitorio): la clave queda pendiente y las vistas lo avisan
            SYNC.dirty.add(key);
            S.sync.error = 'quota';
            quota = true;
            break;
          }
          SYNC.dirty.add(key);
          throw e;
        }
      }
      S.sync.status = SYNC.readonly ? 'idle' : quota ? 'error' : 'ok';
      if (!quota) {
        if (S.sync.error === 'quota') S.sync.error = '';
        S.sync.last = Date.now();
      }
    } catch (e) {
      S.sync.status = 'error';
      S.sync.error = (e && e.code) || 'error';
      setTimeout(() => scheduleFlush(), 15000);
    } finally {
      SYNC.writing = false;
      emit('sync');
    }
  }
  S.flushSync = () => {
    saveLocal.flush();
    if (SYNC.on) {
      scheduleFlush.flush();
    }
  };
  S.initSync = async function () {
    const C = window.claude;
    if (!C || typeof C.use !== 'function') return false;
    let db = null;
    let user = null;
    try {
      [db, user] = await Promise.all([C.use('db'), C.use('user')]);
    } catch (e) {
      return false;
    }
    if (!db || !user) return false;
    let uid = null;
    try {
      uid = await user.id();
    } catch (e) {
      uid = null;
    }
    if (!uid) return false;
    // el progreso guardado en el navegador es de una cuenta: otra cuenta usa su propia clave (sin mezclar ni subir lo ajeno)
    if (S.state.owner && S.state.owner !== uid) {
      saveLocal.flush();
      KEY = BASE_KEY + ':' + uid;
      S.state = sanitize(U.storage.get(KEY, null));
      S.recompute();
      emit('remote');
    }
    if (S.state.owner !== uid) {
      S.state.owner = uid;
      saveLocal();
    }
    SYNC.db = db;
    SYNC.uid = uid;
    SYNC.on = true;
    S.sync.mode = 'cloud';
    await pull();
    // al ocultar o cerrar, S.load ya registró el guardado (S.flushSync)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - SYNC.lastPull > 45000) pull();
    });
    window.addEventListener('online', () => pull());
    return true;
  };
  S.pullNow = () => pull();
})();
