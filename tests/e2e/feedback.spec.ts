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
