// Brief §7: new player → character creation → complete Region 1 → item in inventory → reload → progress persists.
import { expect, test } from '@playwright/test';
import { content, newPlayer, skipToOverworld, solveQuest } from './helpers';

const region = content.regions[0]!.data;

test('a new player completes Region 1 and keeps their progress after a reload', async ({ page }) => {
  test.setTimeout(600_000);
  await newPlayer(page);
  for (const id of [...region.quests, region.boss, ...region.side_quests]) {
    await solveQuest(page, id);
  }
  await page.getByRole('button', { name: /Inventory/ }).click();
  await expect(page.getByRole('button', { name: /Quill of Printing/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: region.fragment.name })).toBeVisible();
  // Badges earned on the way (F-PRG-06): the fix quest, the boss and the side quest.
  const badges = page.getByRole('region', { name: /Badges/ });
  await expect(badges.locator('.earned', { hasText: 'First Bug Squashed' })).toHaveCount(1);
  await expect(badges.locator('.earned', { hasText: 'Region Restorer: Hearthvale' })).toHaveCount(1);

  // The knowledge check opens after the boss (F-BOS-04), and answering everything right scores full marks.
  await page.getByRole('button', { name: /Back to the map/ }).click();
  await page.locator('#quest-log-button').click();
  await page.locator('.quest-row', { hasText: 'Review riddles' }).getByRole('button', { name: 'Go' }).click();
  const items = region.knowledge_check.items;
  for (const [i, item] of items.entries()) {
    const fieldset = page.locator('fieldset').nth(i);
    if (item.kind === 'mcq')
      await fieldset.getByRole('radio', { name: item.options[item.answer]!, exact: true }).check();
    else await fieldset.locator('textarea').fill(item.answer.trimEnd());
  }
  await page.getByRole('button', { name: 'Check my answers' }).click();
  await expect(page.locator('#check-score')).toHaveText(`You got ${items.length} of ${items.length}.`);

  await page.reload();
  await page.getByRole('button', { name: /Clever Newt/ }).click();
  await skipToOverworld(page);
  await page.locator('#quest-log-button').click();
  await expect(page.locator('#quest-log-button')).toContainText(
    `(${region.quests.length + 1}/${region.quests.length + 1})`,
  );
  await page.getByRole('button', { name: /Inventory/ }).click();
  await expect(page.getByRole('button', { name: /Quill of Printing/ })).toBeVisible();
  await expect(page.locator('.badge-card.earned', { hasText: 'Region Restorer: Hearthvale' })).toHaveCount(1);
});
