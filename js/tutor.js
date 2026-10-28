/* "Pregúntale a Claude": tutor conversacional sobre la pregunta actual (solo dentro de claude.ai). */
(function () {
  'use strict';
  const EG = window.EG;
  const U = EG.U;
  const D = EG.data;
  const S = EG.store;
  const ui = EG.ui;
  const { esc } = U;
  const L = ['A', 'B', 'C', 'D', 'E', 'F'];

  const T = (EG.tutor = { available: false, sample: null, chats: new Map(), ctl: null });

  T.init = async function () {
    const C = window.claude;
    if (!C || typeof C.use !== 'function') return;
    try {
      const fn = await C.use('sample');
      if (fn) {
        T.sample = fn;
        T.available = true;
      }
    } catch (e) {
      T.available = false;
    }
  };

  function describe(q, st) {
    const order = st && st.order ? st.order : (q.options || []).map((_, i) => i);
    // Markdown original (plain() borraría operadores como > | * y aplanaría el código); el de varios renglones, aparte
    const opt = (i) => {
      const s = String(q.options[i]);
      return s.includes('\n') ? '\n' + s : s;
    };
    const lines = [];
    const cs = q.case ? D.cases.get(q.case) : null;
    const sub = D.sub(q.sub);
    const topic = D.topic(q.sub, q.topic);
    lines.push(`Subárea: ${q.sub} ${sub ? sub.name : ''} · Tema: ${topic ? topic.name : ''}`);
    if (cs) lines.push(`CASO (${cs.title || ''}):\n${cs.text}`);
    lines.push(`PREGUNTA:\n${q.stem}`);
    if (q.type === 'mc' || q.type === 'multi') {
      lines.push('OPCIONES (como las ve el estudiante):\n' + order.map((oi, k) => `${L[k]}) ${opt(oi)}`).join('\n'));
      const key = q.type === 'mc' ? [q.answer] : q.answer;
      lines.push(`CLAVE DE LA APP: ${key.map((i) => `${L[order.indexOf(i)]}) ${opt(i)}`).join(' y ')}`);
    } else if (q.type === 'order') {
      lines.push('ELEMENTOS A ORDENAR:\n' + order.map((oi, k) => `${L[k]}) ${opt(oi)}`).join('\n'));
      lines.push(`ORDEN CORRECTO SEGÚN LA APP: ${q.answer.map((i) => L[order.indexOf(i)]).join(', ')}`);
    } else if (q.type === 'numeric') {
      lines.push(`RESPUESTA CORRECTA SEGÚN LA APP: ${q.answer}${q.unit ? ' ' + q.unit : ''}`);
    }
    lines.push(`EXPLICACIÓN DE LA APP:\n${q.why}`);
    if (st && st.ans != null) {
      let ua = st.ans;
      if (q.type === 'mc') ua = `${L[order.indexOf(st.ans)]}) ${opt(st.ans)}`;
      else if (q.type === 'multi' || q.type === 'order') ua = st.ans.map((i) => L[order.indexOf(i)]).join(', ');
      const ok = S.grade(q, st.ans) === 1;
      lines.push(`RESPUESTA DEL ESTUDIANTE: ${ua} (${ok ? 'correcta' : 'incorrecta'})`);
    }
    return lines.join('\n\n');
  }
  const RULES = (ctx) => `Eres un tutor experto en Ciencias Computacionales que prepara a un estudiante mexicano para el EGEL Plus COMPU del Ceneval; su meta es sacar Sobresaliente. Responde en español de México, claro y directo, en no más de 250 palabras salvo que pida más detalle. Explica paso a paso cuando haya cálculos o código, usa ejemplos concretos y Markdown sencillo (negritas, listas, tablas pequeñas, bloques de código). Si al revisar notas que la clave o la explicación de la app están equivocadas, dilo claramente y explica cuál es la respuesta correcta y por qué. No inventes datos del examen real.

Contexto de la pregunta que el estudiante está estudiando:

${ctx}`;

  const QUICK = (ok) => [
    ok === false ? '¿Por qué mi respuesta está mal?' : '¿Por qué esa es la respuesta correcta?',
    'Explícamelo más simple, con una analogía',
    'Dame un ejemplo resuelto parecido',
    'Hazme una pregunta similar para practicar (sin darme la respuesta)',
  ];

  function chatHtml(chat) {
    return chat.turns
      .map((t) => `<div class="msg msg-${t.role === 'user' ? 'u' : 'a'}">${t.role === 'user' ? esc(t.content) : `<div class="rich">${EG.md.render(t.content)}</div>`}</div>`)
      .join('');
  }

  T.open = function (q, st) {
    if (!T.available) return;
    const key = q.id;
    // si cambió el orden de las opciones o la respuesta (otra sesión), la conversación empieza de nuevo
    const ctxNow = describe(q, st);
    if (!T.chats.has(key) || T.chats.get(key).ctx !== ctxNow) T.chats.set(key, { turns: [], ctx: ctxNow });
    const chat = T.chats.get(key);
    const ok = st && st.ans != null ? S.grade(q, st.ans) === 1 : null;
    ui.sheet({
      titleHtml: `${ui.icon('spark')} Pregúntale a Claude`,
      title: 'Pregúntale a Claude',
      cls: 'sheet-wide sheet-chat',
      html: `<p class="muted small">Pregunta ${esc(q.id)}. Claude ve la pregunta, la clave y tu respuesta. Cada mensaje usa el límite de uso de tu plan de Claude.</p>
        <div class="chat" id="chatLog" aria-live="polite">${chatHtml(chat)}</div>
        <div class="chips chat-quick" id="chatQuick">${QUICK(ok).map((t) => `<button type="button" class="chip-btn" data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <form class="chat-form" id="chatForm"><textarea id="chatIn" rows="2" maxlength="1500" placeholder="Escribe tu duda…" aria-label="Tu pregunta para Claude"></textarea><div class="chat-btns"><button type="button" class="btn btn-ghost" id="chatStop" hidden>Detener</button><button type="submit" class="btn btn-primary" id="chatSend">Enviar</button></div></form>
        <p class="chat-err" id="chatErr" role="alert" hidden></p>`,
      mount(panel) {
        const log = U.$('#chatLog', panel);
        const form = U.$('#chatForm', panel);
        const inp = U.$('#chatIn', panel);
        const send = U.$('#chatSend', panel);
        const stop = U.$('#chatStop', panel);
        const err = U.$('#chatErr', panel);
        const scroll = () => {
          log.scrollTop = log.scrollHeight;
        };
        scroll();
        const ask = async (text) => {
          const msg = String(text || '').trim();
          if (!msg || T.busy) return;
          T.busy = true;
          err.hidden = true;
          chat.turns.push({ role: 'user', content: msg });
          log.innerHTML = chatHtml(chat) + '<div class="msg msg-a msg-wait"><span class="dots-load"><i></i><i></i><i></i></span> Pensando…</div>';
          scroll();
          inp.value = '';
          send.disabled = true;
          stop.hidden = false;
          const ctl = new AbortController();
          T.ctl = ctl;
          const turns = [{ role: 'user', content: RULES(chat.ctx) }].concat(chat.turns.slice(-10));
          let live = null;
          try {
            const res = await T.sample(turns, {
              signal: ctl.signal,
              cache: false,
              modelTier: 'default',
              onText: ({ text: t }) => {
                if (!live) {
                  log.innerHTML = chatHtml(chat) + '<div class="msg msg-a"><div class="rich" id="chatLive"></div></div>';
                  live = U.$('#chatLive', log);
                }
                live.innerHTML = EG.md.render(t);
                scroll();
              },
            });
            chat.turns.push({ role: 'assistant', content: res.text + (res.truncated ? '\n\n*(Respuesta recortada; pide menos a la vez.)*' : '') });
          } catch (e) {
            const code = e && e.code;
            if (e && e.text) chat.turns.push({ role: 'assistant', content: e.text + '\n\n*(Interrumpida)*' });
            else {
              // sin respuesta: devolver la pregunta al cuadro para no perderla
              chat.turns.pop();
              if (!inp.value) inp.value = msg;
            }
            const msgs = {
              cancelled: '',
              not_granted: 'No se permitió que esta app use a Claude. Puedes cambiarlo en los permisos del artifact.',
              sampling_disabled: 'Claude no está disponible para esta cuenta.',
              rate_limited: 'Llegaste al límite de uso por ahora. Intenta más tarde.',
              session_expired: 'Tu sesión de claude.ai expiró; vuelve a iniciar sesión.',
              refused: 'Claude no pudo responder esa pregunta; intenta formularla de otra manera.',
              prompt_too_large: 'La conversación es muy larga; cierra y vuelve a abrir el tutor.',
            };
            const m = code in msgs ? msgs[code] : 'Hubo un problema de conexión. Intenta de nuevo.';
            if (code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled') T.available = false;
            if (m) {
              err.textContent = m;
              err.hidden = false;
            }
          } finally {
            T.busy = false;
            T.ctl = null;
            log.innerHTML = chatHtml(chat);
            scroll();
            send.disabled = false;
            stop.hidden = true;
          }
        };
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          ask(inp.value);
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ask(inp.value);
          }
        });
        stop.addEventListener('click', () => T.ctl && T.ctl.abort());
        U.$('#chatQuick', panel).addEventListener('click', (e) => {
          const b = e.target.closest('[data-q]');
          if (b) ask(b.dataset.q);
        });
      },
      onClose: () => T.ctl && T.ctl.abort(),
    });
  };
})();
