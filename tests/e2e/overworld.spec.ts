// The map (Phase 2 audit): reduced motion (F-A11-10), the D-pad (F-WLD-05), words for the map
// (F-WLD-06), the Quest Board (F-WLD-07) and reading a greeting aloud (F-DLG-07).
import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

interface SceneHook {
  pos: [number, number];
  reducedMotion: boolean;
  tweens: { add(...a: unknown[]): unknown };
  opts: { region: { overworld: { objects: { kind: string }[] } }; onInteract(o: unknown): void };
}

/** Runs `fn` on the overworld scene, through the ?dev hook. */
function onScene<T>(page: Page, fn: (scene: SceneHook) => T | Promise<T>) {
  return page.evaluate(
    `(${fn.toString()})(window.__codewealdGame.scene.getScene('overworld'))`,
  ) as Promise<T>;
}

const heroPos = (page: Page) => onScene(page, (s) => [...s.pos]);
const said = (page: Page) => page.locator('#live-polite');

test('reduced motion reaches the map: no walking tweens, from the system or the setting', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await newPlayer(page, 'Calm Carp', './?dev');
  await expect.poll(() => onScene(page, (s) => s.reducedMotion)).toBe(true);
  await onScene(page, (s) => {
    const add = s.tweens.add.bind(s.tweens);
    Object.assign(window, { __tweens: 0 });
    s.tweens.add = (...a: unknown[]) => {
      (window as unknown as { __tweens: number }).__tweens++;
      return add(...a);
    };
  });
  const start = await heroPos(page);
  await page.getByRole('application').focus();
  // Some of these steps may be blocked; at least one of them walks.
  for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight']) await page.keyboard.press(key);
  await expect.poll(() => heroPos(page)).not.toEqual(start);
  expect(await page.evaluate(() => (window as unknown as { __tweens: number }).__tweens)).toBe(0);

  // With the system setting off, the game's own setting turns it on.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByRole('radio', { name: 'Off', exact: true }).check();
  await page.getByRole('button', { name: /Back to the map/ }).click();
  await expect.poll(() => onScene(page, (s) => s.reducedMotion)).toBe(false);
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByRole('radio', { name: 'On', exact: true }).check();
  await page.getByRole('button', { name: /Back to the map/ }).click();
  await expect.poll(() => onScene(page, (s) => s.reducedMotion)).toBe(true);
});

test('the D-pad walks; the map says where things are, including the way out', async ({ page }) => {
  await newPlayer(page, 'Pad Panda', './?dev');
  const picture = page.getByRole('img', { name: /^Hearthvale Village\./ });
  await expect(picture).toBeVisible();
  const before = await heroPos(page);
  for (const dir of ['right', 'down', 'left', 'up']) {
    await page.getByRole('button', { name: `Walk ${dir}` }).click();
    if (JSON.stringify(await heroPos(page)) !== JSON.stringify(before)) break;
  }
  await expect.poll(() => heroPos(page)).not.toEqual(before);

  await page.getByRole('button', { name: /Describe surroundings/ }).click();
  await expect(said(page)).toContainText(/^Hearthvale Village\. .+ is .+\. The way out is .+\. Press Q/);
  await page.getByRole('application').focus();
  await page.keyboard.press('Shift+L'); // any case
  await expect(said(page)).toContainText('The way out is');
});

test('the Quest Board lists side quests, locked until the village quests are done', async ({ page }) => {
  await newPlayer(page, 'Board Badger', './?dev');
  await onScene(page, (s) =>
    s.opts.onInteract(s.opts.region.overworld.objects.find((o) => o.kind === 'board')),
  );
  const board = page.getByRole('dialog', { name: 'Quest Board' });
  await expect(board).toContainText('⭐ Banner Painter');
  await expect(board).toContainText('Locked');
  await expect(board).toContainText("Finish “Byte's First Steps”");
  await expect(board.getByRole('button', { name: 'Go' })).toBeDisabled();
  await board.getByRole('button', { name: 'Close' }).press('Escape');
  await expect(board).toHaveCount(0);
});

test("a person's greeting can be read aloud", async ({ page }) => {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.assign(window, { __spoken: spoken });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ name: 'Robin', lang: 'en-GB', localService: true }],
        speak: (u: { text: string }) => spoken.push(u.text),
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        voice = null;
        rate = 1;
        constructor(readonly text: string) {}
      },
    });
  });
  await newPlayer(page, 'Ear Eel');
  await page.getByRole('application').focus();
  await page.keyboard.press('ArrowRight'); // Byte stands to the right of the spawn point
  await page.keyboard.press('Enter');
  const talk = page.getByRole('dialog', { name: 'Byte' });
  await talk.getByRole('button', { name: /Read aloud/ }).click();
  expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)).toEqual([
    'Ah, my apprentice. Ready for your very first steps?',
  ]);
});
