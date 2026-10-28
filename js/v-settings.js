/* Ajustes: perfil, preferencias, datos (sincronización, respaldo, importación, borrado), reportes y ayuda. */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const S = EG.store;
  const D = EG.data;
  const ui = EG.ui;
  const { esc } = U;
  const A = EG.actions;

  EG.applySettings = function () {
    const st = S.settings();
    const root = document.documentElement;
    if (EG.hostTheme === undefined) EG.hostTheme = root.getAttribute('data-theme');
    if (st.theme === 'light' || st.theme === 'dark') root.setAttribute('data-theme', st.theme);
    else if (EG.hostTheme) root.setAttribute('data-theme', EG.hostTheme);
    else root.removeAttribute('data-theme');
    root.style.setProperty('--ts', String(st.text || 1));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', dark ? '#0b1626' : '#f3f6f9');
    }
  };

  async function saveFile(name, text, mime) {
    const C = window.claude;
    if (C && typeof C.use === 'function') {
      // dentro de claude.ai el marco no descarga por su cuenta: solo cuenta lo que confirme downloads
      let dl = null;
      try {
        dl = await C.use('downloads');
      } catch (e) {
        dl = null;
      }
      if (!dl) return 'error';
      try {
        await dl.save({ filename: name, data: text });
        return 'saved';
      } catch (e) {
        return e && e.code === 'declined' ? 'declined' : 'error';
      }
    }
    try {
      const blob = new Blob([text], { type: mime || 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return 'saved';
    } catch (e) {
      return 'error';
    }
  }

  const toggle = (id, on, label, hint) => `<label class="tog" for="${id}"><span class="tog-t"><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="tog-s" aria-hidden="true"></span></label>`;

  EG.views.settings = {
    tab: 'settings',
    title: 'Ajustes',
    html() {
      const p = S.profile();
      const st = S.settings();
      const sync = S.sync;
      const syncHtml =
        sync.mode === 'cloud' && sync.error === 'quota'
          ? `<div class="sync">${ui.icon('cloud')}<div><b>La nube está llena</b><span class="muted small">Tu progreso solo se guarda en este dispositivo y ya no llega a los demás. Exporta un respaldo para no perderlo.</span></div><button type="button" class="btn btn-sm btn-ghost" data-act="sync-now">Reintentar</button></div>`
          : sync.mode === 'cloud'
          ? `<div class="sync on">${ui.icon('cloud')}<div><b>Sincronizado con tu cuenta de claude.ai</b><span class="muted small">Tu progreso aparece en cualquier dispositivo donde abras esta app con tu cuenta.${sync.last ? ` Última sincronización: ${esc(U.fmtDateTime(sync.last))}.` : ''}${sync.status === 'error' ? ' Hubo un problema de conexión; se reintentará.' : ''}</span></div><button type="button" class="btn btn-sm btn-ghost" data-act="sync-now">Sincronizar</button></div>`
          : `<div class="sync">${ui.icon('device')}<div><b>Guardado en este dispositivo</b><span class="muted small">${sync.error === 'readonly' ? 'Esta copia compartida no puede guardar en la nube; tu progreso se queda en este navegador.' : 'Tu progreso se guarda en este navegador.'} Para pasarlo a otro dispositivo usa Exportar e Importar.</span></div></div>`;
      const weakChips = D.meta.subs.map((s) => `<button type="button" class="chip-btn${(p.weak || []).includes(s.code) ? ' on' : ''}" data-act="set-weak" data-sub="${esc(s.code)}" aria-pressed="${(p.weak || []).includes(s.code)}"><b>${esc(s.code)}</b> ${esc(s.short || s.name)}</button>`).join('');
      const reported = S.reported();
      const repList = reported.length
        ? `<ol class="qrows">${reported.map((id) => { const q = D.bank.get(id); const r = S.mark(id).r; return `<li><button type="button" class="qrow" data-act="open-q" data-qid="${esc(id)}">${q ? ui.subChip(q.sub, { short: true }) : ''}<span class="qrow-t"><b>${esc(id)}</b> · ${esc(r.reason)}${r.text ? ` — ${esc(String(r.text).slice(0, 90))}` : ''}</span></button></li>`; }).join('')}</ol><button type="button" class="btn btn-sm btn-ghost" data-act="export-reports">${ui.icon('download')}<span>Exportar reportes</span></button>`
        : '<p class="muted small">No has reportado preguntas. Si encuentras un error, usa "Reportar error" en la retroalimentación.</p>';
      const counts = D.meta.areas.map((a) => {
        const n = D.meta.subs.filter((s) => s.area === a.id).reduce((acc, s) => acc + (D.bySub.get(s.code) || []).length, 0);
        return `<li><span class="dot" style="background:${ui.areaColor(a.id)}"></span>${esc(a.name)}: <b>${U.fmtNum(n)}</b></li>`;
      }).join('');
      return `<div class="page page-narrow">
        <header class="page-h"><div><h1>Ajustes</h1></div></header>
        <section class="card"><h2 class="card-h">Tu examen</h2><div class="form">
          <label class="fld"><span>Nombre</span><input id="setName" type="text" maxlength="40" value="${esc(p.name)}" placeholder="Opcional"></label>
          <label class="fld"><span>Fecha del examen</span><input id="setDate" type="date" value="${esc(p.examDate)}"></label>
          <label class="fld"><span>Meta diaria de preguntas</span><input id="setGoal" type="number" min="10" max="300" step="5" value="${esc(p.dailyGoal)}"></label>
          <div class="fld"><span>Subáreas que te cuestan más</span><div class="chips">${weakChips}</div></div>
        </div></section>
        <section class="card"><h2 class="card-h">Preferencias</h2><div class="form">
          <div class="fld"><span>Tema</span><div class="chips" role="radiogroup">${[['system', 'Del sistema'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button type="button" class="chip-btn${st.theme === k ? ' on' : ''}" data-act="set-theme" data-v="${k}" role="radio" aria-checked="${st.theme === k}">${l}</button>`).join('')}</div></div>
          <div class="fld"><span>Tamaño del texto</span><div class="chips" role="radiogroup">${[[1, 'Normal'], [1.12, 'Grande'], [1.25, 'Muy grande']].map(([k, l]) => `<button type="button" class="chip-btn${Number(st.text) === k ? ' on' : ''}" data-act="set-text" data-v="${k}" role="radio" aria-checked="${Number(st.text) === k}">${l}</button>`).join('')}</div></div>
          ${toggle('setShuffle', st.shuffle, 'Revolver el orden de las opciones', 'Evita memorizar la letra en lugar de la respuesta.')}
          ${toggle('setOneTap', st.oneTap, 'Responder con un toque', 'En modo tutor, califica al tocar una opción sin pulsar Comprobar.')}
          ${toggle('setTimer', st.practiceTimer, 'Cronómetro en práctica', 'Muestra el tiempo por pregunta (meta: ~2.4 min).')}
        </div></section>
        <section class="card"><h2 class="card-h">Tus datos</h2>${syncHtml}
          <div class="btn-row"><button type="button" class="btn btn-ghost" data-act="export">${ui.icon('download')}<span>Exportar progreso</span></button><button type="button" class="btn btn-ghost" data-act="import">${ui.icon('upload')}<span>Importar progreso</span></button><input type="file" id="importFile" accept=".json,application/json" hidden></div>
          <p class="muted small">Importar combina el archivo con tu progreso actual; no borra nada.</p>
          <div class="danger"><button type="button" class="btn btn-danger" data-act="reset">${ui.icon('trash')}<span>Borrar todo mi progreso</span></button></div>
        </section>
        <section class="card"><h2 class="card-h">Preguntas reportadas</h2>${repList}</section>
        <section class="card"><h2 class="card-h">Instalar la app</h2>
          <div class="rich"><ul><li><b>Android (Chrome):</b> abre el menú ⋮ y elige <b>Agregar a la pantalla principal</b> o <b>Instalar app</b>.</li><li><b>iPhone (Safari):</b> toca Compartir y luego <b>Agregar a inicio</b>.</li><li><b>PC (Edge o Chrome):</b> usa el ícono de instalar en la barra de direcciones, o el menú › <b>Aplicaciones › Instalar este sitio como aplicación</b>.</li></ul></div>
        </section>
        <section class="card"><h2 class="card-h">Acerca de</h2>
          <p>Banco de <b>${U.fmtNum(D.bank.size)}</b> preguntas originales (versión ${esc(D.meta.version || '')}), verificadas con dos resoluciones a ciegas y ejecución real del código:</p><ul class="counts">${counts}</ul>
          <p class="muted small">Estructura, áreas, descriptores de desempeño y formatos de reactivo tomados de la Guía para el sustentante del EGEL Plus COMPU (Ceneval, 2022). App de estudio independiente: no está afiliada al Ceneval ni usa reactivos reales del examen. El nivel y el índice que muestra son estimaciones.</p>
        </section>
      </div>`;
    },
    mount(el) {
      const save = () => {
        const name = U.$('#setName', el).value.trim();
        const examDate = U.$('#setDate', el).value;
        const goal = U.clamp(Number(U.$('#setGoal', el).value) || 40, 10, 300);
        const p = S.profile();
        if (name !== p.name || examDate !== p.examDate || goal !== p.dailyGoal) S.setProfile({ name, examDate, dailyGoal: goal });
      };
      ['#setName', '#setDate', '#setGoal'].forEach((sel) => U.$(sel, el).addEventListener('change', save));
      U.$('#setShuffle', el).addEventListener('change', (e) => S.setSettings({ shuffle: e.target.checked }));
      U.$('#setOneTap', el).addEventListener('change', (e) => S.setSettings({ oneTap: e.target.checked }));
      U.$('#setTimer', el).addEventListener('change', (e) => S.setSettings({ practiceTimer: e.target.checked }));
      U.$('#importFile', el).addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            S.importData(String(rd.result));
            ui.toast('Progreso importado y combinado.');
            EG.router.refresh();
          } catch (err) {
            ui.toast(err.message || 'No se pudo importar el archivo.', 'bad');
          }
        };
        rd.readAsText(f);
        e.target.value = '';
      });
    },
  };

  A['set-theme'] = (el) => {
    S.setSettings({ theme: el.dataset.v });
    EG.applySettings();
    EG.router.refresh();
  };
  A['set-text'] = (el) => {
    S.setSettings({ text: Number(el.dataset.v) });
    EG.applySettings();
    EG.router.refresh();
  };
  A['set-weak'] = (el) => {
    const w = new Set(S.profile().weak || []);
    const c = el.dataset.sub;
    if (w.has(c)) w.delete(c);
    else w.add(c);
    S.setProfile({ weak: [...w] });
    el.classList.toggle('on');
    el.setAttribute('aria-pressed', String(w.has(c)));
  };
  A['sync-now'] = async () => {
    ui.toast('Sincronizando…');
    await S.pullNow();
    S.flushSync();
    EG.router.refresh();
  };
  // botón (no <label>) para que también se pueda abrir con el teclado
  A.import = () => {
    const i = U.$('#importFile');
    if (i) i.click();
  };
  A.export = async () => {
    const r = await saveFile(`egel-progreso-${U.dayKey(Date.now())}.json`, S.exportData());
    if (r === 'saved') ui.toast('Respaldo listo.');
    else if (r === 'error') ui.toast('No se pudo descargar el respaldo.', 'bad');
  };
  A['export-reports'] = async () => {
    const rows = S.reported().map((id) => ({ id, ...S.mark(id).r }));
    const r = await saveFile(`egel-reportes-${U.dayKey(Date.now())}.json`, JSON.stringify(rows, null, 1));
    if (r === 'saved') ui.toast('Reportes exportados.');
    else if (r === 'error') ui.toast('No se pudo descargar el archivo de reportes.', 'bad');
  };
  A.reset = async () => {
    const v = await ui.modal({
      title: 'Borrar todo tu progreso',
      body: '<p>Se borrarán tus respuestas, sesiones, guardadas, reportes y ajustes en este dispositivo y en la sincronización. No se puede deshacer. Si quieres conservar una copia, exporta tu progreso antes.</p>',
      actions: [
        { id: 'cancel', label: 'Cancelar', kind: 'primary' },
        { id: 'del', label: 'Borrar todo', kind: 'danger' },
      ],
    });
    if (v !== 'del') return;
    const ok = await S.reset();
    EG.applySettings();
    if (EG.resetWelcome) EG.resetWelcome();
    EG.router.go('welcome', {}, { root: true });
    if (!ok) ui.toast('No se pudo borrar todavía la copia en la nube; se reintentará al sincronizar.', 'bad');
  };
})();
