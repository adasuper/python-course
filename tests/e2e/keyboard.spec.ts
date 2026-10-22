// Brief §7: keyboard-only playthrough of one quest — from the map, with no mouse at all.
import { expect, test, type Page } from '@playwright/test';

async function tabTo(page: Page, matches: () => Promise<boolean>, max = 60, key = 'Tab') {
  for (let i = 0; i < max; i++) {
    if (await matches()) return;
    await page.keyboard.press(key);
  }
  throw new Error(`could not reach the element with ${key}`);
}

/** A focused button whose text matches. */
const focusedText = (page: Page, re: RegExp) => () =>
  page.evaluate((source) => {
    const el = document.activeElement;
    return el instanceof HTMLButtonElement && new RegExp(source).test(el.textContent ?? '');
  }, re.source);

/** Title screen → creator → story → concept scene → map, with the keyboard only. */
async function keyboardNewPlayer(page: Page) {
  await page.goto('./');
  await tabTo(page, focusedText(page, /New adventurer/));
  await page.keyboard.press('Enter');
  await tabTo(page, focusedIs(page, 'input[type="text"], input:not([type])'));
  await page.keyboard.type('Key Newt');
  await tabTo(page, focusedText(page, /Start my adventure/));
  await page.keyboard.press('Enter');
  // Story lines: "Next" has focus; Enter advances. Then the concept scene's "Let's go!".
  for (let i = 0; i < 40 && !(await page.getByRole('application').count()); i++) {
    if (await page.locator('.concept-screen').count()) {
      await tabTo(page, focusedText(page, /Let's go/));
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
  }
  await expect(page.getByRole('application')).toBeFocused();
}

const focusedIs = (page: Page, selector: string) => () =>
  page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector);

test('play the first quest using only the keyboard', async ({ page }) => {
  test.setTimeout(180_000);
  await keyboardNewPlayer(page); // ends with the map focused
  await page.keyboard.press('ArrowRight'); // Byte stands to the right of the spawn point
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Byte' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start quest' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('#quest-title')).toBeFocused();
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  // First prediction: the market stall (option 1). Second: right 4 steps (option 1).
  await tabTo(page, focusedIs(page, 'input[name="prompt-0"]'));
  await page.keyboard.press('Space');
  await tabTo(page, focusedIs(page, 'input[name="prompt-1"]'));
  await page.keyboard.press('Space');
  await tabTo(page, focusedIs(page, 'button.primary'));
  await page.keyboard.press('Enter'); // Lock in
  await expect(page.locator('button.run')).toBeFocused();
  await page.keyboard.press('Enter'); // Run to check
  await expect(page.locator('#feedback')).toBeFocused({ timeout: 30_000 });
  await expect(page.locator('#feedback')).toContainText('Quest complete!');
  // XP and the new item also pop up as a toast (F-PRG-08).
  await expect(page.locator('.toast-reward')).toContainText('+20 XP');
});

test('the editor never traps the keyboard: Esc, then Tab, leaves it', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  await tabTo(page, focusedIs(page, '.cm-content'));
  await page.keyboard.type('print("Hi")');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.output-body')).toContainText('Hi', { timeout: 20_000 });
  // After a run, feedback takes focus (so screen readers hear it). Then we go back to the editor.
  await expect(page.locator('#feedback')).toBeFocused({ timeout: 20_000 });
  await tabTo(page, focusedIs(page, '.cm-content'), 60, 'Shift+Tab');
  await page.keyboard.press('Tab'); // indents inside the editor
  await expect(page.locator('.cm-content')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await expect(page.locator('.cm-content')).not.toBeFocused();
});

test('the code size buttons make the editor text bigger and smaller (F-EDT-02)', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  const content = page.locator('.cm-content');
  await expect(content).toHaveCSS('font-size', '16px');
  const bigger = page.getByRole('button', { name: 'A+ bigger code' });
  await bigger.click();
  await bigger.click();
  await expect(content).toHaveCSS('font-size', '20px');
  await expect(page.locator('.code-size output')).toHaveText('20 px');
  await page.getByRole('button', { name: 'A− smaller code' }).click();
  await expect(content).toHaveCSS('font-size', '18px');
});

test('a run error marks its line and keeps focus in the editor (F-EDT-05)', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  const editor = page.locator('.cm-content');
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('print("Welcome")\nprint("Try Bun\'s Bakery)');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.cm-mark-error')).toHaveText('✖', { timeout: 20_000 });
  await expect(page.locator('.cm-error-line')).toHaveCount(1);
  await expect(page.locator('#live-polite')).toContainText('Error on line 2');
  await expect(editor).toBeFocused();
});
