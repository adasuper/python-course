// The Workshop (F-WSH-01–04, F-EXE-13): it opens after the Region 1 boss, runs any code on a
// sandbox map with typed input and the bigger loop budget, and keeps programs.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { defeatTheFirstBoss, setCode } from './helpers';

test('the Workshop: locked at first, then free coding with typed input and saved programs', async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Locked until the Region 1 boss is beaten.
  await page.goto('./?dev#/dev/quest/r1-q1-first-steps');
  await page
    .getByRole('button', { name: /Back to the map/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: /Workshop/ })).toHaveCount(0);

  await defeatTheFirstBoss(page);
  await page.getByRole('button', { name: /Workshop/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Workshop/ })).toBeFocused();
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
  await page.getByRole('combobox', { name: /Speed/ }).selectOption('instant');

  // The starter program runs on the meadow.
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#live-polite')).toContainText('Hello, Workshop!');

  // Only the spells from reached regions are listed; the rest wait under "More spells".
  const api = page.getByRole('region', { name: /Spells you know/ });
  await expect(api.locator(':scope > dl')).toContainText('hero.move(direction, steps=1)');
  await expect(api.locator(':scope > dl')).not.toContainText('world.look()');
  await expect(api.locator('details summary')).toContainText('More spells');

  // Typed input (Mode B), and the Workshop's larger loop budget (over the quests' 100,000).
  await setCode(
    page,
    'name = input("Name? ")\nn = 0\nwhile n < 200000:\n    n += 1\nprint("Hi " + name, n)\n',
  );
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  const box = page.getByRole('textbox', { name: 'Name?' });
  await expect(box).toBeFocused();
  await page.keyboard.type('Ada');
  await page.keyboard.press('Enter');
  await expect(page.locator('.output-body')).toContainText('Hi Ada 200000');

  // Save, start a new one, open it again, download it, delete it.
  await page.getByRole('textbox', { name: 'Program name' }).fill('Greeter');
  await page.getByRole('button', { name: /^💾 Save$/ }).click();
  const programs = page.getByRole('region', { name: /My programs/ });
  await expect(programs).toContainText('Greeter');
  await expect(programs).toContainText('(1/20)');
  await page.getByRole('button', { name: /New program/ }).click();
  await expect(page.getByRole('textbox', { name: /Spellbook: your Python code/ })).toContainText(
    'Hello, Workshop!',
  );
  await programs.getByRole('button', { name: 'Open Greeter' }).click();
  await expect(page.getByRole('textbox', { name: /Spellbook: your Python code/ })).toContainText(
    'input("Name? ")',
  );
  const downloading = page.waitForEvent('download');
  await programs.getByRole('button', { name: '⬇ .py Greeter' }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe('greeter.py');
  expect(readFileSync((await file.path())!, 'utf8')).toContain('print("Hi " + name, n)');
  page.once('dialog', (d) => void d.accept());
  await programs.getByRole('button', { name: 'Delete Greeter' }).click();
  await expect(programs).toContainText('Save a program to keep it here.');

  // Another map.
  await page.getByRole('combobox', { name: 'Map' }).selectOption({ label: 'Twisty Maze' });
  await expect(page.getByRole('region', { name: /Workshop map/ })).toContainText('Twisty Maze');

  // Ten runs earn the Workshop Inventor badge (three are done).
  await setCode(page, 'print("tick")\n');
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: /^▶ Run$/ }).click();
    await expect(page.getByRole('button', { name: /^▶ Run$/ })).toBeEnabled();
  }
  await expect(page.locator('.toast-celebrate', { hasText: 'Workshop Inventor' })).toBeVisible();
});
