// Settings and accessibility features (M2.9): one settings screen saved per profile (F-A11-13),
// title-screen quick settings, quest tabs on narrow screens (F-QST-03), click-to-walk
// (F-WLD-05), shortcut keys that can be turned off (F-A11-12), read aloud (§14.5) and a calm
// replay with reduced motion (F-API-13).
import { expect, test, type Page } from '@playwright/test';
import { newPlayer, openFixture, openFromQuestLog, quest, setCode, solveBody } from './helpers';

const root = (page: Page): Promise<Record<string, string | undefined>> =>
  page.evaluate(() => ({
    scale: document.documentElement.style.getPropertyValue('--text-scale'),
    ...document.documentElement.dataset,
  }));

/** Nothing scrolls sideways (WCAG 1.4.10). */
async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

interface OverworldHook {
  pos: [number, number];
  hero: { x: number; y: number };
  isBlocked(x: number, y: number): boolean;
  objectsAt: Map<string, unknown>;
  cameras: { main: { zoom: number; worldView: { x: number; y: number } } };
}

/** The hero's tile, and where on the page each free neighbouring tile is. */
function heroAndNeighbours(page: Page) {
  return page.evaluate(() => {
    const game = (window as unknown as { __codewealdGame: { canvas: HTMLCanvasElement; scene: unknown } })
      .__codewealdGame;
    const scene = (game.scene as { getScene(k: string): OverworldHook }).getScene('overworld');
    const cam = scene.cameras.main;
    const box = game.canvas.getBoundingClientRect();
    const deltas = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] } as const;
    const free = Object.entries(deltas)
      .filter(([, [dx, dy]]) => {
        const [x, y] = [scene.pos[0] + dx, scene.pos[1] + dy];
        return !scene.isBlocked(x, y) && !scene.objectsAt.has(`${x},${y}`);
      })
      .map(([dir, [dx, dy]]) => ({
        dir,
        to: [scene.pos[0] + dx, scene.pos[1] + dy] as [number, number],
        x: box.left + (scene.hero.x + dx * 16 - cam.worldView.x) * cam.zoom,
        y: box.top + (scene.hero.y + dy * 16 - cam.worldView.y) * cam.zoom,
      }));
    return { pos: [...scene.pos] as [number, number], free };
  });
}

const heroPos = async (page: Page) => (await heroAndNeighbours(page)).pos;

test('quick settings on the title screen carry into a new adventurer', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Bigger text: 100%/ }).click();
  await expect(page.getByRole('button', { name: /Bigger text: 125%/ })).toBeVisible();
  const contrast = page.getByRole('button', { name: /High contrast/ });
  await contrast.click();
  await expect(contrast).toHaveAttribute('aria-pressed', 'true');
  expect(await root(page)).toMatchObject({ scale: '1.25', contrast: 'high' });

  // They stay for the next visit, and become the new adventurer's first settings.
  await newPlayer(page, 'Quick Quail');
  expect(await root(page)).toMatchObject({ scale: '1.25', contrast: 'high' });
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByRole('heading', { name: /Settings/ })).toBeFocused();
  await expect(page.getByRole('radio', { name: '125%' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'High contrast' })).toBeChecked();
});

test('one settings screen: changes apply at once and are saved with the adventurer', async ({ page }) => {
  test.setTimeout(120_000);
  await newPlayer(page, 'Comfy Crane');
  await page.getByRole('button', { name: /Settings/ }).click();

  await page.getByRole('radio', { name: 'OpenDyslexic' }).check();
  await page.getByRole('radio', { name: "This computer's code font" }).check();
  await page.getByRole('checkbox', { name: 'High contrast' }).check();
  await page.getByRole('radio', { name: 'On', exact: true }).check();
  await page.getByLabel('Replay speed').selectOption('2');
  await page.getByLabel('Sound effects').fill('50');
  expect(await root(page)).toMatchObject({
    font: 'opendyslexic',
    codeFont: 'system',
    contrast: 'high',
    motion: 'reduce',
  });
  await expect(page.locator('output[for="slider-sound-effects"]')).toHaveText('50%');

  // 200% text: nothing scrolls sideways, and the quest screen uses tabs (F-A11-08, F-QST-03).
  await page.getByRole('radio', { name: '200%' }).check();
  expect((await root(page)).scale).toBe('2');
  await noSidewaysScroll(page);
  await page.getByRole('button', { name: /Back to the map/ }).click();
  await noSidewaysScroll(page);
  await openFromQuestLog(page, "Byte's First Steps");
  await expect(page.getByRole('tablist', { name: 'Quest panels' })).toBeVisible();
  await noSidewaysScroll(page);

  // Saved with the adventurer: a fresh page load brings everything back.
  await page.waitForTimeout(700); // the profile saves 0.5 s after the last change
  await page.goto('./');
  await page.locator('.profile-button', { hasText: 'Comfy Crane' }).click();
  await expect(page.locator('#quest-title')).toHaveText("Byte's First Steps");
  expect(await root(page)).toMatchObject({ scale: '2', font: 'opendyslexic', contrast: 'high' });
  await page.getByRole('tab', { name: /Stage and output/ }).click();
  await expect(page.getByRole('combobox', { name: /Speed/ })).toHaveValue('2');
});

