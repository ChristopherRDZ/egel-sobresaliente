/* Guías de repaso: índice por área, lector con temas y hoja rápida desde una pregunta. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const S = EG.store;
  const D = EG.data;
  const ui = EG.ui;
  const { esc } = U;
  const A = EG.actions;

  // Divide la guía en introducción y secciones "## tNN · Nombre".
  function split(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const out = { intro: [], sections: [] };
    let cur = null;
    for (const line of lines) {
      const m = /^## (t\d{2}) · (.+)$/.exec(line);
      if (m) {
        cur = { id: m[1], title: m[2].trim(), lines: [] };
        out.sections.push(cur);
        continue;
      }
      if (!cur) {
        if (/^# /.test(line)) continue;
        out.intro.push(line);
      } else cur.lines.push(line);
    }
    out.intro = out.intro.join('\n').trim();
    out.sections.forEach((s) => (s.body = s.lines.join('\n').trim()));
    return out;
  }

  EG.views.guides = {
    tab: 'guides',
    title: 'Guías',
    html() {
      const areas = D.meta.areas
        .map((a) => {
          const subs = D.meta.subs.filter((s) => s.area === a.id);
          const cards = subs
            .map((s) => {
              const has = !!(D.meta.notes || {})[s.code];
              const read = s.topics.filter((t) => S.isRead(s.code + '.' + t.id)).length;
              return `<button type="button" class="sub-card" data-act="open-guide" data-sub="${esc(s.code)}" style="--c:${ui.areaColor(a.id)}"${has ? '' : ' disabled'}>
                <span class="sub-card-h"><span class="code">${esc(s.code)}</span><b>${esc(s.name)}</b></span>
                <span class="sub-card-s">${ui.bar(read / s.topics.length, ui.areaColor(a.id))}<span class="muted small">${has ? `${read}/${s.topics.length} temas leídos` : 'En preparación'}</span></span>
              </button>`;
            })
            .join('');
          return `<section class="area-sec"><header class="area-h" style="--c:${ui.areaColor(a.id)}"><div><p class="eyebrow">${a.id === 'LC' ? 'Sección transversal' : 'Área ' + a.id.slice(1)}</p><h2>${esc(a.name)}</h2></div></header><div class="sub-grid">${cards}</div></section>`;
        })
        .join('');
      return `<div class="page"><header class="page-h"><div><h1>Guías de repaso</h1><p class="muted">Lo esencial de cada tema, con tablas, ejemplos resueltos y las trampas que más cuestan puntos. Úsalas antes de practicar un tema nuevo o cuando una explicación no te baste.</p></div></header>${areas}</div>`;
    },
  };

  EG.views.guide = {
    nested: true,
    tab: 'guides',
    title: (p) => (D.sub(p.sub) ? `Guía ${p.sub}` : 'Guía'),
    html(p) {
      const s = D.sub(p.sub);
      if (!s) return '<div class="empty"><p>Guía no encontrada.</p></div>';
      const text = D.notes.get(s.code);
      const head = `<header class="page-h sub-h" style="--c:${ui.areaColor(s.area)}"><div><p class="eyebrow">${esc(D.area(s.area).name)} · Guía de repaso</p><h1><span class="code big">${esc(s.code)}</span> ${esc(s.name)}</h1></div></header>`;
      if (text == null) return `<div class="page">${head}<div class="card"><p class="muted">Cargando la guía…</p></div></div>`;
      const g = split(text);
      const toc = g.sections
        .map((sec) => {
          const read = S.isRead(s.code + '.' + sec.id);
          return `<li><a href="#g-${esc(sec.id)}" data-act="guide-jump" data-id="${esc(sec.id)}" class="${read ? 'read' : ''}">${read ? ui.icon('check') : `<span class="code">${esc(sec.id.slice(1))}</span>`}<span>${esc(sec.title)}</span></a></li>`;
        })
        .join('');
      const body = g.sections
        .map((sec) => {
          const key = s.code + '.' + sec.id;
          const read = S.isRead(key);
          const n = (D.byTopic.get(key) || []).length;
          return `<section class="g-sec" id="g-${esc(sec.id)}"><h2><span class="code">${esc(sec.id.slice(1))}</span> ${EG.md.inline(sec.title)}</h2><div class="rich">${EG.md.render(sec.body, { headingShift: 1 })}</div>
            <div class="g-acts"><button type="button" class="chip-btn${read ? ' on' : ''}" data-act="guide-read" data-key="${esc(key)}" aria-pressed="${read}">${ui.icon('check')} ${read ? 'Leído' : 'Marcar como leído'}</button>${n ? `<button type="button" class="btn btn-sm" data-act="start-topic" data-topic="${esc(key)}" data-n="10">Practicar este tema (${Math.min(10, n)})</button>` : ''}</div></section>`;
        })
        .join('');
      return `<div class="page guide">${head}
        <div class="guide-grid">
          <nav class="guide-toc" aria-label="Temas de la guía"><details open><summary>Temas</summary><ol>${toc}</ol></details></nav>
          <article class="guide-body">${g.intro ? `<div class="rich g-intro">${EG.md.render(g.intro)}</div>` : ''}${body}</article>
        </div></div>`;
    },
    mount(el, p) {
      const s = D.sub(p.sub);
      if (!s) return;
      if (!D.notes.has(s.code)) {
        D.loadNote(s.code)
          .then(() => {
            if (EG.router.cur && EG.router.cur.name === 'guide' && EG.router.cur.params.sub === s.code) {
              EG.router.render({});
            }
          })
          .catch(() => ui.toast('No se pudo cargar la guía. Revisa tu conexión.'));
        return;
      }
      if (p.topic) {
        const target = U.$('#g-' + p.topic, el);
        if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 30);
      }
      if (window.matchMedia('(max-width: 899px)').matches) {
        const d = U.$('.guide-toc details', el);
        if (d) d.open = false;
      }
    },
  };
  A['guide-jump'] = (el) => {
    const t = U.$('#g-' + el.dataset.id);
    if (t) t.scrollIntoView({ block: 'start', behavior: U.prefersReducedMotion() ? 'auto' : 'smooth' });
    const d = U.$('.guide-toc details');
    if (d && window.matchMedia('(max-width: 899px)').matches) d.open = false;
  };
  A['guide-read'] = (el) => {
    const key = el.dataset.key;
    S.markRead(key, !S.isRead(key));
    EG.router.refresh();
  };

  // Hoja rápida desde una pregunta
  EG.guides = {
    split,
    async openTopic(code, tid) {
      const s = D.sub(code);
      if (!s) return;
      let text = D.notes.get(code);
      if (text == null) {
        try {
          text = await D.loadNote(code);
        } catch (e) {
          text = null;
        }
      }
      const t = D.topic(code, tid);
      const g = text ? split(text) : null;
      const sec = g ? g.sections.find((x) => x.id === tid) : null;
      const html = sec
        ? `<div class="rich">${EG.md.render(sec.body, { headingShift: 1 })}</div>`
        : `<p class="muted">La guía de este tema aún no está disponible.</p>`;
      ui.sheet({
        titleHtml: `<span class="code">${esc(code)}</span> ${esc(t ? t.name : 'Tema')}`,
        title: t ? t.name : 'Guía',
        html: `${html}<div class="btn-row sheet-acts"><button type="button" class="btn btn-ghost" data-act="guide-full" data-sub="${esc(code)}" data-topic="${esc(tid)}">${ui.icon('book')}<span>Abrir guía completa</span></button></div>`,
        cls: 'sheet-wide',
      });
    },
  };
  A['guide-full'] = (el) => {
    ui.closeTop();
    const inRun = EG.router.cur && EG.router.cur.name === 'session';
    if (inRun) {
      ui.toast('Tu sesión queda guardada; regresa con el botón Atrás.');
    }
    EG.router.go('guide', { sub: el.dataset.sub, topic: el.dataset.topic });
  };
})();
