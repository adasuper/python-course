// Brief §7: axe-core checks on the main screens (WCAG 2.1 AA rules).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { defeatTheFirstBoss, newPlayer, openFixture, quest, solveBody } from './helpers';

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

test('credits', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Credits' }).click();
  await expect(page.getByRole('heading', { name: 'Credits and licenses' })).toBeFocused();
  await expect(page.locator('.credits-screen table').first()).toBeVisible();
  await scan(page, 'credits');
});

test('concept scene', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /New adventurer/ }).click();
  await page.getByLabel('Your nickname').fill('Axe Concept');
  await page.getByRole('button', { name: 'Start my adventure' }).click();
  for (let i = 0; i < 30 && !(await page.locator('.concept-screen').count()); i++) {
    await page.getByRole('button', { name: /^(Next|Done)/ }).click();
  }
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  await page.getByRole('button', { name: /Run the example/ }).click();
  await expect(page.locator('.output-body')).toContainText('Hello', { timeout: 20_000 });
  await scan(page, 'concept scene');
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

// One of every quest type: predict, investigate, parsons, modify, fix, make, boss.
for (const quest of [
  'r1-q1-first-steps',
  'r1-q2-hello-hearthvale',
  'r1-q3-path-to-the-well',
  'r1-q4-notes-for-the-baker',
  'r1-q5-criers-crooked-announcement',
  'r1-q6-welcome-sign',
  'r1-side1-banner-painter',
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

test('notebook: items, badges and an item page', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-q5-criers-crooked-announcement');
  await solveBody(page, quest('r1-q5-criers-crooked-announcement') as never);
  await page
    .locator('#feedback')
    .getByRole('button', { name: /Back to the map/ })
    .click();
  await page.getByRole('button', { name: /Inventory/ }).click();
  await expect(page.locator('.badge-card.earned')).not.toHaveCount(0);
  await scan(page, 'notebook with badges');
  await page.getByRole('button', { name: /Spyglass of Errors/ }).click();
  await page.getByRole('button', { name: 'Run the example' }).click();
  await expect(page.locator('.error-explain')).toBeVisible();
  await scan(page, 'item page');
});

test('Workshop', async ({ page }) => {
  await defeatTheFirstBoss(page);
  await page.getByRole('button', { name: /Workshop/ }).click();
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await page.locator('.api-ref details summary').click();
  await scan(page, 'workshop');
});

test('Spellbook: every tab', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  await solveBody(page, quest('r1-q6-welcome-sign') as never);
  await page
    .locator('#feedback')
    .getByRole('button', { name: /Back to the map/ })
    .click();
  await page.getByRole('button', { name: /Spellbook/ }).click();
  for (const tab of ['Spell Pages', 'My Spells', 'Worked examples', 'Concept scenes', 'Glossary']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    await scan(page, `spellbook ${tab}`);
  }
});

test('Parsons listboxes with lines in both lists and one picked up', async ({ page }) => {
  await openFixture(page, 'gate');
  const first = page.locator('.parsons-scraps [role="option"]').first();
  await first.focus();
  await page.keyboard.press('m');
  await page.keyboard.press('Space');
  await expect(page.locator('.parsons-item.held')).toHaveCount(1);
  await scan(page, 'parsons');
});

test("Byte's annotated real error (Region 10 on)", async ({ page }) => {
  await openFixture(page, 'crash', { regionNumber: 10 });
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await page.getByRole('button', { name: 'Show the real Python error' }).click();
  await expect(page.locator('.trace-annotated')).toBeVisible();
  await scan(page, 'annotated traceback');
});

test('Phase 2 quest types: fill, typed input, lamps, twin, bonus', async ({ page }) => {
  await openFixture(page, 'fill');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText("There's still a gap");
  await scan(page, 'fill quest with a gap error');

  await openFixture(page, 'doors');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  const box = page.getByRole('textbox', { name: 'Pick a door (1 or 2):' });
  await expect(box).toBeFocused();
  await scan(page, 'input dialog');
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: /Lamps/ })).toBeVisible();
  await scan(page, 'session lamps');

  await openFixture(page, 'twin');
  await page.getByRole('radio', { name: '23', exact: true }).check();
  await page.getByRole('button', { name: /Lock in/ }).click();
  await page.getByRole('button', { name: /Run to check/ }).click();
  await page.getByRole('button', { name: /Try a twin/ }).click();
  await scan(page, 'predict twin');

  // A new query string, so this is a real page load (a hash change alone isn't).
  await page.goto('./?dev&bonus#/dev/quest/r1-side1-banner-painter');
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  await page.getByRole('textbox', { name: /Spellbook/ }).click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('# banner\nprint("**")\nprint("**")\nprint("**")\nprint("**")\n');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('.bonus')).toBeVisible();
  await scan(page, 'bonus challenges');
});

test('Settings, and the quest screen as tabs on a narrow screen', async ({ page }) => {
  await newPlayer(page, 'Axe Settings');
  await page.getByRole('button', { name: /Settings/ }).click();
  await scan(page, 'settings');
  await page.getByRole('checkbox', { name: 'High contrast' }).check();
  await scan(page, 'settings, high contrast');
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('./?dev#/dev/quest/r1-q4-notes-for-the-baker');
  await expect(page.getByRole('tablist', { name: 'Quest panels' })).toBeVisible();
  await scan(page, 'narrow quest screen');
  await page.getByRole('tab', { name: /Stage and output/ }).click();
  await scan(page, 'narrow quest screen, stage tab');
});

test('System check', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'System check' }).click();
  await expect(page.locator('.system-table')).toBeVisible();
  await scan(page, 'system check');
});
