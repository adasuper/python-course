// Progression (M2.5): a badge is celebrated when earned, and the inventory is a notebook
// (F-PRG-04, F-PRG-06, F-PRG-08).
import { expect, test } from '@playwright/test';
import { quest, solveBody } from './helpers';

test('a badge is celebrated, and items open as notebook pages', async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r1-q5-criers-crooked-announcement');
  await solveBody(page, quest('r1-q5-criers-crooked-announcement') as never);
  // The first fix quest earns First Bug Squashed (and, with no hints, Clean Cast).
  const toast = page.locator('.toast-celebrate', { hasText: 'Badge earned: First Bug Squashed!' });
  await expect(toast).toBeVisible();
  await expect(page.locator('#live-polite')).toContainText('Badge earned: First Bug Squashed!');
  await toast.getByRole('button', { name: 'Dismiss' }).click();
  await expect(toast).toHaveCount(0);

  await page
    .locator('#feedback')
    .getByRole('button', { name: /Back to the map/ })
    .click();
  await page.getByRole('button', { name: /Inventory/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const badges = page.getByRole('region', { name: /Badges/ });
  await expect(badges).toContainText(/2 of \d+ earned/);
  await expect(badges.locator('.not-yet', { hasText: 'Tinkerer' })).toContainText('Not earned yet');

  // Search, then open the item as a page.
  const search = page.getByRole('searchbox', { name: 'Search your items' });
  await search.fill('quill');
  await expect(page.getByText('No items match that search.')).toBeVisible();
  await search.fill('error');
  await page.getByRole('button', { name: /Spyglass of Errors/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Spyglass of Errors' })).toBeFocused();

  // The worked example runs (this one shows an error on purpose), with Byte's explanation.
  await page.getByRole('button', { name: 'Run the example' }).click();
  await expect(page.locator('.error-explain')).toContainText('line 1');
  await expect(page.getByRole('region', { name: 'Where you learned it' })).toContainText(
    "The Crier's Crooked Announcement",
  );
  await page.getByText('Concept card').click();
  await expect(page.getByRole('region', { name: 'Words to know' })).toContainText('error message');

  await page.getByRole('button', { name: /Back/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: /Inventory/ })).toBeVisible();
});
