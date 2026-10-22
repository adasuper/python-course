// Owner decision Q3: devices may forget everything, so a save code must restore progress anywhere.
import { expect, test } from '@playwright/test';
import { newPlayer, skipToOverworld, solveQuest } from './helpers';

test('a save code restores progress, including items, in a brand-new browser', async ({ page, browser }) => {
  test.setTimeout(240_000);
  await newPlayer(page, 'Swift Otter');
  await solveQuest(page, 'r1-q1-first-steps');
  await solveQuest(page, 'r1-q2-hello-hearthvale'); // rewards the Quill of Printing
  const xp = await page.locator('.hud-who .muted.small-text').textContent();
  const hudSave = page.locator('.hud').getByRole('button', { name: /Save progress/ });
  await expect(hudSave).toContainText('Unsaved progress');
  await hudSave.click();
  const dialog = page.getByRole('dialog', { name: 'Save your progress' });
  const code = await dialog.locator('#save-code').inputValue();
  expect(code).toMatch(/^CW1-/);
  await dialog.getByRole('button', { name: 'Copy save code' }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(hudSave).not.toContainText('Unsaved progress');

  // A different browser profile: nothing stored there, as after a Chromebook sign-out.
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto('./');
  await expect(other.getByText('No adventurers on this computer yet.')).toBeVisible();
  await other.getByRole('button', { name: /Continue from a save/ }).click();
  await other.getByLabel('Paste your save code').fill(code);
  await other.getByRole('button', { name: 'Continue with this code' }).click();
  await skipToOverworld(other);
  await expect(other.locator('.hud')).toContainText('Swift Otter');
  await expect(other.locator('.hud-who .muted.small-text')).toHaveText(xp!);
  await other.locator('#quest-log-button').click();
  await expect(
    other
      .locator('.quest-row')
      .filter({ has: other.locator('.quest-title', { hasText: /^Byte's First Steps$/ }) }),
  ).toContainText('✓ Done');
  await other.keyboard.press('Escape');
  await other.getByRole('button', { name: /Inventory/ }).click();
  await expect(other.locator('.items')).toContainText('Quill of Printing');
  await fresh.close();
});

test('a mistyped save code is caught kindly', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Continue from a save/ }).click();
  await page.getByLabel('Paste your save code').fill('CW1-ABCDE-FGHJK-MNPQR');
  await page.getByRole('button', { name: 'Continue with this code' }).click();
  await expect(page.getByRole('alert')).toContainText('typo');
});
