// F-QA-12 / F-OFF-05: after loading, nothing is fetched from, or sent to, any other site.
import { expect, test } from '@playwright/test';
import { newPlayer, solveQuest } from './helpers';

test('a whole session talks to no other site', async ({ page, context, baseURL }) => {
  test.setTimeout(180_000);
  const origin = new URL(baseURL!).origin;
  const outside: string[] = [];
  // The context sees requests from the page and from its Python worker.
  context.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !/^(data|blob):/.test(url)) outside.push(url);
  });
  page.on('websocket', (ws) => outside.push(ws.url()));

  await newPlayer(page, 'Private Newt');
  await solveQuest(page, 'r1-q1-first-steps'); // Python runs, the world replays
  await page
    .locator('.hud')
    .getByRole('button', { name: /Save progress/ })
    .click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: /Inventory/ }).click();
  await page.getByRole('button', { name: /Switch adventurer/ }).click();
  await page.getByRole('button', { name: 'Credits' }).click();
  await expect(page.getByRole('heading', { name: 'Credits and licenses' })).toBeVisible();

  expect(outside).toEqual([]);
});
