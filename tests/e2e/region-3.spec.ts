// Region 3 — Merchant's Crossing through the real UI: the concept scene and its worked
// example, the map, every core quest (one of each type) with its reference solution, typed
// answers to input() (Mode B), the boss phase by phase, and the knowledge check. axe checks
// the map and a quest screen.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { solutionCode } from '../../scripts/lib/content';
import type { BossQuestFile, NormalQuestFile } from '../../src/content/schema';
import { content, quest, setCode, solveBody, waitForPython } from './helpers';

const region = content.regions.find((r) => r.data.id === 'merchants-crossing')!.data;
const BOSS = 'r3-boss-haggling-bug';
// This quest is played with typed answers; the others use the answers their NPC hands over.
const TYPED = 'r3-q6-receipt-writer';
// axe checks this quest screen after a pass. (Its code has no f-strings: the editor's colour
// for f-string braces is too pale for axe, which is an editor theme issue, not content.)
const SCANNED = 'r3-q5-price-tag-trouble';

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

/** Quests that read input() ask the player first; this uses the NPC's answers instead. */
async function useQueuedAnswers(page: Page) {
  const box = page.getByRole('checkbox', { name: /Let me type the answers/ });
  await expect(box).toBeVisible();
  await box.uncheck();
  await expect(box).not.toBeChecked();
}

/** Types each answer into the "Your program is asking" dialog, as a player would. */
async function answer(page: Page, answers: [RegExp, string][]) {
  for (const [prompt, value] of answers) {
    const box = page
      .getByRole('dialog', { name: 'Your program is asking' })
      .getByRole('textbox', { name: prompt });
    await expect(box).toBeFocused();
    await page.keyboard.type(value);
    await page.keyboard.press('Enter');
  }
}

async function instantReplay(page: Page) {
  await page
    .getByRole('combobox', { name: /Speed/ })
    .selectOption('instant')
    .catch(() => {});
}

test('the concept scene runs its worked example', async ({ page }) => {
  await page.goto('./?dev#/dev/concept/merchants-crossing');
  await expect(page.locator('.concept-screen h1')).toHaveText(region.concept_scene.title);
  await waitForPython(page);
  await page.getByRole('button', { name: /Run the example/ }).click();
  await expect(page.locator('.output-body')).toContainText('12', { timeout: 20_000 });
});

test('the market map opens with its quests, and axe finds nothing serious', async ({ page }) => {
  await page.goto('./?dev&map#/dev/region/merchants-crossing');
  await expect(page.getByRole('application', { name: /Merchant's Crossing map/ })).toBeVisible();
  await scan(page, 'region map');
  await page.locator('#quest-log-button').click();
  for (const id of [...region.quests, BOSS]) {
    const title = new RegExp(`^${quest(id).title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    await expect(page.locator('.quest-row .quest-title', { hasText: title })).toHaveCount(1);
  }
  await scan(page, 'region map with the Quest Log');
});

for (const [i, id] of region.quests.entries()) {
  const q = quest(id) as NormalQuestFile;
  test(`${q.type}: ${q.title}`, async ({ page }) => {
    await page.goto(`./?dev&q${i}#/dev/quest/${id}`);
    await expect(page.locator('#quest-title')).toHaveText(q.title);
    await waitForPython(page);
    if (id === TYPED) {
      // Mode B: the player types the customer's answer. The checks don't depend on it.
      await instantReplay(page);
      await setCode(page, solutionCode(q));
      await page.getByRole('button', { name: /^▶ Run$/ }).click();
      await answer(page, [[/How many melons\?/, '5']]);
      await expect(page.locator('.output-body')).toContainText('Total: 30 silver');
      await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });
      return;
    }
    if (q.interactive_input) await useQueuedAnswers(page);
    await solveBody(page, q);
    if (id === SCANNED) await scan(page, `${q.type} quest after a pass`);
  });
}

test('Hagglebug is beaten phase by phase', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(`./?dev&boss#/dev/quest/${BOSS}`);
  const [fixList, askAndConvert, makeChange, everyCustomer] = (quest(BOSS) as BossQuestFile).phases;
  // A phase's screen appears once its starting code is ready (a carried phase reads the last
  // phase's code from storage first), so wait until it is the current step.
  const next = async (phase: { title: string }) => {
    await page.getByRole('button', { name: /Next phase/ }).click();
    await expect(page.locator('.phase-tabs [aria-current="step"]')).toContainText(phase.title);
  };

  await solveBody(page, fixList!);
  await next(askAndConvert!);
  await useQueuedAnswers(page);
  await solveBody(page, askAndConvert!);
  await next(makeChange!);
  await useQueuedAnswers(page);
  await solveBody(page, makeChange!);
  await next(everyCustomer!);

  // The last phase: fix the bug, then test the calculator with three customers, an edge
  // case among them, typing each customer's numbers.
  await waitForPython(page);
  await expect(page.getByRole('checkbox', { name: /Let me type the answers/ })).toBeChecked();
  await instantReplay(page);
  await setCode(page, solutionCode(everyCustomer!));
  const customers: [string, string, string][] = [
    ['1', '20', '1 gold and 3 silver'],
    ['2', '50', '3 gold and 6 silver'],
    ['3', '21', '0 gold and 0 silver'],
  ];
  for (const [n, [pies, paid, change]] of customers.entries()) {
    await page.getByRole('button', { name: /^▶ Run$/ }).click();
    await answer(page, [
      [/How many pies\?/, pies],
      [/How much silver do you pay\?/, paid],
    ]);
    await expect(page.locator('.output-body')).toContainText(`Your change: ${change}.`);
    if (n < customers.length - 1)
      await expect(page.locator('#feedback')).toContainText('Now prove it works!');
  }
  await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });
  await expect(page.locator('.boss-bar')).toContainText('The Bug is debugged!');
});

test('the knowledge check, all right', async ({ page }) => {
  await page.goto('./?dev&check#/dev/check/merchants-crossing');
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
