// Every side quest of the course can be played through the real UI with its reference solution
// (the region smoke tests play the core quests; validate-content runs every solution in Python).
import { expect, test } from '@playwright/test';
import { content, quest, solveBody } from './helpers';

const sideQuests = content.regions.flatMap((r) => r.data.side_quests);

test('the course has side quests to play', () => {
  expect(sideQuests.length).toBeGreaterThan(0);
});

for (const [i, id] of sideQuests.entries()) {
  test(`side quest ${id}`, async ({ page }) => {
    await page.goto(`./?dev&side${i}#/dev/quest/${id}`);
    await expect(page.locator('#quest-title')).toHaveText(quest(id).title);
    await solveBody(page, quest(id) as never);
  });
}
