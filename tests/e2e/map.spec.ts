// Regression: the map camera used to jump every half second once a quest had been played,
// and the canvas kept the quest stage's size after coming back to the map.
import { expect, test, type Page } from '@playwright/test';
import { newPlayer, solveQuest } from './helpers';

interface GameHook {
  canvas: HTMLCanvasElement;
  scene: { getScene(key: string): { cameras: { main: { scrollX: number; scrollY: number } } } };
}

/** Camera position, canvas size and holder size, read through the ?dev hook. */
function mapState(page: Page) {
  return page.evaluate(() => {
    const game = (window as unknown as { __codewealdGame: GameHook }).__codewealdGame;
    const cam = game.scene.getScene('overworld').cameras.main;
    const host = document.querySelector('.world-host')!.getBoundingClientRect();
    return {
      camera: `${cam.scrollX},${cam.scrollY}`,
      canvas: `${game.canvas.width}x${game.canvas.height}`,
      host: `${Math.floor(host.width)}x${Math.floor(host.height)}`,
    };
  });
}

test('the map stays still and fills its frame after a quest', async ({ page }) => {
  test.setTimeout(180_000);
  await newPlayer(page, 'Clever Newt', './?dev');
  await solveQuest(page, 'r1-q1-first-steps');
  // Scrolling the page made Phaser report a resize every 500 ms, which re-centered the camera.
  await page.evaluate(() => window.scrollTo(0, 40));
  await page.waitForTimeout(500);

  const first = await mapState(page);
  expect(first.canvas).toBe(first.host);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(250);
    expect(await mapState(page)).toEqual(first);
  }
});
