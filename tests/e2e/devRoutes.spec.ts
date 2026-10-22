// Dev routes for authors and region smoke tests (specs §10.6): a region's concept scene and
// map open directly, without playing the regions before it.
import { expect, test } from '@playwright/test';

test('a concept scene and a region map open from the dev routes', async ({ page }) => {
  await page.goto('./?dev#/dev/concept/hearthvale-village');
  await expect(page.locator('.concept-screen h1')).toHaveText('What is a program?');
  await page.goto('./?dev&map#/dev/region/hearthvale-village');
  await expect(page.getByRole('application', { name: /Hearthvale Village map/ })).toBeVisible();
});
