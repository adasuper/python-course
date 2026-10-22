// Renders compiled story text safely (no innerHTML) with glossary toggletips.
import { useState } from 'preact/hooks';
import type { Inline, Rich } from '../../content/richtext';
import { t } from '../../i18n/en';
import { course } from '../../state/store';

let termCounter = 0;

export function Term({ term, children }: { term: string; children: preact.ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const [id] = useState(() => `term-${++termCounter}`);
  const entry = course.value?.glossary[term];
  if (!entry) return <>{children}</>;
  return (
    <span class="term">
      <button
        type="button"
        class="term-button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          // Esc closes the tip, and only the tip (not the scene around it).
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      >
        {children}
      </button>
      {/* The toggletip pattern: the definition is put into a live region when it opens, so
          screen readers announce it (F-DLG-03). */}
      <span id={id} class="term-live" role="status">
        {open && (
          <span class="term-pop">
            <strong>{entry.term}:</strong> <RichText rich={entry.definition} inline />{' '}
            <span class="term-example">
              {t.glossaryExample} <RichText rich={entry.example} inline />
            </span>
          </span>
        )}
      </span>
    </span>
  );
}

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text':
            return <span key={i}>{n.v}</span>;
          case 'code':
            return <code key={i}>{n.v}</code>;
          case 'b':
            return (
              <strong key={i}>
                <InlineNodes nodes={n.c} />
              </strong>
            );
          case 'i':
            return (
              <em key={i}>
                <InlineNodes nodes={n.c} />
              </em>
            );
          case 'term':
            return (
              <Term key={i} term={n.term}>
                <InlineNodes nodes={n.c} />
              </Term>
            );
        }
      })}
    </>
  );
}

export function RichText({
  rich,
  inline = false,
  onCopyCode,
}: {
  rich: Rich | null | undefined;
  inline?: boolean;
  onCopyCode?: (code: string) => void;
}) {
  if (!rich) return null;
  if (inline) {
    return (
      <>
        {rich.map((b, i) =>
          b.t === 'p' ? (
            <InlineNodes key={i} nodes={b.c} />
          ) : b.t === 'pre' ? (
            <code key={i}>{b.v}</code>
          ) : null,
        )}
      </>
    );
  }
  return (
    <>
      {rich.map((b, i) => {
        if (b.t === 'p')
          return (
            <p key={i}>
              <InlineNodes nodes={b.c} />
            </p>
          );
        if (b.t === 'ul')
          return (
            <ul key={i}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <InlineNodes nodes={item} />
                </li>
              ))}
            </ul>
          );
        return (
          <div key={i} class="code-block">
            <pre lang="zxx">
              <code>{b.v}</code>
            </pre>
            {onCopyCode && (
              <button type="button" class="small" onClick={() => onCopyCode(b.v)}>
                Copy into Spellbook
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
