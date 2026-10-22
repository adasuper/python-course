// The Spellbook's code colours: CodeMirror's default style, with the few colours that were too
// light (under 4.5:1 on the code backgrounds, e.g. f-strings) made darker. A unit test checks
// every colour against every code background (tests/unit/tokens.test.ts).
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export const HIGHLIGHT_COLORS = {
  meta: '#404740',
  keyword: '#770088',
  atom: '#221199',
  literal: '#116644',
  string: '#aa1111',
  special: '#a63a00',
  definition: '#0000ff',
  local: '#3300aa',
  type: '#00703f',
  className: '#116677',
  specialName: '#225566',
  property: '#0000cc',
  comment: '#994400',
  invalid: '#c00000',
} as const;

const c = HIGHLIGHT_COLORS;

export const spellbookHighlight = HighlightStyle.define([
  { tag: tags.meta, color: c.meta },
  { tag: tags.link, textDecoration: 'underline' },
  { tag: tags.heading, textDecoration: 'underline', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.keyword, color: c.keyword },
  { tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName], color: c.atom },
  { tag: [tags.literal, tags.inserted], color: c.literal },
  { tag: [tags.string, tags.deleted], color: c.string },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: c.special },
  { tag: tags.definition(tags.variableName), color: c.definition },
  { tag: tags.local(tags.variableName), color: c.local },
  { tag: [tags.typeName, tags.namespace], color: c.type },
  { tag: tags.className, color: c.className },
  { tag: [tags.special(tags.variableName), tags.macroName], color: c.specialName },
  { tag: tags.definition(tags.propertyName), color: c.property },
  { tag: tags.comment, color: c.comment },
  { tag: tags.invalid, color: c.invalid },
]);
