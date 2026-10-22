// Shared steps for end-to-end tests: play quests through the real UI using the
// content's own reference solutions.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { parse } from 'yaml';
import { compileQuest, loadContent, solutionCode, type Body } from '../../scripts/lib/content';
import { NormalQuestSchema, type BossQuestFile, type NormalQuestFile } from '../../src/content/schema';
import type { Quest } from '../../src/content/types';

export const content = loadContent();

/** Opens a quest from tests/e2e/fixtures, for quest types the real content doesn't use
 *  yet. It goes through the same schema and compiler as content/. */
export async function openFixture(
  page: Page,
  name: string,
  options: { regionNumber?: number } = {},
): Promise<Quest> {
  const raw = parse(readFileSync(join(import.meta.dirname, 'fixtures', `${name}.yaml`), 'utf8')) as unknown;
  const quest = compileQuest(NormalQuestSchema.parse(raw), new Map());
  await page.goto('./?dev');
  await page.waitForFunction(() => '__codewealdTest' in window);
  await page.evaluate(
    ([q, o]) =>
      (
        window as unknown as { __codewealdTest: { openQuest(q: unknown, o: unknown): Promise<void> } }
      ).__codewealdTest.openQuest(q, o),
    [quest, options] as const,
  );
  await expect(page.locator('#quest-title')).toHaveText(quest.title);
  await waitForPython(page);
  return quest;
}

export function quest(id: string) {
  const q = content.quests.get(id);
  if (!q) throw new Error(`no quest ${id}`);
  return q.data;
}

export async function newPlayer(page: Page, nickname = 'Clever Newt', url = './') {
  await page.goto(url);
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
  const row = page
    .locator('.quest-row')
    .filter({ has: page.locator('.quest-title', { hasText: new RegExp(`^${escape(title)}$`) }) });
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

export async function waitForPython(page: Page) {
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
      // The per-line mouse buttons (hidden from assistive technology; their tooltip names them).
      await item.locator('button[title="Move to the other list"]').click();
      const indent = (line.length - line.trimStart().length) / 4;
      const placed = page.locator('.parsons-spell .parsons-item').last();
      for (let k = 0; k < indent; k++) await placed.locator('button[title="Indent more"]').click();
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
