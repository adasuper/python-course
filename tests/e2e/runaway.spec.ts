// Brief §7: timeout handling for an infinite loop (both safety layers, specs §6.3).
import { expect, test } from '@playwright/test';
import { setCode } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/?dev#/dev/quest/r1-q6-welcome-sign');
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
});

test('an infinite while loop is stopped instantly, with the loop line named', async ({ page }) => {
  await setCode(page, 'print("start")\nwhile True:\n    pass\n');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  const feedback = page.locator('#feedback');
  await expect(feedback).toContainText('line 2', { timeout: 20_000 });
  await expect(feedback).toContainText(/running forever|loop/i);
  // The worker survived: the next run works straight away.
  await setCode(page, 'print("Still here")\n');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('.output-body')).toContainText('Still here');
});

test('long C-level work hits the hard timeout, and Python restarts', async ({ page }) => {
  await setCode(page, 'print(sum(range(10**12)))\n');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toContainText('Byte stopped your code', { timeout: 20_000 });
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  await setCode(page, 'print("Back again")\n');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('.output-body')).toContainText('Back again', { timeout: 20_000 });
});
