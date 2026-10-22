// A tiny reader for ASSETS_LICENSES.md (headings, paragraphs, lists, tables), shown on
// the Credits screen as plain text. No imports, so tests can use it directly.

export type Block =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] };

/** Markdown links become plain text: the game never sends students off to the web. */
const unlink = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => unlink(c.trim()));

export function parseCredits(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith('# ') || !line.trim()) continue;
    if (line.startsWith('## ')) blocks.push({ t: 'h', text: line.slice(3) });
    else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith('|')) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i]!.trim())) rows.push(cells(lines[i]!));
        i++;
      }
      i--;
      blocks.push({ t: 'table', head: rows[0] ?? [], rows: rows.slice(1) });
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('- ')) items.push(unlink(lines[i++]!.slice(2)));
      i--;
      blocks.push({ t: 'ul', items });
    } else {
      const para = [line];
      while (i + 1 < lines.length && lines[i + 1]!.trim() && !/^(#|\||- )/.test(lines[i + 1]!))
        para.push(lines[++i]!);
      blocks.push({ t: 'p', text: unlink(para.join(' ')) });
    }
  }
  return blocks;
}
