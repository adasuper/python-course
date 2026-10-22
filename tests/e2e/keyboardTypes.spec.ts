// Every quest type played with only the keyboard (Phase 2 exit criterion, F-A11-01). Predict
// (keyboard.spec.ts) and Parsons (parsons.spec.ts) have their own tests; these cover
// investigate, modify, fix, make, the boss, fill gaps, typed input and a Parsons plan.
// No mouse: focus moves with Tab, code is typed, and Ctrl+Enter runs.
import { expect, test, type Page } from '@playwright/test';
import { solutionCode, type Body } from '../../scripts/lib/content';
import type { BossQuestFile } from '../../src/content/schema';
import { openFixture, quest, waitForPython } from './helpers';

const isFocused = (page: Page, selector: string) =>
  page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector);

/** A focused button whose text matches. */
const buttonFocused = (page: Page, re: RegExp) =>
  page.evaluate((source) => {
    const el = document.activeElement;
    return el instanceof HTMLButtonElement && new RegExp(source).test(el.textContent ?? '');
  }, re.source);

async function tabUntil(page: Page, reached: () => Promise<boolean>, key = 'Tab') {
  for (let i = 0; i < 100; i++) {
    if (await reached()) return;
    // Tab indents inside the editor; Esc first lets the next Tab leave it (F-EDT-03).
    if (await isFocused(page, '.cm-content')) await page.keyboard.press('Escape');
    await page.keyboard.press(key);
  }
  throw new Error(`could not reach it with ${key}`);
}

/** Tab into the editor, replace everything, and run with Ctrl+Enter. */
async function typeAndRun(page: Page, code: string) {
  await tabUntil(page, () => isFocused(page, '.cm-content'));
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
  await page.keyboard.press('ControlOrMeta+Enter');
}

const passed = (page: Page) =>
  expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });

for (const id of ['r1-q4-notes-for-the-baker', 'r1-q5-criers-crooked-announcement', 'r1-q6-welcome-sign']) {
  const q = quest(id) as Body;
  test(`${q.type} quest by keyboard: ${id}`, async ({ page }) => {
    await page.goto(`./?dev#/dev/quest/${id}`);
    await waitForPython(page);
    await typeAndRun(page, solutionCode(q));
    await passed(page);
    await expect(page.locator('#feedback')).toBeFocused();
  });
}

test('investigate quest by keyboard: run, answer, check, retry', async ({ page }) => {
  const q = quest('r1-q2-hello-hearthvale') as Body;
  await page.goto('./?dev#/dev/quest/r1-q2-hello-hearthvale');
  await waitForPython(page);
  await tabUntil(page, () => isFocused(page, '.cm-content'));
  await page.keyboard.press('ControlOrMeta+Enter');
  for (const [i, question] of (q.questions ?? []).entries()) {
    const input = `.investigate fieldset:nth-of-type(${i + 1}) input`;
    await expect(page.locator(input).first()).toBeEnabled();
    await tabUntil(page, () => isFocused(page, input));
    if (question.kind === 'mcq') {
      // Space picks the first choice; ↓ moves to the next one.
      await page.keyboard.press('Space');
      for (let k = 0; k < question.answer; k++) await page.keyboard.press('ArrowDown');
    } else {
      await page.keyboard.type(question.kind === 'number' ? String(question.answer) : question.accept[0]!);
    }
    await tabUntil(page, () => buttonFocused(page, /Check answer/));
    await page.keyboard.press('Enter');
    await expect(page.locator(`.investigate fieldset:nth-of-type(${i + 1})`)).toContainText('Right!');
  }
  await passed(page);
});

test('boss by keyboard: every phase, and Next phase', async ({ page }) => {
  test.setTimeout(180_000);
  const boss = quest('r1-boss-village-crier-bug') as BossQuestFile;
  await page.goto('./?dev#/dev/quest/r1-boss-village-crier-bug');
  for (const [i, phase] of boss.phases.entries()) {
    await waitForPython(page);
    await typeAndRun(page, solutionCode(phase as Body));
    await passed(page);
    if (i < boss.phases.length - 1) {
      await tabUntil(page, () => buttonFocused(page, /Next phase/));
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.locator('#feedback').getByRole('button', { name: /Back to the map/ })).toBeVisible();
});

test('fill quest by keyboard: Next gap, type, Ctrl+Enter', async ({ page }) => {
  await openFixture(page, 'fill');
  await tabUntil(page, () => buttonFocused(page, /Next gap/));
  await page.keyboard.press('Enter'); // selects the gap and moves focus into the editor
  await expect(page.locator('.cm-content')).toBeFocused();
  await page.keyboard.type('12');
  await page.keyboard.press('ControlOrMeta+Enter');
  await passed(page);
});

test('typed input by keyboard: run, answer in the dialog, run again', async ({ page }) => {
  await openFixture(page, 'doors');
  await tabUntil(page, () => isFocused(page, '.cm-content'));
  for (const door of ['1', '2']) {
    await page.keyboard.press('ControlOrMeta+Enter');
    const box = page.getByRole('textbox', { name: 'Pick a door (1 or 2):' });
    await expect(box).toBeFocused();
    await page.keyboard.type(door);
    await page.keyboard.press('Enter');
    await expect(page.locator('.output-body')).toContainText(door === '1' ? 'Gold!' : 'A dragon!');
    if (door === '1') await tabUntil(page, () => isFocused(page, '.cm-content'), 'Shift+Tab');
  }
  await passed(page);
});

test('Parsons plan (check: order) by keyboard', async ({ page }) => {
  await openFixture(page, 'plan');
  const scraps = page.locator('.parsons-scraps [role="option"] code');
  for (const line of ['# pack a lunch', '# walk to the well', '# say hello to the miller']) {
    await tabUntil(page, () => isFocused(page, '.parsons-scraps [role="option"]'));
    await page.keyboard.press('Home');
    const at = (await scraps.allTextContents()).indexOf(line);
    for (let k = 0; k < at; k++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('m');
  }
  await tabUntil(page, () => buttonFocused(page, /Run$/));
  await page.keyboard.press('Enter');
  await passed(page);
});
