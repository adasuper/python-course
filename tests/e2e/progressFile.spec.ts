// Progress files (§12.3, F-SAV-04/05/09): export → clear storage → import restores everything,
// including code; a second import can Merge; deleting a profile offers "Save first".
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { newPlayer, openFromQuestLog, setCode, skipToOverworld, solveQuest } from './helpers';

// Use the download and <input type=file> paths: the system file pickers can't be automated.
const noPickers = (page: Page) =>
  page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).showSaveFilePicker;
    delete (window as unknown as Record<string, unknown>).showOpenFilePicker;
  });

async function importFile(page: Page, path: string) {
  await page.getByRole('button', { name: /Continue from a save/ }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open a progress file' }).click();
  await (await chooser).setFiles(path);
}

test('export, clear storage, import: progress and code come back; Merge; delete with Save first', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  await noPickers(page);
  await newPlayer(page, 'File Fox');
  await solveQuest(page, 'r1-q1-first-steps');
  await solveQuest(page, 'r1-q2-hello-hearthvale');
  await solveQuest(page, 'r1-q3-path-to-the-well');
  // Unfinished code in the next quest.
  await openFromQuestLog(page, 'Notes for the Baker');
  await setCode(page, '# my half-done notes\nprint("bread")\n');
  await page.waitForTimeout(1500); // drafts save after 1 s
  await page
    .getByRole('button', { name: /Back to the map/ })
    .first()
    .click();

  await page
    .locator('.hud')
    .getByRole('button', { name: /Save progress/ })
    .click();
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Save your progress' })
    .getByRole('button', { name: 'Save progress file' })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^codeweald-File-Fox-\d{4}-\d{2}-\d{2}\.codeweald\.json$/);
  const path = (await download.path())!;
  const file = JSON.parse(readFileSync(path, 'utf8')) as {
    version: number;
    checksum: string;
    drafts: Record<string, string>;
  };
  expect(file.version).toBe(2);
  expect(file.checksum).toMatch(/^[0-9a-f]{8}$/);
  expect(Object.values(file.drafts).join()).toContain('my half-done notes');

  // A brand-new browser profile: storage is empty, as after a Chromebook sign-out.
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await noPickers(other);
  await other.goto('./');
  await importFile(other, path);
  await skipToOverworld(other);
  await expect(other.locator('.hud')).toContainText('File Fox');
  await openFromQuestLog(other, 'Notes for the Baker');
  await expect(other.getByRole('textbox', { name: /Spellbook: your Python code/ })).toContainText(
    'my half-done notes',
  );

  // Importing the same adventurer again offers Replace, Keep both, or Merge.
  await other.getByRole('button', { name: 'Switch adventurer' }).click();
  await importFile(other, path);
  await other.getByRole('button', { name: /Merge them/ }).click();
  // Back where this adventurer left off: the quest that was open (F-SAV-10).
  await expect(other.locator('#quest-title')).toHaveText('Notes for the Baker');
  await other.getByRole('button', { name: 'Switch adventurer' }).click();
  await expect(other.locator('.profile-row')).toHaveCount(1);

  // Deleting names the profile and offers to save a file first.
  await other.getByRole('button', { name: 'Delete File Fox' }).click();
  const dialog = other.getByRole('dialog', { name: 'Delete File Fox?' });
  await expect(dialog.getByRole('button', { name: 'Keep it' })).toBeFocused();
  const saving = other.waitForEvent('download');
  await dialog.getByRole('button', { name: /Save a progress file first/ }).click();
  await saving;
  await expect(dialog.getByRole('status')).toContainText('Now you can delete safely');
  await dialog.getByRole('button', { name: 'Delete File Fox' }).click();
  await expect(other.getByText('No adventurers on this computer yet.')).toBeVisible();
  await fresh.close();
});

test('a damaged progress file is refused kindly and changes nothing', async ({ page }, info) => {
  await noPickers(page);
  await page.goto('./');
  const path = info.outputPath('broken.codeweald.json');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(path, '{"format":"codeweald-progress","version":2,"checksum":"00000000","profile":{}}');
  await importFile(page, path);
  await expect(page.getByRole('alert')).toContainText('changed or damaged');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('No adventurers on this computer yet.')).toBeVisible();
});
