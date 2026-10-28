/* Carga del banco de preguntas, casos y guías (archivos data/*.js que llaman a EGEL_DATA). */
(function () {
  'use strict';
  const EG = window.EG;
  const D = (EG.data = {
    meta: null,
    bank: new Map(),
    cases: new Map(),
    bySub: new Map(),
    byTopic: new Map(),
    byCase: new Map(),
    notes: new Map(),
    order: [],
  });

  window.EGEL_DATA = {
    meta(m) {
      D.meta = m;
      D.subByCode = new Map(m.subs.map((s) => [s.code, s]));
      D.areaById = new Map(m.areas.map((a) => [a.id, a]));
    },
    bank(sub, questions, cases) {
      for (const c of cases || []) D.cases.set(c.id, c);
      const ids = [];
      for (const q of questions) {
        q.sub = sub;
        D.bank.set(q.id, q);
        ids.push(q.id);
        const tk = sub + '.' + q.topic;
        if (!D.byTopic.has(tk)) D.byTopic.set(tk, []);
        D.byTopic.get(tk).push(q.id);
        if (q.case) {
          if (!D.byCase.has(q.case)) D.byCase.set(q.case, []);
          D.byCase.get(q.case).push(q.id);
        }
      }
      D.bySub.set(sub, (D.bySub.get(sub) || []).concat(ids));
    },
    note(sub, text) {
      D.notes.set(sub, text);
    },
  };

  const loaded = new Map();
  D.loadScript = function (src) {
    if (loaded.has(src)) return loaded.get(src);
    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loaded.delete(src);
        reject(new Error('No se pudo cargar ' + src));
      };
      document.head.appendChild(s);
    });
    loaded.set(src, p);
    return p;
  };

  D.loadAll = async function (onProgress) {
    await D.loadScript('data/meta.js');
    const files = D.meta.files || [];
    let done = 0;
    await Promise.all(
      files.map((f) =>
        D.loadScript('data/' + f).then(() => {
          done++;
          if (onProgress) onProgress(done / files.length);
        }),
      ),
    );
    for (const ids of D.bySub.values()) ids.sort();
    D.order = [...D.bank.keys()].sort();
  };

  D.loadNote = async function (sub) {
    if (D.notes.has(sub)) return D.notes.get(sub);
    const f = (D.meta.notes || {})[sub];
    if (!f) return null;
    await D.loadScript('data/' + f);
    return D.notes.get(sub) || null;
  };

  D.sub = (code) => D.subByCode.get(code);
  D.area = (id) => D.areaById.get(id);
  D.topic = (code, tid) => {
    const s = D.subByCode.get(code);
    return s ? s.topics.find((t) => t.id === tid) : null;
  };
})();
