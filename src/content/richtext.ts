// A tiny, safe Markdown subset for story text (docs/specs.md §9.8).
// Text is compiled to this tree at build time and rendered by Preact components,
// so nothing is ever inserted as raw HTML.
//
// Supported: paragraphs, ```code blocks```, "- " lists, **bold**, *italic*, `code`,
// and glossary links [[term]] or [[shown words|term]].

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; c: Inline[] }
  | { t: 'i'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'term'; term: string; c: Inline[] };

export type Block = { t: 'p'; c: Inline[] } | { t: 'pre'; v: string } | { t: 'ul'; items: Inline[][] };

export type Rich = Block[];

export function parseRich(source: string): Rich {
  const blocks: Rich = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ t: 'p', c: parseInline(para.join(' ')) });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ t: 'ul', items: list.map(parseInline) });
    list = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim().startsWith('```')) {
      flushPara();
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) code.push(lines[i++]!);
      blocks.push({ t: 'pre', v: code.join('\n') });
      continue;
    }
    if (/^\s*- /.test(line)) {
      flushPara();
      list.push(line.replace(/^\s*- /, ''));
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    if (rest.startsWith('`')) {
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ t: 'code', v: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (rest.startsWith('[[')) {
      const end = text.indexOf(']]', i + 2);
      if (end > i) {
        flush();
        const inner = text.slice(i + 2, end);
        const [shown, term] = inner.includes('|') ? inner.split('|', 2) : [inner, inner];
        out.push({ t: 'term', term: term!.trim().toLowerCase(), c: parseInline(shown!) });
        i = end + 2;
        continue;
      }
    }
    if (rest.startsWith('**')) {
      const end = text.indexOf('**', i + 2);
      if (end > i) {
        flush();
        out.push({ t: 'b', c: parseInline(text.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (rest.startsWith('*') && !rest.startsWith('**')) {
      const end = text.indexOf('*', i + 1);
      if (end > i + 1) {
        flush();
        out.push({ t: 'i', c: parseInline(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return out;
}

/** Glossary terms referenced anywhere in a rich text tree. */
export function termsIn(rich: Rich): string[] {
  const found: string[] = [];
  const walk = (nodes: Inline[]) => {
    for (const n of nodes) {
      if (n.t === 'term') {
        found.push(n.term);
        walk(n.c);
      } else if (n.t === 'b' || n.t === 'i') walk(n.c);
    }
  };
  for (const b of rich) {
    if (b.t === 'p') walk(b.c);
    if (b.t === 'ul') b.items.forEach(walk);
  }
  return found;
}

/** Plain words of a rich text tree, for reading-level checks and screen-reader labels. */
export function plainText(rich: Rich, includeCode = false): string {
  const inline = (nodes: Inline[]): string =>
    nodes
      .map((n) => {
        if (n.t === 'text') return n.v;
        if (n.t === 'code') return includeCode ? n.v : '';
        return inline(n.c);
      })
      .join('');
  return rich
    .map((b) => {
      if (b.t === 'p') return inline(b.c);
      if (b.t === 'ul') return b.items.map(inline).join('. ');
      return includeCode ? b.v : '';
    })
    .join('\n');
}

/** Fill {placeholders} in every text and code node (used for error messages). */
export function fillRich(rich: Rich, params: Record<string, string>): Rich {
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => params[k] ?? m);
  const inline = (nodes: Inline[]): Inline[] =>
    nodes.map((n) => {
      if (n.t === 'text' || n.t === 'code') return { ...n, v: fill(n.v) };
      return { ...n, c: inline(n.c) };
    });
  return rich.map((b) => {
    if (b.t === 'p') return { ...b, c: inline(b.c) };
    if (b.t === 'ul') return { ...b, items: b.items.map(inline) };
    return { ...b, v: fill(b.v) };
  });
}
