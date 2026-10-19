// Save codes: progress as copy-and-paste text (docs/specs.md §12.4, §12.5).
// Format: "CW1-" + Crockford Base32 in groups of 5; the last group is a CRC-16 check.
import type { Course } from '../content/types';
import { emptyRecord, newProfile, type Profile, type QuestRecord } from './profile';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const NICK_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
const ATTEMPT_BUCKETS = [0, 1, 2, 3, 4, 6, 10, 20];
const MINUTE_BUCKETS = [0, 2, 5, 10, 15, 20, 30, 45];
const EPOCH = Date.UTC(2026, 0, 1);
const VERSION = 1;

class BitWriter {
  bits: number[] = [];
  write(value: number, width: number) {
    for (let i = width - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
}

class BitReader {
  pos = 0;
  constructor(private bits: number[]) {}
  read(width: number): number {
    if (this.pos + width > this.bits.length) throw new Error('short');
    let v = 0;
    for (let i = 0; i < width; i++) v = v * 2 + this.bits[this.pos++]!;
    return v;
  }
}

export function crc16(bits: number[]): number {
  let crc = 0xffff;
  for (const bit of bits) {
    const top = (crc >> 15) & 1;
    crc = (crc << 1) & 0xffff;
    if (top ^ bit) crc ^= 0x1021;
  }
  return crc;
}

const bucket = (value: number, edges: number[]) => {
  let i = 0;
  while (i + 1 < edges.length && value >= edges[i + 1]!) i++;
  return i;
};

export interface Choices {
  avatars: string[];
  themes: string[];
}

export function encodeSaveCode(p: Profile, course: Course, choices: Choices, now = new Date()): string {
  const w = new BitWriter();
  w.write(VERSION, 4);
  w.write(parseInt(course.contentVersion.slice(0, 4), 16) || 0, 16);
  w.write(parseInt(p.id.replace(/-/g, '').slice(0, 8), 16) >>> 0, 32);
  w.write(Math.max(0, Math.min(65535, Math.floor((now.getTime() - EPOCH) / 86_400_000))), 16);
  w.write(Math.max(0, choices.avatars.indexOf(p.avatarId)), 4);
  w.write(Math.max(0, choices.themes.indexOf(p.themeId)), 4);
  const nick = [...p.nickname].filter((c) => NICK_CHARS.includes(c)).slice(0, 16);
  w.write(nick.length, 5);
  for (const c of nick) w.write(NICK_CHARS.indexOf(c), 6);
  w.write(Math.min(65535, p.xp), 16);
  w.write(course.questOrder.length, 8);
  for (const id of course.questOrder) {
    const r = p.quests[id];
    const status = !r ? 0 : r.status === 'completed' ? 2 : 1;
    w.write(status, 2);
    w.write(r?.hintsUsed ?? 0, 2);
    w.write(bucket(r?.attempts ?? 0, ATTEMPT_BUCKETS), 3);
    w.write(bucket((r?.activeSeconds ?? 0) / 60, MINUTE_BUCKETS), 3);
    const phases = course.questInfo[id]?.phases ?? [];
    if (phases.length) {
      let mask = 0;
      phases.forEach((ph, i) => (mask |= (r?.phasesDone?.includes(ph) ? 1 : 0) << i));
      w.write(mask, 4);
    }
  }
  for (const region of course.regions) {
    const c = p.checks[region.id];
    w.write(c ? Math.min(6, c.best) : 7, 3);
  }
  w.write(
    Math.max(
      0,
      course.regions.findIndex((r) => r.id === p.location.region),
    ),
    4,
  );
  const bits = w.bits;
  while (bits.length % 5) bits.push(0);
  const check = crc16(bits);
  for (let i = 15; i >= 0; i--) bits.push((check >> i) & 1);
  while (bits.length % 5) bits.push(0);
  let body = '';
  for (let i = 0; i < bits.length; i += 5) {
    body +=
      ALPHABET[
        (bits[i]! << 4) | (bits[i + 1]! << 3) | (bits[i + 2]! << 2) | (bits[i + 3]! << 1) | bits[i + 4]!
      ];
  }
  return `CW1-${body.match(/.{1,5}/g)!.join('-')}`;
}

export type DecodeResult =
  | { ok: true; profile: Profile; sameContent: boolean }
  | { ok: false; reason: 'format' | 'typo' | 'version' | 'course' };

export function decodeSaveCode(code: string, course: Course, choices: Choices): DecodeResult {
  const cleaned = code
    .trim()
    .toUpperCase()
    .replace(/^CW1/, '')
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  if (!cleaned.length || /[^0-9A-HJKMNP-TV-Z]/.test(cleaned)) return { ok: false, reason: 'format' };
  const bits: number[] = [];
  for (const ch of cleaned) {
    const v = ALPHABET.indexOf(ch);
    for (let i = 4; i >= 0; i--) bits.push((v >> i) & 1);
  }
  // The check group is the last 16 bits after padding the body to whole characters.
  let payloadEnd = -1;
  for (let end = bits.length - 16; end >= 0; end--) {
    if (end % 5 !== 0) continue;
    const tail = bits.slice(end + 16);
    if (tail.length >= 5 || tail.some((b) => b)) continue;
    let check = 0;
    for (let i = 0; i < 16; i++) check = check * 2 + bits[end + i]!;
    if (crc16(bits.slice(0, end)) === check) {
      payloadEnd = end;
      break;
    }
  }
  if (payloadEnd < 0) return { ok: false, reason: 'typo' };
  try {
    const r = new BitReader(bits.slice(0, payloadEnd));
    if (r.read(4) !== VERSION) return { ok: false, reason: 'version' };
    const contentHash = r.read(16);
    const id8 = r.read(32).toString(16).padStart(8, '0');
    const days = r.read(16);
    const avatar = choices.avatars[r.read(4)] ?? choices.avatars[0]!;
    const theme = choices.themes[r.read(4)] ?? choices.themes[0]!;
    const nickLen = r.read(5);
    let nickname = '';
    for (let i = 0; i < nickLen; i++) nickname += NICK_CHARS[r.read(6)] ?? '';
    const xp = r.read(16);
    const count = r.read(8);
    if (count !== course.questOrder.length) return { ok: false, reason: 'course' };
    const profile = newProfile(nickname || 'Scriptwright', avatar, theme, course.regions[0]!.id);
    profile.id = `${id8}-0000-4000-8000-000000000000`;
    profile.xp = xp;
    for (const id of course.questOrder) {
      const status = r.read(2);
      const hints = r.read(2) as QuestRecord['hintsUsed'];
      const attempts = ATTEMPT_BUCKETS[r.read(3)]!;
      const minutes = MINUTE_BUCKETS[r.read(3)]!;
      const phases = course.questInfo[id]?.phases ?? [];
      const mask = phases.length ? r.read(4) : 0;
      if (status === 0) continue;
      const rec: QuestRecord = { ...emptyRecord(), status: status === 2 ? 'completed' : 'in_progress' };
      rec.hintsUsed = hints;
      rec.attempts = attempts;
      rec.activeSeconds = minutes * 60;
      if (phases.length) rec.phasesDone = phases.filter((_, i) => mask & (1 << i));
      profile.quests[id] = rec;
      const item = course.questInfo[id]?.item;
      if (rec.status === 'completed' && item && !profile.items.includes(item)) profile.items.push(item);
    }
    for (const region of course.regions) {
      const best = r.read(3);
      if (best !== 7) profile.checks[region.id] = { best, latest: best, total: 0, attempts: 1 };
    }
    const regionIndex = r.read(4);
    profile.location = { region: course.regions[regionIndex]?.id ?? course.regions[0]!.id, at: null };
    profile.createdOn = new Date(EPOCH + days * 86_400_000).toISOString().slice(0, 10);
    const started = Object.keys(profile.quests).length > 0;
    profile.seen = {
      opening: started,
      regionIntros: started
        ? [...new Set(Object.keys(profile.quests).map((q) => course.questInfo[q]?.region ?? ''))]
        : [],
      conceptScenes: [],
    };
    return {
      ok: true,
      profile,
      sameContent: contentHash === (parseInt(course.contentVersion.slice(0, 4), 16) || 0),
    };
  } catch {
    return { ok: false, reason: 'format' };
  }
}

/** Do two profiles come from the same original profile? (Save codes keep 8 hex digits of the id.) */
export function sameProfile(a: string, b: string): boolean {
  return a.replace(/-/g, '').slice(0, 8) === b.replace(/-/g, '').slice(0, 8);
}
