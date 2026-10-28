/* Utilidades generales: DOM, fechas, azar con semilla, almacenamiento local seguro. */
(function () {
  'use strict';
  const EG = (window.EG = window.EG || {});
  const U = (EG.U = {});

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  U.escText = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ESC[c]);

  const pad = (n) => String(n).padStart(2, '0');
  U.pad = pad;
  U.now = () => Date.now();
  U.dayKey = (t) => {
    const d = t instanceof Date ? t : new Date(t == null ? Date.now() : t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  U.parseDay = (key) => {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  U.startOfDay = (t) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  U.daysBetween = (a, b) => Math.round((U.startOfDay(b) - U.startOfDay(a)) / 86400000);
  U.addDays = (t, n) => {
    const d = new Date(t);
    d.setDate(d.getDate() + n);
    return d.getTime();
  };
  // Semana ISO aproximada como clave de documento: 2026w44
  U.weekKey = (t) => {
    const d = new Date(U.startOfDay(t));
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day + 3);
    const firstThu = new Date(d.getFullYear(), 0, 4);
    const w = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}w${pad(w)}`;
  };
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  U.fmtShort = (t) => {
    const d = new Date(t);
    return `${d.getDate()} ${MESES[d.getMonth()]}`;
  };
  U.fmtLong = (t) => {
    const d = new Date(t);
    return `${DIAS_L[d.getDay()]} ${d.getDate()} de ${MESES_L[d.getMonth()]}`;
  };
  U.fmtDow = (t) => DIAS[new Date(t).getDay()];
  U.fmtDateTime = (t) => {
    const d = new Date(t);
    return `${d.getDate()} ${MESES[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  U.fmtDur = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h) return `${h} h ${pad(m)} min`;
    if (m) return `${m} min`;
    return `${s} s`;
  };
  U.fmtClock = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return h ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
  };
  U.fmtNum = (n) => Number(n).toLocaleString('es-MX');
  U.pct = (x) => `${Math.round(x * 100)}%`;
  U.plural = (n, one, many) => `${U.fmtNum(n)} ${n === 1 ? one : many}`;
  U.clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  // FNV-1a de 32 bits y generador mulberry32 para revolver de forma reproducible.
  U.hash = (str) => {
    let h = 0x811c9dc5;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };
  U.rng = (seed) => {
    let a = typeof seed === 'number' ? seed >>> 0 : U.hash(seed);
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.shuffle = (arr, rnd) => {
    const a = arr.slice();
    const r = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  U.uid = (p) => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  U.debounce = (fn, ms) => {
    let t = null;
    const d = (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
    d.flush = (...args) => {
      clearTimeout(t);
      fn(...args);
    };
    return d;
  };
  U.norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();

  // localStorage puede faltar o lanzar excepciones (ventana privada, vista previa): todo protegido.
  U.storage = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    del(key) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        /* sin almacenamiento */
      }
    },
  };

  U.isFramed = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();
  U.isStandalone = () => {
    try {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  };
  U.prefersReducedMotion = () => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  };
})();
