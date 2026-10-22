// Region 2 — Whispering Library (M3.1): the concept scene, the map, every quest with its
// reference solution, the boss and the knowledge check; and the road there from Region 1 on the
// world map (F-WLD-08).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { BossQuestFile } from '../../src/content/schema';
import { content, defeatTheFirstBoss, quest, solveBody, waitForPython } from './helpers';

const region = content.regions.find((r) => r.data.id === 'whispering-library')!.data;

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page: page as never })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map((v) => `${label}: ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`),
  ).toEqual([]);
}

test('concept scene and map', async ({ page }) => {
  await page.goto('./?dev#/dev/concept/whispering-library');
  await expect(page.locator('.concept-screen h1')).toHaveText('What is a variable?');
  await waitForPython(page);
  await page.getByRole('button', { name: /Run the example/ }).click();
  await expect(page.locator('.output-body')).toContainText(
    'The Owl Who Coded lives on the Mysteries shelf.',
    {
      timeout: 20_000,
    },
  );

  await page.goto('./?dev&map#/dev/region/whispering-library');
  await expect(page.getByRole('application', { name: /Whispering Library map/ })).toBeVisible();
  await page.getByRole('button', { name: /Describe surroundings/ }).click();
  await expect(page.locator('#live-polite')).toContainText('Whispering Library.');
  await scan(page, 'region 2 map');
});

for (const [i, id] of [...region.quests, ...region.side_quests].entries()) {
  test(`quest ${id}`, async ({ page }) => {
    await page.goto(`./?dev&q${i}#/dev/quest/${id}`);
    await expect(page.locator('#quest-title')).toHaveText(quest(id).title);
    if (i === 0) await scan(page, id);
    await solveBody(page, quest(id) as never);
  });
}

test('the boss: The Mislabeled Archive', async ({ page }) => {
  test.setTimeout(180_000);
  const boss = quest(region.boss) as BossQuestFile;
  await page.goto(`./?dev&boss#/dev/quest/${region.boss}`);
  for (const [i, phase] of boss.phases.entries()) {
    await solveBody(page, phase as never);
    if (i < boss.phases.length - 1) await page.getByRole('button', { name: /Next phase/ }).click();
  }
  await expect(page.locator('#feedback').getByRole('button', { name: /World map/ })).toBeVisible();
});

test('the knowledge check', async ({ page }) => {
  await page.goto('./?dev#/dev/check/whispering-library');
  const items = region.knowledge_check.items;
  for (const [i, item] of items.entries()) {
    const fieldset = page.locator('fieldset').nth(i);
    if (item.kind === 'mcq')
      await fieldset.getByRole('radio', { name: item.options[item.answer]!, exact: true }).check();
    else await fieldset.locator('textarea').fill(item.answer.trimEnd());
  }
  await page.getByRole('button', { name: 'Check my answers' }).click();
  await expect(page.locator('#check-score')).toHaveText(`You got ${items.length} of ${items.length}.`);
});

test('the world map opens the road to Region 2 once Region 1 is restored', async ({ page }) => {
  test.setTimeout(240_000);
  await defeatTheFirstBoss(page);
  await page.getByRole('button', { name: /World map/ }).click();
  await expect(page.getByRole('heading', { name: /World map/ })).toBeFocused();
  const rows = page.locator('.region-row');
  await expect(rows.nth(0)).toContainText('Hearthvale Village');
  await expect(rows.nth(0)).toContainText('Restored');
  await expect(rows.nth(1)).toContainText('Whispering Library');
  await expect(rows.nth(1)).toContainText('Open');
  // Only the boss was played (through the dev route): 1 of Hearthvale's 6 quests and boss.
  await expect(rows.nth(0)).toContainText('1 of 7 quests done.');
  await expect(rows.nth(1)).toContainText('0 of 7 quests done.');
  await scan(page, 'world map');
  await page.getByRole('button', { name: 'Travel to Whispering Library' }).click();
  await expect(page.getByRole('application', { name: /Whispering Library map/ })).toBeVisible();
  await expect(page.locator('.hud-region')).toContainText('Whispering Library');
});
