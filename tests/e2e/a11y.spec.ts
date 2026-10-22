// Brief §7: axe-core checks on the main screens (WCAG 2.1 AA rules).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page: page as never })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map(
      (v) =>
        `${label}: ${v.id} — ${v.help} (${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(', ')})`,
    ),
  ).toEqual([]);
}

test('title and character creator', async ({ page }) => {
  await page.goto('./');
  await scan(page, 'title');
  await page.getByRole('button', { name: /New adventurer/ }).click();
  await scan(page, 'creator');
  await page.getByRole('button', { name: 'Start my adventure' }).click();
  await scan(page, 'creator with error');
});

test('story, overworld, save dialog, inventory', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /New adventurer/ }).click();
  await page.getByLabel('Your nickname').fill('Axe Tester');
  await page.getByRole('button', { name: 'Start my adventure' }).click();
  await scan(page, 'story');
  await newPlayer(page, 'Axe Two');
  await page.locator('#quest-log-button').click();
  await scan(page, 'overworld');
  await page
    .locator('.hud')
    .getByRole('button', { name: /Save progress/ })
    .click();
  await scan(page, 'save dialog');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: /Inventory/ }).click();
  await scan(page, 'inventory');
});

for (const quest of [
  'r1-q1-first-steps',
  'r1-q2-hello-hearthvale',
  'r1-q3-path-to-the-well',
  'r1-q5-criers-crooked-announcement',
  'r1-boss-village-crier-bug',
]) {
  test(`quest screen: ${quest}`, async ({ page }) => {
    await page.goto(`./?dev#/dev/quest/${quest}`);
    await expect(page.locator('#quest-title')).toBeVisible();
    await scan(page, quest);
  });
}

test('knowledge check', async ({ page }) => {
  await page.goto('./?dev#/dev/check/hearthvale-village');
  await expect(page.getByRole('heading', { name: /Review riddles/ })).toBeVisible();
  await scan(page, 'knowledge check');
  await page.getByRole('button', { name: 'Check my answers' }).click();
  await scan(page, 'knowledge check results');
});
