/* Progreso: nivel estimado por área, mapa de temas, actividad diaria y simulacros. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const S = EG.store;
  const D = EG.data;
  const ui = EG.ui;
  const { esc } = U;

  function activityChart(days, goal) {
    const W = 640;
    const H = 170;
    const PL = 34;
    const PB = 26;
    const PT = 12;
    const max = Math.max(goal, ...days.map((d) => d.n), 10);
    const step = (W - PL - 8) / days.length;
    const y = (v) => PT + (1 - v / max) * (H - PT - PB);
    let s = '';
    const ticks = [0, Math.round(max / 2), max];
    ticks.forEach((v) => {
      s += `<line x1="${PL}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" class="ch-grid"/><text x="${PL - 6}" y="${y(v)}" class="ch-ax" text-anchor="end" dominant-baseline="central">${v}</text>`;
    });
    days.forEach((d, k) => {
      const x = PL + k * step + step * 0.18;
      const w = step * 0.64;
      const h = Math.max(0, y(0) - y(d.n));
      if (d.n) s += `<rect x="${x.toFixed(1)}" y="${y(d.n).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" class="ch-bar${d.n >= goal ? ' hit' : ''}"><title>${esc(U.fmtShort(d.t))}: ${d.n} preguntas, ${d.c} correctas</title></rect>`;
      if (k % 5 === 0 || k === days.length - 1) s += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" class="ch-ax" text-anchor="middle">${esc(U.fmtShort(d.t))}</text>`;
    });
    s += `<line x1="${PL}" x2="${W - 4}" y1="${y(goal)}" y2="${y(goal)}" class="ch-goal"/><text x="${W - 6}" y="${y(goal) - 7}" class="ch-ax ch-goal-t" text-anchor="end">meta ${goal}</text>`;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Preguntas respondidas por día en los últimos 30 días">${s}</svg></div>`;
  }

  function simChart(sims) {
    if (sims.length < 2) return '';
    const W = 640;
    const H = 180;
    const PL = 40;
    const PB = 22;
    const PT = 12;
    const y = (v) => PT + (1 - (v - 700) / 600) * (H - PT - PB);
    const x = (k) => PL + (k / (sims.length - 1)) * (W - PL - 16);
    let s = '';
    [700, 1000, 1150, 1300].forEach((v) => (s += `<line x1="${PL}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" class="ch-grid${v === 1150 ? ' ch-ss' : v === 1000 ? ' ch-s' : ''}"/><text x="${PL - 6}" y="${y(v)}" class="ch-ax" text-anchor="end" dominant-baseline="central">${v}</text>`));
    const pts = sims.map((m, k) => `${x(k).toFixed(1)},${y(m.idx).toFixed(1)}`).join(' ');
    s += `<polyline points="${pts}" class="ch-line"/>`;
    sims.forEach((m, k) => (s += `<circle cx="${x(k).toFixed(1)}" cy="${y(m.idx).toFixed(1)}" r="${k === sims.length - 1 ? 5 : 3.5}" class="ch-pt"><title>${esc(U.fmtShort(m.t))}: ${m.idx}</title></circle>`));
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Índice disciplinar estimado por simulacro">${s}</svg></div>`;
  }

  EG.views.progress = {
    tab: 'progress',
    title: 'Progreso',
    html() {
      const T = S.derived.totals;
      const unique = S.derived.q.size;
      const rd = S.readiness();
      const goal = S.profile().dailyGoal || 40;
      const areaRows = D.meta.areas
        .map((a) => {
          const st = S.areaStats(a.id);
          const r = rd.areas[a.id];
          return `<div class="area-row"><div class="area-row-h"><span class="dot" style="background:${ui.areaColor(a.id)}"></span><b>${esc(a.name)}</b><span class="muted">${st.seen ? `${r.idx} · ${st.seen}/${st.total} vistas` : 'sin datos'}</span>${st.seen ? ui.levelPill(r.lvl, true) : ''}</div>${ui.gauge(st.seen ? r.idx : null)}</div>`;
        })
        .join('');
      const heat = D.meta.subs
        .map((s) => {
          const cells = s.topics
            .map((t) => {
              const st = S.topicStats(s.code, t.id);
              const v = st.seen ? st.acc : null;
              const cls = v == null ? 'h0' : v >= 0.8 ? 'h4' : v >= 0.6 ? 'h3' : v >= 0.4 ? 'h2' : 'h1';
              return `<button type="button" class="hm ${cls}" data-act="start-topic" data-topic="${esc(s.code + '.' + t.id)}" data-n="10" title="${esc(t.name)}: ${v == null ? 'sin datos' : U.pct(v) + ' de ' + st.seen}" aria-label="${esc(t.name)}: ${v == null ? 'sin datos' : U.pct(v)}"></button>`;
            })
            .join('');
          return `<div class="hm-row"><span class="hm-l">${ui.subChip(s.code, { short: true })}<span class="hm-name">${esc(s.short || s.name)}</span></span><span class="hm-cells">${cells}</span></div>`;
        })
        .join('');
      const days = [];
      for (let k = 29; k >= 0; k--) {
        const t = U.addDays(Date.now(), -k);
        const d = S.derived.daily.get(U.dayKey(t)) || { n: 0, c: 0 };
        days.push({ t, n: d.n, c: d.c });
      }
      const sims = S.sessions()
        .filter((s) => (s.k === 'exam' || s.k === 'diag') && s.done)
        .reverse()
        .map((s) => {
          const { rep } = EG.sessionReport(s);
          return { t: s.t0, idx: rep.disc ? rep.disc.idx : 700, lvl: rep.global, s };
        });
      const simList = sims.length
        ? `<ol class="hist">${sims
            .slice()
            .reverse()
            .slice(0, 8)
            .map((m) => `<li><button type="button" class="hist-row" data-act="nav" data-to="results" data-p='${esc(JSON.stringify({ id: m.s.id }))}'><span class="hist-ic">${ui.icon(m.s.k === 'diag' ? 'target' : 'timer')}</span><span class="hist-b"><b>${esc(m.s.title)}</b><span class="muted small">${esc(U.fmtDateTime(m.t))} · índice disciplinar ${m.idx}</span></span>${m.lvl ? ui.levelPill(m.lvl, true) : ''}${ui.icon('right')}</button></li>`)
            .join('')}</ol>`
        : '<p class="muted">Haz un diagnóstico o un simulacro para ver tu evolución.</p>';
      return `<div class="page">
        <header class="page-h"><div><h1>Progreso</h1></div></header>
        <section class="tiles tiles-4">
          <div class="tile">${ui.icon('list')}<b>${U.fmtNum(T.n)}</b><span>respuestas</span></div>
          <div class="tile">${ui.icon('target')}<b>${U.fmtNum(unique)}</b><span>de ${U.fmtNum(D.bank.size)} preguntas vistas</span></div>
          <div class="tile">${ui.icon('check')}<b>${T.n ? U.pct(T.c / T.n) : '—'}</b><span>aciertos</span></div>
          <div class="tile">${ui.icon('timer')}<b>${U.fmtDur(T.ms)}</b><span>de práctica</span></div>
        </section>
        <section class="card"><div class="card-h-row"><h2 class="card-h">Nivel estimado por área</h2>${unique ? ui.levelPill(rd.global || 'ANS', true) : ''}</div><div class="area-rows">${areaRows}</div>
          <p class="note">${ui.icon('info')} El Índice Ceneval va de 700 a 1300; 1000 es Satisfactorio y 1150 Sobresaliente. Esta estimación usa tu última respuesta en cada pregunta vista y una meta exigente (80% ≈ 1150). Para el Sobresaliente global necesitas Sobresaliente en la sección disciplinar y al menos Satisfactorio en Lenguaje y Comunicación.</p></section>
        <section class="card"><h2 class="card-h">Dominio por tema</h2><p class="muted small">Cada cuadro es un tema; toca uno para practicarlo.</p><div class="hm-legend"><span><i class="hm h0"></i>sin datos</span><span><i class="hm h1"></i>&lt;40%</span><span><i class="hm h2"></i>40–59%</span><span><i class="hm h3"></i>60–79%</span><span><i class="hm h4"></i>80%+</span></div><div class="heat">${heat}</div></section>
        <section class="card"><h2 class="card-h">Actividad · últimos 30 días</h2>${activityChart(days, goal)}</section>
        <section class="card"><h2 class="card-h">Diagnóstico y simulacros</h2>${simChart(sims)}${simList}</section>
      </div>`;
    },
  };
})();
