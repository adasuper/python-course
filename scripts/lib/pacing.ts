// The pacing summary the build prints (F-AUT-11, docs/specs.md §20): how long the course is
// with the regions and side quests that course.yaml turns on.
import type { LoadedContent } from './content';

export interface Pacing {
  regions: number;
  lessons: number;
  quests: number;
  sideQuests: number;
  minutes: number;
  /** Regions left out with `enabled: false`. */
  skipped: string[];
}

export function pacing(content: LoadedContent): Pacing {
  const course = content.course!.data;
  const out: Pacing = { regions: 0, lessons: 0, quests: 0, sideQuests: 0, minutes: 0, skipped: [] };
  for (const entry of course.regions) {
    if (!entry.enabled) {
      out.skipped.push(entry.id);
      continue;
    }
    const region = content.regions.find((r) => r.data.id === entry.id)?.data;
    if (!region) continue;
    out.regions++;
    out.lessons += entry.lessons;
    const core = [...region.quests, region.boss];
    const side = course.side_quests ? region.side_quests : [];
    for (const id of [...core, ...side]) {
      const quest = content.quests.get(id)?.data;
      if (!quest) continue;
      out.minutes += quest.estimated_minutes;
      if (side.includes(id)) out.sideQuests++;
      else out.quests++;
    }
  }
  return out;
}

export function pacingLine(p: Pacing): string {
  const hours = Math.round((p.minutes / 60) * 10) / 10;
  return (
    `pacing: ${p.regions} region(s), ${p.lessons} lesson(s), ${p.quests} quest(s) and bosses` +
    `${p.sideQuests ? ` + ${p.sideQuests} side quest(s)` : ''}, about ${p.minutes} minutes (${hours} h)` +
    (p.skipped.length ? `; left out: ${p.skipped.join(', ')}` : '')
  );
}
