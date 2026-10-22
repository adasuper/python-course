// Offline play (F-QA-11, F-OFF-01–03): after one visit, the game and Python work with no
// network, and Python's big files are downloaded only once.
import { expect, test, type Page } from '@playwright/test';
import { quest, solveBody } from './helpers';

/** How often the server has sent each Python file, since it started. */
async function downloads(page: Page): Promise<Record<string, number>> {
  return (await page.request.get('./__codeweald-requests')).json() as Promise<Record<string, number>>;
}

test('Python downloads once, then the game plays offline', async ({ page, context }) => {
  test.setTimeout(240_000);
  const before = await downloads(page);
  await page.goto('./');
  await expect(page.getByText('Ready to play offline ✓')).toBeVisible({ timeout: 120_000 });
  const after = await downloads(page);
  for (const file of ['pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide.asm.mjs', 'pyodide-lock.json'])
    expect((after[file] ?? 0) - (before[file] ?? 0), file).toBe(1);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Ready to play offline ✓')).toBeVisible({ timeout: 60_000 });
  // A quest with a Python run, entirely from the caches.
  await page.goto('./?dev#/dev/quest/r1-q4-notes-for-the-baker');
  await expect(page.locator('.hud')).toContainText('Offline');
  await solveBody(page, quest('r1-q4-notes-for-the-baker') as never);
  await context.setOffline(false);
  expect((await downloads(page))['pyodide.asm.wasm']).toBe(after['pyodide.asm.wasm']);
});

test('System check: every row has a result in words', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'System check' }).click();
  await expect(page.getByRole('heading', { name: /System check/ })).toBeFocused();
  const rows = page.locator('.system-table tbody tr');
  await expect(rows).toHaveCount(8);
  await expect(page.getByRole('row', { name: /WebAssembly/ })).toContainText('Pass');
  await expect(page.getByRole('row', { name: /Python file type/ })).toContainText('application/wasm');
});

test('a new version waits for the student, then reloads when asked', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./');
  await expect(page.getByText('Ready to play offline ✓')).toBeVisible({ timeout: 120_000 });
  // Publish a "new version" (the test server serves a changed sw.js).
  await page.request.post('./__codeweald-next-version');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  const banner = page.getByRole('status').filter({ hasText: 'A new version of Codeweald is ready' });
  await expect(banner).toBeVisible({ timeout: 30_000 });
  // Nothing reloads by itself.
  await page.getByRole('button', { name: /New adventurer/ }).click();
  await expect(page.getByLabel('Your nickname')).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByLabel('Your nickname')).toBeVisible();
  // Reload now: the new version takes over.
  await Promise.all([page.waitForEvent('load'), banner.getByRole('button', { name: /Reload now/ }).click()]);
  await expect(page.getByRole('button', { name: /New adventurer/ })).toBeVisible();
  await expect(banner).toHaveCount(0);
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting),
  ).toBeFalsy();
});

test.afterEach(async ({ request }) => {
  await request.delete('./__codeweald-next-version');
});
