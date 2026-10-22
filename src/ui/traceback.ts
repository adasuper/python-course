// Byte labels the parts of a real Python traceback, from Region 10 on (docs/specs.md §6.8,
// F-FBK-10). Pure, so it can be unit-tested.
import { t } from '../i18n/en';

/** Region from which the "Show the real Python error" view is annotated. */
export const ANNOTATE_FROM_REGION = 10;

export type TracePartKind = 'intro' | 'where' | 'code' | 'pointer' | 'error';

export interface TracePart {
  line: string;
  kind: TracePartKind;
  note: string;
}

export function annotateTraceback(raw: string): TracePart[] {
  const lines = raw.replace(/\n+$/, '').split('\n');
  return lines.map((line, i): TracePart => {
    if (/^Traceback \(most recent call last\):/.test(line))
      return { line, kind: 'intro', note: t.trace.intro };
    const where = /^\s*File "spellbook", line (\d+)(?:, in (\S+))?/.exec(line);
    if (where) {
      const n = Number(where[1]);
      const fn = where[2] && where[2] !== '<module>' ? where[2] : null;
      return { line, kind: 'where', note: fn ? t.trace.whereIn(n, fn) : t.trace.where(n) };
    }
    if (/^\s*[\^~]+\s*$/.test(line)) return { line, kind: 'pointer', note: t.trace.pointer };
    if (i === lines.length - 1) {
      const m = /^([A-Za-z_]\w*)(?::\s?(.*))?$/.exec(line);
      if (m) return { line, kind: 'error', note: t.trace.error(m[1]!, m[2] ?? '') };
    }
    return { line, kind: 'code', note: t.trace.code };
  });
}
