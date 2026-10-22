// The quest types and mechanics added in Phase 2 (M2.1), played by keyboard where the
// student would type: fill gaps and locked lines, typed input with session lamps, Parsons
// checked by order, predict twins and bonus challenges.
import { expect, test } from '@playwright/test';
import { openFixture, setCode, waitForPython } from './helpers';

const editor = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: /Spellbook: your Python code/ });

test('fill: a gap left is explained, locked lines stay put, filling the gap passes', async ({ page }) => {
  await openFixture(page, 'fill');
  await expect(page.locator('.cm-gap')).toHaveText('____');
  await expect(page.locator('#editor-help')).toContainText('Only the lines with a gap can be changed');

  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText("There's still a gap to fill");
  await expect(page.locator('#feedback')).toContainText('Line 1 still has a ____ gap');

  // A locked line can't be changed, and the game says why.
  await editor(page).click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type('x');
  await expect(page.locator('.note-locked')).toContainText('That line is locked');
  await expect(editor(page)).toHaveText(/^gold = ____print\(gold\)$/);

  // "Next gap" selects the gap; typing replaces it.
  await page.getByRole('button', { name: /Next gap/ }).click();
  await page.keyboard.type('12');
  await expect(editor(page)).toContainText('gold = 12');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('#feedback')).toContainText('Quest complete!');
});

test('typed input: the player answers, and every door lights a lamp across runs', async ({ page }) => {
  await openFixture(page, 'doors');
  const run = page.getByRole('button', { name: /^▶ Run$/ });

  const box = page
    .getByRole('dialog', { name: 'Your program is asking' })
    .getByRole('textbox', { name: 'Pick a door (1 or 2):' });
  const answer = async (value: string) => {
    await expect(box).toBeFocused();
    await page.keyboard.type(value);
    await page.keyboard.press('Enter');
  };

  // Esc stops the program.
  await run.click();
  await expect(box).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByText('You stopped the program.')).toBeVisible();

  await run.click();
  await answer('1');
  await expect(page.locator('#feedback')).toContainText('Keep going: run your program again.');
  await expect(page.locator('#feedback')).toContainText('1 of 2 lamps lit.');
  const lamps = page.getByRole('list', { name: /Lamps/ });
  await expect(lamps).toContainText('if on line 2: lit');
  await expect(lamps).toContainText('else on line 4: not lit yet');
  await expect(page.locator('.output-body')).toContainText('Gold!');

  await run.click();
  await answer('2');
  await expect(page.locator('#feedback')).toContainText('Quest complete!');
  await expect(lamps).toContainText('else on line 4: lit');
  await expect(page.locator('.session')).toContainText('Runs without a crash: 2 of 2.');

  // The lamps are saved with the draft.
  await page.reload();
  await openFixture(page, 'doors');
  await expect(page.getByRole('list', { name: /Lamps/ })).toContainText('else on line 4: lit');
});

test('Parsons check: order: a plan passes by its order, with a hint about how much is right', async ({
  page,
}) => {
  await openFixture(page, 'plan');
  // M moves the focused line to "Your spell", and focus follows it there.
  const place = async (text: string) => {
    await page.locator('.parsons-scraps .parsons-handle', { hasText: text }).focus();
    await page.keyboard.press('m');
    await expect(page.locator('.parsons-spell .parsons-handle', { hasText: text })).toBeFocused();
  };
  await place('# pack a lunch');
  await place('# say hello to the miller');
  await place('# walk to the well');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText('The first line is in the right place.');

  // Pick up the last line and move it up one place.
  const last = page.locator('.parsons-spell .parsons-handle', { hasText: '# walk to the well' });
  await last.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText('Quest complete!');
});

test('predict twin: a wrong prediction shows both answers, then a twin to try', async ({ page }) => {
  await openFixture(page, 'twin');
  await page.getByRole('radio', { name: '23', exact: true }).check();
  await page.getByRole('button', { name: /Lock in/ }).click();
  await page.getByRole('button', { name: /Run to check/ }).click();
  const verdict = page.locator('.prompt .verdict');
  await expect(verdict).toContainText('The real result was different');
  await expect(verdict.locator('.compare')).toContainText('23');
  await expect(verdict.locator('.compare')).toContainText('The right answer');

  await page.getByRole('button', { name: /Try a twin/ }).click();
  const twin = page.locator('.twin');
  await expect(twin.getByRole('heading')).toBeFocused();
  await expect(twin.locator('code').first()).toHaveText('print("2" + "3")');
  await twin.getByRole('radio', { name: '23', exact: true }).check();
  await twin.getByRole('button', { name: 'Check my prediction' }).click();
  await expect(twin.locator('.verdict')).toContainText('You predicted it!');
});

test('bonus challenge: shown after a pass, XP given once', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-side1-banner-painter');
  await waitForPython(page);
  const run = page.getByRole('button', { name: /^▶ Run$/ });
  await setCode(page, '# A small banner\nprint("****")\nprint("*hi*")\nprint("*  *")\nprint("****")\n');
  await run.click();
  await expect(page.locator('#feedback')).toContainText('Quest complete!');
  const bonus = page.locator('.bonus');
  await expect(bonus).toContainText('Not yet');
  await expect(bonus).toContainText('Make a framed banner');

  const framed =
    '# A framed banner\n' +
    ['~~~~', '~hi~', '~  ~', '~  ~', '~yo~', '~~~~'].map((r) => `print("${r}")`).join('\n');
  await setCode(page, framed);
  await run.click();
  await expect(page.locator('#feedback')).toContainText('Bonus challenge complete! +15 XP');
  await expect(bonus).toContainText('✓ Done');

  await run.click();
  await expect(page.locator('#feedback')).toContainText('Quest complete!');
  await expect(page.locator('#feedback')).not.toContainText('Bonus challenge complete!');
});
