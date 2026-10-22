// Region 4 smoke test (Forked Road Forest): the concept scene, the map, one quest of every
// type with its reference solution, the Riddle Gate phase by phase (typed answers light a lamp
// for every door), the knowledge check, and axe on the map and a quest screen.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { solutionCode, type Body } from '../../scripts/lib/content';
import type { BossQuestFile } from '../../src/content/schema';
import { content, quest, setCode, solveBody, waitForPython } from './helpers';

const REGION = 'forked-road-forest';
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

/** Opens a quest from the dev route. Each load gets its own query string, so it is a real page
 *  load (a hash change alone isn't). */
async function openQuest(page: Page, id: string) {
  await page.goto(`./?dev&${id}#/dev/quest/${id}`);
  await expect(page.locator('#quest-title')).toHaveText(quest(id).title);
  await waitForPython(page);
}

/** Runs with the answers the quest's characters hand over (the input queue), not typed ones. */
async function useQueue(page: Page) {
  await page.getByRole('checkbox', { name: /Let me type the answers/ }).uncheck();
}

const run = (page: Page) => page.getByRole('button', { name: /^▶ Run$/ }).click();

/** Types an answer into the dialog that opens when the program calls input(). */
async function answer(page: Page, prompt: string, value: string) {
  const box = page
    .getByRole('dialog', { name: 'Your program is asking' })
    .getByRole('textbox', { name: prompt });
  await expect(box).toBeFocused();
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

const passed = (page: Page) =>
  expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });

const instant = (page: Page) => page.getByRole('combobox', { name: /Speed/ }).selectOption('instant');

/** The region the saved "Dev Tester" profile stands in, read from IndexedDB. */
const savedRegion = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        const open = indexedDB.open('codeweald');
        open.onerror = () => resolve(null);
        open.onsuccess = () => {
          const all = open.result.transaction('kv', 'readonly').objectStore('kv').getAll();
          all.onerror = () => resolve(null);
          all.onsuccess = () => {
            const profiles = all.result as { nickname?: string; location?: { region?: string } }[];
            resolve(profiles.find((p) => p?.nickname === 'Dev Tester')?.location?.region ?? null);
          };
        };
      }),
  );

test("the concept scene runs Byte's worked example", async ({ page }) => {
  await page.goto(`./?dev#/dev/concept/${REGION}`);
  await expect(page.locator('.concept-screen h1')).toHaveText(region.concept_scene.title);
  await waitForPython(page);
  await page.getByRole('button', { name: /Run the example/ }).click();
  await expect(page.locator('.output-body')).toContainText('The gatekeeper waves you through.');
  await expect(page.locator('.output-body')).not.toContainText('Come back with more gold!');
});

test('the forest map: walk up the road to Forky and talk (axe on the map)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`./?dev&map#/dev/region/${REGION}`);
  const map = page.getByRole('application', { name: /Forked Road Forest map/ });
  await expect(map).toBeVisible();
  await scan(page, 'region map');

  const heroPos = () =>
    page.evaluate(() => {
      const game = (window as unknown as { __codewealdGame: { scene: { getScene(k: string): unknown } } })
        .__codewealdGame;
      return [...(game.scene.getScene('overworld') as { pos: [number, number] }).pos];
    });
  const [x, y] = region.overworld.objects.find((o) => o.kind === 'spawn')!.at;
  await expect.poll(heroPos).toEqual([x, y]);
  await map.focus();
  const forky = region.overworld.objects.find((o) => o.id === 'forky')!.at;
  for (let row = y - 1; row > forky[1]; row--) {
    await page.keyboard.press('ArrowUp');
    await expect.poll(heroPos).toEqual([x, row]);
  }
  await page.keyboard.press('ArrowUp'); // bumps into Forky, facing him
  await page.keyboard.press('Enter');
  const talk = page.getByRole('dialog', { name: 'Forky' });
  await expect(talk).toContainText(region.npcs.forky!.greeting!);
  await expect(talk).toContainText(quest('r4-q1-talking-signpost').title);
  await scan(page, 'talking to Forky');
  await page.keyboard.press('Escape');

  // The Quest Log lists every core quest and the boss.
  await page.locator('#quest-log-button').click();
  for (const id of [...region.quests, region.boss])
    await expect(page.locator('.quest-row .quest-title', { hasText: quest(id).title })).toHaveCount(1);
});

test('investigate: The Talking Signpost, answering the weather question by typing', async ({ page }) => {
  await openQuest(page, 'r4-q1-talking-signpost');
  await instant(page);
  await run(page);
  await answer(page, 'How is the weather?', 'sun');
  await expect(page.locator('.output-body')).toContainText('Go right. The view is lovely!');
  // The reference answers, with the weather Nimbus hands over.
  await useQueue(page);
  await solveBody(page, quest('r4-q1-talking-signpost') as Body);
});

