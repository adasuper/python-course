// Owner decision Q3: devices may forget everything, so a save code must restore progress anywhere.
import { expect, test } from '@playwright/test';
import { newPlayer, skipToOverworld, solveQuest } from './helpers';

test('a save code restores progress in a brand-new browser', async ({ page, browser }) => {
  test.setTimeout(240_000);
  await newPlayer(page, 'Swift Otter');
  await solveQuest(page, 'r1-q1-first-steps');
  const hudSave = page.locator('.hud').getByRole('button', { name: /Save progress/ });
  await expect(hudSave).toContainText('Unsaved progress');
  await hudSave.click();
  const code = await page.locator('#save-code').inputValue();
  expect(code).toMatch(/^CW1-/);
  await page.getByRole('button', { name: 'Copy save code' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(hudSave).not.toContainText('Unsaved progress');

  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto('/');
  await expect(other.getByText('No adventurers on this computer yet.')).toBeVisible();
  await other.getByRole('button', { name: /Continue from a save/ }).click();
  await other.getByLabel('Paste your save code').fill(code);
  await other.getByRole('button', { name: 'Continue with this code' }).click();
  await skipToOverworld(other);
  await expect(other.locator('.hud')).toContainText('Swift Otter');
  await expect(other.locator('.hud')).toContainText('20 of 50 XP');
  await other.locator('#quest-log-button').click();
  await expect(other.locator('.quest-row', { hasText: "Byte's First Steps" })).toContainText('✓ Done');
  await fresh.close();
});

test('a mistyped save code is caught kindly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue from a save/ }).click();
  await page.getByLabel('Paste your save code').fill('CW1-ABCDE-FGHJK-MNPQR');
  await page.getByRole('button', { name: 'Continue with this code' }).click();
  await expect(page.getByRole('alert')).toContainText('typo');
});
