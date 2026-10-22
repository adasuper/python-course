import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'public/',
      'src/generated/',
      'playwright-report/',
      'test-results/',
      '.claude/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Text is only ever rendered as text (F-DLG-02, F-QA-01): no raw HTML anywhere.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AssignmentExpression[left.property.name=/^(inner|outer)HTML$/]',
          message: 'Never set innerHTML/outerHTML. Render text with Preact or textContent.',
        },
        {
          selector: 'CallExpression[callee.property.name="insertAdjacentHTML"]',
          message: 'Never insert raw HTML. Render text with Preact or textContent.',
        },
        {
          selector: 'CallExpression[callee.object.name="document"][callee.property.name=/^write(ln)?$/]',
          message: 'Never use document.write.',
        },
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'Never use dangerouslySetInnerHTML. Render the safe text tree instead.',
        },
      ],
    },
  },
);