test('predict: True or False, Traveler?', async ({ page }) => {
  await openQuest(page, 'r4-q2-true-or-false');
  await solveBody(page, quest('r4-q2-true-or-false') as Body);
  await expect(page.locator('#feedback')).toContainText('Tuning Fork of Truth');
});

test('make: Gold for the Gatekeeper (axe on a quest screen)', async ({ page }) => {
  await openQuest(page, 'r4-q3-gatekeeper');
  await scan(page, 'r4-q3-gatekeeper');
  // A common mistake gets its own feedback: "more than 10" leaves out exactly 10.
  await instant(page);
  await setCode(page, solutionCode(quest('r4-q3-gatekeeper') as Body).replace('gold >= 10', 'gold > 10'));
  await run(page);
  await expect(page.locator('#feedback')).toContainText('What happens when gold is exactly 10?');
  await solveBody(page, quest('r4-q3-gatekeeper') as Body);
  await scan(page, 'r4-q3-gatekeeper passed');
});

test('fix: The Crooked Branches', async ({ page }) => {
  await openQuest(page, 'r4-q4-crooked-branches');
  await instant(page);
  await run(page);
  await expect(page.locator('#feedback')).toContainText('two equals signs');
  await solveBody(page, quest('r4-q4-crooked-branches') as Body);
});

test('parsons: Three Paths at the Fork', async ({ page }) => {
  await openQuest(page, 'r4-q5-three-paths');
  await useQueue(page);
  await solveBody(page, quest('r4-q5-three-paths') as Body);
});

test('modify: The Picky Bridge Keeper, with typed answers', async ({ page }) => {
  await openQuest(page, 'r4-q6-picky-bridge-keeper');
  await instant(page);
  await setCode(page, solutionCode(quest('r4-q6-picky-bridge-keeper') as Body));
  await run(page);
  await answer(page, 'How old are you?', '72');
  await answer(page, 'How much gold?', '0');
  await passed(page);
  await expect(page.locator('.output-body')).toContainText('You may cross the bridge.');
});

test('boss: the Riddle Gate falls phase by phase, with a lamp for every door', async ({ page }) => {
  test.setTimeout(240_000);
  const boss = quest('r4-boss-riddle-gate') as BossQuestFile;
  const [first, second, third] = boss.phases;
  const next = () => page.getByRole('button', { name: /Next phase/ }).click();
  // Walk into the forest first: the quest dev route alone leaves the Dev Tester in the first
  // region, so "Back to the map" would have no map to show.
  const map = page.getByRole('application', { name: /Forked Road Forest map/ });
  await page.goto(`./?dev&map#/dev/region/${REGION}`);
  await expect(map).toBeVisible();
  // Saving is debounced: wait until the saved Dev Tester stands in the forest.
  await expect.poll(() => savedRegion(page)).toBe(REGION);
  await openQuest(page, boss.id);

  // Phase 1: Byte types his answer into the gate's question.
  await instant(page);
  await setCode(page, solutionCode(first!));
  await run(page);
  await answer(page, 'Who hoots at night?', 'owl');
  await passed(page);
  await expect(page.locator('.output-body')).toContainText('Correct! The lock clicks.');
  await next();

  // Phases 2 and 3 use the answers Byte hands over.
  for (const phase of [second!, third!]) {
    await useQueue(page);
    await solveBody(page, phase);
    await next();
  }

  // Phase 4 carries the phase 3 code. Each run with a new answer lights another door's lamp.
  await instant(page);
  const lamps = page.getByRole('list', { name: /Lamps/ });
  for (const [i, door] of ['Byte', 'owl', 'pigeon'].entries()) {
    await run(page);
    await answer(page, 'Who is the wisest bird?', door);
    if (i < 2) {
      await expect(page.locator('#feedback')).toContainText('Keep going: run your program again.');
      await expect(page.locator('#feedback')).toContainText(`${i + 1} of 3 lamps lit.`);
    }
  }
  await passed(page);
  await expect(lamps).toContainText('if on line 3: lit');
  await expect(lamps).toContainText('elif on line 5: lit');
  await expect(lamps).toContainText('else on line 7: lit');
  await expect(page.locator('#feedback')).toContainText('Script Fragment: Choices');
  await page
    .locator('#feedback')
    .getByRole('button', { name: /Back to the map/ })
    .click();
  await expect(map).toBeVisible();
  // The knowledge check opens once the boss is beaten (F-BOS-04).
  await page.locator('#quest-log-button').click();
  await expect(page.locator('.quest-row', { hasText: 'Review riddles' })).toBeVisible();
});

test('the knowledge check: every answer right', async ({ page }) => {
  await page.goto(`./?dev&check#/dev/check/${REGION}`);
  await expect(page.getByRole('heading', { name: /Review riddles: Forked Road Forest/ })).toBeVisible();
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