test('narrow screen: the quest panels become tabs, and Run is always there', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('./?dev#/dev/quest/r1-q6-welcome-sign');
  const tabs = page.getByRole('tablist', { name: 'Quest panels' });
  const run = page.getByRole('button', { name: /^▶ Run$/ });
  await expect(tabs).toBeVisible();
  await expect(page.getByRole('tab', { name: /Spellbook/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.quest-story')).toBeHidden();
  await expect(run).toBeVisible();

  // Arrow keys move between tabs (WAI-ARIA tabs); each panel is labelled by its tab.
  await page.getByRole('tab', { name: /Spellbook/ }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: /Quest$/ })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: /Quest$/ })).toBeVisible();
  await expect(page.locator('.quest-work')).toBeHidden();
  await expect(run).toBeVisible();
  await noSidewaysScroll(page);

  // A skip link shows the panel it jumps to.
  await page.getByRole('link', { name: 'Skip to output' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: /Stage and output/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#output-body')).toBeFocused();

  // After the replay, Byte's feedback brings the Spellbook panel back.
  await page.getByRole('tab', { name: /Spellbook/ }).click();
  await solveBody(page, quest('r1-q6-welcome-sign') as never);
  await expect(page.getByRole('tab', { name: /Spellbook/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#feedback')).toBeVisible();

  // Wide again: three panels side by side, no tabs.
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(tabs).toHaveCount(0);
  await expect(page.locator('.quest-story')).toBeVisible();
});

test('overworld: click next to the hero to walk; letter shortcuts can be turned off', async ({ page }) => {
  await newPlayer(page, 'Tapping Toad', './?dev');
  await page.waitForTimeout(600); // the camera settles on the hero
  const before = await heroAndNeighbours(page);
  const step = before.free[0]!;
  await page.mouse.click(step.x, step.y);
  await expect.poll(() => heroPos(page)).toEqual(step.to);

  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByRole('checkbox', { name: /Letter shortcut keys/ }).uncheck();
  await page.getByRole('button', { name: /Back to the map/ }).click();
  await page.getByRole('application').focus();
  const at = await heroPos(page);
  for (const key of ['w', 'a', 's', 'd']) await page.keyboard.press(key);
  await page.waitForTimeout(400);
  expect(await heroPos(page)).toEqual(at);
  // Arrow keys always work.
  const back = { right: 'ArrowLeft', left: 'ArrowRight', down: 'ArrowUp', up: 'ArrowDown' }[
    step.dir as 'right'
  ];
  await page.keyboard.press(back);
  await expect.poll(() => heroPos(page)).toEqual(before.pos);
});

/** A pretend offline voice that records what it says. */
function fakeVoices(page: Page, voices: { name: string; lang: string; localService: boolean }[]) {
  return page.addInitScript((list) => {
    const spoken: string[] = [];
    Object.assign(window, { __spoken: spoken });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => list,
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
  }, voices);
}

async function startStory(page: Page, nickname: string) {
  await page.goto('./');
  await page.getByRole('button', { name: /New adventurer/ }).click();
  await page.getByLabel('Your nickname').fill(nickname);
  await page.getByRole('button', { name: 'Start my adventure' }).click();
}

test('read aloud uses an installed voice, and says so when there is none', async ({ page, browser }) => {
  await fakeVoices(page, [{ name: 'Robin', lang: 'en-GB', localService: true }]);
  await startStory(page, 'Loud Lark');
  const line = (await page.locator('.dialogue-text p:not(.speaker)').first().innerText())
    .replace(/\s+/g, ' ')
    .trim();
  await page.getByRole('button', { name: /Read aloud/ }).click();
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
  expect(spoken).toHaveLength(1);
  expect(line.startsWith(spoken[0]!.slice(0, 20))).toBe(true);

  const other = await browser.newContext();
  const quiet = await other.newPage();
  await fakeVoices(quiet, [{ name: 'Cloud', lang: 'en-US', localService: false }]);
  await startStory(quiet, 'Quiet Quokka');
  await expect(quiet.getByText('Read-aloud needs an installed voice.')).toBeVisible();
  await other.close();
});

test('reduced motion: the replay jumps instead of sliding and bumps without a shake', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page, 'walk');
  expect((await root(page)).motion).toBe('reduce');
  // Count every tween the stage starts while the replay plays at normal speed.
  await page.evaluate(() => {
    const game = (window as unknown as { __codewealdGame: { scene: { getScene(k: string): unknown } } })
      .__codewealdGame;
    const scene = game.scene.getScene('stage') as { tweens: { add(...a: unknown[]): unknown } };
    const add = scene.tweens.add.bind(scene.tweens);
    Object.assign(window, { __tweens: 0 });
    scene.tweens.add = (...a: unknown[]) => {
      (window as unknown as { __tweens: number }).__tweens++;
      return add(...a);
    };
  });
  await setCode(page, 'from codeweald import hero\nhero.move("right", 5)\n');
  await page.getByRole('button', { name: /^▶ Run$/ }).click();
  await expect(page.locator('#feedback')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { __tweens: number }).__tweens)).toBe(0);
});
