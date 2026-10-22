// Brief §7: keyboard-only playthrough of one quest — from the map, with no mouse at all.
import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

async function tabTo(page: Page, matches: () => Promise<boolean>, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await matches()) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('could not reach the element with Tab');
}

const focusedIs = (page: Page, selector: string) => () =>
  page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector);

test('play the first quest using only the keyboard', async ({ page }) => {
  test.setTimeout(180_000);
  await newPlayer(page); // creates a player, then stops on the map
  await page.locator('body').focus();
  await tabTo(page, focusedIs(page, '[role="application"]'));
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
});

test('the editor never traps the keyboard: Esc, then Tab, leaves it', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  await page.locator('.cm-content').focus();
  await page.keyboard.type('print("Hi")');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.output-body')).toContainText('Hi', { timeout: 20_000 });
  // After a run, feedback takes focus (so screen readers hear it). Then we go back to the editor.
  await expect(page.locator('#feedback')).toBeFocused({ timeout: 20_000 });
  await page.locator('.cm-content').focus();
  await page.keyboard.press('Tab'); // indents inside the editor
  await expect(page.locator('.cm-content')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await expect(page.locator('.cm-content')).not.toBeFocused();
});
