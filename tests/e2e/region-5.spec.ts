// Region 5 — The Endless Mines, played through the real UI: the concept scene, the mine map,
// one quest of each type with its reference solution, the friendly runaway-loop message,
// the boss phase by phase, and the knowledge check. axe checks the map and a quest screen.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { Body } from '../../scripts/lib/content';
import type { BossQuestFile, NormalQuestFile } from '../../src/content/schema';
import { content, quest, solveBody, waitForPython } from './helpers';

const REGION = 'the-endless-mines';
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

/** What goes in each ____ gap of a fill quest, read from its reference solution. */
function gapAnswers(body: Body): string[] {
  const solution = (body.solution ?? '').split('\n');
  return body.starter_code.split('\n').flatMap((line, i) => {
    if (!line.includes('____')) return [];
    const [before, after] = line.split('____') as [string, string];
    const done = solution[i] ?? '';
    return [done.slice(before.length, done.length - after.length)];
  });
}

/** A locked fill quest: only the gaps can change, so fill each one with "Next gap". */
async function solveFill(page: Page, body: Body) {
  await page
    .getByRole('combobox', { name: /Speed/ })
    .selectOption('instant')
    .catch(() => {});
  for (const answer of gapAnswers(body)) {
    await page.getByRole('button', { name: /Next gap/ }).click();
    await expect(page.locator('.cm-content')).toBeFocused();
    await page.keyboard.insertText(answer);
  }
  await expect(page.locator('.cm-gap')).toHaveCount(0);
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });
}

test('concept scene: Byte explains while loops from the entrance, and the example runs', async ({ page }) => {
  await page.goto(`./?dev#/dev/concept/${REGION}`);
  await expect(page.locator('.concept-screen h1')).toHaveText(region.concept_scene.title);
  await waitForPython(page);
  await page.getByRole('button', { name: /Run the example/ }).click();
  await expect(page.locator('.output-body')).toContainText('Out of torches. Time to rest.', {
    timeout: 20_000,
  });
  await expect(page.locator('.output-body')).toContainText('Light a torch and dig!');
});

test('region map: the mine opens with Byte at the entrance and passes axe', async ({ page }) => {
  await page.goto(`./?dev&map#/dev/region/${REGION}`);
  await expect(page.getByRole('application', { name: /The Endless Mines map/ })).toBeVisible();
  // The words for the map name the place and the nearest person (F-WLD-06).
  await expect(page.locator('.world-canvas')).toHaveAttribute('aria-label', /The Endless Mines\. Byte is/);
  await page.locator('#quest-log-button').click();
  for (const id of region.quests)
    await expect(page.locator('.quest-row .quest-title', { hasText: quest(id).title })).toHaveCount(1);
  await scan(page, 'mine map with quest log');
});

// The core quests are one of each type; the side quest takes typed answers too.
const PLAYED = [...region.quests, ...region.side_quests];

test('the core quests cover every quest type the region uses', () => {
  expect(new Set(region.quests.map((id) => quest(id).type))).toEqual(
    new Set(['predict', 'investigate', 'fill', 'fix', 'modify', 'make']),
  );
});

for (const [i, id] of PLAYED.entries()) {
  const body = quest(id) as NormalQuestFile;
  test(`${body.type} quest with its reference solution: ${id}`, async ({ page }) => {
    // A new query string per page load: a hash change alone isn't a real load.
    await page.goto(`./?dev&q${i}#/dev/quest/${id}`);
    await expect(page.locator('#quest-title')).toHaveText(body.title);
    await waitForPython(page);
    if (body.type === 'fill' && body.locked) {
      await scan(page, `fill quest ${id}`);
      await solveFill(page, body);
    } else {
      // Use the miner's answers from the input queue instead of typing them.
      if (body.interactive_input)
        await page.getByRole('checkbox', { name: /Let me type the answers/ }).uncheck();
      await solveBody(page, body);
    }
    const item = body.rewards.item ? content.items.find((it) => it.id === body.rewards.item) : null;
    if (item) await expect(page.locator('#feedback')).toContainText(item.name);
  });
}

test('fix quest: the starter loop runs forever, and Byte names the variable', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r5-q4-the-endless-tunnel');
  await waitForPython(page);
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  const feedback = page.locator('#feedback');
  await expect(feedback).toContainText('Your loop might be running forever!', { timeout: 20_000 });
  await expect(feedback).toContainText('The while loop on line 4 checks steps');
  await expect(feedback).toContainText('nothing inside the loop changes steps');
  // The worker survived: the fixed program runs straight away.
  await solveBody(page, quest('r5-q4-the-endless-tunnel') as NormalQuestFile);
});

test('boss: Rumblebug is beaten phase by phase', async ({ page }) => {
  test.setTimeout(240_000);
  const boss = quest('r5-boss-cave-in') as BossQuestFile;
  await page.goto('./?dev&boss#/dev/quest/r5-boss-cave-in');
  for (const [i, phase] of boss.phases.entries()) {
    await solveBody(page, phase);
    if (i < boss.phases.length - 1) await page.getByRole('button', { name: /Next phase/ }).click();
  }
  await expect(page.locator('.boss-bar')).toContainText('The Bug is debugged!');
  await expect(page.locator('#feedback').getByRole('button', { name: /Back to the map/ })).toBeVisible();
});

test('knowledge check: every answer right scores full marks', async ({ page }) => {
  await page.goto(`./?dev#/dev/check/${REGION}`);
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
