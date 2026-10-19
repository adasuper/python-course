// Shared steps for end-to-end tests: play quests through the real UI using the
// content's own reference solutions.
import { expect, type Page } from '@playwright/test';
import { loadContent, solutionCode, type Body } from '../../scripts/lib/content';
import type { BossQuestFile, NormalQuestFile } from '../../src/content/schema';

export const content = loadContent();

export function quest(id: string) {
  const q = content.quests.get(id);
  if (!q) throw new Error(`no quest ${id}`);
  return q.data;
}

export async function newPlayer(page: Page, nickname = 'Clever Newt') {
  await page.goto('/');
  await page.getByRole('button', { name: /New adventurer/ }).click();
  await page.getByLabel('Your nickname').fill(nickname);
  await page.getByRole('button', { name: 'Start my adventure' }).click();
  await skipToOverworld(page);
}

/** Click through story and concept scenes until the map appears. */
export async function skipToOverworld(page: Page) {
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('application').count()) return;
    const go = page.getByRole('button', { name: /Let's go/ });
    if (await go.count()) await go.click();
    const next = page.getByRole('button', { name: /^(Next|Done)/ });
    if (await next.count()) await next.click();
    await page.waitForTimeout(100);
  }
  await expect(page.getByRole('application')).toBeVisible();
}

export async function openFromQuestLog(page: Page, title: string) {
  const toggle = page.locator('#quest-log-button');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  const row = page.locator('.quest-row', { hasText: title });
  await row.getByRole('button', { name: /^(Go|Replay)$/ }).click();
  await expect(page.locator('#quest-title')).toHaveText(title);
}

/** Replace the editor's contents exactly (no auto-indent). */
export async function setCode(page: Page, code: string) {
  const editor = page.getByRole('textbox', { name: /Spellbook: your Python code/ });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
}

async function waitForPython(page: Page) {
  await expect(page.locator('.loading-panel')).toHaveCount(0, { timeout: 90_000 });
}

/** Play one quest body (a quest or a boss phase) with its reference solution. */
export async function solveBody(page: Page, body: Body) {
  await waitForPython(page);
  await page
    .getByRole('combobox', { name: /Speed/ })
    .selectOption('instant')
    .catch(() => {});
  if (body.type === 'predict') {
    for (const prompt of body.prompts ?? []) {
      if (prompt.kind === 'mcq')
        await page.getByRole('radio', { name: prompt.options[prompt.answer]!, exact: true }).first().check();
      else await page.getByRole('textbox', { name: /Your prediction/ }).fill(prompt.answer);
    }
    await page.getByRole('button', { name: /Lock in/ }).click();
    await page.getByRole('button', { name: /Run to check/ }).click();
  } else if (body.type === 'investigate') {
    await page.getByRole('button', { name: /^▶ Run$/ }).click();
    const fieldsets = page.locator('.investigate fieldset');
    await expect(fieldsets.first()).toBeEnabled();
    for (const [i, q] of (body.questions ?? []).entries()) {
      const fs = fieldsets.nth(i);
      if (q.kind === 'mcq') await fs.getByRole('radio').nth(q.answer).check();
      else await fs.locator('input').fill(q.kind === 'number' ? String(q.answer) : q.accept[0]!);
      await fs.getByRole('button', { name: 'Check answer' }).click();
      await expect(fs.getByText('Right!')).toBeVisible();
    }
  } else if (body.type === 'parsons') {
    const lines = body.parsons!.lines;
    for (const line of lines) {
      const item = page
        .locator('.parsons-scraps .parsons-item', {
          has: page.locator('code', { hasText: new RegExp(`^${escape(line.trim())}$`) }),
        })
        .first();
      await item.getByRole('button', { name: 'Move to the other list' }).click();
      const indent = (line.length - line.trimStart().length) / 4;
      const placed = page.locator('.parsons-spell .parsons-item').last();
      for (let k = 0; k < indent; k++) await placed.getByRole('button', { name: 'Indent more' }).click();
    }
    await page.getByRole('button', { name: /^▶ Run$/ }).click();
  } else {
    await setCode(page, solutionCode(body));
    await page.getByRole('button', { name: /^▶ Run$/ }).click();
  }
  await expect(page.locator('#feedback')).toContainText('Quest complete!', { timeout: 30_000 });
}

export async function solveQuest(page: Page, id: string) {
  const q = quest(id);
  console.log(`solving ${id}`);
  await openFromQuestLog(page, q.title);
  if (q.type === 'boss') {
    const phases = (q as BossQuestFile).phases;
    for (const [i, phase] of phases.entries()) {
      await solveBody(page, phase);
      if (i < phases.length - 1) await page.getByRole('button', { name: /Next phase/ }).click();
    }
  } else {
    await solveBody(page, q as NormalQuestFile);
  }
  await page
    .locator('#feedback')
    .getByRole('button', { name: /Back to the map/ })
    .click();
  await expect(page.getByRole('application')).toBeVisible();
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
