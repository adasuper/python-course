// Credits (F-DEP-06): ASSETS_LICENSES.md itself, rendered as plain text, tables and lists.
// It is bundled at build time, so the credits always match the file and work offline.
import { useEffect, useRef } from 'preact/hooks';
import licenses from '../../../ASSETS_LICENSES.md?raw';
import { parseInline } from '../../content/richtext';
import { t } from '../../i18n/en';
import { go, type Route } from '../../state/store';
import { InlineNodes } from '../components/RichText';
import { parseCredits } from '../markdown';

const Text = ({ text }: { text: string }) => <InlineNodes nodes={parseInline(text)} />;

export function CreditsScreen({ back = { name: 'title' } }: { back?: Route }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <main id="main" class="screen credits-screen">
      <div class="quest-header">
        <button type="button" class="ghost" onClick={() => go(back)}>
          ◀ {t.credits.back}
        </button>
        <h1 ref={heading} tabIndex={-1}>
          {t.credits.heading}
        </h1>
      </div>
      <div class="card">
        {parseCredits(licenses).map((b, i) => {
          if (b.t === 'h') return <h2 key={i}>{b.text}</h2>;
          if (b.t === 'p')
            return (
              <p key={i}>
                <Text text={b.text} />
              </p>
            );
          if (b.t === 'ul')
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Text text={item} />
                  </li>
                ))}
              </ul>
            );
          return (
            <div class="table-wrap" key={i}>
              <table>
                <thead>
                  <tr>
                    {b.head.map((h, j) => (
                      <th key={j} scope="col">
                        <Text text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((c, k) => (
                        <td key={k}>
                          <Text text={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </main>
  );
}
