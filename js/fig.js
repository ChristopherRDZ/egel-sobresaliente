/* Figuras SVG generadas a partir de especificaciones JSON: tree, graph, automaton, tape, dendrogram, layers. */
(function () {
  'use strict';
  const EG = window.EG;
  const { escText, esc } = EG.U;
  let seq = 0;

  const t = (x, y, s, cls, extra) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls || 'fl'}" text-anchor="middle" dominant-baseline="central"${extra || ''}>${escText(s)}</text>`;
  // label: descripción completa de la figura (role=img oculta sus textos a los lectores de pantalla).
  // El mínimo de ancho nunca pasa del contenedor: en teléfono ningún nodo queda fuera de la vista y, si la figura
  // queda muy reducida, «Ampliar figura» (o tocarla) la abre a tamaño natural (fit y zoom, abajo).
  const wrap = (w, h, body, label, maxW, x0, y0) => {
    const id = `fg${++seq}`;
    const W = Math.ceil(w);
    // MARK: punta rellena; OPENM: punta abierta (dependencias de UML, con línea discontinua), solo si se usa
    const open = body.includes('OPENM') ? `<marker id="${id}o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9" class="fah-o"/></marker>` : '';
    const defs = `<defs><marker id="${id}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fah"/></marker>${open}</defs>`;
    const zi = EG.ui && EG.ui.icon ? EG.ui.icon('expand') : '';
    return `<figure class="fig" data-w="${W}"><svg class="fig-svg" data-act="fig-zoom" viewBox="${x0 || 0} ${y0 || 0} ${W} ${Math.ceil(h)}" style="max-width:${maxW || W}px;min-width:min(100%, ${Math.round(W * 0.62)}px)" role="img" aria-label="${esc(label)}">${defs}${body.replace(/MARK/g, `url(#${id}a)`).replace(/OPENM/g, `url(#${id}o)`)}</svg><button type="button" class="btn btn-ghost btn-sm fig-zoom" data-act="fig-zoom" hidden>${zi}<span>Ampliar figura</span></button></figure>`;
  };
  const list = (xs) => xs.join(', ');
  const unit = (dx, dy) => {
    const L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  };
  const nodeSize = (label) => {
    const s = String(label);
    return s.length <= 3 ? { r: 17 } : { w: Math.max(34, 8.2 * s.length + 14), h: 30 };
  };
  // punto en el borde de un nodo (círculo, rectángulo, óvalo o rombo) en dirección (ux, uy)
  const border = (p, ux, uy) => {
    if (p.r) return [p.x + ux * p.r, p.y + uy * p.r];
    const hw = p.w / 2;
    const hh = p.h / 2;
    let k;
    if (p.sh === 'oval') k = 1 / Math.hypot(ux / hw, uy / hh);
    else if (p.sh === 'diamond') k = 1 / (Math.abs(ux) / hw + Math.abs(uy) / hh);
    else k = Math.min(Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity);
    return [p.x + ux * k, p.y + uy * k];
  };
  const drawNode = (p, label, opts) => {
    const o = opts || {};
    const cls = `fn${o.hl ? ' fn-hl' : ''}`;
    let s = '';
    if (p.r) {
      s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" class="${cls}"/>`;
      if (o.double) s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r - 4}" class="fn fn-in"/>`;
    } else if (p.sh === 'oval') {
      s += `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.w / 2}" ry="${p.h / 2}" class="${cls}"/>`;
    } else if (p.sh === 'diamond') {
      s += `<polygon points="${p.x},${p.y - p.h / 2} ${p.x + p.w / 2},${p.y} ${p.x},${p.y + p.h / 2} ${p.x - p.w / 2},${p.y}" class="${cls}"/>`;
    } else {
      s += `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" rx="${o.box ? 3 : 8}" class="fn${o.hl ? ' fn-hl' : ''}"/>`;
    }
    if (label !== '' && label != null) s += t(p.x, p.y, label, 'fl');
    return s;
  };

  // ---------- árbol ----------
  function tree(f) {
    const DY = 64;
    let slot = 0;
    const all = [];
    function walk(n, depth) {
      if (n == null) {
        const x = slot;
        slot += 0.6;
        return { ghost: true, x, depth };
      }
      const kids = Array.isArray(n.c) ? n.c : [];
      let x;
      let real = [];
      if (!kids.length || kids.every((k) => k == null)) {
        x = slot;
        slot += 1;
      } else {
        const ks = kids.map((k) => walk(k, depth + 1));
        const xs = ks.map((k) => k.x);
        x = (Math.min(...xs) + Math.max(...xs)) / 2;
        real = ks.filter((k) => !k.ghost);
      }
      const node = { v: n.v, x, depth, kids: real, hl: !!n.hl };
      all.push(node);
      return node;
    }
    walk(f.root, 0);
    for (const n of all) Object.assign(n, nodeSize(n.v));
    // la separación entre hojas crece con la etiqueta más ancha para que los nodos no se encimen
    const half = Math.max(...all.map((n) => n.r || n.w / 2));
    const DX = Math.max(46, 2 * half + 12);
    const minX = Math.min(...all.map((n) => n.x));
    const maxX = Math.max(...all.map((n) => n.x));
    const maxD = Math.max(...all.map((n) => n.depth));
    const PAD = 30;
    const MX = Math.max(PAD + 10, half + 8);
    for (const n of all) n.px = MX + (n.x - minX) * DX;
    // separación vertical por nivel: con un abanico ancho (p. ej. un árbol de derivación) la arista a un hijo lejano
    // pasaría encima de un hermano más cercano; ese nivel crece hasta que la arista lo libra por 6 px
    const gaps = Array.from({ length: maxD }, () => DY);
    const near = (p, a, b, dy) => {
      for (let k = 0; k <= 40; k++) {
        const x = p.px + ((a.px - p.px) * k) / 40;
        const y = (dy * k) / 40;
        const d = b.r ? Math.hypot(x - b.px, y - dy) - b.r : Math.max(Math.abs(x - b.px) - b.w / 2, Math.abs(y - dy) - b.h / 2);
        if (d < 6) return true;
      }
      return false;
    };
    for (const p of all) {
      for (const a of p.kids) {
        for (const b of p.kids) {
          const da = a.px - p.px;
          const db = b.px - p.px;
          if (a === b || da * db <= 0 || Math.abs(db) >= Math.abs(da)) continue;
          while (gaps[p.depth] < 160 && near(p, a, b, gaps[p.depth])) gaps[p.depth] += 2;
        }
      }
    }
    const ys = [PAD];
    for (let d = 1; d <= maxD; d++) ys.push(ys[d - 1] + gaps[d - 1]);
    for (const n of all) n.py = ys[n.depth];
    let body = '';
    for (const n of all) {
      for (const k of n.kids) {
        const [ux, uy] = unit(k.px - n.px, k.py - n.py);
        const a = border({ x: n.px, y: n.py, r: n.r, w: n.w, h: n.h }, ux, uy);
        const b = border({ x: k.px, y: k.py, r: k.r, w: k.w, h: k.h }, -ux, -uy);
        body += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="fe"/>`;
      }
    }
    for (const n of all) body += drawNode({ x: n.px, y: n.py, r: n.r, w: n.w, h: n.h }, n.v, { hl: n.hl });
    const w = MX * 2 + (maxX - minX) * DX;
    const h = PAD + ys[maxD];
    // descripción: hijos de cada nodo (en los binarios, izquierdo y derecho, con "vacío" si falta)
    const rows = [];
    (function desc(n) {
      if (!n) return;
      const kids = Array.isArray(n.c) ? n.c : [];
      if (kids.some((k) => k != null)) rows.push(`${n.v}: ${kids.length === 2 ? `izquierdo ${kids[0] ? kids[0].v : 'vacío'}, derecho ${kids[1] ? kids[1].v : 'vacío'}` : list(kids.filter((k) => k != null).map((k) => k.v))}`);
      kids.forEach(desc);
    })(f.root);
    const hl = all.filter((n) => n.hl).map((n) => n.v);
    const label = `Árbol con raíz ${f.root ? f.root.v : ''}.${rows.length ? ` Hijos: ${rows.join('; ')}.` : ''}${hl.length ? ` Resaltados: ${list(hl)}.` : ''}`;
    return wrap(Math.max(w, 120), h, body, label, Math.max(w, 120) * 1.05);
  }

  // ---------- grafo ----------
  function graph(f) {
    const nodes = f.nodes.map((n) => ({ id: String(n.id), label: n.label != null ? String(n.label) : String(n.id), shape: n.shape || 'circle', tokens: n.tokens, ix: n.x, iy: n.y, hl: !!n.hl }));
    const n = nodes.length;
    const hasXY = nodes.every((p) => typeof p.ix === 'number' && typeof p.iy === 'number');
    const W = hasXY ? 560 : n <= 3 ? 360 : n <= 5 ? 440 : 520;
    // con coordenadas, "h" alarga el lienzo (p. ej., diagramas de flujo de una sola columna)
    const H = hasXY ? EG.U.clamp(Number(f.h) || 340, 200, 700) : n <= 3 ? 260 : n <= 5 ? 330 : 400;
    const PAD = 42;
    nodes.forEach((p, i) => {
      if (hasXY) {
        p.x = PAD + (p.ix / 100) * (W - 2 * PAD);
        p.y = PAD + (p.iy / 100) * (H - 2 * PAD);
      } else if (n === 1) {
        p.x = W / 2;
        p.y = H / 2;
      } else {
        const R = Math.min(W, H) / 2 - PAD;
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
        p.x = W / 2 + R * Math.cos(ang);
        p.y = H / 2 + R * Math.sin(ang);
      }
      if (p.shape === 'box') Object.assign(p, { w: Math.max(28, 8.2 * p.label.length + 14), h: 28 });
      // óvalo (inicio o fin) y rombo (decisión) de los diagramas de flujo: el texto cabe dentro de la figura
      else if (p.shape === 'oval') Object.assign(p, { sh: 'oval', w: Math.max(56, 10.3 * p.label.length + 24), h: 32 });
      else if (p.shape === 'diamond') Object.assign(p, { sh: 'diamond', w: Math.max(60, (2 * 8.2 * p.label.length) / 1.4 + 20), h: 48 });
      else Object.assign(p, nodeSize(p.label));
    });
    const byId = new Map(nodes.map((p) => [p.id, p]));
    const directed = !!f.directed;
    // dash: línea discontinua con punta abierta (dependencia de UML)
    const edges = (f.edges || []).map((e) => ({ from: String(e.from), to: String(e.to), label: e.label != null ? String(e.label) : e.w != null ? String(e.w) : '', dash: e.dash === true }));
    const pairs = new Set(edges.map((e) => `${e.from}→${e.to}`));
    let body = '';
    let labels = '';
    // caja real de lo dibujado (nodos, bucles y etiquetas): el viewBox no deja márgenes de sobra
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const ext = (x, y, rx, ry) => {
      box.x0 = Math.min(box.x0, x - rx);
      box.x1 = Math.max(box.x1, x + rx);
      box.y0 = Math.min(box.y0, y - ry);
      box.y1 = Math.max(box.y1, y + ry);
    };
    const extLabel = (x, y, s) => ext(x, y, 4 * String(s).length + 6, 10);
    for (const p of nodes) ext(p.x, p.y, p.r || p.w / 2, p.r || p.h / 2);
    for (const e of edges) {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b) continue;
      const cls = e.dash ? 'fe fe-dash' : 'fe';
      const mk = e.dash ? 'OPENM' : 'MARK';
      if (a === b) {
        const cx = W / 2;
        const cy = H / 2;
        const [ox, oy] = unit(a.x - cx || 0.001, a.y - cy || -1);
        const r = a.r || a.h / 2;
        const base = [a.x + ox * r, a.y + oy * r];
        const px = -oy;
        const py = ox;
        const c1 = [base[0] + ox * 46 + px * 22, base[1] + oy * 46 + py * 22];
        const c2 = [base[0] + ox * 46 - px * 22, base[1] + oy * 46 - py * 22];
        const s = [a.x + (ox + px * 0.5) * r * 0.9, a.y + (oy + py * 0.5) * r * 0.9];
        const en = [a.x + (ox - px * 0.5) * r * 0.9, a.y + (oy - py * 0.5) * r * 0.9];
        body += `<path d="M${s[0]},${s[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${en[0]},${en[1]}" class="${cls}"${directed ? ` marker-end="${mk}"` : ''}/>`;
        ext(c1[0], c1[1], 2, 2);
        ext(c2[0], c2[1], 2, 2);
        if (e.label) {
          labels += t(base[0] + ox * 44, base[1] + oy * 44, e.label, 'fel');
          extLabel(base[0] + ox * 44, base[1] + oy * 44, e.label);
        }
        continue;
      }
      const rev = directed && pairs.has(`${e.to}→${e.from}`);
      const [ux, uy] = unit(b.x - a.x, b.y - a.y);
      if (rev) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const off = 26;
        const c = [mx - uy * off, my + ux * off];
        const [sx, sy] = unit(c[0] - a.x, c[1] - a.y);
        const [ex, ey] = unit(c[0] - b.x, c[1] - b.y);
        const p1 = border(a, sx, sy);
        const p2 = border(b, ex, ey);
        body += `<path d="M${p1[0]},${p1[1]} Q${c[0]},${c[1]} ${p2[0]},${p2[1]}" class="${cls}" marker-end="${mk}"/>`;
        const mid = [0.25 * p1[0] + 0.5 * c[0] + 0.25 * p2[0], 0.25 * p1[1] + 0.5 * c[1] + 0.25 * p2[1]];
        ext(mid[0], mid[1], 2, 2);
        if (e.label) {
          labels += t(mid[0], mid[1], e.label, 'fel');
          extLabel(mid[0], mid[1], e.label);
        }
      } else {
        const p1 = border(a, ux, uy);
        const p2 = border(b, -ux, -uy);
        body += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="${cls}"${directed ? ` marker-end="${mk}"` : ''}/>`;
        if (e.label) {
          labels += t((p1[0] + p2[0]) / 2 - uy * 11, (p1[1] + p2[1]) / 2 + ux * 11, e.label, 'fel');
          extLabel((p1[0] + p2[0]) / 2 - uy * 11, (p1[1] + p2[1]) / 2 + ux * 11, e.label);
        }
      }
    }
    for (const p of nodes) {
      body += drawNode(p, p.shape === 'box' ? p.label : p.tokens != null ? '' : p.label, { double: p.shape === 'double', box: p.shape === 'box', hl: p.hl });
      if (p.tokens != null && p.shape !== 'box') {
        const k = p.tokens;
        if (k > 0 && k <= 4) {
          const pos = { 1: [[0, 0]], 2: [[-5, 0], [5, 0]], 3: [[-5, 4], [5, 4], [0, -5]], 4: [[-5, -5], [5, -5], [-5, 5], [5, 5]] }[k];
          for (const [dx, dy] of pos) body += `<circle cx="${p.x + dx}" cy="${p.y + dy}" r="3.2" class="ftok"/>`;
        } else if (k > 4) body += t(p.x, p.y, String(k), 'fl');
        labels += t(p.x, p.y - (p.r || 14) - 11, p.label, 'fel');
        extLabel(p.x, p.y - (p.r || 14) - 11, p.label);
      }
    }
    if (box.x0 === Infinity) ext(W / 2, H / 2, 20, 20);
    const M = 6;
    const x0 = Math.floor(box.x0 - M);
    const y0 = Math.floor(box.y0 - M);
    const w = Math.ceil(box.x1 + M) - x0;
    const h = Math.ceil(box.y1 + M) - y0;
    // descripción: nodos (con sus marcas) y aristas con su peso o etiqueta
    const name = (id) => byId.get(id).label;
    const nodeDesc = nodes.map((p) => p.label + (p.shape === 'oval' ? ' (terminal)' : p.shape === 'diamond' ? ' (decisión)' : '') + (p.tokens != null ? ` (${p.tokens} ${p.tokens === 1 ? 'marca' : 'marcas'})` : '') + (p.hl ? ' (resaltado)' : ''));
    const edgeDesc = edges.filter((e) => byId.has(e.from) && byId.has(e.to)).map((e) => `${name(e.from)}${directed ? ' → ' : ' – '}${name(e.to)}${e.label ? ` (${e.label})` : ''}`);
    const label = `${directed ? 'Grafo dirigido' : 'Grafo no dirigido'}. Nodos: ${list(nodeDesc)}.${edgeDesc.length ? ` ${directed ? 'Arcos' : 'Aristas'}: ${list(edgeDesc)}.` : ''}`;
    return wrap(w, h, body + labels, label, w, x0, y0);
  }

  // ---------- autómata ----------
  function automaton(f) {
    const S = f.states.map(String);
    const n = S.length;
    const idx = new Map(S.map((s, i) => [s, i]));
    const merged = new Map();
    for (const [a, sym, b] of f.trans || []) {
      const k = `${a}→${b}`;
      if (!merged.has(k)) merged.set(k, { a: String(a), b: String(b), syms: [] });
      merged.get(k).syms.push(String(sym));
    }
    const accept = new Set((f.accept || []).map(String));
    const row = n <= 6;
    const R = 20;
    const DX = 112;
    let W, H;
    const pos = [];
    let maxUp = 0;
    let maxDown = 0;
    // altura del arco por distancia entre estados: un arco que salta dos o más estados sale más empinado que el de
    // uno solo, para que dos arcos del mismo estado (S2→S1 y S2→S0) no salgan juntos ni se crucen bajo la etiqueta
    const arcH = (span) => 18 + span * 22 + (span - 1) * 40;
    if (row) {
      for (const e of merged.values()) {
        const i = idx.get(e.a);
        const j = idx.get(e.b);
        const span = Math.abs(j - i);
        if (i === j) maxUp = Math.max(maxUp, 52);
        else if (j > i && (span > 1 || merged.has(`${e.b}→${e.a}`))) maxUp = Math.max(maxUp, arcH(span));
        else if (j < i) maxDown = Math.max(maxDown, arcH(span));
      }
      W = 90 + (n - 1) * DX + 60;
      const top = 26 + maxUp;
      H = top + R + maxDown + 34;
      S.forEach((s, i) => pos.push({ x: 90 + i * DX, y: top + 6, r: R }));
    } else {
      // con radio 160, el margen deja dentro la flecha y la etiqueta de inicio y los bucles de arriba y abajo
      W = 560;
      H = 480;
      S.forEach((s, i) => {
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
        pos.push({ x: W / 2 + 160 * Math.cos(ang), y: H / 2 + 160 * Math.sin(ang), r: R });
      });
    }
    let body = '';
    let labels = '';
    for (const e of merged.values()) {
      const i = idx.get(e.a);
      const j = idx.get(e.b);
      const a = pos[i];
      const b = pos[j];
      const lab = e.syms.join(', ');
      if (i === j) {
        let ox = 0;
        let oy = -1;
        if (!row) [ox, oy] = unit(a.x - W / 2, a.y - H / 2);
        const px = -oy;
        const py = ox;
        const s = [a.x + (ox + px * 0.55) * R * 0.92, a.y + (oy + py * 0.55) * R * 0.92];
        const en = [a.x + (ox - px * 0.55) * R * 0.92, a.y + (oy - py * 0.55) * R * 0.92];
        const c1 = [a.x + ox * (R + 40) + px * 24, a.y + oy * (R + 40) + py * 24];
        const c2 = [a.x + ox * (R + 40) - px * 24, a.y + oy * (R + 40) - py * 24];
        body += `<path d="M${s[0]},${s[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${en[0]},${en[1]}" class="fe" marker-end="MARK"/>`;
        labels += t(a.x + ox * (R + 40), a.y + oy * (R + 40) - (row ? 2 : 0), lab, 'fel');
        continue;
      }
      const both = merged.has(`${e.b}→${e.a}`);
      let c;
      if (row) {
        const span = Math.abs(j - i);
        const straight = j === i + 1 && !both;
        if (straight) {
          const p1 = [a.x + R, a.y];
          const p2 = [b.x - R, b.y];
          body += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="fe" marker-end="MARK"/>`;
          labels += t((p1[0] + p2[0]) / 2, a.y - 11, lab, 'fel');
          continue;
        }
        const up = j > i;
        const hgt = arcH(span);
        c = [(a.x + b.x) / 2, a.y + (up ? -1 : 1) * hgt * 2];
      } else {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const [ux, uy] = unit(b.x - a.x, b.y - a.y);
        const off = both ? 30 : 0;
        c = [mx - uy * off, my + ux * off];
        if (!both) {
          const p1 = border(a, ux, uy);
          const p2 = border(b, -ux, -uy);
          body += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="fe" marker-end="MARK"/>`;
          labels += t(mx - uy * 12, my + ux * 12, lab, 'fel');
          continue;
        }
      }
      const [sx, sy] = unit(c[0] - a.x, c[1] - a.y);
      const [ex, ey] = unit(c[0] - b.x, c[1] - b.y);
      const p1 = border(a, sx, sy);
      const p2 = border(b, ex, ey);
      body += `<path d="M${p1[0]},${p1[1]} Q${c[0]},${c[1]} ${p2[0]},${p2[1]}" class="fe" marker-end="MARK"/>`;
      const lx = 0.25 * p1[0] + 0.5 * c[0] + 0.25 * p2[0];
      const ly = 0.25 * p1[1] + 0.5 * c[1] + 0.25 * p2[1];
      labels += t(lx, ly + (c[1] < a.y ? -9 : 9), lab, 'fel');
    }
    const si = idx.get(String(f.start));
    if (si != null) {
      const p = pos[si];
      const [ux, uy] = row ? [-1, 0] : unit(p.x - W / 2 || -1, p.y - H / 2);
      const tip = [p.x + ux * R, p.y + uy * R];
      body += `<line x1="${tip[0] + ux * 34}" y1="${tip[1] + uy * 34}" x2="${tip[0]}" y2="${tip[1]}" class="fe fe-start" marker-end="MARK"/>`;
      labels += t(tip[0] + ux * 46, tip[1] + uy * 46 - 1, 'inicio', 'fel fel-s');
    }
    S.forEach((s, i) => {
      body += drawNode(pos[i], s, { double: accept.has(s) });
    });
    const tr = [...merged.values()].map((e) => `${e.a} con ${e.syms.join(' o ')} va a ${e.b}`);
    const label = `Autómata con estados ${list(S)}; inicial ${f.start != null ? f.start : 'sin indicar'}; de aceptación ${accept.size ? list([...accept]) : 'ninguno'}.${tr.length ? ` Transiciones: ${tr.join('; ')}.` : ''}`;
    return wrap(W, H, body + labels, label, W);
  }

  // ---------- cinta de máquina de Turing ----------
  function tape(f) {
    const cells = f.cells.map(String);
    const C = 40;
    const PADX = 44;
    const W = PADX * 2 + cells.length * C;
    const H = 112;
    let body = `<text x="${PADX - 18}" y="40" class="fl fl-dim" text-anchor="middle" dominant-baseline="central">…</text><text x="${W - PADX + 18}" y="40" class="fl fl-dim" text-anchor="middle" dominant-baseline="central">…</text>`;
    cells.forEach((c, i) => {
      const x = PADX + i * C;
      body += `<rect x="${x}" y="20" width="${C}" height="${C}" class="fcell${i === f.head ? ' fcell-h' : ''}"/>`;
      body += t(x + C / 2, 40, c, 'fl fl-mono');
    });
    const hx = PADX + f.head * C + C / 2;
    body += `<path d="M${hx},64 l-9,14 h18 z" class="fhead"/>`;
    if (f.state) body += t(hx, 92, String(f.state), 'fl fl-mono fl-b');
    const label = `Cinta de máquina de Turing con las celdas ${list(cells)}; la cabeza está en la celda ${f.head + 1} (${cells[f.head]})${f.state ? `, en el estado ${f.state}` : ''}.`;
    return wrap(W, H, body, label, W);
  }

  // ---------- dendrograma ----------
  function dendrogram(f) {
    const n = f.leaves.length;
    const kids = {};
    const height = {};
    f.merges.forEach(([i, j, h], k) => {
      kids[n + k] = [i, j];
      height[n + k] = h;
    });
    const rootId = n + f.merges.length - 1;
    const order = [];
    const walk = (id) => {
      if (id < n) order.push(id);
      else kids[id].forEach(walk);
    };
    walk(rootId);
    const maxH = Math.max(...f.merges.map((m) => m[2])) || 1;
    const PADL = 54;
    const PADB = 40;
    const TOP = 22;
    const STEP = Math.max(44, Math.min(70, 520 / n));
    const W = PADL + n * STEP + 20;
    const H = 260;
    const yOf = (h) => TOP + (1 - h / maxH) * (H - TOP - PADB);
    const xOf = {};
    order.forEach((id, k) => (xOf[id] = PADL + STEP / 2 + k * STEP));
    const yAt = (id) => (id < n ? yOf(0) : yOf(height[id]));
    let body = '';
    for (let k = 0; k < f.merges.length; k++) {
      const id = n + k;
      const [a, b] = kids[id];
      xOf[id] = (xOf[a] + xOf[b]) / 2;
      const y = yOf(height[id]);
      body += `<path d="M${xOf[a]},${yAt(a)} V${y} H${xOf[b]} V${yAt(b)}" class="fe fe-d"/>`;
    }
    const ticks = 4;
    for (let k = 0; k <= ticks; k++) {
      const v = (maxH * k) / ticks;
      const y = yOf(v);
      body += `<line x1="${PADL - 6}" y1="${y}" x2="${W - 10}" y2="${y}" class="fgrid"/>`;
      body += `<text x="${PADL - 10}" y="${y}" class="fax" text-anchor="end" dominant-baseline="central">${escText(Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, ''))}</text>`;
    }
    body += `<text x="14" y="${(TOP + H - PADB) / 2}" class="fax" text-anchor="middle" transform="rotate(-90 14 ${(TOP + H - PADB) / 2})">distancia</text>`;
    order.forEach((id) => {
      body += t(xOf[id], H - PADB + 18, f.leaves[id], 'fl');
    });
    // la fusión k forma el "grupo k"
    const nm = f.leaves.map(String);
    const fus = f.merges.map(([i, j, h], k) => {
      const s = `${k + 1}) ${nm[i]} y ${nm[j]} a distancia ${h}`;
      nm[n + k] = `grupo ${k + 1}`;
      return s;
    });
    const label = `Dendrograma de ${list(f.leaves.map(String))}. Fusiones (la fusión k forma el grupo k): ${fus.join('; ')}.`;
    return wrap(W, H, body, label, W);
  }

  // ---------- red neuronal por capas ----------
  function layers(f) {
    const L = f.layers;
    const maxN = Math.max(...L.map((l) => l.length));
    const GAPX = 150;
    const GAPY = 52;
    const W = 80 + (L.length - 1) * GAPX + 80;
    const H = 40 + (maxN - 1) * GAPY + 70;
    const pos = L.map((layer, k) => layer.map((lab, i) => ({ x: 80 + k * GAPX, y: 34 + ((maxN - layer.length) * GAPY) / 2 + i * GAPY, r: 17, lab: String(lab) })));
    let body = '';
    for (let k = 0; k < L.length - 1; k++) {
      for (const a of pos[k]) for (const b of pos[k + 1]) {
        const [ux, uy] = unit(b.x - a.x, b.y - a.y);
        body += `<line x1="${a.x + ux * a.r}" y1="${a.y + uy * a.r}" x2="${b.x - ux * b.r}" y2="${b.y - uy * b.r}" class="fe fe-w"/>`;
      }
    }
    for (const layer of pos) for (const p of layer) body += drawNode(p, p.lab.length > 3 ? '' : p.lab) + (p.lab.length > 3 ? t(p.x, p.y, p.lab, 'fl fl-sm') : '');
    if (Array.isArray(f.labels)) f.labels.forEach((lab, k) => (body += t(80 + k * GAPX, H - 18, lab, 'fel fel-s')));
    const names = Array.isArray(f.labels) ? f.labels : [];
    const label = `Red neuronal por capas, cada neurona conectada con todas las de la capa siguiente: ${L.map((l, k) => `${names[k] || `capa ${k + 1}`} (${list(l.map(String))})`).join('; ')}.`;
    return wrap(W, H, body, label, W);
  }

  const KINDS = { tree, graph, automaton, tape, dendrogram, layers };

  // Figura que el contenedor reduce a menos del 85 % (teléfono): se ofrece verla a tamaño natural. Se mide al
  // aparecer y al cambiar de ancho (girar el teléfono, abrir el caso que la contiene); al volver a dibujar la vista,
  // también antes de restaurar el foco y el desplazamiento (EG.fig.fit en rerender y en ui.restoreFocus).
  function fit(f) {
    const svg = f && f.querySelector('.fig-svg');
    const b = f && f.querySelector('.fig-zoom');
    if (!svg || !b) return;
    const r = svg.getBoundingClientRect().width;
    const small = r > 0 && r < Number(f.dataset.w) * 0.85;
    f.classList.toggle('fig-small', small);
    b.hidden = !small;
  }
  if (window.ResizeObserver && window.MutationObserver) {
    // se observa el svg y no la figura: mostrar u ocultar el botón cambia la altura de la figura, no el ancho del svg
    const RO = new ResizeObserver((es) => es.forEach((e) => fit(e.target.closest('.fig'))));
    const live = new Set();
    new MutationObserver((ms) => {
      for (const svg of live) {
        if (!svg.isConnected) {
          RO.unobserve(svg);
          live.delete(svg);
        }
      }
      for (const m of ms) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          const fs = n.matches('.fig[data-w]') ? [n] : n.querySelectorAll('.fig[data-w]');
          for (const f of fs) {
            const svg = f.querySelector('.fig-svg');
            if (!svg || live.has(svg)) continue;
            live.add(svg);
            RO.observe(svg);
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  // Copia a tamaño natural en un diálogo; con ids propios, porque las flechas apuntan a su marcador por id y la
  // vista de abajo puede volver a dibujarse mientras está abierto.
  function zoom(el) {
    const f = el.closest('.fig');
    const svg = f && f.querySelector('.fig-svg');
    if (!svg || !f.classList.contains('fig-small')) return;
    const c = svg.cloneNode(true);
    c.removeAttribute('data-act');
    c.setAttribute('style', `width:${Number(f.dataset.w)}px;max-width:none`);
    let html = c.outerHTML;
    // marcadores fg<n>a (punta rellena) y fg<n>o (abierta): el mismo número nuevo para los dos
    const np = `fg${++seq}`;
    for (const m of c.querySelectorAll('marker')) {
      const nid = np + m.id.slice(-1);
      html = html.split(`id="${m.id}"`).join(`id="${nid}"`).split(`url(#${m.id})`).join(`url(#${nid})`);
    }
    EG.ui.modal({
      title: 'Figura',
      body: `<div class="fig-big" tabindex="0" role="region" aria-label="Figura a tamaño natural">${html}</div><p class="fig-hint muted" hidden>Desliza para recorrerla completa.</p>`,
      actions: [{ id: 'ok', label: 'Cerrar', kind: 'primary' }],
      cls: 'modal-fig',
      mount(p) {
        const box = p.querySelector('.fig-big');
        const hint = p.querySelector('.fig-hint');
        if (box && hint) hint.hidden = box.scrollWidth <= box.clientWidth + 2 && box.scrollHeight <= box.clientHeight + 2;
      },
    });
  }

  EG.fig = {
    render(spec) {
      if (!spec || !KINDS[spec.kind]) return '';
      try {
        return KINDS[spec.kind](spec);
      } catch (e) {
        if (window.console) console.warn('Figura inválida', e, spec);
        return '';
      }
    },
    zoom,
    fit,
  };
})();
