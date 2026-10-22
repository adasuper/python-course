// Phase 4 mechanics (M4.0): Byte's rubber duck (§9.8a), picking a starter with the capstone's
// light rules, and the finale with its credits.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openFixture, setCode } from './helpers';

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page: page as never })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map((v) => `${label}: ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`),
  ).toEqual([]);
}

test('the duck asks about each line, keeps the answers on this computer, then the fix passes', async ({
  page,
}) => {
  await openFixture(page, 'duck');
  const duck = page.locator('.duck-panel');
  await expect(duck).toContainText('Tell the duck what each line should do.');
  await duck.getByRole('button', { name: /Talk to the Duck/ }).click();

  // The comment line is skipped: 5 lines to explain. The duck's line is marked in the editor.
  const answer = page.getByRole('textbox', { name: 'What should this line do?' });
  await expect(answer).toBeFocused();
  await expect(duck).toContainText('Line 1 (1 of 5)');
  await expect(duck.locator('.duck-line')).toHaveText('score = 95');
  await expect(page.locator('.cm-replay-line')).toContainText('score = 95');
  const next = duck.getByRole('button', { name: /Next line/ });
  await expect(next).toBeDisabled();
  await scan(page, 'duck talk');

  const notes = [
    'Store 95 in score.',
    'Check for bronze first.',
    'Print bronze.',
    'Check for gold.',
    'Print gold.',
  ];
  for (const [i, note] of notes.entries()) {
    await answer.fill(note);
    await duck
      .getByRole('button', { name: i === notes.length - 1 ? /Done explaining/ : /Next line/ })
      .click();
  }
  await expect(page.getByRole('heading', { name: /The duck listened to every line/ })).toBeFocused();
  await expect(duck).toContainText('Did you spot anything odd?');
  await expect(duck.locator('.duck-notes li')).toHaveCount(5);
  await expect(duck.locator('.duck-notes')).toContainText('Check for bronze first.');
  await expect(page.locator('#live-polite')).toContainText('The duck listened to every line.');
  await scan(page, 'duck notes');

  // The bug the talk uncovers: the checks are in the wrong order.
  await setCode(
    page,
    'score = 95\nif score >= 90:\n    print("gold")\nelif score >= 50:\n    print("bronze")\n',
  );
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });

  // The answers are still there next time (they stay on this computer).
  await openFixture(page, 'duck');
  await page
    .locator('.duck-panel')
    .getByRole('button', { name: /Talk to the Duck/ })
    .click();
  await expect(page.getByRole('textbox', { name: 'What should this line do?' })).toHaveValue(
    'Store 95 in score.',
  );
});

test('pick a starter, then the light rules: a loop, an if, a function, random and 3 runs', async ({
  page,
}) => {
  await openFixture(page, 'starters');
  const picker = page.locator('.starters');
  await expect(picker.getByRole('radio', { name: /Dice duel/ })).toBeChecked();
  await expect(page.getByRole('button', { name: /^▶ Run$/ })).toHaveCount(0);
  await scan(page, 'starter picker');

  await picker.getByRole('radio', { name: /Choose a path/ }).check();
  await picker.getByRole('button', { name: 'Start with this one' }).click();
  await expect(page.locator('.cm-content')).toContainText('fork in the road');
  await expect(page.locator('#live-polite')).toContainText('Choose a path is in your spellbook.');

  const run = page.getByRole('button', { name: /^▶ Run$/ });
  await run.click();
  await expect(page.locator('#feedback')).toContainText('Add a loop (for or while).', { timeout: 30_000 });

  // Reset goes back to the starters.
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: /Reset/ }).click();
  await expect(picker.getByRole('button', { name: 'Start with this one' })).toBeVisible();
  await picker.getByRole('button', { name: 'Start with this one' }).click();
  await expect(page.locator('.cm-content')).toContainText('random.randint(1, 6)');

  await setCode(
    page,
    'import random\ndef roll():\n    return random.randint(1, 6)\nfor turn in range(3):\n    if roll() == 6:\n        print("Six!")\n    else:\n        print("Again.")\n',
  );
  for (const n of [1, 2]) {
    await run.click();
    await expect(page.locator('#feedback')).toContainText(`Runs without a crash: ${n} of 3.`, {
      timeout: 30_000,
    });
  }
  await run.click();
  await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });
});

test('the finale: the story, the fragments, the journey and the credits', async ({ page }) => {
  await page.goto('./?dev#/dev/finale');
  await expect(page.getByRole('heading', { name: /The Great Script is whole again/ })).toBeVisible();
  for (let i = 0; i < 10 && (await page.locator('.finale-screen').count()) === 0; i++) {
    await page.getByRole('button', { name: /^(Next|Done)/ }).click();
  }
  await expect(
    page.getByRole('heading', { level: 1, name: /The Great Script is whole again/ }),
  ).toBeFocused();
  const fragments = page.getByRole('region', { name: /Script Fragments restored/ });
  await expect(fragments).toContainText('Script Fragment: Words');
  await expect(fragments).toContainText('Hearthvale Village');
  const roll = page.getByRole('region', { name: 'Credits' });
  await expect(roll).toContainText('Dev Tester, Scriptwright');
  await expect(roll).toContainText('The people of Hearthvale Village');
  await expect(roll).toContainText('Pip Puddlefoot');
  await expect(roll).toContainText('Clangle');
  await scan(page, 'finale');

  await roll.getByRole('button', { name: 'Full credits and licenses' }).click();
  await expect(page.getByRole('heading', { name: 'Credits and licenses' })).toBeFocused();
  await page.getByRole('button', { name: /Back/ }).click();
  await expect(page.locator('.finale-screen')).toBeVisible();
});
