// Region 6 — Clocktower Peaks, smoke tested through the real UI: the concept scene, the map,
// one quest of every type with its reference solution, the tapestry view, the boss phase by
// phase and the knowledge check. axe scans the map and the tapestry quest screen.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { BossQuestFile, NormalQuestFile } from '../../src/content/schema';
import { content, quest, solveBody, waitForPython } from './helpers';

const REGION = 'clocktower-peaks';
const region = content.regions.find((r) => r.data.id === REGION)!.data;

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

/** A new query string per quest, so each one is a real page load (a hash change alone isn't). */
async function openQuest(page: Page, id: string) {
  await page.goto(`./?dev&${id}#/dev/quest/${id}`);
  await expect(page.locator('#quest-title')).toHaveText(quest(id).title);
}

/** The quest passed. (The dev quest route keeps the Dev Tester's map on Region 1, which it
 *  doesn't load, so these tests don't click "Back to the map"; the boss test reopens the map
 *  with the region route instead.) */
async function passed(page: Page) {
  await expect(page.locator('#feedback')).toContainText('Quest complete!');
  await expect(page.locator('#feedback').getByRole('button', { name: /Back to the map/ })).toBeVisible();
}

test('the concept scene runs its worked example', async ({ page }) => {
  await page.goto(`./?dev#/dev/concept/${REGION}`);
  await expect(page.locator('.concept-screen h1')).toHaveText(region.concept_scene.title);
  await waitForPython(page);
  await page.getByRole('button', { name: /Run the example/ }).click();
  await expect(page.locator('.output-body')).toContainText('Bell 3: DONG!', { timeout: 30_000 });
  await expect(page.locator('.output-body')).toContainText('The clock is happy again.');
});

test('the region map opens with every quest in the Quest Log', async ({ page }) => {
  await page.goto(`./?dev&map#/dev/region/${REGION}`);
  const map = page.getByRole('application', { name: /Clocktower Peaks map/ });
  await expect(map).toBeVisible();
  await page.locator('#quest-log-button').click();
  for (const id of [...region.quests, region.boss]) {
    await expect(page.locator('.quest-row .quest-title', { hasText: quest(id).title })).toHaveCount(1);
  }
  await scan(page, 'Clocktower Peaks map');
});

// One quest of each type: predict, investigate, modify, fix and make (the fill quest has
// locked lines, so it gets its own test below).
for (const id of [
  'r6-q1-counting-the-bells',
  'r6-q2-the-clockmakers-loop',
  'r6-q3-rewind-the-lift',
  'r6-q5-the-skipping-clock',
]) {
  test(`${quest(id).type} quest: ${id}`, async ({ page }) => {
    await openQuest(page, id);
    await solveBody(page, quest(id) as NormalQuestFile);
    await passed(page);
  });
}

test('fill quest with locked lines: Next gap, then type each answer', async ({ page }) => {
  const id = 'r6-q4-the-toll-bucket';
  await openQuest(page, id);
  await waitForPython(page);
  await page.getByRole('combobox', { name: /Speed/ }).selectOption('instant');
  for (const answer of ['total = 0', 'total = total + toll']) {
    await page.getByRole('button', { name: /Next gap/ }).click();
    await expect(page.locator('.cm-content')).toBeFocused();
    await page.keyboard.type(answer);
  }
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });
  await expect(page.locator('.output-body')).toContainText('The bucket holds 275 coins.');
  await passed(page);
});

test('make quest on the tapestry: the pattern weaver', async ({ page }) => {
  const id = 'r6-q6-the-pattern-weaver';
  await openQuest(page, id);
  await expect(page.locator('.output-tapestry')).toBeVisible();
  await expect(page.locator('.output-tapestry h2')).toContainText('Tapestry');
  await solveBody(page, quest(id) as NormalQuestFile);
  await expect(page.locator('.output-tapestry .output-body')).toContainText('******');
  await scan(page, 'tapestry quest screen');
  await passed(page);
});

test('the boss, phase by phase', async ({ page }) => {
  test.setTimeout(180_000);
  const boss = quest(region.boss) as BossQuestFile;
  await openQuest(page, boss.id);
  for (const [i, phase] of boss.phases.entries()) {
    await solveBody(page, phase);
    if (phase.stage.kind === 'none' && phase.stage.view === 'tapestry')
      await expect(page.locator('.output-tapestry')).toBeVisible();
    if (i < boss.phases.length - 1) await page.getByRole('button', { name: /Next phase/ }).click();
  }
  await passed(page);
  // Tick-Tock-Tick is debugged, and the region's Restorer badge is earned.
  await expect(page.locator('.boss-bar')).toContainText('The Bug is debugged!');
  await expect(page.getByText('Badge earned: Region Restorer: Clocktower Peaks!').first()).toBeVisible();
});

test('the knowledge check, all answers right', async ({ page }) => {
  await page.goto(`./?dev#/dev/check/${REGION}`);
  await expect(page.getByRole('heading', { name: /Review riddles/ })).toBeVisible();
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
