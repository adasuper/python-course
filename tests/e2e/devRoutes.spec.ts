// Dev routes for authors and region smoke tests (specs §10.6): a region's concept scene and
// map open directly, without playing the regions before it.
import { expect, test } from '@playwright/test';

test('a concept scene and a region map open from the dev routes', async ({ page }) => {
  await page.goto('./?dev#/dev/concept/hearthvale-village');
  await expect(page.locator('.concept-screen h1')).toHaveText('What is a program?');
  await page.goto('./?dev&map#/dev/region/hearthvale-village');
  await expect(page.getByRole('application', { name: /Hearthvale Village map/ })).toBeVisible();
});

test("a later region's quest from the dev route goes back to that region's map", async ({ page }) => {
  await page.goto('./?dev#/dev/quest/r2-q1-labeled-jars');
  await expect(page.locator('#quest-title')).toBeVisible();
  await page
    .getByRole('button', { name: /Back to the map/ })
    .first()
    .click();
  await expect(page.getByRole('application', { name: /Whispering Library map/ })).toBeVisible();
});
