// Parsons puzzles (F-QST-09, F-QST-10, F-QA-09): solved with only the §14.3 keys, and by
// dragging with a pointer.
import { expect, test, type Page } from '@playwright/test';
import { openFixture } from './helpers';

const LINES = [
  'gold = 12',
  'if gold >= 10:',
  'print("You may pass")',
  'else:',
  'print("Come back later")',
] as const;

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return {
      role: el?.getAttribute('role') ?? el?.tagName.toLowerCase(),
      list: el?.closest('.parsons-list')?.classList.contains('parsons-spell') ? 'spell' : 'scraps',
      text: el?.textContent ?? '',
    };
  });

async function tabUntil(page: Page, test: (f: Awaited<ReturnType<typeof focused>>) => boolean, key = 'Tab') {
  for (let i = 0; i < 40; i++) {
    if (test(await focused(page))) return;
    await page.keyboard.press(key);
  }
  throw new Error('could not reach it with the keyboard');
}

const scrapTexts = (page: Page) => page.locator('.parsons-scraps [role="option"] code').allTextContents();
const spellOptions = (page: Page) => page.locator('.parsons-spell [role="option"]');

test('solve a Parsons puzzle with only the keyboard (F-QA-09)', async ({ page }) => {
  await openFixture(page, 'gate');
  await expect(page.getByRole('listbox', { name: 'Spell scraps' })).toBeVisible();
  await tabUntil(page, (f) => f.role === 'option' && f.list === 'scraps');

  // Build: gold, if, else, ⇥pass, ⇥back (pass and else swapped on purpose).
  for (const [line, indent] of [
    [LINES[0], 0],
    [LINES[1], 0],
    [LINES[3], 0],
    [LINES[2], 1],
    [LINES[4], 1],
  ] as const) {
    // Back to the scraps list (Shift+Tab from the spell), then ↓ to the wanted line.
    await tabUntil(page, (f) => f.role === 'option' && f.list === 'scraps', 'Shift+Tab');
    await page.keyboard.press('Home');
    const at = (await scrapTexts(page)).indexOf(line);
    for (let k = 0; k < at; k++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('m');
    for (let k = 0; k < indent; k++) await page.keyboard.press('ArrowRight');
  }
  await expect(spellOptions(page)).toHaveCount(5);
  await expect(page.locator('.parsons-scraps [role="option"]')).toHaveText(['if gold = 10:']);
  await expect(page.locator('#live-polite')).toContainText('Position 5 of 5, indent 1');

  // Esc cancels a move.
  await page.keyboard.press('ArrowUp'); // focus "print pass"
  await page.keyboard.press('Space');
  await expect(page.locator('#live-polite')).toContainText('Picked up print("You may pass")');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  await expect(page.locator('#live-polite')).toContainText('Put back where it was.');
  await expect(spellOptions(page).nth(3)).toHaveAccessibleName('print("You may pass"), indent 1');

  // Space, ↑, Space moves it above "else:".
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(spellOptions(page).nth(2)).toHaveAccessibleName('print("You may pass"), indent 1');
  await expect(spellOptions(page).nth(2)).toBeFocused();

  // Tab on to the Run button, and run.
  await tabUntil(page, (f) => f.role === 'button' && /Run$/.test(f.text));
  await page.keyboard.press('Enter');
  await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });
});

test('drag lines with a pointer, including the indent', async ({ page }) => {
  await openFixture(page, 'gate');
  const drag = async (text: string, target: () => Promise<{ x: number; y: number }>) => {
    const box = (await page.locator('[role="option"]', { hasText: text }).first().boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    const to = await target();
    await page.mouse.move(box.x + 30, box.y + box.height / 2, { steps: 3 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await expect(page.locator('.parsons-drop')).toBeVisible();
    await page.mouse.up();
  };
  const spellBox = async () => (await page.locator('.parsons-spell .parsons-items').boundingBox())!;

  // Into the empty spell, near its left edge: indent 0.
  await drag('if gold >= 10:', async () => {
    const b = await spellBox();
    return { x: b.x + 20, y: b.y + 10 };
  });
  await expect(spellOptions(page)).toHaveCount(1);
  await expect(spellOptions(page).first()).toHaveAccessibleName('if gold >= 10:, indent 0');

  // Below it, about two indent steps (2rem each) to the right: indent 1 or more, here 1.
  await drag('print("You may pass")', async () => {
    const b = await spellBox();
    return { x: b.x + 20 + 32, y: b.y + b.height + 8 };
  });
  await expect(spellOptions(page).nth(1)).toHaveAccessibleName('print("You may pass"), indent 1');

  // Above the first line.
  await drag('gold = 12', async () => {
    const b = await spellBox();
    return { x: b.x + 20, y: b.y + 4 };
  });
  await expect(spellOptions(page).first()).toHaveAccessibleName('gold = 12, indent 0');

  // A click without moving is not a drag.
  await page.locator('[role="option"]', { hasText: 'else:' }).click();
  await expect(page.locator('.parsons-scraps [role="option"]', { hasText: 'else:' })).toBeFocused();
});
