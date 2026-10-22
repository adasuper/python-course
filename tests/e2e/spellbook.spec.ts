// The Spellbook's reference pages (F-PRG-05, F-DLG-04, F-DLG-06): concept cards, my own
// code, worked examples, concept scenes to watch again, and the glossary.
import { expect, test } from '@playwright/test';
import { quest, solveBody } from './helpers';

test('Spellbook pages fill up as quests are done, and work by keyboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  await solveBody(page, quest('r1-q6-welcome-sign') as never);
  await page
    .locator('#feedback')
    .getByRole('button', { name: /Back to the map/ })
    .click();
  await page.getByRole('button', { name: /Spellbook/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Spellbook/ })).toBeFocused();

  // Spell Pages: the concept card of the finished quest.
  const tabs = page.getByRole('tablist', { name: 'Spellbook' });
  await expect(tabs.getByRole('tab', { name: 'Spell Pages' })).toHaveAttribute('aria-selected', 'true');
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('Paint the Welcome Sign');

  // ← and → move between tabs.
  await tabs.getByRole('tab', { name: 'Spell Pages' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'My Spells' })).toBeFocused();
  await expect(panel).toContainText('Welcome to Hearthvale!');
  await panel.getByRole('button', { name: /Copy/ }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Welcome to Hearthvale!');

  // Worked examples and concept scenes (the dev profile has seen Region 1's).
  await page.keyboard.press('ArrowRight');
  await page.getByRole('tab', { name: 'Worked examples' }).click();
  await expect(panel.locator('.code-block')).not.toHaveCount(0);
  await page.getByRole('tab', { name: 'Concept scenes' }).click();
  await panel
    .locator('li', { hasText: 'Hearthvale Village' })
    .getByRole('button', { name: /Watch again/ })
    .click();
  await expect(page.locator('.concept-screen')).toBeVisible();

  // The glossary: A–Z, search, and words not met yet.
  await page.goto('./?dev&g#/dev/quest/r1-q6-welcome-sign');
  await page
    .getByRole('button', { name: /Back to the map/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Spellbook/ }).click();
  await page.getByRole('tab', { name: 'Glossary' }).click();
  await expect(page.locator('.glossary-entry dt').first()).toBeVisible();
  const terms = await page.locator('.glossary-entry dt').allTextContents();
  expect(terms.map((x) => x.toLowerCase())).toEqual(
    [...terms.map((x) => x.toLowerCase())].sort((a, b) => a.localeCompare(b)),
  );
  await page.getByRole('searchbox', { name: 'Search words' }).fill('comment');
  await expect(page.locator('.glossary-entry').first()).toContainText('comment');
  await page.getByRole('searchbox', { name: 'Search words' }).fill('');
  await page.getByRole('checkbox', { name: "Only words I've met" }).check();
  await expect(page.locator('.glossary-entry', { hasText: 'not met yet' })).toHaveCount(0);
});
