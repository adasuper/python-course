// The deploy's hint mode (F-DEP-02, M2.4): all three tiers, only the nudge, or none.
import { expect, test, type Page } from '@playwright/test';
import { waitForPython } from './helpers';

async function withHints(page: Page, hints: 'all' | 'nudge' | 'off') {
  await page.route('**/codeweald.config.json', (route) => route.fulfill({ json: { defaults: { hints } } }));
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  await waitForPython(page);
}

test('hints: all three tiers by default, unlocked in order', async ({ page }) => {
  await withHints(page, 'all');
  const hints = page.getByRole('region', { name: /Hints/ });
  await expect(hints.getByRole('button', { name: /^Hint \d$/ })).toHaveCount(3);
  await expect(hints.getByRole('button', { name: 'Hint 2' })).toBeDisabled();
  await hints.getByRole('button', { name: 'Hint 1' }).click();
  await expect(hints.getByRole('button', { name: 'Hint 2' })).toBeEnabled();
  await expect(hints).toContainText('Hints are free');
});

test('hints: a "nudge" deploy shows only the first hint', async ({ page }) => {
  await withHints(page, 'nudge');
  const hints = page.getByRole('region', { name: /Hints/ });
  await expect(hints.getByRole('button', { name: /^Hint \d$/ })).toHaveCount(1);
  await hints.getByRole('button', { name: 'Hint 1' }).click();
  await expect(hints.getByRole('note')).toHaveCount(1);
});

test('hints: an "off" deploy shows none', async ({ page }) => {
  await withHints(page, 'off');
  await expect(page.locator('#quest-title')).toBeVisible();
  await expect(page.getByRole('region', { name: /Hints/ })).toHaveCount(0);
});

test('hint 3 can copy its example into the Spellbook (F-FBK-12)', async ({ page }) => {
  await withHints(page, 'all');
  const hints = page.getByRole('region', { name: /Hints/ });
  for (const n of [1, 2, 3]) await hints.getByRole('button', { name: `Hint ${n}` }).click();
  await hints.getByRole('button', { name: /Copy into Spellbook/ }).click();
  const code = (await hints.locator('pre').last().innerText()).trim();
  await expect(page.getByRole('textbox', { name: /Spellbook: your Python code/ })).toContainText(
    code.split('\n')[0]!,
  );
});

test('investigate: a wrong answer shows that question’s hint, then a retry can be right', async ({
  page,
}) => {
  await page.goto('./?dev#/dev/quest/r1-q2-hello-hearthvale');
  await waitForPython(page);
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  const first = page.locator('.investigate fieldset').first();
  await expect(first.locator('input')).toBeEnabled();
  await first.locator('input').fill('5');
  await first.getByRole('button', { name: 'Check answer' }).click();
  await expect(first).toContainText('Not quite. Here is a hint:');
  await expect(first).toContainText('Count the lines on the Scroll');
  await first.locator('input').fill('3');
  await first.getByRole('button', { name: 'Check answer' }).click();
  await expect(first).toContainText('Right!');
  await expect(first).not.toContainText('Not quite');
});
