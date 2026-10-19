// Progress files: everything, including code, as a JSON file the student keeps
// (docs/specs.md §12.3, §12.5). Imported files are untrusted and fully validated.
import { z } from 'zod';
import type { Course } from '../content/types';
import type { Profile } from './profile';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const QuestRecordSchema = z.object({
  status: z.enum(['available', 'in_progress', 'completed']),
  attempts: z.number().int().min(0).max(1e6),
  codeHashes: z.array(z.string().max(16)).max(20).default([]),
  failedBeforePass: z.number().int().min(0).max(1e6).default(0),
  hintsUsed: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  activeSeconds: z.number().min(0).max(1e7),
  completedOn: z.string().max(10).optional(),
  predictionsCorrectFirstTry: z.number().int().min(0).optional(),
  predictionsTotal: z.number().int().min(0).optional(),
  bonus: z.array(z.string().max(64)).max(20).optional(),
  solution: z.string().max(50_000).optional(),
  phasesDone: z.array(z.string().max(64)).max(8).optional(),
});

const ProfileSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().max(64),
  nickname: z.string().min(1).max(16),
  avatarId: z.string().max(32),
  themeId: z.string().max(32),
  createdOn: z.string().max(10),
  xp: z.number().int().min(0).max(1e7),
  quests: z.record(z.string().max(80), QuestRecordSchema),
  checks: z.record(
    z.string().max(64),
    z.object({ best: z.number(), latest: z.number(), total: z.number(), attempts: z.number() }),
  ),
  items: z.array(z.string().max(64)).max(200),
  poisVisited: z.record(z.string().max(64), z.array(z.string().max(64)).max(50)),
  seen: z.object({
    opening: z.boolean(),
    regionIntros: z.array(z.string().max(64)).max(50),
    conceptScenes: z.array(z.string().max(64)).max(50),
  }),
  location: z.object({ region: z.string().max(64), at: z.tuple([z.number(), z.number()]).nullable() }),
  settings: z.object({
    textScale: z.union([z.literal(1), z.literal(1.25), z.literal(1.5), z.literal(2)]),
    reducedMotion: z.enum(['system', 'on', 'off']),
    replaySpeed: z.union([z.literal(0.5), z.literal(1), z.literal(2), z.literal(4), z.literal('instant')]),
    editorFontSize: z.number().min(10).max(32),
    highContrast: z.boolean(),
    font: z.enum(['atkinson', 'opendyslexic', 'system']),
  }),
  lastSavedOutHash: z.string().max(16).nullable(),
});

const FileSchema = z.object({
  format: z.literal('codeweald-progress'),
  version: z.literal(1),
  courseId: z.string().max(64),
  contentVersion: z.string().max(32),
  exportedOn: z.string().max(10),
  profile: ProfileSchema,
  drafts: z.record(z.string().max(120), z.string().max(50_000)),
});

export type ProgressFile = z.infer<typeof FileSchema>;

export function makeProgressFile(
  profile: Profile,
  drafts: Record<string, string>,
  course: Course,
): ProgressFile {
  return {
    format: 'codeweald-progress',
    version: 1,
    courseId: course.id,
    contentVersion: course.contentVersion,
    exportedOn: new Date().toISOString().slice(0, 10),
    profile,
    drafts,
  };
}

export function fileName(profile: Profile): string {
  const safe = profile.nickname.replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'scriptwright';
  return `codeweald-${safe}-${new Date().toISOString().slice(0, 10)}.codeweald.json`;
}

export type ParseResult =
  | { ok: true; file: ProgressFile }
  | { ok: false; reason: 'too-big' | 'not-json' | 'not-codeweald' | 'invalid' };

export function parseProgressFile(text: string): ParseResult {
  if (text.length > MAX_FILE_BYTES) return { ok: false, reason: 'too-big' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not-json' };
  }
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as { format?: unknown }).format !== 'codeweald-progress'
  ) {
    return { ok: false, reason: 'not-codeweald' };
  }
  const parsed = FileSchema.safeParse(raw);
  return parsed.success ? { ok: true, file: parsed.data as ProgressFile } : { ok: false, reason: 'invalid' };
}

type PickerWindow = Window & {
  showSaveFilePicker?: (
    o: unknown,
  ) => Promise<{ createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }> }>;
  showOpenFilePicker?: (o: unknown) => Promise<{ getFile(): Promise<File> }[]>;
};

const PICKER_TYPES = [{ description: 'Codeweald progress', accept: { 'application/json': ['.json'] } }];

/** Save with the system "Save as" dialog when available (ChromeOS: Google Drive works), else download. */
export async function saveFile(
  name: string,
  contents: string,
): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const blob = new Blob([contents], { type: 'application/json' });
  const w = window as PickerWindow;
  if (w.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: name, types: PICKER_TYPES });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** Let the student pick a progress file. */
export async function openFile(): Promise<string | null> {
  const w = window as PickerWindow;
  if (w.showOpenFilePicker) {
    try {
      const [handle] = await w.showOpenFilePicker({ types: PICKER_TYPES, multiple: false });
      const file = await handle!.getFile();
      return file.size > MAX_FILE_BYTES ? '\u0000too-big' : await file.text();
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return null;
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve(file.size > MAX_FILE_BYTES ? '\u0000too-big' : await file.text());
    };
    input.click();
  });
}
