/* Texto enriquecido mínimo (párrafos, listas, tablas, código, citas, encabezados) y resaltado de sintaxis. */
(function () {
  'use strict';
  const EG = window.EG;
  const { escText, esc } = EG.U;

  // ---------- resaltado ----------
  const KW = {
    java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try var void volatile while record yield sealed permits true false null',
    c: 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false NULL',
    cpp: 'alignas auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while override final std cout cin endl string vector',
    python: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield print len range self',
    js: 'async await break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof undefined var void while with yield of console',
    php: 'abstract and array as break case catch class clone const continue declare default do echo else elseif empty endfor endforeach endif endwhile extends final finally fn for foreach function global if implements include include_once instanceof interface isset list match namespace new null or print private protected public require require_once return static switch throw trait true false try unset use var while',
    sql: 'select from where and or not in is null like between join inner left right full outer cross on as group by having order asc desc distinct union all insert into values update set delete create table view index primary key foreign references drop alter add column constraint unique check default trigger procedure function begin end declare if then else elsif case when return returns for each row new old before after commit rollback savepoint grant revoke to exists count sum avg min max limit offset truncate cascade varchar int integer char date decimal numeric boolean text serial',
    pseudo: 'procedimiento función funcion inicio fin si entonces sino sino_si fin_si mientras hacer fin_mientras para hasta fin_para paso repetir que regresar retornar devolver escribir leer imprimir y o no verdadero falso entero real cadena caracter booleano arreglo de var variable algoritmo según segun caso fin_según otro intercambia llamar mod div nulo',
    prolog: 'is not true fail',
    haskell: 'case class data deriving do else if import in infix instance let module newtype of then type where map filter foldr foldl head tail',
    lisp: 'define lambda let if cond else car cdr cons list quote setq defun and or not null',
    bash: 'if then else elif fi for in do done while case esac function echo exit return export local',
  };
  const SETS = {};
  for (const k of Object.keys(KW)) SETS[k] = new Set(KW[k].split(/\s+/));
  SETS.scheme = SETS.lisp;
  const CI = new Set(['sql', 'pseudo']);
  const LINE_COMMENT = {
    java: '//', c: '//', cpp: '//', js: '//', php: '//', python: '#', bash: '#', sql: '--', haskell: '--', prolog: '%', lisp: ';', scheme: ';', pseudo: '//',
  };

  function highlight(code, lang) {
    const set = SETS[lang];
    if (!set) return escText(code);
    const lc = LINE_COMMENT[lang];
    const block = ['java', 'c', 'cpp', 'js', 'php', 'pseudo', 'sql'].includes(lang);
    const parts = [];
    if (block) parts.push('\\/\\*[\\s\\S]*?\\*\\/');
    if (lc) parts.push(lc.replace(/[/]/g, '\\/') + '[^\\n]*');
    if (lang === 'python') parts.push('"""[\\s\\S]*?"""', "'''[\\s\\S]*?'''");
    parts.push('"(?:\\\\.|[^"\\\\\\n])*"', "'(?:\\\\.|[^'\\\\\\n])*'");
    if (lang === 'js') parts.push('`(?:\\\\.|[^`\\\\])*`');
    const re = new RegExp(
      `(${parts.join('|')})|(\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[fFlLuU]*\\b|\\b0[xX][0-9a-fA-F]+\\b)|(@?[A-Za-z_áéíóúñÁÉÍÓÚÑ$][\\wáéíóúñÁÉÍÓÚÑ$]*)|(#\\s*(?:include|define|ifndef|ifdef|endif|pragma)[^\\n]*)`,
      'g',
    );
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(code))) {
      if (m.index > last) out += escText(code.slice(last, m.index));
      const t = m[0];
      if (m[1]) {
        const isComment = t.startsWith('/*') || (lc && t.startsWith(lc));
        out += `<span class="${isComment ? 'tc' : 'ts'}">${escText(t)}</span>`;
      } else if (m[2]) {
        out += `<span class="tn">${escText(t)}</span>`;
      } else if (m[3]) {
        const w = CI.has(lang) ? t.toLowerCase() : t;
        if (t.startsWith('@')) out += `<span class="tt">${escText(t)}</span>`;
        else if (set.has(w)) out += `<span class="tk">${escText(t)}</span>`;
        else if ((lang === 'java' || lang === 'cpp' || lang === 'php') && /^[A-Z][A-Za-z0-9_]*$/.test(t) && t.length > 1) out += `<span class="tt">${escText(t)}</span>`;
        else out += escText(t);
      } else if (m[4]) {
        out += `<span class="tk">${escText(t)}</span>`;
      }
      last = re.lastIndex;
    }
    out += escText(code.slice(last));
    return out;
  }

  const LANG_LABEL = {
    java: 'Java', c: 'C', cpp: 'C++', python: 'Python', js: 'JavaScript', php: 'PHP', sql: 'SQL', pseudo: 'Pseudocódigo', prolog: 'Prolog', haskell: 'Haskell', lisp: 'Lisp', scheme: 'Scheme', bash: 'Bash', html: 'HTML', css: 'CSS', json: 'JSON', xml: 'XML', text: 'Texto', asm: 'Ensamblador',
  };

  function codeBlock(code, lang) {
    const label = LANG_LABEL[lang] || '';
    const show = label && lang !== 'text';
    return `<figure class="code"${show ? ` data-lang="${esc(label)}"` : ''}><pre><code>${highlight(code, lang)}</code></pre></figure>`;
  }

  // ---------- en línea ----------
  function inline(src) {
    const codes = [];
    let s = String(src == null ? '' : src).replace(/`([^`\n]+)`/g, (m, c) => {
      codes.push(c);
      return `\u0000${codes.length - 1}\u0000`;
    });
    s = escText(s);
    s = s.replace(/&lt;(\/?)(sup|sub)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, '<br>');
    s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
    // la cursiva no abre con puntuación: un * de Kleene ("por *: c*") se queda como asterisco
    s = s.replace(/(^|[\s(¿¡"'“«—–\-])\*(?=[^\s*.,;:!?)\]}])([^*\n]*?[^\s*])\*(?=$|[\s.,;:!?)"'”»—–\-])/g, '$1<em>$2</em>');
    s = s.replace(/\u0000(\d+)\u0000/g, (m, k) => `<code>${escText(codes[Number(k)])}</code>`);
    return s;
  }

  // ---------- bloques ----------
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const isUl = (l) => /^\s*[-•] \S/.test(l);
  const isOl = (l) => /^\s*\d+[.)] \S/.test(l);
  // cerca de código: ``` al inicio del renglón o con hasta 3 espacios de sangría
  const FENCE = /^ {0,3}```/;
  const isBlockStart = (l, next) => FENCE.test(l) || /^#{1,4} /.test(l) || /^>/.test(l) || isUl(l) || isOl(l) || (isTableRow(l) && next != null && isSep(next));

  // "\|" es una barra literal dentro de la celda (GFM), también dentro de código
  function cells(row) {
    return row.split('\\|').join('\u0001').trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim().split('\u0001').join('|'));
  }

  // Consume la cerca que empieza en lines[i] quitando a cada renglón la sangría de la cerca; devuelve [html, siguiente i].
  function fence(lines, i) {
    const m = /^(\s*)```\s*(.*)$/.exec(lines[i]);
    const ind = m[1].length;
    const lang = m[2].trim().toLowerCase();
    const buf = [];
    i++;
    while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
      const l = lines[i++];
      buf.push(l.slice(Math.min(ind, l.length - l.replace(/^ +/, '').length)));
    }
    return [codeBlock(buf.join('\n'), lang), i + 1];
  }

  function render(src, opts) {
    const o = opts || {};
    const lines = String(src == null ? '' : src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (FENCE.test(line)) {
        const [h, ni] = fence(lines, i);
        out.push(h);
        i = ni;
        continue;
      }
      if (/^\s*$/.test(line)) {
        i++;
        continue;
      }
      const hm = /^(#{1,4}) (.*)$/.exec(line);
      if (hm) {
        const lvl = Math.min(4, hm[1].length + (o.headingShift || 0));
        const text = hm[2].trim();
        const idm = /^(t\d{2})\s*·\s*/.exec(text);
        const id = idm && o.idPrefix ? ` id="${esc(o.idPrefix + idm[1])}"` : '';
        out.push(`<h${lvl}${id}>${inline(text)}</h${lvl}>`);
        i++;
        continue;
      }
      if (isTableRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
        const head = cells(line);
        const al = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''));
        i += 2;
        const rows = [];
        while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
        const th = head.map((c, k) => `<th${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(c)}</th>`).join('');
        const tb = rows.map((r) => `<tr>${head.map((_, k) => `<td${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(r[k] == null ? '' : r[k])}</td>`).join('')}</tr>`).join('');
        out.push(`<div class="tbl"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`);
        continue;
      }
      if (/^>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${render(buf.join('\n'), o)}</blockquote>`);
        continue;
      }
      if (isUl(line) || isOl(line)) {
        const ordered = isOl(line);
        const items = [];
        let start = null;
        while (i < lines.length && (ordered ? isOl(lines[i]) : isUl(lines[i]))) {
          const mm = ordered ? /^\s*(\d+)[.)] (.*)$/.exec(lines[i]) : /^\s*[-•] (.*)$/.exec(lines[i]);
          if (ordered && start == null) start = Number(mm[1]);
          // renglones de continuación uno por uno; una cerca con sangría es un bloque de código dentro del elemento
          let html = inline(ordered ? mm[2] : mm[1]);
          i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !isUl(lines[i]) && !isOl(lines[i])) {
            if (/^\s+```/.test(lines[i])) {
              const [h, ni] = fence(lines, i);
              html += h;
              i = ni;
            } else html += '<br>' + inline(lines[i++].trim());
          }
          items.push(html);
        }
        const tag = ordered ? 'ol' : 'ul';
        const st = ordered && start && start !== 1 ? ` start="${start}"` : '';
        out.push(`<${tag}${st}>${items.map((t) => `<li>${t}</li>`).join('')}</${tag}>`);
        continue;
      }
      const buf = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i], lines[i + 1])) buf.push(lines[i++]);
      out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
    }
    return out.join('');
  }

  // Versión compacta para opciones: si es una sola línea, sin <p>.
  function renderOption(src) {
    const s = String(src == null ? '' : src).trim();
    if (!s.includes('\n') && !/^```/.test(s) && !isUl(s) && !isOl(s)) return inline(s);
    return render(s);
  }

  // Texto plano (para búsquedas y prompts).
  function plain(src) {
    return String(src == null ? '' : src)
      .replace(/```[a-z]*\n?/g, '')
      // etiquetas antes que los marcadores (si no, se borra el ">" de <sup> y queda "A<sup p</sup")
      .replace(/<sup>/g, '^')
      .replace(/<sub>/g, '_')
      .replace(/<\/(sup|sub)>/g, '')
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/[*`#>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  EG.md = { render, inline, renderOption, highlight, plain, codeBlock };
})();
