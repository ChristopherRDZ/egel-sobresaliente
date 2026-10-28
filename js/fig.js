/* Figuras SVG generadas a partir de especificaciones JSON: tree, graph, automaton, tape, dendrogram, layers. */
(function () {
  'use strict';
  const EG = window.EG;
  const { escText, esc } = EG.U;
  let seq = 0;

  const t = (x, y, s, cls, extra) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls || 'fl'}" text-anchor="middle" dominant-baseline="central"${extra || ''}>${escText(s)}</text>`;
  const wrap = (w, h, body, label, maxW) => {
    const id = `fg${++seq}`;
    const defs = `<defs><marker id="${id}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fah"/></marker></defs>`;
    return `<figure class="fig"><svg class="fig-svg" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}" style="max-width:${maxW || Math.ceil(w)}px" role="img" aria-label="${esc(label)}">${defs}${body.replace(/MARK/g, `url(#${id}a)`)}</svg></figure>`;
  };
  const unit = (dx, dy) => {
    const L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  };
  const nodeSize = (label) => {
    const s = String(label);
    return s.length <= 3 ? { r: 17 } : { w: Math.max(34, 8.2 * s.length + 14), h: 30 };
  };
  // punto en el borde de un nodo (círculo o rectángulo) en dirección (ux, uy)
  const border = (p, ux, uy) => {
    if (p.r) return [p.x + ux * p.r, p.y + uy * p.r];
    const hw = p.w / 2;
    const hh = p.h / 2;
    const k = Math.min(Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity);
    return [p.x + ux * k, p.y + uy * k];
  };
  const drawNode = (p, label, opts) => {
    const o = opts || {};
    let s = '';
    if (p.r) {
      s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" class="fn${o.hl ? ' fn-hl' : ''}"/>`;
      if (o.double) s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r - 4}" class="fn fn-in"/>`;
    } else {
      s += `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" rx="${o.box ? 3 : 8}" class="fn${o.hl ? ' fn-hl' : ''}"/>`;
    }
    if (label !== '' && label != null) s += t(p.x, p.y, label, 'fl');
    return s;
  };

  // ---------- árbol ----------
  function tree(f) {
    const DX = 46;
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
    const minX = Math.min(...all.map((n) => n.x));
    const maxX = Math.max(...all.map((n) => n.x));
    const maxD = Math.max(...all.map((n) => n.depth));
    const PAD = 30;
    for (const n of all) {
      Object.assign(n, nodeSize(n.v));
      n.px = PAD + (n.x - minX) * DX + 10;
      n.py = PAD + n.depth * DY;
    }
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
    const w = PAD * 2 + (maxX - minX) * DX + 20;
    const h = PAD * 2 + maxD * DY;
    return wrap(Math.max(w, 120), h, body, 'Árbol', Math.max(w, 120) * 1.05);
  }

  // ---------- grafo ----------
  function graph(f) {
    const nodes = f.nodes.map((n) => ({ id: String(n.id), label: n.label != null ? String(n.label) : String(n.id), shape: n.shape || 'circle', tokens: n.tokens, x: n.x, y: n.y, hl: !!n.hl }));
    const n = nodes.length;
    const hasXY = nodes.every((p) => typeof p.x === 'number');
    const W = hasXY ? 560 : n <= 3 ? 360 : n <= 5 ? 440 : 520;
    const H = hasXY ? 340 : n <= 3 ? 260 : n <= 5 ? 330 : 400;
    const PAD = 42;
    nodes.forEach((p, i) => {
      if (hasXY) {
        p.px = PAD + (p.x / 100) * (W - 2 * PAD);
        p.py = PAD + (p.y / 100) * (H - 2 * PAD);
      } else if (n === 1) {
        p.px = W / 2;
        p.py = H / 2;
      } else {
        const R = Math.min(W, H) / 2 - PAD;
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
        p.px = W / 2 + R * Math.cos(ang);
        p.py = H / 2 + R * Math.sin(ang);
      }
      if (p.shape === 'box') Object.assign(p, { w: Math.max(28, 8.2 * p.label.length + 14), h: 28 });
      else Object.assign(p, nodeSize(p.label));
    });
    const byId = new Map(nodes.map((p) => [p.id, p]));
    const directed = !!f.directed;
    const edges = (f.edges || []).map((e) => ({ from: String(e.from), to: String(e.to), label: e.label != null ? String(e.label) : e.w != null ? String(e.w) : '' }));
    const pairs = new Set(edges.map((e) => `${e.from}→${e.to}`));
    let body = '';
    let labels = '';
    for (const e of edges) {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b) continue;
      if (a === b) {
        const cx = W / 2;
        const cy = H / 2;
        const [ox, oy] = unit(a.px - cx || 0.001, a.py - cy || -1);
        const r = a.r || a.h / 2;
        const base = [a.px + ox * r, a.py + oy * r];
        const px = -oy;
        const py = ox;
        const c1 = [base[0] + ox * 46 + px * 22, base[1] + oy * 46 + py * 22];
        const c2 = [base[0] + ox * 46 - px * 22, base[1] + oy * 46 - py * 22];
        const s = [a.px + (ox + px * 0.5) * r * 0.9, a.py + (oy + py * 0.5) * r * 0.9];
        const en = [a.px + (ox - px * 0.5) * r * 0.9, a.py + (oy - py * 0.5) * r * 0.9];
        body += `<path d="M${s[0]},${s[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${en[0]},${en[1]}" class="fe"${directed ? ' marker-end="MARK"' : ''}/>`;
        if (e.label) labels += t(base[0] + ox * 44, base[1] + oy * 44, e.label, 'fel');
        continue;
      }
      const rev = directed && pairs.has(`${e.to}→${e.from}`);
      const [ux, uy] = unit(b.px - a.px, b.py - a.py);
      if (rev) {
        const mx = (a.px + b.px) / 2;
        const my = (a.py + b.py) / 2;
        const off = 26;
        const c = [mx - uy * off, my + ux * off];
        const [sx, sy] = unit(c[0] - a.px, c[1] - a.py);
        const [ex, ey] = unit(c[0] - b.px, c[1] - b.py);
        const p1 = border(a, sx, sy);
        const p2 = border(b, ex, ey);
        body += `<path d="M${p1[0]},${p1[1]} Q${c[0]},${c[1]} ${p2[0]},${p2[1]}" class="fe" marker-end="MARK"/>`;
        if (e.label) labels += t(0.25 * p1[0] + 0.5 * c[0] + 0.25 * p2[0], 0.25 * p1[1] + 0.5 * c[1] + 0.25 * p2[1], e.label, 'fel');
      } else {
        const p1 = border(a, ux, uy);
        const p2 = border(b, -ux, -uy);
        body += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="fe"${directed ? ' marker-end="MARK"' : ''}/>`;
        if (e.label) labels += t((p1[0] + p2[0]) / 2 - uy * 11, (p1[1] + p2[1]) / 2 + ux * 11, e.label, 'fel');
      }
    }
    for (const p of nodes) {
      body += drawNode(p, p.shape === 'box' ? p.label : p.tokens != null ? '' : p.label, { double: p.shape === 'double', box: p.shape === 'box', hl: p.hl });
      if (p.tokens != null && p.shape !== 'box') {
        const k = p.tokens;
        if (k > 0 && k <= 4) {
          const pos = { 1: [[0, 0]], 2: [[-5, 0], [5, 0]], 3: [[-5, 4], [5, 4], [0, -5]], 4: [[-5, -5], [5, -5], [-5, 5], [5, 5]] }[k];
          for (const [dx, dy] of pos) body += `<circle cx="${p.px + dx}" cy="${p.py + dy}" r="3.2" class="ftok"/>`;
        } else if (k > 4) body += t(p.px, p.py, String(k), 'fl');
        labels += t(p.px, p.py - (p.r || 14) - 11, p.label, 'fel');
      }
    }
    return wrap(W, H, body + labels, 'Grafo', W);
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
    if (row) {
      for (const e of merged.values()) {
        const i = idx.get(e.a);
        const j = idx.get(e.b);
        const span = Math.abs(j - i);
        if (i === j) maxUp = Math.max(maxUp, 52);
        else if (j > i && (span > 1 || merged.has(`${e.b}→${e.a}`))) maxUp = Math.max(maxUp, 18 + span * 22);
        else if (j < i) maxDown = Math.max(maxDown, 18 + span * 22);
      }
      W = 90 + (n - 1) * DX + 60;
      const top = 26 + maxUp;
      H = top + R + maxDown + 34;
      S.forEach((s, i) => pos.push({ x: 90 + i * DX, y: top + 6, r: R }));
    } else {
      W = 520;
      H = 420;
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
        const hgt = 18 + span * 22;
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
    return wrap(W, H, body + labels, 'Diagrama de autómata', W);
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
    return wrap(W, H, body, 'Cinta de máquina de Turing', W);
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
    return wrap(W, H, body, 'Dendrograma', W);
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
    return wrap(W, H, body, 'Red neuronal', W);
  }

  const KINDS = { tree, graph, automaton, tape, dendrogram, layers };

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
  };
})();
